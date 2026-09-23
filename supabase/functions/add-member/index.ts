import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, error: 'Sessão inválida' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: authData.user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Acesso restrito a administradores' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { email, name, planType, includeAdultAccess, contentId } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!planType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tipo de plano é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (planType === 'single_content' && !contentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID do conteúdo é obrigatório para plano parcial' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    console.log('Adicionando membro:', trimmedEmail, 'Plano:', planType, 'Acesso +18:', includeAdultAccess, 'ContentId:', contentId);

    // Get content title if single_content
    let contentTitle = '';
    if (planType === 'single_content' && contentId) {
      const { data: contentData } = await supabase
        .from('contents')
        .select('title')
        .eq('id', contentId)
        .single();
      contentTitle = contentData?.title || 'Conteúdo Avulso';
    }

    // Calculate plan name for display
    const planNames: Record<string, string> = {
      monthly: 'Plano Mensal',
      annual: 'Plano Anual',
      adult: 'Acesso +18',
      single_content: `Conteúdo Avulso: ${contentTitle}`,
    };

    // Create a purchase_webhooks entry so the user can access the platform
    // Mark as NOT processed so process-user-purchases can handle it on first login
    const { data: webhookData, error: webhookError } = await supabase
      .from('purchase_webhooks')
      .insert({
        buyer_email: trimmedEmail,
        buyer_name: name || null,
        webhook_type: planType,
        product_name: `${planNames[planType] || planType} (Adicionado pelo Admin)`,
        raw_data: { 
          added_manually: true, 
          added_at: new Date().toISOString(),
          plan_type: planType,
          include_adult_access: includeAdultAccess || false,
          content_id: contentId || null,
        },
        processed: false, // Not processed yet - will be processed on first login
      })
      .select()
      .single();

    if (webhookError) {
      console.error('Erro ao criar entrada de webhook:', webhookError);
      // Continue anyway - user might already have a webhook entry
    } else {
      console.log('Entrada de webhook criada:', webhookData.id);
    }

    // Check if user already exists
    const { data: existingUserId } = await supabase.rpc('get_auth_user_id_by_email', { p_email: trimmedEmail });
    const existingUser = existingUserId ? { id: existingUserId } : null;

    if (existingUser) {
      console.log('Usuário já existe:', existingUser.id);
      
      // Update webhook with user_id if we created one
      if (webhookData?.id) {
        await supabase
          .from('purchase_webhooks')
          .update({ user_id: existingUser.id })
          .eq('id', webhookData.id);
      }

      // Calculate subscription end date based on plan type
      const now = new Date();
      const endDate = new Date(now);
      
      if (planType === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (planType === 'annual') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else if (planType === 'adult') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Prepare profile update
      const profileUpdate: Record<string, any> = {
        full_name: name || undefined,
        subscription_status: 'active',
        plan_type: planType,
        subscription_start_date: now.toISOString(),
        subscription_end_date: endDate.toISOString(),
      };

      // Add adult access if requested or if annual/adult plan
      if (includeAdultAccess || planType === 'annual' || planType === 'adult') {
        profileUpdate.has_adult_access = true;
        profileUpdate.adult_access_start_date = now.toISOString();
        profileUpdate.adult_access_end_date = endDate.toISOString();
      }

      // Update profile
      await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('user_id', existingUser.id);

      // If single_content, create content purchase entry
      if (planType === 'single_content' && contentId) {
        await supabase
          .from('user_content_purchases')
          .upsert({
            user_id: existingUser.id,
            content_id: contentId,
            is_lifetime: true,
            webhook_id: webhookData?.id || null,
          }, { onConflict: 'user_id,content_id' });
        console.log('Acesso ao conteúdo liberado para usuário existente');
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user_id: existingUser.id, 
          message: 'Usuário já existia, acesso atualizado com sucesso!' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User doesn't exist yet - webhook entry is enough for first access authorization
    // For single_content, we need to track the content_id so we can grant access after signup
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Membro adicionado! O usuário criará sua conta no primeiro acesso.' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

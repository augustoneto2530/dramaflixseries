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

    const { email, name } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Adicionando membro:', email);

    // First, create a purchase_webhooks entry so the user can access the platform
    const { data: webhookData, error: webhookError } = await supabase
      .from('purchase_webhooks')
      .insert({
        buyer_email: email.trim().toLowerCase(),
        buyer_name: name || null,
        webhook_type: 'monthly', // Default plan type for manual members
        product_name: 'Acesso Manual (Admin)',
        raw_data: { added_manually: true, added_at: new Date().toISOString() },
        processed: true, // Mark as processed since we're handling it now
        processed_at: new Date().toISOString(),
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
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email.trim().toLowerCase());

    if (existingUser) {
      console.log('Usuário já existe:', existingUser.id);
      
      // Update webhook with user_id if we created one
      if (webhookData?.id) {
        await supabase
          .from('purchase_webhooks')
          .update({ user_id: existingUser.id })
          .eq('id', webhookData.id);
      }

      return new Response(
        JSON.stringify({ success: true, user_id: existingUser.id, message: 'Usuário já existia, acesso garantido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate random password - user will set their own on first access
    const tempPassword = crypto.randomUUID();

    // Create user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name || '',
      },
    });

    if (createError) {
      console.error('Erro ao criar usuário:', createError);
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile with name and activate subscription
    if (newUser?.user) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription for manual members

      await supabase
        .from('profiles')
        .update({ 
          full_name: name || null,
          subscription_status: 'active',
          plan_type: 'monthly',
          subscription_start_date: now.toISOString(),
          subscription_end_date: endDate.toISOString(),
        })
        .eq('user_id', newUser.user.id);

      // Update webhook with user_id
      if (webhookData?.id) {
        await supabase
          .from('purchase_webhooks')
          .update({ user_id: newUser.user.id })
          .eq('id', webhookData.id);
      }
    }

    console.log('Membro adicionado com sucesso:', email);

    return new Response(
      JSON.stringify({ success: true, user_id: newUser?.user?.id }),
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

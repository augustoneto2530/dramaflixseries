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

      // Update profile to ensure subscription is active
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      await supabase
        .from('profiles')
        .update({ 
          full_name: name || null,
          subscription_status: 'active',
          plan_type: 'monthly',
          subscription_start_date: now.toISOString(),
          subscription_end_date: endDate.toISOString(),
        })
        .eq('user_id', existingUser.id);

      return new Response(
        JSON.stringify({ success: true, user_id: existingUser.id, message: 'Usuário já existia, acesso garantido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DO NOT create user here - let them create their own account on first access
    // The webhook entry is enough to authorize their access
    return new Response(
      JSON.stringify({ success: true, message: 'Membro adicionado. Usuário criará conta no primeiro acesso.' }),
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

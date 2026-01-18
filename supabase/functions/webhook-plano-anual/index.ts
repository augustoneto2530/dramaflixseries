import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse the webhook payload
    const payload = await req.json();
    console.log('Webhook Plano Anual - Payload recebido:', JSON.stringify(payload, null, 2));

    // Extract buyer information from various possible formats
    const buyerEmail = payload.buyer?.email || 
                       payload.customer?.email || 
                       payload.data?.buyer?.email ||
                       payload.data?.customer?.email ||
                       payload.email;

    const buyerName = payload.buyer?.name || 
                      payload.customer?.name || 
                      payload.data?.buyer?.name ||
                      payload.data?.customer?.name ||
                      payload.name;

    const buyerPhone = payload.buyer?.phone || 
                       payload.buyer?.checkout_phone ||
                       payload.customer?.phone || 
                       payload.data?.buyer?.phone ||
                       payload.phone;

    const buyerDocument = payload.buyer?.document || 
                          payload.customer?.document ||
                          payload.data?.buyer?.document ||
                          payload.document;

    // Extract transaction details
    const transactionId = payload.transaction?.id || 
                          payload.purchase?.transaction ||
                          payload.data?.transaction?.id ||
                          payload.transaction_id ||
                          payload.id;

    const amount = payload.purchase?.price?.value || 
                   payload.transaction?.amount ||
                   payload.data?.purchase?.price?.value ||
                   payload.amount ||
                   payload.value;

    const paymentStatus = payload.purchase?.status || 
                          payload.transaction?.status ||
                          payload.data?.purchase?.status ||
                          payload.status ||
                          'approved';

    if (!buyerEmail) {
      console.error('Email do comprador não encontrado no payload');
      return new Response(
        JSON.stringify({ error: 'Email do comprador é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Dados extraídos:', { buyerEmail, buyerName, buyerPhone, transactionId, amount, paymentStatus });

    // Save webhook data
    const { data: webhookData, error: webhookError } = await supabase
      .from('purchase_webhooks')
      .insert({
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        buyer_document: buyerDocument,
        transaction_id: transactionId,
        amount: amount,
        payment_status: paymentStatus,
        webhook_type: 'annual',
        product_name: 'Plano Anual',
        raw_data: payload,
        processed: false
      })
      .select()
      .single();

    if (webhookError) {
      console.error('Erro ao salvar webhook:', webhookError);
      throw webhookError;
    }

    console.log('Webhook salvo:', webhookData.id);

    // Check if user exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const user = existingUser?.users?.find(u => u.email === buyerEmail);

    let userId: string;

    if (user) {
      userId = user.id;
      console.log('Usuário existente encontrado:', userId);
    } else {
      // Create new user
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: buyerEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: buyerName
        }
      });

      if (createError) {
        console.error('Erro ao criar usuário:', createError);
        throw createError;
      }

      userId = newUser.user.id;
      console.log('Novo usuário criado:', userId);
    }

    // Calculate subscription dates (1 year)
    const now = new Date();
    const endDate = new Date(now);
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Update user profile with annual subscription
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        plan_type: 'annual',
        subscription_start_date: now.toISOString(),
        subscription_end_date: endDate.toISOString(),
        full_name: buyerName || undefined
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Erro ao atualizar perfil:', profileError);
      throw profileError;
    }

    console.log('Perfil atualizado com plano anual para usuário:', userId);

    // Mark webhook as processed
    await supabase
      .from('purchase_webhooks')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString(),
        user_id: userId
      })
      .eq('id', webhookData.id);

    console.log('Webhook processado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Plano Anual ativado com sucesso',
        user_id: userId,
        webhook_id: webhookData.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro no webhook plano anual:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

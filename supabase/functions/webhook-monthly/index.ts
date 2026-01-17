import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook data - generic format to accept any payment platform
    const rawData = await req.json();
    console.log('Webhook mensal recebido:', JSON.stringify(rawData));

    // Extract common fields from various webhook formats
    const buyerEmail = rawData.email || rawData.buyer_email || rawData.customer?.email || rawData.data?.buyer?.email || rawData.data?.customer?.email || '';
    const buyerName = rawData.name || rawData.buyer_name || rawData.customer?.name || rawData.data?.buyer?.name || rawData.data?.customer?.name || '';
    const buyerPhone = rawData.phone || rawData.buyer_phone || rawData.customer?.phone || rawData.data?.buyer?.phone || rawData.data?.customer?.phone || '';
    const buyerDocument = rawData.document || rawData.cpf || rawData.buyer_document || rawData.customer?.document || rawData.data?.buyer?.doc || '';
    const productId = rawData.product_id || rawData.productId || rawData.data?.product?.id || rawData.offer_code || '';
    const productName = rawData.product_name || rawData.productName || rawData.data?.product?.name || rawData.offer_name || '';
    const transactionId = rawData.transaction_id || rawData.transactionId || rawData.sale_id || rawData.data?.sale?.id || rawData.id || '';
    const paymentMethod = rawData.payment_method || rawData.paymentMethod || rawData.data?.payment?.type || '';
    const paymentStatus = rawData.status || rawData.payment_status || rawData.data?.status || 'approved';
    const amount = parseFloat(rawData.amount || rawData.price || rawData.data?.sale?.total || rawData.data?.payment?.value || 0);
    const currency = rawData.currency || 'BRL';

    if (!buyerEmail) {
      console.error('Email do comprador não encontrado no webhook');
      return new Response(
        JSON.stringify({ success: false, error: 'Email do comprador é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save webhook data
    const { data: webhookData, error: webhookError } = await supabase
      .from('purchase_webhooks')
      .insert({
        webhook_type: 'monthly',
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        buyer_document: buyerDocument,
        product_id: productId,
        product_name: productName,
        transaction_id: transactionId,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        amount: amount,
        currency: currency,
        raw_data: rawData,
        processed: false,
      })
      .select()
      .single();

    if (webhookError) {
      console.error('Erro ao salvar webhook:', webhookError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao processar webhook' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const user = existingUser?.users?.find(u => u.email === buyerEmail);

    if (user) {
      // Update existing user profile
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          plan_type: 'monthly',
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: endDate.toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Erro ao atualizar perfil:', updateError);
      }

      // Update webhook as processed
      await supabase
        .from('purchase_webhooks')
        .update({ processed: true, processed_at: new Date().toISOString(), user_id: user.id })
        .eq('id', webhookData.id);

      console.log('Usuário existente atualizado:', buyerEmail);
    } else {
      // Create new user with random password
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: buyerEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: buyerName,
        },
      });

      if (createError) {
        console.error('Erro ao criar usuário:', createError);
      } else if (newUser?.user) {
        // Update profile with subscription
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            plan_type: 'monthly',
            subscription_start_date: new Date().toISOString(),
            subscription_end_date: endDate.toISOString(),
            full_name: buyerName,
          })
          .eq('user_id', newUser.user.id);

        // Update webhook as processed
        await supabase
          .from('purchase_webhooks')
          .update({ processed: true, processed_at: new Date().toISOString(), user_id: newUser.user.id })
          .eq('id', webhookData.id);

        console.log('Novo usuário criado:', buyerEmail);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

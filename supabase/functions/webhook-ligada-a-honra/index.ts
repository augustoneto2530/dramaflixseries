import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ID do conteúdo "Ligada a Honra"
const LIGADA_A_HONRA_CONTENT_ID = '840dbec5-3144-4069-80a8-8413bf3497a9';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Webhook Ligada a Honra - Início ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse do payload
    const payload = await req.json();
    console.log('Payload recebido:', JSON.stringify(payload, null, 2));

    // Extração de dados do comprador (suporta múltiplos formatos de payload)
    const buyerEmail = payload.buyer?.email || 
                       payload.customer?.email || 
                       payload.email || 
                       payload.data?.buyer?.email ||
                       payload.data?.customer?.email;
    
    const buyerName = payload.buyer?.name || 
                      payload.customer?.name || 
                      payload.name || 
                      payload.data?.buyer?.name ||
                      payload.data?.customer?.name || 
                      'Usuário';
    
    const buyerPhone = payload.buyer?.phone || 
                       payload.customer?.phone || 
                       payload.phone ||
                       payload.data?.buyer?.phone;
    
    const buyerDocument = payload.buyer?.document || 
                          payload.customer?.document || 
                          payload.document ||
                          payload.data?.buyer?.document;

    // Extração de dados da transação
    const amount = payload.purchase?.value || 
                   payload.amount || 
                   payload.value || 
                   payload.data?.purchase?.value ||
                   payload.transaction?.amount || 
                   0;
    
    const transactionId = payload.purchase?.transaction || 
                          payload.transaction_id || 
                          payload.transaction?.id ||
                          payload.data?.purchase?.transaction ||
                          payload.id || 
                          '';
    
    const productId = payload.product?.id || 
                      payload.product_id || 
                      payload.data?.product?.id ||
                      LIGADA_A_HONRA_CONTENT_ID;
    
    const productName = payload.product?.name || 
                        payload.product_name || 
                        payload.data?.product?.name ||
                        'Ligada a Honra';
    
    const paymentMethod = payload.purchase?.payment_method || 
                          payload.payment_method || 
                          payload.data?.purchase?.payment_method ||
                          'unknown';
    
    const paymentStatus = payload.purchase?.status || 
                          payload.status || 
                          payload.data?.purchase?.status ||
                          'approved';

    // Validação do email
    if (!buyerEmail) {
      console.error('Email do comprador não encontrado no payload');
      return new Response(
        JSON.stringify({ error: 'Email do comprador é obrigatório' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Dados extraídos:', { 
      buyerEmail, 
      buyerName, 
      amount, 
      transactionId,
      productName,
      contentId: LIGADA_A_HONRA_CONTENT_ID
    });

    // Verifica se o conteúdo existe
    const { data: contentData, error: contentError } = await supabase
      .from('contents')
      .select('id, title')
      .eq('id', LIGADA_A_HONRA_CONTENT_ID)
      .single();

    if (contentError || !contentData) {
      console.error('Conteúdo não encontrado:', contentError);
      return new Response(
        JSON.stringify({ error: 'Conteúdo não encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Conteúdo encontrado:', contentData.title);

    // Salvar webhook na tabela purchase_webhooks
    const { data: webhookData, error: webhookError } = await supabase
      .from('purchase_webhooks')
      .insert({
        webhook_type: 'single_content',
        raw_data: payload,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        buyer_document: buyerDocument,
        amount: amount,
        transaction_id: transactionId,
        product_id: LIGADA_A_HONRA_CONTENT_ID,
        product_name: productName || contentData.title,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        processed: false
      })
      .select()
      .single();

    if (webhookError) {
      console.error('Erro ao salvar webhook:', webhookError);
    } else {
      console.log('Webhook salvo com ID:', webhookData?.id);
    }

    // Verificar se usuário já existe
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('email', buyerEmail)
      .single();

    let userId: string;

    if (existingProfile) {
      // Usuário já existe
      userId = existingProfile.user_id;
      console.log('Usuário existente encontrado:', userId);
    } else {
      // Criar novo usuário
      console.log('Criando novo usuário para:', buyerEmail);
      
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: buyerEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: buyerName,
          phone: buyerPhone
        }
      });

      if (authError) {
        console.error('Erro ao criar usuário:', authError);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar usuário', details: authError.message }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      userId = authData.user.id;
      console.log('Novo usuário criado:', userId);

      // Atualizar perfil do novo usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: buyerName,
          phone: buyerPhone
        })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
      }
    }

    // Registrar a compra do conteúdo
    const { error: purchaseError } = await supabase
      .from('user_content_purchases')
      .upsert({
        user_id: userId,
        content_id: LIGADA_A_HONRA_CONTENT_ID,
        purchase_date: new Date().toISOString(),
        amount_paid: amount,
        transaction_id: transactionId,
        payment_status: 'completed'
      }, {
        onConflict: 'user_id,content_id'
      });

    if (purchaseError) {
      console.error('Erro ao registrar compra:', purchaseError);
      return new Response(
        JSON.stringify({ error: 'Erro ao registrar compra', details: purchaseError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Compra registrada com sucesso para:', contentData.title);

    // Marcar webhook como processado
    if (webhookData?.id) {
      await supabase
        .from('purchase_webhooks')
        .update({ processed: true })
        .eq('id', webhookData.id);
      
      console.log('Webhook marcado como processado');
    }

    console.log('=== Webhook Ligada a Honra - Concluído com sucesso ===');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Compra de "Ligada a Honra" processada com sucesso',
        user_id: userId,
        content_id: LIGADA_A_HONRA_CONTENT_ID,
        content_title: contentData.title
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error('Erro no webhook Ligada a Honra:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

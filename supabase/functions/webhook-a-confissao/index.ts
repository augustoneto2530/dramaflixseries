import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// IDs dos conteúdos liberados neste webhook
const CONFISSAO_PARTE1_CONTENT_ID = '0e8f3de8-5fdf-48f7-a6ab-f7004e3491ed';
const CONFISSAO_CONTENT_ID = '9b7072cf-c7d4-4b38-a8a0-bc02d1ad88ed';
const LIGADA_A_HONRA_CONTENT_ID = '840dbec5-3144-4069-80a8-8413bf3497a9';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Webhook A Confissão + Ligada a Honra - Início ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Payload recebido:', JSON.stringify(payload, null, 2));

    // Extração de dados do comprador
    const buyerEmail = payload.buyer?.email ||
      payload.customer?.email ||
      payload.email ||
      payload.data?.buyer?.email ||
      payload.data?.customer?.email ||
      payload.buyer_email;

    const buyerName = payload.buyer?.name ||
      payload.customer?.name ||
      payload.name ||
      payload.data?.buyer?.name ||
      payload.data?.customer?.name ||
      payload.buyer_name ||
      'Usuário';

    const buyerPhone = payload.buyer?.phone ||
      payload.customer?.phone ||
      payload.phone ||
      payload.data?.buyer?.phone ||
      payload.buyer_phone;

    const buyerDocument = payload.buyer?.document ||
      payload.customer?.document ||
      payload.document ||
      payload.data?.buyer?.document ||
      payload.buyer_document;

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

    const paymentMethod = payload.purchase?.payment_method ||
      payload.payment_method ||
      payload.data?.purchase?.payment_method ||
      'unknown';

    const paymentStatus = payload.purchase?.status ||
      payload.status ||
      payload.data?.purchase?.status ||
      'approved';

    if (!buyerEmail) {
      console.error('Email do comprador não encontrado no payload');
      return new Response(
        JSON.stringify({ error: 'Email do comprador é obrigatório' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const normalizedEmail = buyerEmail.toLowerCase().trim();
    console.log('Dados extraídos:', { buyerEmail: normalizedEmail, buyerName, amount, transactionId });

    // Salvar webhook
    const { data: webhookData, error: webhookError } = await supabase
      .from('purchase_webhooks')
      .insert({
        webhook_type: 'single_content',
        raw_data: payload,
        buyer_email: normalizedEmail,
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        buyer_document: buyerDocument,
        amount,
        transaction_id: transactionId,
        product_id: CONFISSAO_CONTENT_ID,
        product_name: 'A Confissão + Ligada a Honra',
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
      .eq('email', normalizedEmail)
      .single();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.user_id;
      console.log('Usuário existente encontrado:', userId);
    } else {
      console.log('Criando novo usuário para:', normalizedEmail);
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: buyerName, phone: buyerPhone }
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

      await new Promise(resolve => setTimeout(resolve, 1000));

      await supabase
        .from('profiles')
        .update({ full_name: buyerName, phone: buyerPhone })
        .eq('user_id', userId);
    }

    // Liberar os dois conteúdos: A Confissão e Ligada a Honra
    const contentIds = [CONFISSAO_CONTENT_ID, LIGADA_A_HONRA_CONTENT_ID];
    const contentNames = ['A Confissão', 'Ligada a Honra'];

    for (let i = 0; i < contentIds.length; i++) {
      const { error: purchaseError } = await supabase
        .from('user_content_purchases')
        .upsert({
          user_id: userId,
          content_id: contentIds[i],
          purchased_at: new Date().toISOString(),
          is_lifetime: true,
          transaction_id: transactionId,
          webhook_id: webhookData?.id || null,
        }, {
          onConflict: 'user_id,content_id'
        });

      if (purchaseError) {
        console.error(`Erro ao registrar compra de ${contentNames[i]}:`, purchaseError);
      } else {
        console.log(`Compra registrada: ${contentNames[i]}`);
      }
    }

    // Marcar webhook como processado
    if (webhookData?.id) {
      await supabase
        .from('purchase_webhooks')
        .update({ processed: true, processed_at: new Date().toISOString(), user_id: userId })
        .eq('id', webhookData.id);
    }

    console.log('=== Webhook A Confissão + Ligada a Honra - Concluído ===');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Compra de "A Confissão" + "Ligada a Honra" processada com sucesso',
        user_id: userId,
        contents_granted: contentNames,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error('Erro no webhook A Confissão:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

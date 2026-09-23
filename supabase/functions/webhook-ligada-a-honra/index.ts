import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ID do conteúdo "Ligada a Honra"
const LIGADA_A_HONRA_CONTENT_ID = '840dbec5-3144-4069-80a8-8413bf3497a9';
const isApprovedPayment = (status: unknown) =>
  ['approved', 'paid', 'completed', 'complete', 'aprovado', 'pago', 'concluido', 'concluído']
    .includes(String(status || '').toLowerCase().trim());

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
    const amount = payload.payment?.amount || payload.purchase?.value || 
                   payload.amount || 
                   payload.value || 
                   payload.data?.purchase?.value ||
                   payload.transaction?.amount || 
                   0;
    
    const transactionId = payload.payment?.id || payload.purchase?.transaction || 
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
    
    const paymentStatus = payload.payment?.status || payload.purchase?.status || 
                          payload.status || 
                           payload.data?.purchase?.status ||
                           '';

    // Validação do email
    if (!buyerEmail) {
      console.error('Email do comprador não encontrado no payload');
      return new Response(
        JSON.stringify({ error: 'Email do comprador é obrigatório' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!isApprovedPayment(paymentStatus)) {
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: 'Pagamento ainda não aprovado' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const normalizedEmail = String(buyerEmail).toLowerCase().trim();

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
        buyer_email: normalizedEmail,
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
      .ilike('email', normalizedEmail)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      // Usuário já existe
      userId = existingProfile.user_id;
      console.log('Usuário existente encontrado:', userId);
    } else {
      // Criar novo usuário
      console.log('Criando novo usuário para:', normalizedEmail);
      
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
      
      // --- Resolve contas já existentes (auth user pode existir sem perfil) ---
      const _origCreateUser = supabase.auth.admin.createUser.bind(supabase.auth.admin);
      const _ensureProfile = async (uid: string, email: string, name?: string) => {
        await supabase.from('profiles').upsert(
          { user_id: uid, email, full_name: name || email },
          { onConflict: 'user_id' }
        );
      };
      // deno-lint-ignore no-explicit-any
      (supabase.auth.admin as any).createUser = async (attrs: any) => {
        const _email = String(attrs?.email || '').toLowerCase().trim();
        const _name = attrs?.user_metadata?.full_name;
        const { data: existingId } = await supabase.rpc('get_auth_user_id_by_email', { p_email: _email });
        if (existingId) {
          console.log('Conta já existente encontrada em auth.users:', existingId);
          await _ensureProfile(existingId as string, _email, _name);
          return { data: { user: { id: existingId, email: _email } }, error: null };
        }
        const res = await _origCreateUser(attrs);
        if (res.error) {
          const { data: fallbackId } = await supabase.rpc('get_auth_user_id_by_email', { p_email: _email });
          if (fallbackId) {
            console.log('createUser falhou, usando conta existente:', fallbackId);
            await _ensureProfile(fallbackId as string, _email, _name);
            return { data: { user: { id: fallbackId, email: _email } }, error: null };
          }
          return res;
        }
        if (res.data?.user?.id) {
          await new Promise((r) => setTimeout(r, 500));
          await _ensureProfile(res.data.user.id, _email, _name);
        }
        return res;
      };
      // --- fim ---

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
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
        purchased_at: new Date().toISOString(),
        is_lifetime: true,
        transaction_id: transactionId,
        webhook_id: webhookData?.id || null,
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
        .update({ processed: true, processed_at: new Date().toISOString(), user_id: userId })
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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCT_ACCESS = new Map([
  ['8Uuv0D8fdlQltbgDcVPM', {
    contentId: 'f81aa496-708e-4154-99b7-1148f4f91f77',
    title: 'O Filho do meu Chefe',
  }],
  ['DdDZosKap9UaVb8SCgEd', {
    contentId: '6084c12a-635e-4feb-b62c-db1eb68f3acf',
    title: 'O Pai do meu namorado, meu pecado!',
  }],
]);

const normalizeEmail = (email: unknown) => String(email || '').toLowerCase().trim();

const isApprovedPayment = (status: unknown) => {
  const normalized = String(status || '').toLowerCase().trim();
  return ['approved', 'paid', 'completed', 'complete', 'aprovado', 'pago', 'concluido', 'concluído'].includes(normalized);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return new Response(
      JSON.stringify({ success: true, service: 'webhook-filho-do-meu-chefe' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    console.log('=== Webhook Filho do Meu Chefe - Início ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    if (!rawBody.trim()) {
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: 'Verificação sem conteúdo' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.warn('Notificação ignorada: corpo não é JSON válido');
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: 'Formato não reconhecido' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    console.log('Notificação recebida', {
      event: payload.event,
      transactionId: payload.payment?.id,
      productId: payload.product?.id || payload.products?.[0]?.id,
    });

    const buyerEmail = normalizeEmail(
      payload.buyer?.email ||
      payload.customer?.email ||
      payload.email ||
      payload.data?.buyer?.email ||
      payload.data?.customer?.email ||
      payload.buyer_email ||
      payload.contact?.email
    );

    const buyerName = payload.buyer?.name ||
      payload.customer?.name ||
      payload.name ||
      payload.data?.buyer?.name ||
      payload.data?.customer?.name ||
      payload.buyer_name ||
      `${payload.first_name || ''} ${payload.last_name || ''}`.trim() ||
      'Usuário';

    const buyerPhone = payload.buyer?.phone ||
      payload.customer?.phone ||
      payload.phone ||
      payload.data?.buyer?.phone ||
      payload.buyer_phone ||
      payload.contact?.phone ||
      null;

    const buyerDocument = payload.buyer?.document ||
      payload.customer?.document ||
      payload.document ||
      payload.cpf ||
      payload.data?.buyer?.document ||
      payload.buyer_document ||
      null;

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
      payload.purchase_id ||
      payload.order_id ||
      payload.id ||
      '';

    const paymentMethod = payload.purchase?.payment_method ||
      payload.payment_method ||
      payload.data?.purchase?.payment_method ||
      payload.payment?.method ||
      'unknown';

    const paymentStatus = payload.payment?.status || payload.purchase?.status ||
      payload.payment_status ||
      payload.status ||
      payload.data?.purchase?.status ||
      '';
    const checkoutProductId = payload.product?.id || payload.products?.[0]?.id || payload.product_id || payload.data?.product?.id || '';
    const selectedAccess = PRODUCT_ACCESS.get(String(checkoutProductId));

    if (!isApprovedPayment(paymentStatus)) {
      console.info('Notificação ignorada: pagamento não aprovado', { paymentStatus, transactionId });
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: 'Pagamento não aprovado' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!selectedAccess) {
      console.warn('Notificação ignorada: produto não reconhecido', { checkoutProductId, transactionId });
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: 'Produto não reconhecido' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!buyerEmail) {
      console.warn('Compra aprovada sem e-mail do comprador', { checkoutProductId, transactionId });
      return new Response(
        JSON.stringify({ error: 'Email do comprador é obrigatório' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!transactionId) {
      console.warn('Compra aprovada sem identificador de transação', { checkoutProductId, buyerEmail });
      return new Response(
        JSON.stringify({ error: 'Identificador da transação é obrigatório' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { data: contentData, error: contentError } = await supabase
      .from('contents')
      .select('id, title')
      .eq('id', selectedAccess.contentId)
      .single();

    if (contentError || !contentData) {
      console.error('Conteúdo não encontrado:', contentError);
      return new Response(
        JSON.stringify({ error: 'Conteúdo comprado não encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { data: priorWebhook } = await supabase
      .from('purchase_webhooks')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('external_product_id', String(checkoutProductId))
      .maybeSingle();

    if (priorWebhook?.processed) {
      console.info('Reenvio confirmado sem duplicar a compra', { transactionId, checkoutProductId });
      return new Response(
        JSON.stringify({ success: true, repeated: true, message: 'Compra já processada' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    let webhookData = priorWebhook;
    let webhookError: { message: string } | null = null;

    if (!webhookData) {
      const inserted = await supabase
        .from('purchase_webhooks')
        .insert({
          webhook_type: 'single_content',
          raw_data: payload,
          buyer_email: buyerEmail,
          buyer_name: buyerName,
          buyer_phone: buyerPhone,
          buyer_document: buyerDocument,
          amount,
          transaction_id: transactionId,
          external_product_id: String(checkoutProductId),
          product_id: selectedAccess.contentId,
          product_name: selectedAccess.title,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          processed: false,
        })
        .select()
        .maybeSingle();

      webhookData = inserted.data;
      webhookError = inserted.error;
    }


    if (!webhookError && !webhookData) {
      const existingWebhook = await supabase
        .from('purchase_webhooks')
        .select('*')
        .eq('transaction_id', transactionId)
        .eq('external_product_id', String(checkoutProductId))
        .maybeSingle();

      webhookData = existingWebhook.data;
      webhookError = existingWebhook.error;

      if (webhookData?.processed) {
        console.info('Reenvio confirmado sem duplicar a compra', { transactionId, checkoutProductId });
        return new Response(
          JSON.stringify({ success: true, repeated: true, message: 'Compra já processada' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    if (webhookError || !webhookData) {
      console.error('Erro ao salvar webhook:', webhookError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar webhook', details: webhookError?.message || 'Registro não encontrado' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('email', buyerEmail)
      .maybeSingle();

    let userId = existingProfile?.user_id;

    if (!userId) {
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
        email: buyerEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: buyerName, phone: buyerPhone },
      });


      if (authError || !authData.user) {
        console.error('Erro ao criar usuário:', authError);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar usuário', details: authError?.message }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      userId = authData.user.id;

      await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          email: buyerEmail,
          full_name: buyerName,
        }, { onConflict: 'user_id' });
    }

    const { error: purchaseError } = await supabase
      .from('user_content_purchases')
      .upsert({
        user_id: userId,
        content_id: selectedAccess.contentId,
        purchased_at: new Date().toISOString(),
        is_lifetime: true,
        transaction_id: transactionId,
        webhook_id: webhookData.id,
      }, { onConflict: 'user_id,content_id' });

    if (purchaseError) {
      console.error('Erro ao liberar conteúdo:', purchaseError);
      return new Response(
        JSON.stringify({ error: 'Erro ao liberar conteúdo', details: purchaseError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    await supabase
      .from('purchase_webhooks')
      .update({ processed: true, processed_at: new Date().toISOString(), user_id: userId })
      .eq('id', webhookData.id);

    console.log('=== Webhook avulso - Concluído ===');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Compra de ${selectedAccess.title} processada com sucesso`,
        user_id: userId,
        content_id: selectedAccess.contentId,
        content_title: contentData.title,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error('Erro no webhook Filho do Meu Chefe:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
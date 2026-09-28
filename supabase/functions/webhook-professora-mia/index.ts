import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CONTENT_ID = '1a2b1e56-ed07-4c79-b6b9-be0f6ba70943';
const CONTENT_TITLE = 'Professora Mia, Segredo Secreto!';
const approvedStatuses = new Set([
  'approved', 'paid', 'completed', 'complete', 'aprovado', 'pago', 'concluido', 'concluído',
]);

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
);

const normalizeEmail = (value: unknown) => String(value || '').toLowerCase().trim();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method === 'GET' || req.method === 'HEAD') {
    return jsonResponse({ success: true, service: 'webhook-professora-mia' });
  }
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return jsonResponse({ error: 'Configuração indisponível' }, 500);

    const payload = await req.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return jsonResponse({ error: 'Notificação inválida' }, 400);
    }

    const buyerEmail = normalizeEmail(
      payload.buyer?.email || payload.customer?.email || payload.email ||
      payload.data?.buyer?.email || payload.data?.customer?.email ||
      payload.buyer_email || payload.contact?.email,
    );
    const paymentStatus = String(
      payload.payment?.status || payload.purchase?.status || payload.payment_status ||
      payload.status || payload.data?.purchase?.status || '',
    ).toLowerCase().trim();

    if (!buyerEmail || !buyerEmail.includes('@')) {
      return jsonResponse({ error: 'Email do comprador é obrigatório' }, 400);
    }
    if (!approvedStatuses.has(paymentStatus)) {
      return jsonResponse({ success: true, ignored: true, reason: 'Pagamento ainda não aprovado' });
    }

    const buyerName = payload.buyer?.name || payload.customer?.name || payload.name ||
      payload.data?.buyer?.name || payload.data?.customer?.name || payload.buyer_name || buyerEmail;
    const buyerPhone = payload.buyer?.phone || payload.customer?.phone || payload.phone ||
      payload.data?.buyer?.phone || payload.buyer_phone || payload.contact?.phone || null;
    const transactionId = String(
      payload.payment?.id || payload.purchase?.transaction || payload.transaction_id ||
      payload.transaction?.id || payload.data?.purchase?.transaction ||
      payload.purchase_id || payload.order_id || payload.id || '',
    ).trim();
    const externalProductId = String(
      payload.product?.id || payload.products?.[0]?.id || payload.product_id ||
      payload.data?.product?.id || '',
    ).trim();
    const amount = payload.payment?.amount || payload.purchase?.value || payload.amount ||
      payload.value || payload.data?.purchase?.value || payload.transaction?.amount || 0;
    const paymentMethod = payload.purchase?.payment_method || payload.payment_method ||
      payload.data?.purchase?.payment_method || payload.payment?.method || 'unknown';

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: content, error: contentError } = await supabase
      .from('contents').select('id, title').eq('id', CONTENT_ID).single();
    if (contentError || !content) return jsonResponse({ error: 'Série não encontrada' }, 404);

    if (transactionId) {
      const { data: previous } = await supabase
        .from('purchase_webhooks')
        .select('id, processed, user_id')
        .eq('transaction_id', transactionId)
        .eq('product_id', CONTENT_ID)
        .maybeSingle();
      if (previous) {
        return jsonResponse({ success: true, repeated: true, processed: previous.processed, webhook_id: previous.id });
      }
    }

    const { data: profile } = await supabase
      .from('profiles').select('user_id').ilike('email', buyerEmail).maybeSingle();
    let userId: string | null = profile?.user_id || null;

    if (!userId) {
      const { data: authUserId } = await supabase.rpc('get_auth_user_id_by_email', { p_email: buyerEmail });
      userId = typeof authUserId === 'string' ? authUserId : null;
    }

    if (!userId) {
      const randomBytes = crypto.getRandomValues(new Uint8Array(24));
      const password = `${Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}A1!`;
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: buyerEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: buyerName, phone: buyerPhone },
      });
      if (createError || !created.user) {
        return jsonResponse({ error: 'Não foi possível vincular a conta', details: createError?.message }, 500);
      }
      userId = created.user.id;
    }

    await supabase.from('profiles').upsert(
      { user_id: userId, email: buyerEmail, full_name: buyerName },
      { onConflict: 'user_id' },
    );

    const { data: webhook, error: webhookError } = await supabase.from('purchase_webhooks').insert({
      webhook_type: 'single_content',
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      amount,
      transaction_id: transactionId || null,
      external_product_id: externalProductId || null,
      product_id: CONTENT_ID,
      product_name: CONTENT_TITLE,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      raw_data: payload,
      processed: false,
      user_id: userId,
    }).select('id').single();
    if (webhookError || !webhook) {
      return jsonResponse({ error: 'Não foi possível registrar a compra', details: webhookError?.message }, 500);
    }

    const { error: purchaseError } = await supabase.from('user_content_purchases').upsert({
      user_id: userId,
      content_id: CONTENT_ID,
      purchased_at: new Date().toISOString(),
      is_lifetime: true,
      transaction_id: transactionId || null,
      webhook_id: webhook.id,
    }, { onConflict: 'user_id,content_id' });
    if (purchaseError) return jsonResponse({ error: 'Não foi possível liberar a série', details: purchaseError.message }, 500);

    await supabase.from('purchase_webhooks').update({
      processed: true,
      processed_at: new Date().toISOString(),
      user_id: userId,
    }).eq('id', webhook.id);

    return jsonResponse({
      success: true,
      webhook_id: webhook.id,
      content_id: CONTENT_ID,
      content_title: content.title,
      access: 'single_content',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro no webhook Professora Mia:', message);
    return jsonResponse({ error: 'Erro interno do servidor' }, 500);
  }
});

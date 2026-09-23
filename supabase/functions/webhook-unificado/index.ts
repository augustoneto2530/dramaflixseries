import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.24.2';
import { isAuthorized } from './auth.ts';

const PayloadSchema = z.object({
  event: z.string().max(100).optional(),
  customer: z.object({
    email: z.string().email().max(320),
    name: z.string().max(255).optional(),
    phone: z.string().max(50).optional(),
    document: z.string().max(50).optional(),
  }),
  payment: z.object({
    id: z.string().min(1).max(255),
    status: z.string().min(1).max(50),
    amount: z.coerce.number().nonnegative().optional(),
    method: z.string().max(100).optional(),
    paymentMethod: z.string().max(100).optional(),
  }),
  product: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    title: z.string().max(255).optional(),
    type: z.string().max(50).optional(),
  }),
  products: z.array(z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    title: z.string().max(255).optional(),
    type: z.string().max(50).optional(),
  })).max(30).optional(),
}).passthrough();

type ProductMapping = {
  id: string;
  external_product_id: string;
  product_name: string;
  grant_type: 'monthly' | 'annual' | 'vip' | 'adult' | 'single_content';
  content_id: string | null;
  duration_days: number | null;
};

const approvedEvents = new Set(['pix.paid', 'card.paid', 'payment.approved', 'purchase.approved']);
const approvedStatuses = new Set(['paid', 'approved', 'completed', 'complete', 'aprovado', 'pago', 'concluido', 'concluído']);

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString();
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method === 'GET' || req.method === 'HEAD') {
    return json({ success: true, service: 'webhook-unificado' });
  }
  if (req.method !== 'POST') return json({ success: false, error: 'Método não permitido' }, 405);

  try {
    const rawBody = await req.text();
    let body: unknown = null;
    try {
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      return json({ success: true, ignored: true, reason: 'Verificação recebida sem compra' });
    }

    const possiblePayload = body && typeof body === 'object' ? body as Record<string, unknown> : null;
    const isSetupCheck = !possiblePayload
      || (!possiblePayload.payment && !possiblePayload.customer && !possiblePayload.product);
    if (isSetupCheck) {
      return json({ success: true, ignored: true, reason: 'Verificação do webhook concluída' });
    }

    const expectedSecret = Deno.env.get('GGCHECKOUT_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!expectedSecret || !supabaseUrl || !serviceKey) return json({ success: false, error: 'Configuração indisponível' }, 503);

    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const providedSecret = req.headers.get('x-secret') || bearer;
    if (!providedSecret || !isAuthorized(providedSecret, expectedSecret)) {
      return json({ success: false, error: 'Notificação não autorizada' }, 401);
    }

    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      console.warn('Payload GGCheckout rejeitado:', parsed.error.flatten().fieldErrors);
      return json({ success: true, ignored: true, reason: 'Notificação incompleta' });
    }

    const payload = parsed.data;
    const event = String(payload.event || '').toLowerCase().trim();
    const status = String(payload.payment.status).toLowerCase().trim();
    if (!approvedStatuses.has(status) || (event && !approvedEvents.has(event))) {
      return json({ success: true, ignored: true, reason: 'Pagamento não aprovado' });
    }

    const productIds = [...new Set([payload.product.id, ...(payload.products || []).map((product) => product.id)])];
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: mappings, error: mappingError } = await supabase
      .from('checkout_product_mappings')
      .select('id, external_product_id, product_name, grant_type, content_id, duration_days')
      .in('external_product_id', productIds)
      .eq('is_active', true);

    if (mappingError) throw mappingError;
    const recognized = (mappings || []) as ProductMapping[];
    if (recognized.length === 0) return json({ success: true, ignored: true, reason: 'Produto não cadastrado' });

    const email = payload.customer.email.toLowerCase().trim();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, subscription_end_date, adult_access_end_date')
      .eq('email', email)
      .maybeSingle();
    if (profileError) throw profileError;

    const now = new Date();
    let processed = 0;
    let repeated = 0;
    for (const mapping of recognized) {
      const webhookType = mapping.grant_type === 'vip' ? 'annual' : mapping.grant_type;
      const { data: existingWebhook, error: existingError } = await supabase
        .from('purchase_webhooks')
        .select('id, processed')
        .eq('transaction_id', payload.payment.id)
        .eq('external_product_id', mapping.external_product_id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existingWebhook) {
        repeated += 1;
        continue;
      }

      const { data: webhook, error: webhookError } = await supabase
        .from('purchase_webhooks')
        .insert({
          webhook_type: webhookType,
          buyer_email: email,
          buyer_name: payload.customer.name || null,
          buyer_phone: payload.customer.phone || null,
          buyer_document: payload.customer.document || null,
          external_product_id: mapping.external_product_id,
          product_id: mapping.content_id || mapping.external_product_id,
          product_name: mapping.product_name,
          transaction_id: payload.payment.id,
          payment_method: payload.payment.paymentMethod || payload.payment.method || null,
          payment_status: status,
          amount: payload.payment.amount || null,
          currency: 'BRL',
          raw_data: payload,
          processed: false,
          user_id: profile?.user_id || null,
        })
        .select('id, processed')
        .single();

      if (webhookError) throw webhookError;
      if (!profile?.user_id) continue;

      if (mapping.grant_type === 'single_content') {
        if (!mapping.content_id) throw new Error(`Mapeamento avulso sem conteúdo: ${mapping.external_product_id}`);
        const { error } = await supabase.from('user_content_purchases').upsert({
          user_id: profile.user_id,
          content_id: mapping.content_id,
          purchased_at: now.toISOString(),
          is_lifetime: true,
          transaction_id: payload.payment.id,
          webhook_id: webhook.id,
        }, { onConflict: 'user_id,content_id' });
        if (error) throw error;
      } else {
        const days = mapping.duration_days || (mapping.grant_type === 'monthly' ? 30 : 365);
        const currentSubscriptionEnd = profile.subscription_end_date && new Date(profile.subscription_end_date) > now
          ? new Date(profile.subscription_end_date)
          : now;
        const currentAdultEnd = profile.adult_access_end_date && new Date(profile.adult_access_end_date) > now
          ? new Date(profile.adult_access_end_date)
          : now;
        const update: Record<string, unknown> = {};

        if (mapping.grant_type === 'adult') {
          update.has_adult_access = true;
          update.adult_access_start_date = now.toISOString();
          update.adult_access_end_date = mapping.duration_days ? addDays(currentAdultEnd, days) : null;
        } else {
          update.subscription_status = 'active';
          update.plan_type = mapping.grant_type === 'monthly' ? 'monthly' : 'annual';
          update.subscription_start_date = now.toISOString();
          update.subscription_end_date = addDays(currentSubscriptionEnd, days);
          if (mapping.grant_type === 'vip') {
            update.is_vip = true;
            update.has_adult_access = true;
            update.adult_access_start_date = now.toISOString();
            update.adult_access_end_date = addDays(currentAdultEnd, days);
          }
        }
        const { error } = await supabase.from('profiles').update(update).eq('user_id', profile.user_id);
        if (error) throw error;
      }

      const { error: markError } = await supabase.from('purchase_webhooks').update({
        processed: true,
        processed_at: now.toISOString(),
        user_id: profile.user_id,
      }).eq('id', webhook.id);
      if (markError) throw markError;
      processed += 1;
    }

    return json({ success: true, processed, pending_registration: !profile?.user_id, repeated });
  } catch (error) {
    console.error('Erro no webhook unificado:', error instanceof Error ? error.message : 'Erro desconhecido');
    return json({ success: false, error: 'Falha temporária ao registrar a compra' }, 500);
  }
});
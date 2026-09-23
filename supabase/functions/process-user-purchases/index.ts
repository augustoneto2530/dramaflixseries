import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.24.2';

const BodySchema = z.object({
  email: z.string().email().max(320),
  userId: z.string().uuid().optional(),
});

type PendingPurchase = {
  id: string;
  external_product_id: string | null;
  transaction_id: string | null;
  payment_status: string | null;
};

type ProductMapping = {
  external_product_id: string;
  grant_type: 'monthly' | 'annual' | 'vip' | 'adult' | 'single_content';
  content_id: string | null;
  duration_days: number | null;
};

const approvedStatuses = new Set(['approved', 'paid', 'completed', 'complete', 'aprovado', 'pago', 'concluido', 'concluído']);

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
  if (req.method !== 'POST') return json({ success: false, error: 'Método não permitido' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey) return json({ success: false, error: 'Configuração indisponível' }, 503);

    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ success: false, error: 'Não autenticado' }, 401);

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user?.email) return json({ success: false, error: 'Sessão inválida' }, 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ success: false, error: 'Dados inválidos' }, 400);

    const userId = authData.user.id;
    const email = parsed.data.email.toLowerCase().trim();
    if (email !== authData.user.email.toLowerCase().trim() || (parsed.data.userId && parsed.data.userId !== userId)) {
      return json({ success: false, error: 'Usuário não autorizado' }, 403);
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: pending, error: pendingError } = await supabase
      .from('purchase_webhooks')
      .select('id, external_product_id, transaction_id, payment_status')
      .eq('buyer_email', email)
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(200);
    if (pendingError) throw pendingError;

    const approved = ((pending || []) as PendingPurchase[]).filter((purchase) => approvedStatuses.has(String(purchase.payment_status || '').toLowerCase().trim()));
    const productIds = [...new Set(approved.map((purchase) => purchase.external_product_id).filter((id): id is string => Boolean(id)))];
    if (productIds.length === 0) return json({ success: true, processed: 0, message: 'Nenhuma compra pendente reconhecida' });

    const { data: mappings, error: mappingError } = await supabase
      .from('checkout_product_mappings')
      .select('external_product_id, grant_type, content_id, duration_days')
      .in('external_product_id', productIds)
      .eq('is_active', true);
    if (mappingError) throw mappingError;

    const mappingByProduct = new Map(((mappings || []) as ProductMapping[]).map((mapping) => [mapping.external_product_id, mapping]));
    let processedCount = 0;

    for (const purchase of approved) {
      const mapping = purchase.external_product_id ? mappingByProduct.get(purchase.external_product_id) : undefined;
      if (!mapping) continue;

      const now = new Date();
      if (mapping.grant_type === 'single_content') {
        if (!mapping.content_id) continue;
        const { error } = await supabase.from('user_content_purchases').upsert({
          user_id: userId,
          content_id: mapping.content_id,
          purchased_at: now.toISOString(),
          is_lifetime: true,
          transaction_id: purchase.transaction_id,
          webhook_id: purchase.id,
        }, { onConflict: 'user_id,content_id' });
        if (error) throw error;
      } else {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_end_date, adult_access_end_date')
          .eq('user_id', userId)
          .single();
        if (profileError) throw profileError;

        const days = mapping.duration_days || (mapping.grant_type === 'monthly' ? 30 : 365);
        const subscriptionBase = profile.subscription_end_date && new Date(profile.subscription_end_date) > now ? new Date(profile.subscription_end_date) : now;
        const adultBase = profile.adult_access_end_date && new Date(profile.adult_access_end_date) > now ? new Date(profile.adult_access_end_date) : now;
        const update: Record<string, unknown> = {};

        if (mapping.grant_type === 'adult') {
          update.has_adult_access = true;
          update.adult_access_start_date = now.toISOString();
          update.adult_access_end_date = mapping.duration_days ? addDays(adultBase, days) : null;
        } else {
          update.subscription_status = 'active';
          update.plan_type = mapping.grant_type === 'monthly' ? 'monthly' : 'annual';
          update.subscription_start_date = now.toISOString();
          update.subscription_end_date = addDays(subscriptionBase, days);
          if (mapping.grant_type === 'vip') {
            update.is_vip = true;
            update.has_adult_access = true;
            update.adult_access_start_date = now.toISOString();
            update.adult_access_end_date = addDays(adultBase, days);
          }
        }

        const { error } = await supabase.from('profiles').update(update).eq('user_id', userId);
        if (error) throw error;
      }

      const { error: markError } = await supabase.from('purchase_webhooks').update({
        processed: true,
        processed_at: now.toISOString(),
        user_id: userId,
      }).eq('id', purchase.id);
      if (markError) throw markError;
      processedCount += 1;
    }

    return json({ success: true, processed: processedCount, message: `${processedCount} compra(s) processada(s)` });
  } catch (error) {
    console.error('Erro ao processar compras:', error instanceof Error ? error.message : 'Erro desconhecido');
    return json({ success: false, error: 'Erro temporário ao processar compras' }, 500);
  }
});
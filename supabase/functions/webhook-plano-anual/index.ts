import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANNUAL_PRODUCT_IDS = new Set(['hC8p7LrFbb9yCRdIVLnS']);
const isApprovedPayment = (status: unknown) =>
  ['approved', 'paid', 'completed', 'complete', 'aprovado', 'pago', 'concluido', 'concluído']
    .includes(String(status || '').toLowerCase().trim());

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
    const transactionId = payload.payment?.id || payload.transaction?.id || 
                          payload.purchase?.transaction ||
                          payload.data?.transaction?.id ||
                          payload.transaction_id ||
                          payload.id;

    const amount = payload.payment?.amount || payload.purchase?.price?.value || 
                   payload.transaction?.amount ||
                   payload.data?.purchase?.price?.value ||
                   payload.amount ||
                   payload.value;

    const paymentStatus = payload.payment?.status || payload.purchase?.status || 
                          payload.transaction?.status ||
                          payload.data?.purchase?.status ||
                          payload.status ||
                          '';
    const productId = payload.product?.id || payload.products?.[0]?.id || payload.product_id || payload.data?.product?.id || '';

    if (!buyerEmail) {
      console.error('Email do comprador não encontrado no payload');
      return new Response(
        JSON.stringify({ error: 'Email do comprador é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isApprovedPayment(paymentStatus) || !ANNUAL_PRODUCT_IDS.has(String(productId))) {
      return new Response(JSON.stringify({ success: true, ignored: true, reason: 'Pagamento não aprovado ou produto incorreto' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

    const emailNormalized = buyerEmail.toLowerCase().trim();
    let userId: string | null = null;

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('email', emailNormalized)
      .maybeSingle();

    if (existingProfile?.user_id) {
      userId = existingProfile.user_id;
    } else {
      const tempPassword = crypto.randomUUID();
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

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: emailNormalized,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: buyerName }
      });

      if (createError) {
        console.error('Erro ao criar usuário:', createError);
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .ilike('email', emailNormalized)
          .maybeSingle();
        if (retryProfile?.user_id) {
          userId = retryProfile.user_id;
        } else {
          throw createError;
        }
      } else {
        userId = newUser.user.id;
        await new Promise(r => setTimeout(r, 800));
      }
    }

    if (!userId) throw new Error('Não foi possível resolver userId');

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

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
    console.log('Webhook anual recebido:', JSON.stringify(rawData));

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
        webhook_type: 'annual',
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
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
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
        user_metadata: { full_name: buyerName },
      });


      if (createError) {
        console.error('Erro ao criar usuário:', createError);
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .ilike('email', emailNormalized)
          .maybeSingle();
        if (retryProfile?.user_id) userId = retryProfile.user_id;
      } else if (newUser?.user) {
        userId = newUser.user.id;
        await new Promise(r => setTimeout(r, 800));
      }
    }

    if (userId) {
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          plan_type: 'annual',
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: endDate.toISOString(),
          full_name: buyerName || undefined,
        })
        .eq('user_id', userId);

      if (updateError) console.error('Erro ao atualizar perfil:', updateError);

      await supabase
        .from('purchase_webhooks')
        .update({ processed: true, processed_at: new Date().toISOString(), user_id: userId })
        .eq('id', webhookData.id);

      console.log('Plano anual ativado:', emailNormalized);
    } else {
      console.error('Não foi possível resolver userId para:', emailNormalized);
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

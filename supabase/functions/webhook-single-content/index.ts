import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get content_id from URL params
    const url = new URL(req.url);
    const contentId = url.searchParams.get('content_id');

    const rawData = await req.json();
    console.log('Webhook conteúdo único recebido:', JSON.stringify(rawData, null, 2));
    console.log('Content ID:', contentId);

    // Extract buyer email from various formats
    const buyerEmail = rawData.buyer_email || 
                       rawData.email || 
                       rawData.customer?.email ||
                       rawData.data?.buyer?.email ||
                       rawData.data?.customer?.email ||
                       rawData.contact?.email;

    if (!buyerEmail) {
      console.error('Email do comprador não encontrado no webhook');
      return new Response(
        JSON.stringify({ error: 'buyer_email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contentId) {
      console.error('Content ID não fornecido');
      return new Response(
        JSON.stringify({ error: 'content_id is required in URL params' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify content exists
    const { data: content, error: contentError } = await supabase
      .from('contents')
      .select('id, title')
      .eq('id', contentId)
      .single();

    if (contentError || !content) {
      console.error('Conteúdo não encontrado:', contentId);
      return new Response(
        JSON.stringify({ error: 'Content not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract other data with fallbacks
    const buyerName = rawData.buyer_name || 
                      rawData.name ||
                      rawData.customer?.name ||
                      rawData.data?.buyer?.name ||
                      `${rawData.first_name || ''} ${rawData.last_name || ''}`.trim() ||
                      null;

    const buyerPhone = rawData.buyer_phone || 
                       rawData.phone ||
                       rawData.customer?.phone ||
                       rawData.data?.buyer?.phone ||
                       null;

    const buyerDocument = rawData.buyer_document ||
                          rawData.document ||
                          rawData.cpf ||
                          rawData.customer?.document ||
                          null;

    const amount = rawData.payment?.amount || rawData.amount || 
                   rawData.value ||
                   rawData.purchase?.value ||
                   rawData.data?.purchase?.value ||
                   null;

    const transactionId = rawData.payment?.id || rawData.transaction_id ||
                          rawData.transaction ||
                          rawData.purchase_id ||
                          rawData.order_id ||
                          rawData.data?.purchase?.transaction ||
                          null;

    const paymentStatus = rawData.payment?.status || rawData.payment_status ||
                          rawData.status ||
                          '';
    const approvedStatuses = ['approved', 'paid', 'completed', 'complete', 'aprovado', 'pago', 'concluido', 'concluído'];
    if (!approvedStatuses.includes(String(paymentStatus).toLowerCase().trim())) {
      return new Response(JSON.stringify({ success: true, ignored: true, reason: 'Pagamento ainda não aprovado' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Save webhook data
    const { data: webhookData, error: webhookError } = await supabase
      .from('purchase_webhooks')
      .insert({
        webhook_type: 'single_content',
        buyer_email: buyerEmail.toLowerCase().trim(),
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        buyer_document: buyerDocument,
        amount: amount,
        transaction_id: transactionId,
        product_id: contentId,
        product_name: content.title,
        payment_method: rawData.payment_method || null,
        payment_status: paymentStatus,
        raw_data: rawData,
        processed: false,
      })
      .select()
      .single();

    if (webhookError) {
      console.error('Erro ao salvar webhook:', webhookError);
      return new Response(
        JSON.stringify({ error: 'Failed to save webhook', details: webhookError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook salvo:', webhookData.id);

    // Check if user exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', buyerEmail.toLowerCase().trim())
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.user_id;
      console.log('Usuário existente encontrado:', userId);
    } else {
      // Create new user
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

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: buyerEmail.toLowerCase().trim(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: buyerName,
          phone: buyerPhone,
        },
      });


      if (createError) {
        console.error('Erro ao criar usuário:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user', details: createError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user!.id;
      console.log('Novo usuário criado:', userId);

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update profile
      await supabase
        .from('profiles')
        .update({ full_name: buyerName })
        .eq('user_id', userId);
    }

    // Add content purchase
    const { data: purchase, error: purchaseError } = await supabase
      .from('user_content_purchases')
      .upsert({
        user_id: userId,
        content_id: contentId,
        purchased_at: new Date().toISOString(),
        is_lifetime: true,
        transaction_id: transactionId,
        webhook_id: webhookData.id,
      }, {
        onConflict: 'user_id,content_id'
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Erro ao registrar compra:', purchaseError);
    } else {
      console.log('Compra registrada:', purchase.id);
    }

    // Mark webhook as processed
    await supabase
      .from('purchase_webhooks')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        user_id: userId,
      })
      .eq('id', webhookData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        webhook_id: webhookData.id,
        content_title: content.title,
        user_id: userId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Erro no webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

    const rawData = await req.json();
    console.log('Webhook +18 recebido:', JSON.stringify(rawData, null, 2));

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

    const amount = rawData.amount || 
                   rawData.value ||
                   rawData.purchase?.value ||
                   rawData.data?.purchase?.value ||
                   null;

    const transactionId = rawData.transaction_id ||
                          rawData.transaction ||
                          rawData.purchase_id ||
                          rawData.order_id ||
                          rawData.data?.purchase?.transaction ||
                          null;

    const productId = rawData.product_id ||
                      rawData.product?.id ||
                      rawData.data?.product?.id ||
                      null;

    const productName = rawData.product_name ||
                        rawData.product?.name ||
                        rawData.data?.product?.name ||
                        'Acesso +18';

    const paymentMethod = rawData.payment_method ||
                          rawData.payment?.method ||
                          rawData.data?.payment?.method ||
                          null;

    const paymentStatus = rawData.payment_status ||
                          rawData.status ||
                          rawData.payment?.status ||
                          'approved';

    // Save webhook data
    const { data: webhookData, error: webhookError } = await supabase
      .from('purchase_webhooks')
      .insert({
        webhook_type: 'adult',
        buyer_email: buyerEmail.toLowerCase().trim(),
        buyer_name: buyerName,
        buyer_phone: buyerPhone,
        buyer_document: buyerDocument,
        amount: amount,
        transaction_id: transactionId,
        product_id: productId,
        product_name: productName,
        payment_method: paymentMethod,
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
      .eq('email', buyerEmail.toLowerCase().trim())
      .single();

    if (existingProfile) {
      // Update existing user with adult access
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          has_adult_access: true,
          adult_access_start_date: new Date().toISOString(),
          adult_access_end_date: null, // Lifetime access
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', existingProfile.user_id);

      if (updateError) {
        console.error('Erro ao atualizar perfil:', updateError);
      } else {
        console.log('Acesso +18 ativado para usuário existente:', existingProfile.email);
      }

      // Mark webhook as processed
      await supabase
        .from('purchase_webhooks')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          user_id: existingProfile.user_id,
        })
        .eq('id', webhookData.id);
    } else {
      // Create new user with adult access
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

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
      } else if (newUser.user) {
        console.log('Novo usuário criado:', newUser.user.id);

        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update the profile with adult access
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            full_name: buyerName,
            has_adult_access: true,
            adult_access_start_date: new Date().toISOString(),
            adult_access_end_date: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', newUser.user.id);

        if (profileUpdateError) {
          console.error('Erro ao atualizar perfil do novo usuário:', profileUpdateError);
        }

        // Mark webhook as processed
        await supabase
          .from('purchase_webhooks')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            user_id: newUser.user.id,
          })
          .eq('id', webhookData.id);

        console.log('Acesso +18 ativado para novo usuário');
      }
    }

    return new Response(
      JSON.stringify({ success: true, webhook_id: webhookData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Erro no webhook +18:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

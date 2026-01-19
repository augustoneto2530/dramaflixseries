import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, userId } = await req.json();

    if (!email || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email e userId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    console.log('Processing purchases for user:', trimmedEmail, userId);

    // Find all webhooks for this email that need processing
    const { data: webhooks, error: webhookError } = await supabase
      .from('purchase_webhooks')
      .select('*')
      .eq('buyer_email', trimmedEmail);

    if (webhookError) {
      console.error('Error fetching webhooks:', webhookError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar compras' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!webhooks || webhooks.length === 0) {
      console.log('No webhooks found for email:', trimmedEmail);
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma compra pendente', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found webhooks:', webhooks.length);

    let processedCount = 0;
    const now = new Date();

    for (const webhook of webhooks) {
      try {
        // Update webhook with user_id if not set
        if (!webhook.user_id) {
          await supabase
            .from('purchase_webhooks')
            .update({ user_id: userId })
            .eq('id', webhook.id);
        }

        const rawData = webhook.raw_data || {};
        const planType = webhook.webhook_type;

        // Handle single_content purchases
        if (planType === 'single_content') {
          const contentId = rawData.content_id || webhook.product_id;
          
          if (contentId) {
            console.log('Processing single_content purchase for content:', contentId);
            
            // Check if purchase already exists
            const { data: existingPurchase } = await supabase
              .from('user_content_purchases')
              .select('id')
              .eq('user_id', userId)
              .eq('content_id', contentId)
              .single();

            if (!existingPurchase) {
              // Create content purchase entry
              const { error: purchaseError } = await supabase
                .from('user_content_purchases')
                .insert({
                  user_id: userId,
                  content_id: contentId,
                  is_lifetime: true,
                  webhook_id: webhook.id,
                });

              if (purchaseError) {
                console.error('Error creating content purchase:', purchaseError);
              } else {
                console.log('Content purchase created successfully');
                processedCount++;
              }
            } else {
              console.log('Purchase already exists, skipping');
            }
          }
        }

        // Handle subscription plans (monthly, annual, adult)
        if (['monthly', 'annual', 'adult'].includes(planType)) {
          const endDate = new Date(now);
          
          if (planType === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
          } else if (planType === 'annual' || planType === 'adult') {
            endDate.setFullYear(endDate.getFullYear() + 1);
          }

          const profileUpdate: Record<string, any> = {
            subscription_status: 'active',
            plan_type: planType,
            subscription_start_date: now.toISOString(),
            subscription_end_date: endDate.toISOString(),
          };

          // Add adult access if applicable
          if (planType === 'annual' || planType === 'adult' || rawData.include_adult_access) {
            profileUpdate.has_adult_access = true;
            profileUpdate.adult_access_start_date = now.toISOString();
            profileUpdate.adult_access_end_date = endDate.toISOString();
          }

          // Check if VIP (from webhook-plano-vip or raw_data)
          if (rawData.is_vip || rawData.grant_vip) {
            profileUpdate.is_vip = true;
          }

          await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('user_id', userId);

          processedCount++;
          console.log('Profile subscription updated');
        }

        // Mark webhook as processed if not already
        if (!webhook.processed) {
          await supabase
            .from('purchase_webhooks')
            .update({
              processed: true,
              processed_at: now.toISOString(),
              user_id: userId,
            })
            .eq('id', webhook.id);
        }
      } catch (err) {
        console.error('Error processing webhook:', webhook.id, err);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${processedCount} compra(s) processada(s)`,
        processed: processedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

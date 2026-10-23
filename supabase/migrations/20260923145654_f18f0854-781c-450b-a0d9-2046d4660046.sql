INSERT INTO public.checkout_product_mappings (external_product_id, product_name, grant_type, content_id, duration_days, is_active)
SELECT 'DdDZosKap9UaVb8SCgEd', 'O Pai do meu namorado, meu pecado!', 'single_content', '6084c12a-635e-4feb-b62c-db1eb68f3acf'::uuid, NULL, true
WHERE EXISTS (SELECT 1 FROM public.contents WHERE id = '6084c12a-635e-4feb-b62c-db1eb68f3acf')
ON CONFLICT (external_product_id) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  grant_type = EXCLUDED.grant_type,
  content_id = EXCLUDED.content_id,
  duration_days = EXCLUDED.duration_days,
  is_active = true,
  updated_at = now();

WITH buyer AS (
  SELECT user_id
  FROM public.profiles
  WHERE lower(email) = lower('rafael@romseguros.com.br')
  LIMIT 1
), recorded AS (
  INSERT INTO public.purchase_webhooks (
    webhook_type, buyer_email, buyer_name, buyer_phone, buyer_document,
    external_product_id, product_id, product_name, transaction_id,
    payment_method, payment_status, amount, currency, raw_data,
    processed, processed_at, user_id
  )
  SELECT
    'single_content'::public.plan_type,
    'rafael@romseguros.com.br', 'Rafael', '5531999837043', '739.998.511-12',
    'DdDZosKap9UaVb8SCgEd', '6084c12a-635e-4feb-b62c-db1eb68f3acf',
    'O Pai do meu namorado, meu pecado!', 'fefe89c2-0fe2-4e8e-9c01-7e1aae3ed677',
    'pix', 'paid', 5, 'BRL',
    jsonb_build_object('recovered_from', 'verified_edge_function_log', 'event', 'pix.paid'),
    true, now(), buyer.user_id
  FROM buyer
  ON CONFLICT DO NOTHING
  RETURNING id, user_id
)
INSERT INTO public.user_content_purchases (
  user_id, content_id, purchased_at, is_lifetime, transaction_id, webhook_id
)
SELECT
  recorded.user_id, '6084c12a-635e-4feb-b62c-db1eb68f3acf', now(), true,
  'fefe89c2-0fe2-4e8e-9c01-7e1aae3ed677', recorded.id
FROM recorded
ON CONFLICT (user_id, content_id) DO UPDATE SET
  purchased_at = EXCLUDED.purchased_at,
  is_lifetime = true,
  transaction_id = EXCLUDED.transaction_id,
  webhook_id = EXCLUDED.webhook_id;
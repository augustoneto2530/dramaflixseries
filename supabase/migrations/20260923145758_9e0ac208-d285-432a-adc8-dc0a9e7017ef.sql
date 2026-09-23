INSERT INTO public.purchase_webhooks (
  webhook_type, buyer_email, buyer_name, buyer_phone, buyer_document,
  external_product_id, product_id, product_name, transaction_id,
  payment_method, payment_status, amount, currency, raw_data,
  processed, processed_at, user_id
)
VALUES (
  'single_content'::public.plan_type,
  'rafael@romseguros.com.br', 'Rafael', '5531999837043', '739.998.511-12',
  'DdDZosKap9UaVb8SCgEd', '6084c12a-635e-4feb-b62c-db1eb68f3acf',
  'O Pai do meu namorado, meu pecado!', 'fefe89c2-0fe2-4e8e-9c01-7e1aae3ed677',
  'pix', 'paid', 5, 'BRL',
  jsonb_build_object('recovered_from', 'verified_edge_function_log', 'event', 'pix.paid'),
  false, NULL, NULL
)
ON CONFLICT DO NOTHING;
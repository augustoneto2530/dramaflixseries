INSERT INTO public.user_content_purchases (user_id, content_id, is_lifetime, webhook_id)
SELECT DISTINCT ON (p.user_id, w.product_id::uuid) p.user_id, w.product_id::uuid, true, w.id
FROM public.purchase_webhooks w
JOIN public.profiles p ON p.email = w.buyer_email
JOIN public.contents c ON c.id = w.product_id::uuid
WHERE w.processed = false
  AND w.webhook_type = 'single_content'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_content_purchases u
    WHERE u.user_id = p.user_id AND u.content_id = w.product_id::uuid
  );

UPDATE public.purchase_webhooks w
SET processed = true, processed_at = now(), user_id = p.user_id
FROM public.profiles p
WHERE p.email = w.buyer_email
  AND w.processed = false
  AND (
    (w.webhook_type = 'adult' AND p.has_adult_access = true)
    OR (w.webhook_type = 'single_content' AND EXISTS (
      SELECT 1 FROM public.user_content_purchases u
      WHERE u.user_id = p.user_id AND u.content_id::text = w.product_id
    ))
  );
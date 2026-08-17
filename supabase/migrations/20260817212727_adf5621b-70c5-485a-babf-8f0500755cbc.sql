-- Libera acesso +18 e anual para compradores com conta cujo webhook ficou pendente
UPDATE public.profiles p
SET has_adult_access = true,
    adult_access_start_date = COALESCE(p.adult_access_start_date, now()),
    adult_access_end_date = GREATEST(COALESCE(p.adult_access_end_date, now()), now() + interval '1 year'),
    subscription_status = CASE WHEN p.subscription_status = 'active' THEN p.subscription_status ELSE 'active' END,
    plan_type = COALESCE(p.plan_type, 'adult'),
    subscription_start_date = COALESCE(p.subscription_start_date, now()),
    subscription_end_date = GREATEST(COALESCE(p.subscription_end_date, now()), now() + interval '1 year'),
    updated_at = now()
FROM public.purchase_webhooks w
WHERE NOT w.processed
  AND w.webhook_type = 'adult'
  AND lower(w.buyer_email) = lower(p.email);

UPDATE public.profiles p
SET is_vip = true,
    plan_type = 'annual',
    subscription_status = 'active',
    has_adult_access = true,
    subscription_start_date = COALESCE(p.subscription_start_date, now()),
    subscription_end_date = GREATEST(COALESCE(p.subscription_end_date, now()), now() + interval '1 year'),
    adult_access_end_date = GREATEST(COALESCE(p.adult_access_end_date, now()), now() + interval '1 year'),
    updated_at = now()
FROM public.purchase_webhooks w
WHERE NOT w.processed
  AND w.webhook_type = 'annual'
  AND lower(w.buyer_email) = lower(p.email);

UPDATE public.purchase_webhooks w
SET processed = true,
    processed_at = now(),
    user_id = COALESCE(w.user_id, p.user_id)
FROM public.profiles p
WHERE NOT w.processed
  AND lower(w.buyer_email) = lower(p.email);
CREATE TABLE public.checkout_product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_product_id text NOT NULL UNIQUE,
  product_name text NOT NULL,
  grant_type text NOT NULL CHECK (grant_type IN ('monthly', 'annual', 'vip', 'adult', 'single_content')),
  content_id uuid REFERENCES public.contents(id) ON DELETE RESTRICT,
  duration_days integer CHECK (duration_days IS NULL OR duration_days > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT checkout_product_mapping_content_check CHECK ((grant_type = 'single_content' AND content_id IS NOT NULL) OR (grant_type <> 'single_content' AND content_id IS NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_product_mappings TO authenticated;
GRANT ALL ON public.checkout_product_mappings TO service_role;
ALTER TABLE public.checkout_product_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view checkout product mappings" ON public.checkout_product_mappings FOR SELECT TO authenticated USING ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "Admins can manage checkout product mappings" ON public.checkout_product_mappings FOR ALL TO authenticated USING ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE TRIGGER update_checkout_product_mappings_updated_at BEFORE UPDATE ON public.checkout_product_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.purchase_webhooks ADD COLUMN external_product_id text;
UPDATE public.purchase_webhooks SET external_product_id = COALESCE(NULLIF(raw_data #>> '{product,id}', ''), NULLIF(raw_data #>> '{data,product,id}', ''), NULLIF(product_id, '')) WHERE external_product_id IS NULL;
CREATE INDEX idx_purchase_webhooks_external_product_id ON public.purchase_webhooks(external_product_id);

WITH ranked AS (
 SELECT id, row_number() OVER (PARTITION BY transaction_id, external_product_id ORDER BY processed DESC, (user_id IS NOT NULL) DESC, processed_at DESC NULLS LAST, created_at ASC, id) rn
 FROM public.purchase_webhooks
 WHERE transaction_id IS NOT NULL AND transaction_id <> '' AND external_product_id IS NOT NULL AND external_product_id <> ''
), keepers AS (
 SELECT r.id duplicate_id, k.id keeper_id
 FROM ranked r
 JOIN public.purchase_webhooks rd ON rd.id=r.id
 JOIN public.purchase_webhooks kd ON kd.transaction_id=rd.transaction_id AND kd.external_product_id=rd.external_product_id
 JOIN ranked k ON k.id=kd.id AND k.rn=1
 WHERE r.rn>1
)
UPDATE public.user_content_purchases u SET webhook_id=k.keeper_id FROM keepers k WHERE u.webhook_id=k.duplicate_id;

WITH ranked AS (
 SELECT id, row_number() OVER (PARTITION BY transaction_id, external_product_id ORDER BY processed DESC, (user_id IS NOT NULL) DESC, processed_at DESC NULLS LAST, created_at ASC, id) rn
 FROM public.purchase_webhooks
 WHERE transaction_id IS NOT NULL AND transaction_id <> '' AND external_product_id IS NOT NULL AND external_product_id <> ''
)
DELETE FROM public.purchase_webhooks w USING ranked r WHERE w.id=r.id AND r.rn>1;

CREATE UNIQUE INDEX purchase_webhooks_transaction_product_unique ON public.purchase_webhooks(transaction_id, external_product_id) WHERE transaction_id IS NOT NULL AND transaction_id <> '' AND external_product_id IS NOT NULL AND external_product_id <> '';

UPDATE public.profiles SET subscription_status='inactive'::public.subscription_status, is_vip=false, has_adult_access=CASE WHEN adult_access_end_date IS NOT NULL AND adult_access_end_date<=now() THEN false ELSE has_adult_access END, updated_at=now() WHERE subscription_status='active'::public.subscription_status AND subscription_end_date IS NOT NULL AND subscription_end_date<=now();

REVOKE ALL ON FUNCTION public.get_auth_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_email(text) TO service_role;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.ensure_current_user_profile(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_email_purchase_info(text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_purchase_info(text) TO anon, service_role;
REVOKE ALL ON FUNCTION public.email_has_profile(text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.email_has_profile(text) TO anon, service_role;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() TO service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

ANALYZE public.checkout_product_mappings;
ANALYZE public.purchase_webhooks;
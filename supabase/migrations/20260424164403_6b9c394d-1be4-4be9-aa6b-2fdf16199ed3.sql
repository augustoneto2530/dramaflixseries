DO $$
DECLARE
  w RECORD;
  uid uuid;
  cid uuid;
  end_dt timestamptz;
BEGIN
  FOR w IN 
    SELECT id, buyer_email, buyer_name, webhook_type, product_id, raw_data, transaction_id 
    FROM purchase_webhooks 
    WHERE NOT processed 
  LOOP
    -- Buscar user_id pelo email (case-insensitive)
    SELECT user_id INTO uid FROM profiles WHERE LOWER(email) = LOWER(TRIM(w.buyer_email)) LIMIT 1;
    IF uid IS NULL THEN CONTINUE; END IF;
    
    IF w.webhook_type = 'monthly' THEN
      end_dt := now() + interval '1 month';
      UPDATE profiles SET 
        subscription_status='active', 
        plan_type='monthly', 
        subscription_start_date=now(), 
        subscription_end_date=end_dt, 
        full_name=COALESCE(full_name, w.buyer_name) 
      WHERE user_id=uid;
      
    ELSIF w.webhook_type = 'annual' THEN
      end_dt := now() + interval '1 year';
      UPDATE profiles SET 
        subscription_status='active', 
        plan_type='annual', 
        subscription_start_date=now(), 
        subscription_end_date=end_dt, 
        full_name=COALESCE(full_name, w.buyer_name) 
      WHERE user_id=uid;
      
    ELSIF w.webhook_type = 'adult' THEN
      end_dt := now() + interval '1 month';
      UPDATE profiles SET 
        has_adult_access=true, 
        adult_access_start_date=now(), 
        adult_access_end_date=end_dt 
      WHERE user_id=uid;
      
    ELSIF w.webhook_type = 'single_content' THEN
      -- Tentar resolver content_id
      cid := NULL;
      BEGIN
        cid := w.product_id::uuid;
      EXCEPTION WHEN OTHERS THEN
        cid := NULL;
      END;
      
      IF cid IS NOT NULL AND EXISTS (SELECT 1 FROM contents WHERE id = cid) THEN
        INSERT INTO user_content_purchases (user_id, content_id, purchased_at, is_lifetime, transaction_id, webhook_id)
        VALUES (uid, cid, now(), true, w.transaction_id, w.id)
        ON CONFLICT (user_id, content_id) DO NOTHING;
      ELSE
        -- não conseguiu resolver content_id, pular sem marcar processed
        CONTINUE;
      END IF;
    END IF;
    
    UPDATE purchase_webhooks 
    SET processed=true, processed_at=now(), user_id=uid 
    WHERE id=w.id;
  END LOOP;
END $$;

-- Garantir índice único em user_content_purchases para upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_content_purchases_unique 
ON user_content_purchases(user_id, content_id);
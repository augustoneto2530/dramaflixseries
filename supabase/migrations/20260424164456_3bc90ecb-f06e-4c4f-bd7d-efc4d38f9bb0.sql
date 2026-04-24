DO $$
DECLARE
  w RECORD;
  uid uuid;
  cid uuid;
  title_extracted text;
BEGIN
  FOR w IN 
    SELECT id, buyer_email, product_id, product_name, transaction_id 
    FROM purchase_webhooks 
    WHERE NOT processed AND webhook_type = 'single_content'
  LOOP
    -- buscar user
    SELECT user_id INTO uid FROM profiles WHERE LOWER(email) = LOWER(TRIM(w.buyer_email)) LIMIT 1;
    IF uid IS NULL THEN CONTINUE; END IF;

    cid := NULL;

    -- 1) tentar por product_id
    IF w.product_id IS NOT NULL THEN
      BEGIN
        cid := w.product_id::uuid;
        IF NOT EXISTS (SELECT 1 FROM contents WHERE id = cid) THEN cid := NULL; END IF;
      EXCEPTION WHEN OTHERS THEN cid := NULL;
      END;
    END IF;

    -- 2) tentar extrair título do product_name
    IF cid IS NULL AND w.product_name IS NOT NULL THEN
      title_extracted := w.product_name;
      -- remover prefixos comuns
      title_extracted := regexp_replace(title_extracted, '^Conteúdo Avulso:\s*', '', 'i');
      title_extracted := regexp_replace(title_extracted, '\s*\(Adicionado pelo Admin\)\s*$', '', 'i');
      title_extracted := TRIM(title_extracted);
      
      SELECT id INTO cid FROM contents WHERE UPPER(title) = UPPER(title_extracted) LIMIT 1;
      IF cid IS NULL THEN
        SELECT id INTO cid FROM contents WHERE title ILIKE '%' || title_extracted || '%' LIMIT 1;
      END IF;
    END IF;

    IF cid IS NULL THEN CONTINUE; END IF;

    INSERT INTO user_content_purchases (user_id, content_id, purchased_at, is_lifetime, transaction_id, webhook_id)
    VALUES (uid, cid, now(), true, w.transaction_id, w.id)
    ON CONFLICT (user_id, content_id) DO NOTHING;

    UPDATE purchase_webhooks SET processed=true, processed_at=now(), user_id=uid WHERE id=w.id;
  END LOOP;
END $$;
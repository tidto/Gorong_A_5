ALTER TABLE gorong_schema.review
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'REVIEW_ONLY',
    ADD COLUMN IF NOT EXISTS review_text TEXT;

ALTER TABLE gorong_schema.review_image
    ADD COLUMN IF NOT EXISTS originalimgname TEXT,
    ADD COLUMN IF NOT EXISTS saveimgname TEXT,
    ADD COLUMN IF NOT EXISTS display_order INTEGER;

UPDATE gorong_schema.review
SET review_text = COALESCE(review_text, title)
WHERE review_text IS NULL;

UPDATE gorong_schema.review
SET status = 'PUBLISHED'
WHERE content IS NOT NULL
  AND BTRIM(content) <> '';

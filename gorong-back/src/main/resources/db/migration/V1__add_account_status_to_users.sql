ALTER TABLE gorong_schema.users
    ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'ACTIVE';


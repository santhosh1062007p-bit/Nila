-- Nila's Treat Migration 0002: User Profiles & Rich Delivery Addresses
-- Safely adds user_profiles table and structured address fields without breaking existing records.

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IS NULL OR gender IN ('female', 'male', 'other', 'prefer_not_to_say')),
  notify_order_updates BOOLEAN NOT NULL DEFAULT TRUE,
  notify_promotions BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE addresses ADD COLUMN IF NOT EXISTS alternate_phone TEXT;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS house_no TEXT;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS street_name TEXT;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS area_locality TEXT;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS district TEXT DEFAULT 'Theni';
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS address_type TEXT NOT NULL DEFAULT 'Home' CHECK (address_type IN ('Home', 'Work', 'Other'));
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS addresses_user_default_idx ON addresses (user_id, is_default);

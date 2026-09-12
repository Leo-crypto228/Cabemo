-- ============================================================
-- CADEMO — Schéma d'affiliation (à exécuter dans Supabase SQL Editor)
-- ============================================================

-- 1. Fonction de génération d'identifiant court unique (#0000-#9999)
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_id := '#' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    SELECT EXISTS(SELECT 1 FROM users WHERE short_id = new_id) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Colonnes nécessaires sur la table users existante
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS short_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS affiliate_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonus_activated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonus_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bonus_activated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_commissions NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_referrals INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_short_id ON users(short_id);
CREATE INDEX IF NOT EXISTS idx_users_affiliate_code ON users(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. Table des filleuls (referrals)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  bonus_activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(affiliate_id, referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_user ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- 4. Table des commissions (paliers 50€)
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  referral_count_at_trigger INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON affiliate_commissions(affiliate_id);

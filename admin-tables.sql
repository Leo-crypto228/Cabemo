-- ============================================
-- TABLES ADMIN POUR CADEMO BOT / IA
-- À exécuter dans l'éditeur SQL Supabase
-- ============================================

-- 1) Proxies (pool résidentiel / datacenter)
CREATE TABLE IF NOT EXISTS admin_proxies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host text NOT NULL,
  port int NOT NULL,
  username text,
  password text,
  country text DEFAULT 'FR',
  city text,
  max_accounts int DEFAULT 3,
  assigned_accounts int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2) Comptes Google validés pour le bot
--    (liés à la table users existante via user_id)
CREATE TABLE IF NOT EXISTS admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  proxy_id uuid REFERENCES admin_proxies(id) ON DELETE SET NULL,
  status text DEFAULT 'valid' CHECK (status IN ('valid', 'disconnected', 'blocked')),
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 3) Missions (instructions pour le bot)
CREATE TABLE IF NOT EXISTS admin_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('post_review', 'reply_review', 'scrape_reviews')),
  target_name text,
  target_url text,
  content text,
  rating int DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  account_ids uuid[],
  proxy_strategy text DEFAULT 'fixed_per_account' CHECK (proxy_strategy IN ('fixed_per_account', 'rotate_on_block')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'failed')),
  schedule_start timestamptz DEFAULT now(),
  end_date timestamptz,
  frequency text DEFAULT 'immediate' CHECK (frequency IN ('immediate', '1_per_hour', '3_per_day', 'random_spread')),
  total_tasks int DEFAULT 0,
  completed_tasks int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4) Logs d'exécution
CREATE TABLE IF NOT EXISTS admin_mission_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES admin_missions(id) ON DELETE CASCADE,
  account_id uuid REFERENCES admin_accounts(id) ON DELETE SET NULL,
  action text,
  status text NOT NULL CHECK (status IN ('success', 'blocked', 'captcha', 'failed')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Vue pratique : comptes prêts pour le bot (session active)
CREATE OR REPLACE VIEW admin_available_accounts AS
SELECT a.id AS admin_account_id,
       a.user_id,
       a.proxy_id,
       a.status AS bot_status,
       u.google_email,
       u.session_cookies,
       u.proxy_used,
       u.last_session_date
FROM admin_accounts a
LEFT JOIN users u ON a.user_id = u.id
WHERE a.status = 'valid' AND u.session_cookies IS NOT NULL;

-- Index pour perf du bot
CREATE INDEX IF NOT EXISTS idx_missions_status ON admin_missions(status);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON admin_accounts(status);
CREATE INDEX IF NOT EXISTS idx_logs_mission ON admin_mission_logs(mission_id);
CREATE INDEX IF NOT EXISTS idx_logs_account ON admin_mission_logs(account_id);

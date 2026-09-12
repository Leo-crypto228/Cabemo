-- ============================================
-- CRÉATION TABLE USERS (à exécuter dans Supabase SQL Editor)
-- ============================================

-- Supprime la table si elle existe déjà (attention aux données !)
DROP TABLE IF EXISTS users;

-- Crée la table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email principal de l'utilisateur sur ton site
  email TEXT,
  
  -- Mot de passe du compte Google (celui que l'utilisateur te donne)
  password TEXT,
  
  -- Email Google (souvent = email, mais pas toujours)
  google_email TEXT,
  
  -- Statut du compte
  status TEXT DEFAULT 'pending_validation',
  
  -- Cookies de session Google (chiffrés localement avant stockage)
  session_cookies JSONB,
  
  -- Fingerprint du navigateur (User-Agent, viewport, etc)
  session_fingerprint JSONB,
  
  -- Proxy utilisé pour ce compte
  proxy_used TEXT,
  
  -- Date de dernière session active
  last_session_date TIMESTAMPTZ,
  
  -- Date de création / mise à jour
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index sur le statut (pour rechercher rapidement les comptes en attente)
CREATE INDEX idx_users_status ON users(status);

-- Index sur l'email (recherche rapide)
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- IMPORTANT : DÉSACTIVER RLS POUR LA ANON_KEY
-- ============================================
-- La ANON_KEY (clé publique) ne peut pas lire/écrire
-- si Row Level Security est activé.
-- Si tu veux utiliser la ANON_KEY, exécute :

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Si tu préfères garder RLS activé (plus sécurisé),
-- il te faut la SERVICE_ROLE_KEY à la place.
-- Dans ce cas, ne désactive pas RLS et donne-moi la SERVICE_ROLE_KEY.

-- ============================================
-- EXEMPLE : Insérer un utilisateur de test
-- ============================================
-- INSERT INTO users (email, password, google_email, status)
-- VALUES ('test@example.com', 'motdepassetest123', 'test@gmail.com', 'pending_validation');
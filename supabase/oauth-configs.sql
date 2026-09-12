-- =========================================================================
-- Cademo — table pour stocker les configs OAuth (refresh_tokens chiffrés).
-- À exécuter dans Supabase → SQL Editor si tu utilises CONFIG_STORE=pg.
--
-- Le secret n'est JAMAIS en clair ici : il est chiffré côté serveur par
-- config-store.js avec MASTER_KEY (voir api/.env). La colonne secret
-- contient un JSON de la forme { v, iv, tag, ct }.
-- =========================================================================

create table if not exists public.oauth_configs (
  email       text primary key,
  secret      jsonb not null,
  updated_at  timestamptz not null default now()
);

-- RLS activée : personne ne lit cette table depuis un client, jamais.
-- Seul le service_role (utilisé côté serveur par config-store.js) y accède.
alter table public.oauth_configs enable row level security;

-- Aucun policy select/insert/update pour anon ni authenticated : bloqué.
-- Le service_role bypass RLS par défaut, donc l'accès serveur reste ouvert.

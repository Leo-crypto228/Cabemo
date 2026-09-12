-- ═══════════════════════════════════════════════════════════════════════════
-- CADEMO  — Nettoyage des doublons dans public.users
-- ═══════════════════════════════════════════════════════════════════════════
-- Problème : des lignes doubles existent pour certains emails (ex. créées
--            avant le trigger) → getUserByEmail renvoyait une erreur PGRST116.
-- Action  : garde la ligne la plus complète pour chaque email, supprime le
--            reste.  EXÉCUTE dans Supabase → SQL Editor → New query.
-- ═══════════════════════════════════════════════════════════════════════════



-- Vérification rapide : doit retourner 0 ou un très petit nombre
-- SELECT COUNT(*) FROM (
--   SELECT email FROM public.users GROUP BY LOWER(email) HAVING COUNT(*) > 1
-- ) dupes;

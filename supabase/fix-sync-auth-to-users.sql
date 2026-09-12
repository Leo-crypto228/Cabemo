-- ================================================================
-- FIX : synchronisation automatique auth.users -> public.users
-- Ce trigger s'assure que chaque nouvel utilisateur Supabase Auth
-- a aussi une ligne dans public.users (affiliation + validation).
-- A EXECUTER dans l'éditeur SQL Supabase (ou via psql).
-- ================================================================

-- Fonction utilitaire de génération de short_id (idempotente)
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

-- Fonction trigger : crée la ligne dans public.users si absente
CREATE OR REPLACE FUNCTION public.handle_new_user_affiliate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_short_id TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    v_short_id := generate_short_id();
    INSERT INTO public.users (
      id, email, short_id, status, role,
      created_at, updated_at
    ) VALUES (
      NEW.id, NEW.email, v_short_id, 'active', 'player',
      NOW(), NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Supprime le trigger s'il existe déjà pour éviter les doublons
DROP TRIGGER IF EXISTS on_auth_user_created_affiliate ON auth.users;

-- Attache le trigger à auth.users
CREATE TRIGGER on_auth_user_created_affiliate
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_affiliate();

-- ================================================================
-- Nettoyage : recalcule les compteurs affiliés existants (optionnel)
-- UPDATE public.users u
-- SET total_referrals = (SELECT COUNT(*) FROM referrals r WHERE r.affiliate_id = u.id),
--     verified_referrals = (SELECT COUNT(*) FROM referrals r WHERE r.affiliate_id = u.id AND r.status = 'bonus_activated');
-- ================================================================
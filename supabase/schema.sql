-- =========================================================================
-- Cademo — schéma de base de données (Supabase / PostgreSQL)
--
-- À exécuter UNE fois dans : Supabase -> SQL Editor -> New query -> Run.
-- Sûr à relancer : tout est en "if not exists" / "create or replace".
--
-- Ce que ça met en place :
--   - profiles : un solde et un statut admin par compte (créé à l'inscription)
--   - bets     : les paris de chaque joueur
--   - sécurité (RLS) : chacun ne voit que SES données ; l'admin voit tout
--   - place_bet / settle_bet / credit_account : les seuls moyens de changer un
--     solde, côté serveur, pour qu'un joueur ne puisse pas se tricher un solde.
-- =========================================================================

-- ---------------------------------------------------------------- TABLES
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  balance    numeric(12,2) not null default 200,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.bets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  legs       jsonb not null,
  stake      numeric(12,2) not null,
  odds       numeric(12,4) not null,
  payout     numeric(12,2) not null,
  status     text not null default 'open' check (status in ('open','won','lost')),
  placed_at  timestamptz not null default now(),
  settled_at timestamptz
);
create index if not exists bets_user_idx on public.bets(user_id);
create index if not exists bets_status_idx on public.bets(status);

-- ------------------------------------------- création du profil à l'inscription
-- Chaque nouveau compte reçoit automatiquement un solde de départ de 200 €.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, balance)
  values (new.id, new.email, 200)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------- helper admin (évite la récursion RLS)
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- ------------------------------------------------------------------ RLS
alter table public.profiles enable row level security;
alter table public.bets     enable row level security;

-- profiles : je vois / modifie le mien ; l'admin voit / modifie tout.
-- (Le solde n'est PAS modifiable directement par le joueur : voir les RPC.)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- bets : je vois les miens ; l'admin voit tout. Personne n'écrit en direct
-- dans la table (les paris passent par place_bet / settle_bet).
drop policy if exists bets_select on public.bets;
create policy bets_select on public.bets for select
  using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------- RPC : placer un pari
-- Débite la mise et enregistre le pari, côté serveur, avec les garde-fous
-- (mise min 5, max 10 % du solde plafonnée à 50, gain plafonné à 45).
create or replace function public.place_bet(p_legs jsonb, p_stake numeric, p_odds numeric)
returns public.bets language plpgsql security definer set search_path = public as $$
declare
  v_bal numeric; v_max numeric; v_payout numeric; v_bet public.bets;
begin
  select balance into v_bal from public.profiles where id = auth.uid();
  if v_bal is null then raise exception 'profil introuvable'; end if;

  v_max := least(50, floor(v_bal * 0.10));
  if p_stake < 5 then raise exception 'mise minimum 5'; end if;
  if p_stake > v_bal then raise exception 'solde insuffisant'; end if;
  if p_stake > v_max then raise exception 'mise maximum %', v_max; end if;
  if p_odds <= 1 then raise exception 'cote invalide'; end if;

  v_payout := least(p_stake * p_odds, 45);      -- plafond de gain

  update public.profiles set balance = balance - p_stake where id = auth.uid();
  insert into public.bets (user_id, legs, stake, odds, payout, status)
    values (auth.uid(), p_legs, p_stake, p_odds, v_payout, 'open')
    returning * into v_bet;
  return v_bet;
end; $$;

-- ------------------------------------------------ RPC : régler un pari (admin)
create or replace function public.settle_bet(p_bet_id uuid, p_result text)
returns void language plpgsql security definer set search_path = public as $$
declare v_bet public.bets;
begin
  if not public.is_admin() then raise exception 'réservé admin'; end if;
  if p_result not in ('won','lost') then raise exception 'résultat invalide'; end if;

  select * into v_bet from public.bets where id = p_bet_id and status = 'open';
  if v_bet.id is null then return; end if;

  update public.bets set status = p_result, settled_at = now() where id = p_bet_id;
  if p_result = 'won' then
    update public.profiles set balance = balance + v_bet.payout where id = v_bet.user_id;
  end if;
end; $$;

-- --------------------------------------------- RPC : créditer un compte (admin)
create or replace function public.credit_account(p_user uuid, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'réservé admin'; end if;
  update public.profiles
     set balance = greatest(0, balance + p_amount)
   where id = p_user;
end; $$;

-- =========================================================================
-- APRÈS avoir exécuté ce script :
--   1. Crée ton compte admin depuis l'app (email + mot de passe).
--   2. Passe-le admin ici, une fois :
--        update public.profiles set is_admin = true
--        where email = 'neyvo.entreprise@gmail.com';
-- =========================================================================

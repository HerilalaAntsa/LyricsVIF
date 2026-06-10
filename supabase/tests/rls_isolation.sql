-- Tests d'isolation tenant des policies RLS.
--
-- Mode d'emploi : à coller dans le SQL editor de Supabase Studio (ou psql
-- connecté en service_role) APRÈS avoir exécuté les deux migrations.
--
-- Tout le scénario est encapsulé dans une transaction qui rollback à la fin :
-- aucune donnée n'est persistée. Si un test échoue, RAISE EXCEPTION arrête
-- la transaction et tu vois le message en sortie SQL.
--
-- Couverture :
--   1. Un admin VIF voit les chants VIF (privés + partagés) et les chants
--      partagés d'Alpha, mais PAS les chants privés d'Alpha.
--   2. Un admin Alpha symétriquement.
--   3. Un operator VIF peut INSERT un song dans VIF.
--   4. Un operator VIF ne peut PAS INSERT dans Alpha (erreur RLS attendue).
--   5. Un viewer VIF ne peut PAS INSERT (erreur RLS attendue).
--   6. Un admin VIF ne peut PAS UPDATE un song d'Alpha (no-op silencieux RLS).

begin;

----------------------------------------------------------------------------
-- SETUP : deux églises, trois users, plusieurs songs.
-- On exécute en superuser (postgres) qui bypass RLS par défaut.
----------------------------------------------------------------------------

-- IDs déterministes pour faciliter les assertions
do $$
declare
  vif_id     constant uuid := '00000000-0000-0000-0000-00000000aa01';
  alpha_id   constant uuid := '00000000-0000-0000-0000-00000000aa02';
  admin_vif  constant uuid := '00000000-0000-0000-0000-0000000000a1';
  op_vif     constant uuid := '00000000-0000-0000-0000-0000000000a2';
  view_vif   constant uuid := '00000000-0000-0000-0000-0000000000a3';
  admin_alpha constant uuid := '00000000-0000-0000-0000-0000000000b1';
  vif_priv   constant uuid := '00000000-0000-0000-0000-0000000000c1';
  vif_share  constant uuid := '00000000-0000-0000-0000-0000000000c2';
  alpha_priv constant uuid := '00000000-0000-0000-0000-0000000000c3';
  alpha_share constant uuid := '00000000-0000-0000-0000-0000000000c4';
begin
  -- Églises
  insert into public.churches (id, name, slug) values
    (vif_id,   'VIF Test',   'vif-test'),
    (alpha_id, 'Alpha Test', 'alpha-test');

  -- Faux auth.users (en prod c'est créé par Supabase Auth à l'inscription)
  insert into auth.users (id, instance_id, aud, role, email)
  values
    (admin_vif,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@vif.test'),
    (op_vif,      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'op@vif.test'),
    (view_vif,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'view@vif.test'),
    (admin_alpha, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@alpha.test');

  -- Profils app
  insert into public.users (id, church_id, email, role) values
    (admin_vif,   vif_id,   'admin@vif.test',   'admin'),
    (op_vif,      vif_id,   'op@vif.test',      'operator'),
    (view_vif,    vif_id,   'view@vif.test',    'viewer'),
    (admin_alpha, alpha_id, 'admin@alpha.test', 'admin');

  -- Songs
  insert into public.songs (id, church_id, title, visibility) values
    (vif_priv,    vif_id,   'VIF private',    'private'),
    (vif_share,   vif_id,   'VIF shared',     'shared'),
    (alpha_priv,  alpha_id, 'Alpha private',  'private'),
    (alpha_share, alpha_id, 'Alpha shared',   'shared');
end $$;

----------------------------------------------------------------------------
-- Helpers de test : impersonner un user authentifié.
----------------------------------------------------------------------------

create or replace function tests_become(user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_id::text, 'role', 'authenticated')::text,
    true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function tests_reset_role()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
end;
$$;

----------------------------------------------------------------------------
-- TEST 1 : admin VIF voit VIF private + VIF shared + Alpha shared (3),
-- pas Alpha private.
----------------------------------------------------------------------------

do $$
declare cnt int;
begin
  perform tests_become('00000000-0000-0000-0000-0000000000a1'::uuid);
  select count(*) into cnt from songs;
  if cnt <> 3 then
    raise exception 'TEST 1 KO : admin VIF voit % songs au lieu de 3', cnt;
  end if;
  if exists (select 1 from songs where title = 'Alpha private') then
    raise exception 'TEST 1 KO : admin VIF voit "Alpha private" — fuite tenant !';
  end if;
  raise notice 'TEST 1 OK : admin VIF voit 3 songs (sans fuite)';
  perform tests_reset_role();
end $$;

----------------------------------------------------------------------------
-- TEST 2 : admin Alpha symétriquement.
----------------------------------------------------------------------------

do $$
declare cnt int;
begin
  perform tests_become('00000000-0000-0000-0000-0000000000b1'::uuid);
  select count(*) into cnt from songs;
  if cnt <> 3 then
    raise exception 'TEST 2 KO : admin Alpha voit % songs au lieu de 3', cnt;
  end if;
  if exists (select 1 from songs where title = 'VIF private') then
    raise exception 'TEST 2 KO : admin Alpha voit "VIF private" — fuite tenant !';
  end if;
  raise notice 'TEST 2 OK : admin Alpha voit 3 songs (sans fuite)';
  perform tests_reset_role();
end $$;

----------------------------------------------------------------------------
-- TEST 3 : operator VIF peut INSERT dans VIF.
----------------------------------------------------------------------------

do $$
begin
  perform tests_become('00000000-0000-0000-0000-0000000000a2'::uuid);
  insert into songs (church_id, title)
  values ('00000000-0000-0000-0000-00000000aa01', 'op-vif-insert');
  raise notice 'TEST 3 OK : operator VIF a pu INSERT dans VIF';
  perform tests_reset_role();
end $$;

----------------------------------------------------------------------------
-- TEST 4 : operator VIF ne peut PAS INSERT dans Alpha.
-- On attend une erreur RLS — on la capture pour valider que la policy bloque.
----------------------------------------------------------------------------

do $$
begin
  perform tests_become('00000000-0000-0000-0000-0000000000a2'::uuid);
  begin
    insert into songs (church_id, title)
    values ('00000000-0000-0000-0000-00000000aa02', 'op-vif-essaie-alpha');
    raise exception 'TEST 4 KO : operator VIF a réussi à INSERT dans Alpha !';
  exception
    when insufficient_privilege or check_violation then
      raise notice 'TEST 4 OK : INSERT cross-tenant bloqué par RLS';
  end;
  perform tests_reset_role();
end $$;

----------------------------------------------------------------------------
-- TEST 5 : viewer VIF ne peut PAS INSERT (même dans VIF).
----------------------------------------------------------------------------

do $$
begin
  perform tests_become('00000000-0000-0000-0000-0000000000a3'::uuid);
  begin
    insert into songs (church_id, title)
    values ('00000000-0000-0000-0000-00000000aa01', 'viewer-essaie');
    raise exception 'TEST 5 KO : viewer a réussi à INSERT !';
  exception
    when insufficient_privilege or check_violation then
      raise notice 'TEST 5 OK : viewer bloqué sur INSERT';
  end;
  perform tests_reset_role();
end $$;

----------------------------------------------------------------------------
-- TEST 6 : admin VIF tente d'UPDATE un song d'Alpha — no-op RLS attendu.
-- (UPDATE sans visibilité tenant = 0 lignes affectées, pas une exception)
----------------------------------------------------------------------------

do $$
declare affected int;
begin
  perform tests_become('00000000-0000-0000-0000-0000000000a1'::uuid);
  update songs set title = 'pwned' where id = '00000000-0000-0000-0000-0000000000c3';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'TEST 6 KO : admin VIF a updaté % ligne(s) d''Alpha', affected;
  end if;
  raise notice 'TEST 6 OK : UPDATE cross-tenant a affecté 0 ligne';
  perform tests_reset_role();
end $$;

----------------------------------------------------------------------------
-- Nettoyage : on rollback pour ne RIEN persister.
----------------------------------------------------------------------------

drop function tests_become(uuid);
drop function tests_reset_role();

rollback;

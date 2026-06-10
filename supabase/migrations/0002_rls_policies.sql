-- Row Level Security : isolation multi-tenant + matrice de droits par rôle.
--
-- Matrice ciblée (cf. cadrage §4 et .local_rag #1) :
--
--                       SELECT                                INSERT    UPDATE    DELETE
--   churches            own tenant + tenants ayant            -         admin     -
--                       au moins un song shared               (signup)
--   users               self + same tenant                    admin     admin     admin
--   songs               own tenant + visibility=shared        op+adm    op+adm    admin
--   bible_versions      authenticated (lecture publique)      -         -         -
--   verses              authenticated (lecture publique)      -         -         -
--   services            own tenant                            op+adm    op+adm    admin
--   service_items       via parent service.church_id          op+adm    op+adm    admin
--   backgrounds         own tenant                            op+adm    op+adm    admin
--
-- Note : viewer = SELECT-only sur son propre tenant.

set search_path = public;

alter table churches        enable row level security;
alter table users           enable row level security;
alter table songs           enable row level security;
alter table bible_versions  enable row level security;
alter table verses          enable row level security;
alter table services        enable row level security;
alter table service_items   enable row level security;
alter table backgrounds     enable row level security;

------------------------------------------------------------------------
-- churches
------------------------------------------------------------------------

create policy churches_select on churches
  for select to authenticated
  using (
    id = current_church_id()
    or exists (
      select 1 from songs s
      where s.church_id = churches.id and s.visibility = 'shared'
    )
  );

create policy churches_update on churches
  for update to authenticated
  using (id = current_church_id() and current_user_role() = 'admin')
  with check (id = current_church_id());

------------------------------------------------------------------------
-- users
------------------------------------------------------------------------

create policy users_select on users
  for select to authenticated
  using (id = auth.uid() or church_id = current_church_id());

create policy users_insert on users
  for insert to authenticated
  with check (
    church_id = current_church_id()
    and current_user_role() = 'admin'
  );

create policy users_update on users
  for update to authenticated
  using (church_id = current_church_id() and current_user_role() = 'admin')
  with check (church_id = current_church_id());

create policy users_delete on users
  for delete to authenticated
  using (church_id = current_church_id() and current_user_role() = 'admin');

------------------------------------------------------------------------
-- songs
------------------------------------------------------------------------

create policy songs_select on songs
  for select to authenticated
  using (church_id = current_church_id() or visibility = 'shared');

create policy songs_insert on songs
  for insert to authenticated
  with check (
    church_id = current_church_id()
    and current_user_role() in ('admin', 'operator')
  );

create policy songs_update on songs
  for update to authenticated
  using (
    church_id = current_church_id()
    and current_user_role() in ('admin', 'operator')
  )
  with check (church_id = current_church_id());

create policy songs_delete on songs
  for delete to authenticated
  using (
    church_id = current_church_id()
    and current_user_role() = 'admin'
  );

------------------------------------------------------------------------
-- bible_versions / verses : lecture publique authentifiée
------------------------------------------------------------------------

create policy bible_versions_select on bible_versions
  for select to authenticated using (true);

create policy verses_select on verses
  for select to authenticated using (true);

------------------------------------------------------------------------
-- services
------------------------------------------------------------------------

create policy services_select on services
  for select to authenticated
  using (church_id = current_church_id());

create policy services_insert on services
  for insert to authenticated
  with check (
    church_id = current_church_id()
    and current_user_role() in ('admin', 'operator')
  );

create policy services_update on services
  for update to authenticated
  using (
    church_id = current_church_id()
    and current_user_role() in ('admin', 'operator')
  )
  with check (church_id = current_church_id());

create policy services_delete on services
  for delete to authenticated
  using (
    church_id = current_church_id()
    and current_user_role() = 'admin'
  );

------------------------------------------------------------------------
-- service_items : hérite via le service parent
------------------------------------------------------------------------

create policy service_items_select on service_items
  for select to authenticated
  using (
    exists (
      select 1 from services s
      where s.id = service_id and s.church_id = current_church_id()
    )
  );

create policy service_items_insert on service_items
  for insert to authenticated
  with check (
    exists (
      select 1 from services s
      where s.id = service_id and s.church_id = current_church_id()
    )
    and current_user_role() in ('admin', 'operator')
  );

create policy service_items_update on service_items
  for update to authenticated
  using (
    exists (
      select 1 from services s
      where s.id = service_id and s.church_id = current_church_id()
    )
    and current_user_role() in ('admin', 'operator')
  );

create policy service_items_delete on service_items
  for delete to authenticated
  using (
    exists (
      select 1 from services s
      where s.id = service_id and s.church_id = current_church_id()
    )
    and current_user_role() = 'admin'
  );

------------------------------------------------------------------------
-- backgrounds
------------------------------------------------------------------------

create policy backgrounds_select on backgrounds
  for select to authenticated
  using (church_id = current_church_id());

create policy backgrounds_insert on backgrounds
  for insert to authenticated
  with check (
    church_id = current_church_id()
    and current_user_role() in ('admin', 'operator')
  );

create policy backgrounds_update on backgrounds
  for update to authenticated
  using (
    church_id = current_church_id()
    and current_user_role() in ('admin', 'operator')
  )
  with check (church_id = current_church_id());

create policy backgrounds_delete on backgrounds
  for delete to authenticated
  using (
    church_id = current_church_id()
    and current_user_role() = 'admin'
  );

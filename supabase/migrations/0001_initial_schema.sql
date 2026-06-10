-- Schéma initial FihiranaVIF
-- Multi-tenant dès le jour 1 : toutes les tables "contenu" ont un church_id.
-- Cf. FIHIRANAVIF.md §4 et src/lib/db/schema.ts (modèle Dexie miroir).
-- Cf. .local_rag entrée #1 : RLS Postgres est le critère décisif du choix Supabase.

set search_path = public;

create extension if not exists "pgcrypto";  -- pour gen_random_uuid()

------------------------------------------------------------------------
-- Types énumérés (correspondent aux types TS du schéma Dexie)
------------------------------------------------------------------------

create type church_plan         as enum ('free', 'supporter');
create type user_role           as enum ('admin', 'operator', 'viewer');
create type song_visibility     as enum ('private', 'shared');
create type service_item_type   as enum ('song', 'verse', 'announcement', 'sermon_point', 'image', 'countdown');
create type background_kind     as enum ('image', 'video');
create type background_source   as enum ('canva', 'upload', 'external');

------------------------------------------------------------------------
-- Tenants (églises)
------------------------------------------------------------------------

create table churches (
  id              uuid          primary key default gen_random_uuid(),
  name            text          not null,
  slug            text          not null unique,
  branding        jsonb         not null default '{}'::jsonb,
  locale_default  text          not null default 'mg',
  plan            church_plan   not null default 'free',
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

------------------------------------------------------------------------
-- Users (profils liés à auth.users)
-- La FK vers auth.users garantit que tout profil correspond à un compte.
-- La FK vers churches garantit qu'un user appartient toujours à une église.
------------------------------------------------------------------------

create table users (
  id          uuid          primary key references auth.users(id) on delete cascade,
  church_id   uuid          not null references churches(id) on delete cascade,
  email       text          not null,
  role        user_role     not null default 'viewer',
  created_at  timestamptz   not null default now()
);
create index users_church_id_idx on users(church_id);

------------------------------------------------------------------------
-- Songs
-- sections : tableau JSON [{ kind, label, lines: [] }, ...]
-- Cf. cadrage §4 et §8 (migration : remplacer HTML <br> par sections structurées)
------------------------------------------------------------------------

create table songs (
  id            uuid              primary key default gen_random_uuid(),
  church_id     uuid              not null references churches(id) on delete cascade,
  title         text              not null,
  sequence      integer,
  sections      jsonb             not null default '[]'::jsonb,
  author        text,
  language      text              not null default 'mg',
  visibility    song_visibility   not null default 'private',
  forked_from   uuid              references songs(id) on delete set null,
  created_at    timestamptz       not null default now(),
  updated_at    timestamptz       not null default now()
);
create index songs_church_id_idx     on songs(church_id);
create index songs_visibility_idx    on songs(visibility);
create index songs_church_lang_idx   on songs(church_id, language);

------------------------------------------------------------------------
-- Bible : versions + versets
-- Décision juridique (cf. cadrage §9) : démarrer avec des traductions
-- libres / domaine public uniquement. Lecture publique (tous tenants).
------------------------------------------------------------------------

create table bible_versions (
  id        uuid    primary key default gen_random_uuid(),
  name      text    not null,
  language  text    not null,
  license   text    not null
);

create table verses (
  id          text     primary key,         -- ex: "lub-mg:mat:1:1" (clé naturelle pour upsert)
  version_id  uuid     not null references bible_versions(id) on delete cascade,
  book        text     not null,
  chapter     integer  not null,
  verse       integer  not null,
  text        text     not null
);
create index verses_lookup_idx on verses(version_id, book, chapter, verse);

------------------------------------------------------------------------
-- Services (déroulés / run-of-show)
------------------------------------------------------------------------

create table services (
  id          uuid         primary key default gen_random_uuid(),
  church_id   uuid         not null references churches(id) on delete cascade,
  date        date         not null,
  title       text         not null,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);
create index services_church_date_idx on services(church_id, date);

------------------------------------------------------------------------
-- Backgrounds (fonds image/vidéo, y compris exports Canva mis en cache)
-- Doit être créée AVANT service_items car référencée par service_items.background_id.
------------------------------------------------------------------------

create table backgrounds (
  id              uuid                primary key default gen_random_uuid(),
  church_id       uuid                not null references churches(id) on delete cascade,
  kind            background_kind     not null,
  url             text                not null,
  cached_blob_key text,
  source          background_source
);
create index backgrounds_church_id_idx on backgrounds(church_id);

------------------------------------------------------------------------
-- Service items (éléments ordonnés d'un service)
-- "order" entre guillemets car c'est un mot réservé SQL.
------------------------------------------------------------------------

create table service_items (
  id            uuid                primary key default gen_random_uuid(),
  service_id    uuid                not null references services(id) on delete cascade,
  "order"       integer             not null,
  type          service_item_type   not null,
  ref_id        text,                                     -- pointe vers song.id / verse.id selon le type
  payload       jsonb               not null default '{}'::jsonb,
  background_id uuid                references backgrounds(id) on delete set null
);
create index service_items_service_idx on service_items(service_id, "order");

------------------------------------------------------------------------
-- Trigger updated_at
------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger churches_updated_at  before update on churches  for each row execute function set_updated_at();
create trigger songs_updated_at     before update on songs     for each row execute function set_updated_at();
create trigger services_updated_at  before update on services  for each row execute function set_updated_at();

------------------------------------------------------------------------
-- Fonctions helper pour RLS
--
-- SECURITY DEFINER + STABLE + search_path verrouillé : on lit la table
-- users sans déclencher RLS récursivement, et c'est mémorisable au sein
-- d'une requête (perf).
------------------------------------------------------------------------

create or replace function current_church_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select church_id from public.users where id = auth.uid()
$$;

create or replace function current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

-- Convention : autoriser uniquement aux rôles authentifiés ces fonctions
revoke all on function current_church_id() from public;
revoke all on function current_user_role() from public;
grant execute on function current_church_id() to authenticated;
grant execute on function current_user_role() to authenticated;

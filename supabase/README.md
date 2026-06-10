# Supabase — Setup FihiranaVIF

> Le backend ne sert qu'aux écritures admin, à l'auth et au stockage des fonds.
> Le cœur lecture reste local-first (Dexie). L'app continue de tourner si
> Supabase est down.

## Étapes (à faire une fois par environnement)

### 1. Créer le projet Supabase

- Aller sur [supabase.com](https://supabase.com) → New project
- Nom : `fihirana-dev` (ou `fihirana-prod`)
- Région : la plus proche de Madagascar — pour l'instant **Frankfurt** (eu-central-1) est un bon compromis
- Choisir un mot de passe DB fort (gardez-le dans un coffre-fort)

### 2. Exécuter les migrations dans l'ordre

Dans le **SQL editor** du dashboard Supabase :

1. Coller `migrations/0001_initial_schema.sql` → exécuter
2. Coller `migrations/0002_rls_policies.sql` → exécuter

Si l'une échoue, lire l'erreur et corriger avant de continuer.

### 3. Vérifier l'isolation tenant

Coller `tests/rls_isolation.sql` dans le SQL editor → exécuter.
Lire la sortie : chaque test doit afficher `TEST N OK : ...`.
La transaction se rollback à la fin → aucune donnée polluée.

**Si un test échoue, NE PAS pousser en prod tant que la policy n'est pas corrigée.**

### 4. Récupérer les credentials côté app

Settings → API du projet Supabase :

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public key** → `VITE_SUPABASE_ANON_KEY`

Les coller dans `.env` à la racine du projet (cf. `.env.example`).

### 5. Premier admin

À la création du projet il n'y a aucun user. Deux approches :

**(a) Manuel (pour démarrer)** : créer un user dans Auth → Users → Add user (email/password), puis dans le SQL editor :

```sql
insert into public.churches (id, name, slug)
values ('11111111-1111-1111-1111-111111111111', 'VIF', 'vif')
on conflict (slug) do nothing;

insert into public.users (id, church_id, email, role)
values (
  'PLACEHOLDER-AUTH-USER-UUID',   -- copier depuis Auth → Users
  '11111111-1111-1111-1111-111111111111',
  'admin@vif.example',
  'admin'
);
```

**(b) Flow d'invitation (plus tard)** : table `invitations` + edge function qui auto-crée le profil au signup à partir d'un token d'invitation. Pas dans le périmètre v1.

## Liens utiles

- Doc RLS Supabase : https://supabase.com/docs/guides/database/postgres/row-level-security
- Migrations versionnées : préférer un dossier numéroté `0001_…`, `0002_…`. Tout fichier futur prend le numéro suivant.

## Mode local optionnel (Supabase CLI)

Si tu veux un Supabase local avant de pousser sur le cloud :

```bash
brew install supabase/tap/supabase
supabase init           # crée supabase/config.toml
supabase start          # lance Docker (Postgres + Studio en local)
supabase db reset       # ré-exécute migrations + seed
```

Tout le SQL de `migrations/` sera ré-appliqué proprement.

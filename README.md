# FihiranaVIF

> Outil **offline-first** de conduite de culte (chants + Bible + déroulé) — multi-église dès le jour 1.

Voir `FIHIRANAVIF.md` pour le cadrage produit complet et `MY_RULES.md` pour les règles de collaboration agent/dev.

## Stack

- **Frontend** : React + Vite + TypeScript, PWA (`vite-plugin-pwa`)
- **Stockage local** : IndexedDB via Dexie.js
- **Recherche locale** : MiniSearch (insensible aux accents)
- **i18n** : i18next
- **UI** : Tailwind CSS + shadcn/ui
- **Backend** : Supabase (Postgres + Auth + Storage + RLS multi-tenant)

## Démarrage local

```bash
npm install
npm run dev
```

L'app tourne par défaut sur http://localhost:5173.

## Surfaces

| Route | Surface | Public |
|---|---|---|
| `/console` | Console opérateur (régie) | Bénévole opérateur |
| `/projection` | Écran de projection | Assemblée (vidéoprojecteur) |
| `/m` | Lecture mobile | Assemblée sur téléphone |

## Mémoire projet

Le dossier `.local_rag/` (non versionné) est la mémoire persistante du projet. Voir `.local_rag/COMMANDS.md`.

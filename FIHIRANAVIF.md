# Cadrage — Application de conduite de culte (offline-first)

> **Document destiné à un agent de développement (Claude Code).**
> Il décrit la vision, les contraintes, l'architecture, le périmètre par phase et les premières étapes.
> Les sections marquées **[DÉCISION OUVERTE]** doivent être confirmées avec le porteur du projet avant implémentation.
> Les sections marquées **[NE PAS CONSTRUIRE]** sont volontairement hors périmètre — ne pas les implémenter même si elles semblent utiles.

---

## 1. Vision en une phrase

Un **outil offline-first de conduite de culte** — chants **et** Bible réunis dans un même déroulé de service — où chaque église dispose de son espace, puise dans une bibliothèque commune qui grandit avec la communauté, et où les églises qui en ont les moyens financent celles qui ne les ont pas.

Le produit n'est **pas** une simple appli de paroles : c'est l'**écran + le cerveau du déroulé** d'un culte.

---

## 2. Contexte et contraintes (non négociables)

1. **Offline-first.** Internet est intermittent et peu fiable à Madagascar. L'application doit fonctionner **à 100 % hors-ligne** pour les usages de l'assemblée et de l'opérateur (lire, rechercher, projeter, dérouler un culte). Le réseau ne sert qu'à des opérations d'administration occasionnelles (synchroniser de nouveaux contenus, créer/éditer). **L'assemblée ne doit jamais avoir besoin d'internet.**
2. **Web + mobile, une seule base de code.** Cible initiale : **PWA installable**. Chemin vers le natif (stores) prévu mais reporté.
3. **Volume de données faible.** Le corpus de départ (~322 chants de texte) + une Bible (quelques Mo) tient entièrement sur l'appareil. Tout le contenu de lecture est cachable localement.
4. **Multilingue par construction.** Démarrage en **malgache**, mais chaque contenu porte une langue et l'interface est traduisible dès le jour 1. Ouvert à tous (français, anglais, etc.).
5. **Principe « construire pour une, concevoir pour beaucoup ».** On livre une application qui sert parfaitement **une église** (l'église VIF), mais on pose dès le départ les fondations multi-église pour éviter une réécriture plus tard.

### Le renversement par rapport à l'ancienne version
L'ancienne application était **online-only** : chaque page allait chercher les données sur l'API, la recherche tapait le serveur. C'est précisément ce qui casse à Madagascar. La nouvelle approche est **local-first** : le contenu vit sur l'appareil, la synchro est un détail de fond.

**Modernité = résilience, pas bande passante.** Les options « en ligne » (Canva, IA, streaming) se posent **par-dessus** un cœur hors-ligne, jamais en dépendance.

---

## 3. Stack technique recommandée

### Frontend (recommandation ferme)
- **React + Vite + TypeScript**, configuré en **PWA** via `vite-plugin-pwa` (service worker pour le cache de l'app shell).
- **Pas de SSR / pas de Next.js** : le rendu serveur va à l'encontre du local-first et n'apporte rien à une application qui est un client local.
- **Stockage local : IndexedDB via [Dexie.js](https://dexie.org/).** C'est là que vit tout le contenu (chants, Bible, déroulés).
- **Recherche locale : MiniSearch ou FlexSearch**, avec **repliage des diacritiques** (recherche insensible aux accents — important pour le malgache).
- **i18n** : `i18next` (interface) ; le contenu porte sa propre langue dans le modèle de données.
- **Chemin natif (plus tard)** : **Capacitor** enveloppe le même build web → zéro réécriture pour publier sur les stores.

### Backend **[DÉCISION OUVERTE]**
Le rôle du backend est réduit (le cœur est local), mais l'arrivée du **multi-église** (comptes, contenus privés, bibliothèque partagée, paliers de don) le fait remonter en importance. Trois options :

| Option | Pour | Contre |
|---|---|---|
| **Supabase** *(recommandé par défaut)* | Postgres + Auth + Storage clé en main ; **Row-Level Security** idéale pour l'isolation multi-tenant ; peu d'ops | dépendance à un fournisseur |
| Express + PostgreSQL | contrôle total, proche de l'existant | tout à construire (auth, sync, sécurité) |
| JSON statique versionné + serverless | minimal, très robuste offline | mal adapté dès qu'il y a comptes + écritures |

**Recommandation : Supabase**, car le multi-tenant + auth + synchro est exactement son point fort, et la RLS Postgres isole proprement les données par église. **À confirmer avant de coder le backend.**

### Modèle de synchronisation (offline ↔ online)
- **App shell** : caché par le service worker → ouverture instantanée hors-ligne.
- **Corpus de lecture** (chants publics, Bible) : snapshot embarqué/caché en IndexedDB ; au lancement, **si** réseau, récupérer les deltas.
- **Écritures admin** (ajout/édition) : possibles en ligne ; idéalement mises en **file locale** et rejouées quand le réseau revient.
- **Conflits** : *last-write-wins* est acceptable dans ce domaine (édition concurrente quasi nulle).

---

## 4. Modèle de données (multi-tenant dès le jour 1)

Même s'il n'y a qu'une église au départ, ces entités existent dès le début. C'est la « couture » qui rend l'ouverture future triviale.

- **Church** *(tenant)* : `id`, `name`, `slug`, `branding` (logo, couleurs — **config, jamais en dur**), `locale_default`, `plan` (free / supporter…).
- **User** : `id`, `church_id`, `email`, `role` (admin / operator / viewer), auth.
- **Song** : `id`, `church_id` (propriétaire), `title`, `sequence`, `content` (structuré en sections : couplet/refrain — **pas du HTML `<br>` brut**), `author`, `language`, `visibility` (`private` | `shared`), `forked_from` (nullable → permet de customiser un chant partagé sans toucher l'original).
- **BibleVersion** : `id`, `name`, `language`, `license` (libre / domaine public / sous licence). **Stockée hors-ligne.**
- **Verse** : `version_id`, `book`, `chapter`, `verse`, `text`.
- **Service** *(le déroulé / run-of-show)* : `id`, `church_id`, `date`, `title`, liste ordonnée d'**items**.
- **ServiceItem** : type (`song` | `verse` | `announcement` | `sermon_point` | `image` | `countdown`), référence vers le contenu, ordre, fond associé.
- **Background** : image/vidéo (y compris exports Canva mis en cache localement).

> **Clé de conception :** tout contenu projetable se ramène à un **« slide »** générique. Chant, verset, annonce, point de sermon = même mécanique de projection, type différent. C'est ce qui rend le déroulé simple à construire.

> **Trois étiquettes sur chaque chant** dès le départ : église propriétaire, **langue**, **visibilité**. Au départ tout sera `VIF / malgache / private` — mais l'info est déjà là, donc aucune migration douloureuse pour la bibliothèque partagée ou l'international.

---

## 5. Périmètre par phase

### v1 — Chants (la fondation, utile dès le premier dimanche)
- PWA offline-first, installable mobile + desktop.
- Migration et **nettoyage des ~322 chants** (voir §8).
- Consultation + **recherche hors-ligne** (insensible aux accents).
- **Mode projection / diaporama** plein écran, hors-ligne.
- Admin : **ajout / édition** de chants (en ligne).
- Modèle de données déjà multi-église, mais l'utilisateur ne voit **qu'une** église : la sienne.

### v1.5 — Bible
- Intégration d'une **traduction biblique libre / domaine public** (malgache classique pour démarrer).
- Recherche et **projection d'un verset** (« Jean 3:16 »), hors-ligne.

### v2 — Déroulé de culte (le cœur « conduite de culte »)
- Construction d'un **Service** : séquence ordonnée chants + versets + annonces + points de sermon.
- L'opérateur **fait défiler** le déroulé pendant le culte.
- **Écran confidence / stage** pour les musiciens (voir le slide suivant).
- **Télécommande depuis un téléphone** via **réseau local** (pas internet — compatible Madagascar).

### Phases ultérieures
- **Multi-église** réellement ouvert : comptes par église, **bibliothèque partagée**, fork de chants.
- **Modèle économique** (voir §6).
- **Intégration Canva** (voir §7).
- **Intégration OBS / vue streaming** (voir §7).
- **IA** : formatage automatique des paroles (texte brut → slides couplet/refrain). *(Privilégier ceci au speech-to-text : le malgache est une langue peu dotée, la reconnaissance vocale y est peu fiable.)*
- **Auto-avance** des slides **calée sur une bande-son connue** (repères temporels) — éprouvé. *(L'« écoute du chant en direct pour suivre » reste expérimental/peu fiable : ne pas viser en priorité.)*

---

## 6. Modèle économique (subvention croisée)

- **Base gratuite / don libre** pour tous — c'est ce que vivront les églises malgaches.
- **Palier « soutien » optionnel** pour les églises qui en ont les moyens (souvent internationales) : fonctions confort (Canva, IA de formatage, synchro multi-appareils, sous-domaine/branding propre).
- **Effet recherché :** les églises aisées financent l'infrastructure, les églises modestes utilisent gratuitement.
- **Rappel d'avant-culte (popup)** : par la **transparence**, pas la culpabilité. Ex. « Ce mois-ci l'hébergement a coûté X ; N églises ont contribué. Merci. » Montrer où va l'argent.
- **Rail de paiement local : mobile money** (MVola, Orange Money, Airtel Money), pas la carte bancaire — pour l'offrande comme pour le don-abonnement.

> **Limite stricte :** l'application peut **afficher** les infos de don (QR / numéro mobile money). Elle ne **traite pas** les paiements et ne collecte jamais d'identifiants bancaires.

---

## 7. Intégrations (toutes optionnelles, posées par-dessus le cœur offline)

### Canva — fonds et vidéos personnalisés
- Via la **Canva Connect API** : créer/importer des designs (import par URL) et **exporter** en PNG / MP4 / PDF (jobs asynchrones).
- **Canva est online uniquement.** Schéma obligatoire : l'admin crée/choisit son fond en ligne → l'app **exporte et met l'asset en cache local** → la projection marche ensuite hors-ligne.

### OBS — streaming réseaux sociaux (l'église l'utilise déjà)
- **[NE PAS CONSTRUIRE]** de moteur de streaming. L'app **nourrit** OBS, elle ne streame pas.
- **Niveau simple :** exposer une **page de sortie** (chant/verset courant, **fond transparent**) qu'OBS ajoute en **Browser Source** et incruste sur le live. **Purement local** — OBS et l'app sur la même machine, aucun internet requis pour ce lien.
- **Niveau avancé (plus tard) :** **OBS WebSocket (v5)** pour piloter OBS depuis le déroulé (changer de scène automatiquement quand un chant démarre).

---

## 8. Migration des données existantes

- Source : ~322 chants dans `server/db/db-data.js` de l'ancien dépôt (`HerilalaAntsa/FihiranaVIF`).
- **Corriger l'encodage** : caractères mal encodés (`�`) → forcer un nettoyage en **UTF-8**.
- **Restructurer le contenu** : remplacer le HTML `<br>` brut par une structure de sections (couplet / refrain) pour permettre la projection slide-par-slide et le futur formatage IA.
- Marquer tous ces chants : `church_id = VIF`, `language = mg`, `visibility = private`.

---

## 9. Points juridiques à vérifier (NON tranchés — ne pas présumer)

> Ces points conditionnent **ce que la bibliothèque partagée a le droit de contenir**. À valider avec une source compétente avant d'ouvrir le partage, surtout à l'international. *(Le rédacteur de ce document n'est pas juriste.)*

- **Paroles de chants :** les chants **originaux des églises / du domaine public** se partagent librement (c'est le cœur sûr de la bibliothèque malgache). Les chants **sous copyright** (beaucoup de louange occidentale) relèvent d'un système de licences (type CCLI/SongSelect) — zone à risque pour le partage international.
- **Versions bibliques :** les traductions modernes sont sous licence ; démarrer avec une version **libre / domaine public**.

---

## 10. Direction visuelle (UI)

### Principe directeur
L'application a **trois surfaces aux besoins opposés** ; ne pas leur appliquer le même style.

1. **Écran de projection** (face à l'assemblée) — le héros visuel, mais le *moins* d'interface possible.
   - **Fond très sombre** (proche du noir, ~`#0E0E10`) : lisibilité sur vidéoprojecteur, y compris en salle peu noircie.
   - **Typographie énorme, centrée**, lisible de loin. C'est le contenu ; tout le reste s'efface.
   - Chrome réduit à 3 repères discrets en gris atténué : titre du chant (haut gauche), position « diapo X / Y » (haut droite), référence (bas). Fine barre de progression en bas.
   - **Sobre & neutre** : nuances de blanc cassé sur presque-noir, **aucune couleur** par défaut. L'éventuel accent de marque reste minimal.
2. **Console opérateur** (régie) — **claire, dense, rapide, sans stress** ; utilisée sous la lumière par des bénévoles, parfois en plein culte.
   - Suit le design system clair (surfaces blanches, bordures 0.5px, variables CSS du thème).
   - Layout : **déroulé** à gauche (chants/versets/annonces ordonnés, icônes par type, item courant marqué) ; à droite **deux aperçus** (`En direct` + `Suivant`, en vignettes sombres rappelant la projection), **contrôles rares** (précédent, suivant, **écran noir**), puis les **diapositives du chant en cours** (cliquables, celle en direct nettement marquée).
   - Règle d'or entre les deux écrans : **toute la complexité vit dans la console ; la projection ne montre que l'essentiel.**
3. **Lecture mobile** (assemblée sur téléphone) — léger, rapide, hors-ligne, typo de lecture confortable, grandes zones tactiles, **performant sur Android bas de gamme**.

### Personnalisation (à deux niveaux)
- **Thème de l'église** (réglé une fois par l'admin) : fond par défaut, police, couleurs de marque, taille de base. C'est le `branding` de l'entité `Church` — **config, jamais en dur**.
- **Fond par chant / par diapositive** (ponctuel, par l'opérateur) : champ `Background` sur `ServiceItem`. **Point de branchement Canva** (export mis en cache local).
- **Hiérarchie** : thème de l'église = défaut → **surchargé** par un fond de chant/diapo si présent.

### Garde-fous (ne PAS tout ouvrir)
- **Catalogue de polices vérifiées** (3-4 choix soignés, **toutes embarquées/cachées** pour le hors-ligne), pas de champ libre.
- Chaque police doit **gérer les caractères malgaches** (`ô`, apostrophes…) — critère de sélection, pas un détail (cf. les `�` de l'ancien corpus).
- **Garde-fous de contraste** : empêcher les combinaisons illisibles (texte clair sur fond clair).
- **Taille de texte adaptative** selon la longueur de la strophe, pour rester lisible de loin.
- Outils : **Tailwind CSS + shadcn/ui** recommandés (modernes par défaut, accessibles, faciles à assembler pour un agent).

---

## 11. Hors périmètre — [NE PAS CONSTRUIRE]

- Le **streaming** lui-même (l'app aide OBS, ne le remplace pas).
- La **gestion d'église** complète : membres, planning des bénévoles, CRM (terrain de Planning Center / ChurchSuite).
- Contrôle **son / lumière**, VR, **génération de musique par IA**.
- Tout **traitement de paiement** ou collecte d'identifiants bancaires dans l'app.

---

## 12. Premières étapes suggérées pour l'agent

1. **Confirmer la [DÉCISION OUVERTE] backend** (Supabase recommandé) avant tout code serveur.
2. Échafauder le projet **Vite + React + TS + PWA** (`vite-plugin-pwa`), i18n (`i18next`), Dexie pour IndexedDB.
3. Implémenter le **modèle de données §4** côté client (schéma Dexie), avec les entités multi-tenant même si une seule église est active.
4. Écrire le **script de migration §8** (parser `db-data.js`, nettoyer l'UTF-8, restructurer en sections) → produire un fichier de seed propre.
5. Livrer la **v1** : liste des chants, recherche hors-ligne insensible aux accents, mode projection, ajout/édition admin. Appliquer la **direction visuelle §10** (projection sombre minimaliste ; console claire et dense).
6. Vérifier que l'app **fonctionne entièrement hors-ligne** après premier chargement (couper le réseau et tester).

---

*Ce document est une boussole de cadrage, pas une spécification figée. Les phases s'empilent : chaque brique ne s'ajoute qu'une fois la précédente solide.*

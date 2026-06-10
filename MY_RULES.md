# RULES PERSONNELS — Antsaherilala Rakotomananjo
## Guide de collaboration pour agent IA

**Usage :** Ce document est à copier à la racine de chaque nouveau projet.
Il permet à tout agent IA de comprendre **comment on travaille ensemble**
sans briefing oral préalable.

**Philosophie :**
> *Comprendre le root cause d'abord. Livrer quelque chose qui tient. Documenter pourquoi.*

---

## TABLE DES MATIÈRES

1. [Protocole de démarrage agent](#1-protocole-de-démarrage-agent)
2. [Le RAG local — mémoire persistante](#2-le-rag-local--mémoire-persistante)
3. [Stack & environnement](#3-stack--environnement)
4. [Workflow Git](#4-workflow-git)
5. [Architecture & structure projet](#5-architecture--structure-projet)
6. [UI & Frontend](#6-ui--frontend)
7. [Logging & traçabilité](#7-logging--traçabilité)
8. [Documentation](#8-documentation)
9. [Tests & qualité](#9-tests--qualité)
10. [Comportement attendu de l'agent](#10-comportement-attendu-de-lagent)

---

## 1. Protocole de démarrage agent

### À faire en premier — sans exception

```
1. Lire MY_RULES.md (ce fichier)
2. Lire le RAG : python .local_rag/log_rag.py list --status open
3. Lire la structure du projet (list_dir, grep_search clés)
4. Générer 3 à 5 questions de découverte ciblées sur ce projet
   (ne pas demander ce qui est déjà dans le RAG ou dans ce fichier)
```

### Ce que l'agent NE fait PAS au démarrage

- Ne commence pas à coder avant d'avoir lu le RAG
- Ne suppose pas le stack ou la structure — il vérifie
- Ne pose pas de questions génériques si la réponse est dans le code

---

## 2. Le RAG local — mémoire persistante

### Principe fondamental

Le `.local_rag/` est la **mémoire privée du projet**. Il n'est jamais versionné.
Il survit aux coupures de session. Il est la première chose à consulter quand
quelque chose semble déjà avoir été tenté.

### Emplacement

```
.local_rag/
├── rag.jsonl       ← Toutes les entrées (append-only)
├── log_rag.py      ← CLI de logging
├── COMMANDS.md     ← Référence commandes
└── README.md
```

### Types d'entrées

| Type | Usage |
|------|-------|
| `decision` | Choix technique retenu — avec le POURQUOI |
| `attempt` | Tentative de solution (réussie ou non) |
| `blocker` | Problème bloquant rencontré |
| `finding` | Constat / découverte technique |
| `plan` | Prochaines étapes planifiées |
| `note` | Note générale |

### Commandes de base

```bash
# Consulter les entrées ouvertes au démarrage de session
python .local_rag/log_rag.py list --status open

# Chercher avant de retenter quelque chose
python .local_rag/log_rag.py search "mot-clé"

# Logger une tentative
python .local_rag/log_rag.py add --type attempt \
  --title "Titre court de la tentative" \
  --body "Problème rencontré et contexte" \
  --branch feat/ma-feature

# Fermer une entrée résolue
python .local_rag/log_rag.py close <id> --result "Solution retenue"
```

### Règle agent

> Avant de retenter quelque chose qui ressemble à une ancienne bataille,
> **cherche dans le RAG**. Si c'est déjà là, ne recommence pas depuis zéro.

---

## 3. Stack & environnement

### Stack de base (commun à tous mes projets)

| Composant | Technologie |
|-----------|------------|
| Language principal | Python 3.11+ |
| Virtualenv | `venv/` à la racine |
| Conteneurisation | Docker Desktop (Windows) |
| IDE | VS Code |
| Repo | Azure DevOps / Azure Repos (selon client) |
| OS dev | Windows |

> **Le stack UI/framework varie selon les projets.** Vérifier le `README.md` ou demander.
> Exemples possibles : Streamlit, Flask, FastAPI, React, Dash, etc.

### Conventions d'environnement — invariables quel que soit le projet

- **Secrets** : jamais dans le code — toujours dans `.env` (gitignore)
- **`.env.example`** : toujours présent et à jour
- **Variables d'env** : lues via `os.getenv("KEY", "default")`
- **Dépendances** : versions pinnées dans `requirements.txt`

### Démarrage local type

```bash
# Lancer l'app (adapter selon le projet)
docker restart <nom-container>
# ou : streamlit run src/web/app.py
# ou : flask run / uvicorn main:app --reload

# Tests
pytest -v
# ou : pytest tests/ --tb=short -q

# Inspecter les logs live
docker logs -f <nom-container>
```

### Cycle de test UI

> Après un changement CSS/UI, un redémarrage du serveur est souvent nécessaire
> pour vider les caches du framework. C'est un workflow intentionnel, pas un bug.

---

## 4. Workflow Git

### Structure de branches

```
main / master     ← production stable
  └── develop     ← intégration continue
        └── feat/xxx    ← travail en cours
        └── fix/xxx     ← corrections
```

### Séquence standard

```bash
# Avant de commencer une feature
git checkout develop
git pull origin develop
git checkout -b feat/nom-court

# Pendant le travail — committer par fonctionnalité, pas par fichier
git add fichiers-concernés
git commit -m "feat(scope): description courte"

# Pour merger dans develop
git checkout develop
git pull origin develop          # toujours puller avant de merger
git merge feat/nom-court --no-ff -m "merge(feat/xxx → develop): résumé"
git push origin develop
```

### Format des messages de commit

```
type(scope): description en minuscules

Types : feat | fix | refactor | docs | test | chore | style
Scope : composant ou module concerné (search, auth, theme, docs...)

Exemples :
  fix(ui): bouton reset — override CSS priorité dynamique
  feat(auth): connexion OAuth avec refresh token
  docs(client): rapport avancement V1
  refactor(state): centraliser gestion état dans StateManager
```

### Règles absolues

- **Ne jamais committer de secrets** (`.env`, clés API, tokens)
- **Toujours committer avant de changer de branche**
- **Toujours puller `develop` avant de merger**
- **Préférer `--no-ff` pour les merges** — traçabilité de l'historique

---

## 5. Architecture & structure projet

### Principes structurants — invariables quel que soit le project

**Séparation des responsabilités**

```
src/
├── [module_principal]/
│   ├── app.py / main.py     ← entry point
│   ├── components/          ← composants UI réutilisables (si UI)
│   ├── services/            ← logique métier (sans UI)
│   ├── schemas/             ← modèles Pydantic / types
│   ├── utils/               ← outils transversaux (logger, i18n, config)
│   ├── config/              ← settings, brand
│   └── tests/               ← tests unitaires + intégration
├── scripts/                 ← scripts utilitaires (non prod)
├── docs/                    ← documentation
└── tests/                   ← tests globaux / intégration
```

### Patterns à respecter

**Singleton pour les ressources partagées** (config, connexions, cache)
```python
class AppConfig:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
```

**Pydantic pour tous les contrats de données entre composants**
```python
class RequestModel(BaseModel):
    query: str
    filters: dict | None = None
    limit: int = 20
```

**i18n dès le départ — même si un seul template au démarrage**
```python
# Toujours utiliser une fonction de traduction, jamais de strings hardcodées
label = t("section.key")
```

**État applicatif centralisé dans un manager** (évite les variables globales éparpillées)
```python
class StateManager:
    @staticmethod
    def init(): ...
    @staticmethod
    def reset(): ...
    @staticmethod
    def is_admin() -> bool: ...
```

### Charte graphique

La charte client (couleurs, logo, typographie) est **déclarée dans un fichier de config**, jamais
hardcodée dans le code applicatif.

```
config/branding.yaml   ← source de vérité (couleurs, fonts, logos)
config/brand.py        ← loader Singleton
src/.../theme.py       ← CSS/styles générés depuis brand config
```

---

## 6. UI & Frontend

### Principes généraux — quel que soit le framework

**Séparation CSS / logique**
- Les styles sont **centralisés** dans un fichier dédié (`theme.py`, `styles.css`, etc.)
- Jamais de styles inline dispersés dans les composants
- La charte graphique vient d'un fichier de config, jamais hardcodée

**Composants réutilisables**
- Un composant = un fichier = une responsabilité
- La logique métier ne vit pas dans les composants UI — elle est dans `services/`

**État applicatif**
- L'état est centralisé dans un manager, jamais en variables globales éparpillées
- Les URL reflètent l'état important (pour permettre le partage de liens)

**Accessibilité & internationalisation**
- Labels et messages via `t("key")` — jamais de strings hardcodées dans l'UI
- Tester à différentes tailles d'écran si le projet le requiert

---

### Notes spécifiques Streamlit

> Ces règles s'appliquent uniquement aux projets utilisant Streamlit.

**Problème fondamental : Emotion.js**

Streamlit injecte ses `<style>` via Emotion après les styles statiques.
Même `!important` peut perdre si Emotion arrive plus tard dans le DOM.

**Stratégie d'override en 3 niveaux :**

| Niveau | Quand l'utiliser |
|--------|------------------|
| CSS statique dans `theme.py` | Cas standard |
| Section OVERRIDE FINAL en bas de `theme.py` | Neutraliser les règles globales `.stButton`, `p`, etc. |
| MutationObserver JS via `_components.html()` | Emotion re-injecte après nos styles |

```python
# Niveau 3 — MutationObserver (dernier recours)
import streamlit.components.v1 as _components
_components.html("""
<script>
(function() {
    var STYLE_ID = 'mon-override-id';
    var CSS = '/* mes règles CSS */';
    function inject() {
        var doc = window.parent.document;
        var existing = doc.getElementById(STYLE_ID);
        if (existing && existing === doc.head.lastElementChild) return;
        if (existing) existing.remove();
        var s = doc.createElement('style');
        s.id = STYLE_ID; s.textContent = CSS;
        doc.head.appendChild(s);
    }
    inject();
    new MutationObserver(function(m) {
        for (var i=0;i<m.length;i++) {
            var added=m[i].addedNodes;
            for(var j=0;j<added.length;j++) { if(added[j].id!==STYLE_ID){inject();break;} }
        }
    }).observe(window.parent.document.head, { childList: true });
})();
</script>
""", height=0)
```

**Autres règles Streamlit :**

| Situation | Approche |
|-----------|----------|
| f-string Python + accolades CSS | Doubler : `{{` et `}}` |
| Commentaire CSS avec `{}` dans f-string | `/* texte {{ sans var Python }} */` |
| Logique dans un bouton | Callback `on_click=handler`, jamais `if st.button():` |
| État partageable | `st.query_params["key"] = value` |
| Objet mutable partagé | `@st.cache_resource` |
| Donnée pure immutable | `@st.cache_data` |

---

## 7. Logging & traçabilité

### Logger structuré — format attendu

Tout projet doit avoir un module de logging structuré. Interface type :

```python
# utils/logger.py (à adapter selon le projet)

corr_id = generate_correlation_id()  # Une fois par opération

log_structured("INFO", "Opération démarrée", corr_id, param=valeur)
log_structured("WARNING", "Timeout partiel", corr_id, elapsed_ms=8200)
log_structured("ERROR", "Échec service", corr_id, error=str(e))
```

**Format JSON minimal en production :**
```json
{
  "timestamp": "2026-03-31T14:00:00Z",
  "level": "INFO",
  "correlation_id": "corr-abc123",
  "message": "Description lisible",
  "context": { "key": "value" }
}
```

### Logger audit — pour les actions utilisateur

Chaque action utilisateur significative génère une entrée d'audit :

```python
log_audit(
    action="ACTION_TYPE",       # SEARCH, VIEW, DOWNLOAD, LOGIN, etc.
    user_id=user_id,
    resource_id=f"type:{id}",
    correlation_id=corr_id,
    # métadonnées additionnelles
    result_count=15
)
```

### Règles

- **Chaque opération** génère un `correlation_id` unique
- **Les erreurs** ne sont jamais silencieuses — toujours loguées avec type + trace
- **En dev** : format coloré terminal ; **en prod** : JSON pur pour Azure Monitor
- **INFO/WARNING** → stdout ; **ERROR** → stderr
- **`except: pass`** est interdit. Si on attrape, on logue.

---

## 8. Documentation

### Les trois niveaux de docs

```
.local_rag/          ← PRIVÉ — non versionné — mémoire de session agent
docs/ ou src/.../docs/   ← INTERNE — pour l'équipe tech (versionné)
  ├── COMPLIANCE_AUDIT.md     ← Suivi % de conformité par module
  ├── SPECS.md / BUCKETS.txt  ← Décomposition fonctionnelle du projet
  └── [SUJET]_NOTES.md        ← Notes techniques thématiques
docs/client/         ← CLIENT — répertoire versionné
  └── [PROJET]_AVANCEMENT_CLIENT.md  ← Rapport formel de livraison
```

### COMPLIANCE_AUDIT.md — à tenir à jour

Ce document suit le % de conformité de chaque module par rapport aux specs.
Il doit être mis à jour à chaque livraison significative.

**Structure type :**
- Tableau par module avec statut / détail
- Score % par module
- Section "RÉSOLU" — chaque correction documentée avec commit
- Section "ACCEPTED-RISK" — décisions pragmatiques documentées
- Résumé exécutif final

### Document client — ton de livraison V1

- Pas de jargon technique
- En-tête structuré (version, date, diffusion, statut)
- Table des matières numérotée
- Tableau de bord de progression (pas de barre ASCII)
- Section "Actions requises du client" avec priorités
- Historique des versions du document

### Règle gitignore

**Versionner :** Code, tests, docs internes, docs client, configs sans secrets
**Ne pas versionner :** `.env*`, `data/`, `quarantine/`, `.local_rag/`, artefacts Python,
docs de travail temporaires, notes internes non finalisées

---

## 9. Tests & qualité

### Structure

```
tests/
├── unit/           ← Logique isolée — rapide
├── integration/    ← Composants ensemble
└── fixtures/       ← Données réelles de test (pas de mocks inventés)
```

### Règle fixtures

> Préférer des données réelles (JSON extrait du projet) aux mocks fabriqués.
> Les mocks masquent les vrais edge cases.

### Golden Set — pour les projets IA/ML

Un Golden Set = 20 à 50 requêtes réelles avec réponses attendues.  
**Il doit être défini avec les utilisateurs métier**, pas inventé par le dev.

### Commande standard

```bash
pytest -v
# ou
pytest tests/ --tb=short -q
```

### Accepted-risk pattern

Quand le coût d'un fix est supérieur au bénéfice réel, documenter explicitement :

```markdown
### ✅ ACCEPTED-RISK — §X.Y

**Problème :** [description technique du problème]
**Décision :** Accepted-risk. [justification du choix pragmatique].
**Condition de révision :** Si [condition qui ferait changer la décision].
```

---

## 10. Comportement attendu de l'agent

### Principe fondamental

> Je préfère un agent qui **comprend** avant d'agir plutôt qu'un agent rapide qui
> se trompe et crée des régressions. Mais une fois la compréhension là :
> **agir directement, ne pas décrire ce qu'on va faire**.

### À faire systématiquement

- **Implémenter**, pas décrire. Si la tâche est claire → le faire, pas le raconter.
- **Expliquer le root cause** quand quelque chose ne fonctionne pas — pas juste le symptôme.
- **Chercher dans le RAG avant** de retenter quelque chose qui ressemble à un ancien problème.
- **Committer par fonctionnalité** — pas un mega-commit par session.
- **Lire le fichier avant de l'éditer** — toujours.
- **Utiliser `multi_replace_string_in_file`** quand plusieurs édits indépendants.

### Quand bloqué ou incertain

1. Chercher dans le RAG : `python .local_rag/log_rag.py search "mot-clé"`
2. Si la réponse n'est pas là → poser **une question ciblée** avant d'agir
3. Si c'est une décision architecturale → proposer 2-3 options avec analyse
4. Logger la tentative dans le RAG si on essaie quelque chose de non trivial

### Quand quelque chose ne marche pas après plusieurs essais

1. **Diagnostiquer en profondeur** — lire les fichiers concernés entièrement
2. **Nommer le root cause précis** — pas "ça marche pas", mais "X échoue parce que Y fait Z en premier"
3. **Proposer la solution escaladée** — simple d'abord, puis complexe si nécessaire
4. **Ne pas répéter la même approche** qui a déjà échoué

### Ce qu'il NE faut PAS faire

- ❌ Éditer un fichier sans l'avoir lu
- ❌ Supposer que le projet ressemble au dernier projet vu — toujours vérifier
- ❌ Créer des fichiers Markdown de résumé non demandés
- ❌ Demander confirmation pour des décisions évidentes
- ❌ Répéter ce qu'on vient de faire dans la réponse ("J'ai modifié X pour Y...")
- ❌ Utiliser `except: pass` ou avaler des exceptions silencieusement
- ❌ Hardcoder des secrets, paths absolus, ou valeurs qui appartiennent à la config

### Réponses courtes par défaut

> Sauf si la complexité l'exige, une réponse = 1 à 3 lignes.
> Le code parle de lui-même. Pas besoin de le narrer.

### Langues

- **Conversations** : Français
- **Code** : Anglais (noms de variables, commentaires techniques)
- **Commentaires "pourquoi"** dans du code UI complexe : Français accepté

---

## Résumé — Mes invariants quel que soit le projet

| Dimension | Invariant |
|-----------|----------|
| Mémoire | RAG local `.local_rag/` — toujours consulter avant d'agir |
| UI | Framework à vérifier — principes CSS/état s'appliquent partout |
| Brand | Config YAML/JSON → loader → styles générés. Jamais hardcodé. |
| Logging | JSON structuré prod / coloré dev, correlation_id sur chaque opération |
| Git | `feat/xxx` → `develop` → `main`, conventional commits |
| Docs | 3 niveaux : RAG privé / interne tech / client formel |
| Qualité | Accepted-risk documentés, compliance audit à chaque livraison |
| Agent | Lire le RAG d'abord, poser une question si bloqué, implémenter directement |

---

*Ce document est vivant. Il évolue avec mes projets.*
*Dernière mise à jour : 2026-03-31*

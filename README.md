# RESTO-H — Plateforme de Gestion de la Restauration Hospitalière

Plateforme web multi-établissements de gestion de la restauration hospitalière, déployable dans tout type de formation sanitaire (CHR, CHU, CMA, CSPS, cliniques privées, etc.).

Fonctionnalités principales : menus hebdomadaires, régimes spéciaux, commandes de repas, suivi des consommations, états et rapports, gestion des licences par formation, tableau de bord analytique.

**Version** : 2.0.0 — 2026-04-12  
**Développeur** : Daniel SCHILLEM  
**Licence** : MIT

---

## Architecture

| Couche          | Technologie                        | Répertoire  |
| --------------- | ---------------------------------- | ----------- |
| Backend         | Laravel 12 + Sanctum 4 (API REST)  | `backend/`  |
| Frontend        | Next.js 16 + React 19 + TypeScript | `frontend/` |
| Base de données | SQLite (dev) / PostgreSQL (prod)   | —           |

---

## Prérequis

- **PHP** ≥ 8.2 avec extensions SQLite, mbstring, openssl
- **Composer** ≥ 2.x
- **Node.js** ≥ 20.x
- **npm** ≥ 10.x

---

## Installation locale

### 1. Backend (Laravel)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
```

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
```

Créer le fichier `frontend/.env.local` :

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

---

## Lancement (développement)

### Backend (port 8000)

```bash
cd backend
php artisan serve --port=8000
```

### Frontend (port 3000)

```bash
cd frontend
npm run dev
```

Ouvrir **http://localhost:3000** dans le navigateur.

---

## Déploiement production

| Service         | Hébergeur         | URL                           |
| --------------- | ----------------- | ----------------------------- |
| Frontend        | Netlify           | https://sgrh-app.netlify.app  |
| Backend         | Render (Docker)   | https://sgrh-api.onrender.com |
| Base de données | Render PostgreSQL | interne                       |

Le déploiement est déclenché automatiquement à chaque push sur la branche `main`.

---

## Comptes de test (seed)

| Rôle        | Email               | Mot de passe |
| ----------- | ------------------- | ------------ |
| Prestataire | prestataire@sgrh.bf | 1234         |
| DSGL        | dsgl@sgrh.bf        | 1234         |
| CSAH        | csah@sgrh.bf        | 1234         |
| SUS         | sus@sgrh.bf         | 1234         |
| SUT         | sut@sgrh.bf         | 1234         |
| Super Admin | superadmin@sgrh.bf  | 1234         |

---

## Rôles et permissions

| Rôle            | Description                                                                      |
| --------------- | -------------------------------------------------------------------------------- |
| **super_admin** | Administration globale : formations sanitaires, licences, utilisateurs, journaux |
| **prestataire** | Gestion opérationnelle : menus, commandes, consommations, paramètres             |
| **dsgl**        | Direction des Services Généraux et de la Logistique                              |
| **csah**        | Chef de Service Administration et Hygiène                                        |
| **sus**         | Service des Urgences et Soins — consultation des menus et commandes              |
| **sut**         | Service des Urgences Techniques — consultation des menus et commandes            |

---

## Pages de l'application

| Page                | Route             | Description                                         |
| ------------------- | ----------------- | --------------------------------------------------- |
| Connexion           | `/login`          | Authentification par rôle                           |
| Tableau de bord     | `/dashboard`      | KPIs, graphiques, commandes récentes                |
| Menus Hebdomadaires | `/menus-hebdo`    | Planning semaine (petit-déjeuner, déjeuner, dîner)  |
| Menus Spéciaux      | `/menus-speciaux` | Régimes spéciaux (demandes, validation, rejet)      |
| Commandes           | `/commandes`      | Commandes malades / personnel / clients externes    |
| Consommations       | `/consommations`  | Suivi consommation, écarts, alertes gaspillage      |
| États & Rapports    | `/etats`          | Rapports commandes, consommations, devis estimatifs |
| Services            | `/services`       | Liste des services de la formation                  |
| Licence             | `/licence`        | Statut de la licence de la formation                |
| Profil              | `/profil`         | Profil utilisateur                                  |
| Notifications       | `/notifications`  | Centre de notifications                             |
| Super Admin         | `/super-admin`    | Gestion formations, licences, journaux, analytique  |

---

## Fonctionnalités clés

- **Multi-établissements** : chaque formation sanitaire est indépendante avec ses propres utilisateurs, données et licence
- **Système de licences par formation** : essai (14 jours), premium (1-5 ans), expiration avec alertes
- **PWA** : installation sur mobile, mode hors-ligne basique
- **Notifications temps réel** : alertes sur commandes, régimes, expirations
- **17 régions du Burkina Faso** (découpage de juillet 2025)
- **Export** : rapports PDF / impression
- **Thème sombre** : interface adaptée

---

## Stack technique

- **Laravel 12** — API REST avec Laravel Sanctum (authentification par token Bearer)
- **Next.js 16** — App Router, React Server Components
- **React 19** — Hooks, Context API (AuthProvider)
- **TypeScript 5** — Typage strict
- **Tailwind CSS 4** — Styles utilitaires
- **Chart.js + react-chartjs-2** — Graphiques (barres, donuts, lignes)
- **Font Awesome 6** — Icônes (CDN)
- **PostgreSQL** — Base de données de production
- **SQLite** — Base de données de développement

---

## Build production

```bash
cd frontend
npm run build
npm start
```

---

## Structure des fichiers

```
backend/
├── app/Http/Controllers/Api/   # Contrôleurs API
├── app/Models/                  # Modèles Eloquent
├── app/Observers/               # Observers (commandes, menus, régimes)
├── database/migrations/         # Migrations
├── database/seeders/            # Seeder complet
├── routes/api.php               # Routes API
└── config/cors.php              # Configuration CORS

frontend/
├── src/app/
│   ├── layout.tsx               # Layout racine + PWA
│   ├── page.tsx                 # Redirection accueil
│   ├── login/page.tsx           # Page connexion
│   ├── super-admin/page.tsx     # Dashboard super-admin
│   └── (app)/                   # Routes authentifiées
│       ├── layout.tsx           # Layout avec Sidebar + Topbar
│       ├── dashboard/page.tsx
│       ├── menus-hebdo/page.tsx
│       ├── menus-speciaux/page.tsx
│       ├── commandes/page.tsx
│       ├── consommations/page.tsx
│       ├── etats/page.tsx
│       ├── services/page.tsx
│       ├── licence/page.tsx
│       ├── profil/page.tsx
│       └── notifications/page.tsx
├── src/components/              # Sidebar, Topbar, Modal
├── src/lib/                     # API service, AuthProvider
├── src/types/                   # Interfaces TypeScript
└── public/                      # PWA manifest, service worker, icônes
```

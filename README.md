# SGRH — Système de Gestion de la Restauration Hospitalière

**Centre Hospitalier Régional (CHR) de Tenkodogo**

Application web de gestion complète de la restauration hospitalière : menus hebdomadaires, régimes spéciaux, commandes de repas, suivi des consommations, états et rapports.

**Version** : 1.0.0 — 2025-07-19  
**Développeur** : DEVBACKEND  
**Licence** : MIT

---

## Architecture

| Couche    | Technologie                  | Répertoire  |
|-----------|------------------------------|-------------|
| Backend   | Laravel 12 + Sanctum (API)   | `backend/`  |
| Frontend  | Next.js 16 + React 19 + TypeScript | `frontend/` |
| Base de données | SQLite (dev) / MySQL (prod) | `backend/database/database.sqlite` |

---

## Prérequis

- **PHP** ≥ 8.2 avec extensions SQLite, mbstring, openssl
- **Composer** ≥ 2.x
- **Node.js** ≥ 20.x
- **npm** ≥ 10.x

---

## Installation

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

## Lancement

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

> **Note** : Les scripts utilisent le flag `--webpack` car Turbopack ne supporte pas les caractères non-ASCII dans les chemins de fichiers.

Ouvrir **http://localhost:3000** dans le navigateur.

---

## Comptes de test (seed)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Gérant | gerant@chr-tenkodogo.bf | 1234 |
| DSGL | dsgl@chr-tenkodogo.bf | 1234 |
| CSAH | csah@chr-tenkodogo.bf | 1234 |
| SUS | sus@chr-tenkodogo.bf | 1234 |
| SUT | sut@chr-tenkodogo.bf | 1234 |

---

## Pages de l'application

| Page | Route | Description |
|------|-------|-------------|
| Connexion | `/login` | Sélection du rôle et authentification |
| Tableau de bord | `/dashboard` | KPIs, graphiques, commandes récentes |
| Menus Hebdomadaires | `/menus-hebdo` | Planning semaine avec 3 repas/jour |
| Menus Spéciaux | `/menus-speciaux` | Régimes spéciaux (demandes, validés, rejetés) |
| Commandes | `/commandes` | Commandes malades/personnel/clients/validation |
| Consommations | `/consommations` | Suivi consommation, écarts, alertes gaspillage |
| États & Rapports | `/etats` | Rapports commandes, conso, devis estimatifs |
| Administration | `/admin` | Gestion utilisateurs, services, paramètres |

---

## API Endpoints

### Authentification
- `POST /api/login` — Connexion (email + password)
- `POST /api/logout` — Déconnexion
- `GET  /api/user` — Utilisateur connecté

### Dashboard
- `GET /api/dashboard/kpis` — Indicateurs clés
- `GET /api/dashboard/recent-orders` — Commandes récentes
- `GET /api/dashboard/weekly-consumption` — Consommation hebdomadaire

### Menus
- `GET|POST /api/menus` — Liste / création
- `GET|PUT|DELETE /api/menus/{id}` — Détail / modification / suppression
- `GET|POST /api/menus-hebdomadaires` — Menus hebdomadaires

### Régimes Spéciaux
- `GET|POST /api/regimes-speciaux` — Liste / création
- `PUT /api/regimes-speciaux/{id}/validate` — Validation
- `PUT /api/regimes-speciaux/{id}/reject` — Rejet

### Commandes
- `GET|POST /api/commandes` — Liste / création
- `GET /api/commandes/{id}` — Détail
- `PUT /api/commandes/{id}/validate` — Validation
- `PUT /api/commandes/{id}/reject` — Rejet

### Consommations
- `GET|POST /api/consommations` — Liste / création
- `GET /api/consommations/kpis` — KPIs consommation

### États & Rapports
- `GET /api/etats/commandes` — Rapport commandes
- `GET /api/etats/consommations` — Rapport consommations
- `GET /api/etats/devis` — Devis estimatifs
- `PUT /api/etats/devis/{id}/validate` — Validation devis
- `PUT /api/etats/devis/{id}/reject` — Rejet devis

### Administration
- `GET|POST /api/admin/users` — Utilisateurs
- `GET|POST /api/admin/services` — Services
- `GET|PUT /api/admin/parametres` — Paramètres

---

## Stack technique

- **Laravel 12** — API REST avec Laravel Sanctum (authentification par token)
- **Next.js 16** — App Router, React Server Components
- **React 19** — Hooks, Context API (AuthProvider)
- **TypeScript 5.9** — Typage strict
- **Tailwind CSS 4** — Styles utilitaires
- **Chart.js + react-chartjs-2** — Graphiques (barres, donuts)
- **Font Awesome 6** — Icônes (CDN)
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
├── app/Http/Controllers/Api/   # 6 contrôleurs API
├── app/Models/                  # 12 modèles Eloquent
├── database/migrations/         # 10 migrations
├── database/seeders/            # Seeder complet
├── routes/api.php               # ~40 routes API
└── config/cors.php              # Configuration CORS

frontend/
├── src/app/
│   ├── layout.tsx               # Layout racine
│   ├── page.tsx                 # Redirection accueil
│   ├── login/page.tsx           # Page connexion
│   └── (app)/                   # Routes authentifiées
│       ├── layout.tsx           # Layout avec Sidebar + Topbar
│       ├── dashboard/page.tsx
│       ├── menus-hebdo/page.tsx
│       ├── menus-speciaux/page.tsx
│       ├── commandes/page.tsx
│       ├── consommations/page.tsx
│       ├── etats/page.tsx
│       └── admin/page.tsx
├── src/components/              # Sidebar, Topbar, Modal
├── src/lib/                     # API service, AuthProvider
├── src/types/                   # Interfaces TypeScript
└── package.json
```

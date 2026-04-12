# RAPPORT COMPLET DU PROJET SGRH

> **Système de Gestion de la Restauration Hospitalière**  
> Version : 1.0.0 — 12 juillet 2025  
> Développeur : Daniel Schillem  
> Repository : `danielschillem/Resto-H` (branche `main`)

---

## 1. RÉSUMÉ EXÉCUTIF

Le **SGRH** est une application web complète de gestion de la restauration hospitalière, conçue pour les formations sanitaires du Burkina Faso. Elle couvre l'ensemble du cycle de gestion : menus, commandes, régimes spéciaux, consommations, états financiers, et administration multi-tenant.

**Stack technique** :

- **Backend** : Laravel 12 (PHP 8.4) — API REST + Sanctum Auth
- **Frontend** : Next.js 16 (React 19, TypeScript)
- **Base de données** : PostgreSQL
- **Déploiement** : Render (backend Docker) + Netlify (frontend SSR)

**État actuel** : ✅ Fonctionnel — 131 tests / 279 assertions passent — Déployé en production

---

## 2. ARCHITECTURE TECHNIQUE

### 2.1 Backend (Laravel 12)

| Composant        | Quantité | Détail                                                                                                                                                                                                              |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contrôleurs API  | 10       | Auth, Dashboard, Menu, Commande, Consommation, RegimeSpecial, Etat, Admin, Licence, SuperAdmin                                                                                                                      |
| Modèles Eloquent | 16       | User, FormationSanitaire, Service, Menu, MenuHebdomadaire, MenuHebdomadaireItem, Commande, RegimeSpecial, Consommation, ConsommationArticle, DevisEstimatif, DevisLigne, Licence, Notification, AuditLog, Parametre |
| Middlewares      | 3        | TenantScope, CheckRole, IsSuperAdmin                                                                                                                                                                                |
| Observers        | 3        | Commande, MenuHebdomadaire, RegimeSpecial                                                                                                                                                                           |
| Migrations       | 24       | Schéma complet + évolutions                                                                                                                                                                                         |
| Endpoints API    | ~60      | Protégés par auth:sanctum + middleware de rôle                                                                                                                                                                      |
| Tests Feature    | 13       | Couverture complète de tous les contrôleurs                                                                                                                                                                         |
| LOC PHP          | ~3 900   | (hors vendor/)                                                                                                                                                                                                      |

### 2.2 Frontend (Next.js 16)

| Composant        | Quantité | Détail                                                                                                                                                                          |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages            | 17       | Login, Super-Admin Login, Dashboard, Menus, Menus Hebdo, Menus Spéciaux, Commandes, Consommations, Services, Régimes, États, Admin, Licence, Profil, Notifications, Super-Admin |
| Composants       | 7        | Sidebar, Topbar, DarkModeToggle, ForcePasswordChange, etc.                                                                                                                      |
| API Client       | 1        | 93 méthodes, ~500 lignes                                                                                                                                                        |
| Types TypeScript | 1        | 209 lignes d'interfaces typées                                                                                                                                                  |
| LOC TS/TSX       | ~15 600  |                                                                                                                                                                                 |

### 2.3 Total du projet

| Métrique                  | Valeur                                 |
| ------------------------- | -------------------------------------- |
| **Total lignes de code**  | **~19 500 LOC**                        |
| **Tests (PHP)**           | 131 tests / 279 assertions / 1 659 LOC |
| **Fichiers de migration** | 24                                     |
| **Endpoints API**         | ~60 uniques                            |
| **Dépendances backend**   | 4 (Laravel, Sanctum, Tinker, PHP ≥8.2) |
| **Dépendances frontend**  | 7 (Next.js, React, Chart.js, jsPDF)    |

---

## 3. FONCTIONNALITÉS PAR MODULE

### 3.1 Authentification & Sécurité

- Login par email/mot de passe avec code formation sanitaire
- Login alternatif par formation + rôle + code d'accès
- 6 rôles : `super_admin`, `prestataire`, `dsgl`, `csah`, `sus`, `sut`
- Authentification API via Laravel Sanctum (tokens)
- Middleware de multi-tenancy (`TenantScope`) — isolation par formation
- Changement de mot de passe obligatoire au premier login
- Rate limiting sur les routes sensibles (login, password change)
- Minimum 8 caractères pour les mots de passe

### 3.2 Dashboard

- KPIs dynamiques personnalisés par rôle (portions, commandes, patients, budget)
- Graphique de consommation hebdomadaire (Chart.js)
- Répartition des commandes par type (malades, personnel, clients)
- Dernières commandes en temps réel

### 3.3 Gestion des Menus

- CRUD complet des menus (intitulé, type de repas, coût unitaire, allergènes)
- Menu hebdomadaire : création, composition par items, soumission/validation
- Workflow de validation : brouillon → soumis → validé/rejeté
- Calcul automatique des coûts (matières + main d'œuvre)

### 3.4 Gestion des Commandes

- Création de commandes (malades, personnel, clients externes)
- Règle de deadline : commandes avant 09h00 uniquement
- Workflow : en_attente → validée → livrée (ou rejetée)
- Livraison uniquement des commandes validées
- Gestion des paiements
- Export PDF avec jsPDF + autoTable

### 3.5 Régimes Spéciaux

- Prescription médicale : patient, lit, service, type de régime
- 8 types : sans_sel, diabétique, hyposodé, post_op_mixé, hyper_protéiné, sans_gluten, enrichi, autre
- Workflow de validation par CSAH/DSGL
- Durée en jours, médecin prescripteur

### 3.6 Consommation & Suivi Budgétaire

- Saisie quotidienne (nb malades, personnel, clients, portions, coûts)
- KPIs consolidés : portions servies, coût réel, écart budgétaire, taux de gaspillage
- Suivi par article de consommation
- Écarts par service
- Filtrage par période (semaine, semaine précédente, mois)

### 3.7 États & Rapports

- État des commandes avec filtrage et agrégation
- Devis estimatifs : création et validation
- Rapport de validations
- Export PDF des états

### 3.8 Administration

- Gestion des utilisateurs (CRUD, activation/désactivation en masse)
- Gestion des services hospitaliers
- Paramètres système
- Journal d'audit complet (actions, IP, ancienne/nouvelle valeur)
- Exports CSV (utilisateurs, services, audit logs)
- Gestion des permissions par rôle

### 3.9 Super-Administration

- Gestion multi-formations sanitaires (CRUD)
- Tableau de bord global (stats, formations, licences)
- Gestion des licences (essai, premium, RESTO-XXXX)
- CRUD utilisateurs cross-formations
- Réinitialisation de mot de passe
- Gestion des permissions globales
- Export CSV des formations et audit

### 3.10 Système de Licences

- Licence d'essai automatique (30 jours) à la création de formation
- Activation par clé au format `RESTO-XXXX-XXXX-XXXX-XXXX`
- Licence premium (1 an)
- Vérification d'expiration automatique
- Page dédiée avec jours restants et statut

### 3.11 Notifications

- Notifications en temps réel (SSE - Server-Sent Events)
- Marquage lu/non-lu
- Notifications automatiques via Observers (commandes, menus, régimes)

---

## 4. MATRICE DES PERMISSIONS

| Fonctionnalité            | Prestataire  | DSGL | CSAH | SUS | SUT |
| ------------------------- | :----------: | :--: | :--: | :-: | :-: |
| Dashboard                 |      ✅      |  ✅  |  ✅  | ✅  | ✅  |
| Consulter menus           |      ✅      |  ✅  |  ✅  | ✅  | ✅  |
| Créer/modifier menus      |      ✅      |  ✅  |  ✅  | ❌  | ❌  |
| Valider menus hebdo       |      ❌      |  ✅  |  ❌  | ❌  | ❌  |
| Créer commandes           |      ✅      |  ✅  |  ✅  | ✅  | ✅  |
| Valider/rejeter commandes |      ❌      |  ✅  |  ✅  | ❌  | ❌  |
| Livrer commandes          |      ✅      |  ❌  |  ❌  | ❌  | ❌  |
| Régimes spéciaux (CRUD)   | ✅ (lecture) |  ✅  |  ✅  | ✅  | ✅  |
| Valider régimes           |      ❌      |  ✅  |  ✅  | ❌  | ❌  |
| Saisir consommations      |      ❌      |  ❌  |  ✅  | ❌  | ✅  |
| États & Rapports          |      ❌      |  ✅  |  ✅  | ❌  | ❌  |
| Administration            |      ❌      |  ✅  |  ❌  | ❌  | ❌  |

---

## 5. SÉCURITÉ

### 5.1 Mesures implémentées

- ✅ Authentification par tokens (Sanctum) — aucun cookie de session
- ✅ Multi-tenancy : isolation complète des données par `formation_id`
- ✅ Middleware de rôle sur toutes les routes sensibles
- ✅ Rate limiting sur login (10/min) et changement de mot de passe (5/min)
- ✅ Validation des entrées sur tous les endpoints
- ✅ CORS configuré avec origines explicites
- ✅ Mots de passe hashés (bcrypt)
- ✅ Minimum 8 caractères pour les mots de passe
- ✅ Journal d'audit avec IP source
- ✅ Protection CSRF sur les routes web
- ✅ Pas d'injection SQL (queries paramétrées Eloquent)
- ✅ Pas de XSS (Next.js auto-escape)

### 5.2 Audit OWASP

| Catégorie OWASP                 | Statut     | Notes                                      |
| ------------------------------- | ---------- | ------------------------------------------ |
| A01 - Broken Access Control     | ✅ Corrigé | Tenant scoping + middleware de rôle        |
| A02 - Cryptographic Failures    | ✅ OK      | bcrypt, Sanctum tokens                     |
| A03 - Injection                 | ✅ OK      | Eloquent ORM, pas de raw SQL non paramétré |
| A04 - Insecure Design           | ✅ OK      | Architecture en couches                    |
| A05 - Security Misconfiguration | ✅ OK      | CORS, rate limiting, env vars              |
| A06 - Vulnerable Components     | ✅ OK      | Dépendances à jour                         |
| A07 - Auth Failures             | ✅ OK      | Throttle + validation                      |
| A08 - Data Integrity            | ✅ OK      | Validation côté serveur                    |
| A09 - Logging Failures          | ✅ OK      | AuditLog complet                           |
| A10 - SSRF                      | ✅ OK      | Pas de requêtes sortantes dynamiques       |

---

## 6. DÉPLOIEMENT

| Composant       | Service           | URL                                 |
| --------------- | ----------------- | ----------------------------------- |
| Backend API     | Render (Docker)   | `https://sgrh-api.onrender.com/api` |
| Frontend SSR    | Netlify           | (configuré via netlify.toml)        |
| Base de données | Render PostgreSQL | Oregon (free tier)                  |

### Configuration Docker

- Image PHP 8.4 + extensions (pdo_pgsql, mbstring, etc.)
- Artisan migrate au démarrage
- Serve via `php artisan serve --host=0.0.0.0 --port=10000`

---

## 7. OPTIMISATIONS APPLIQUÉES (v1.0.0)

| #   | Correction                                                               | Criticité | Statut |
| --- | ------------------------------------------------------------------------ | --------- | ------ |
| 1   | `formation_id` ajouté au fillable de Commande, Service, MenuHebdomadaire | CRITIQUE  | ✅     |
| 2   | Password min:4 → min:8 (Auth, Admin, SuperAdmin)                         | HAUTE     | ✅     |
| 3   | Suppression du mot de passe par défaut '1234' → Str::random(12)          | HAUTE     | ✅     |
| 4   | Dashboard `getRepartition()` : 4 requêtes → 1 seule requête SQL          | HAUTE     | ✅     |
| 5   | Rate limiting sur `/me/password` (throttle:5,1)                          | HAUTE     | ✅     |
| 6   | Tests mis à jour (131/131 passent)                                       | —         | ✅     |

### Recommandations futures

- Migration token storage localStorage → httpOnly cookies
- Ajout d'index BDD sur `users.formation_id`, `commandes.service_id`
- Pagination des endpoints lists (menus, régimes, consommations)
- Intégration PHPStan/Psalm pour analyse statique
- Tests end-to-end supplémentaires (actuellement 1 spec e2e)

---

## 8. QUALITÉ & TESTS

| Métrique               | Valeur       |
| ---------------------- | ------------ |
| Tests totaux           | 131          |
| Assertions             | 279          |
| Fichiers de test       | 15           |
| LOC de test            | 1 659        |
| Ratio test/code        | ~8.5%        |
| Couverture contrôleurs | 100% (10/10) |
| Durée d'exécution      | ~31 secondes |

---

_Rapport généré le 12 juillet 2025 — SGRH v1.0.0_

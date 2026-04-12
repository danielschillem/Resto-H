# ÉVALUATION DU COÛT DE DÉVELOPPEMENT — SGRH

> **Système de Gestion de la Restauration Hospitalière**  
> Date d'évaluation : 12 juillet 2025  
> Méthode : Estimation par points de fonction + effort réel

---

## 1. MÉTHODE D'ÉVALUATION

L'évaluation combine deux approches :

- **Méthode COCOMO II** (Constructive Cost Model) basée sur les lignes de code
- **Estimation par composants fonctionnels** basée sur la complexité de chaque module

### Paramètres de base

| Paramètre                                               | Valeur               |
| ------------------------------------------------------- | -------------------- |
| Total LOC (PHP + TypeScript)                            | ~19 500 lignes       |
| Tests LOC                                               | ~1 660 lignes        |
| Complexité du projet                                    | Moyenne-Haute        |
| Taux journalier développeur senior (Afrique de l'Ouest) | 50 000 – 80 000 FCFA |
| Taux journalier développeur senior (international)      | 300 – 500 USD        |

---

## 2. DÉCOMPOSITION PAR MODULE

### 2.1 Backend Laravel

| Module                                                   | Complexité | Jours estimés | Justification                                     |
| -------------------------------------------------------- | ---------- | ------------- | ------------------------------------------------- |
| Architecture & Setup (Docker, Config, CORS, DB)          | Moyenne    | 3             | Laravel 12, Sanctum, PostgreSQL, Docker           |
| Authentification (login, logout, loginByCode, tokens)    | Haute      | 5             | 2 modes de login, Sanctum, tenant, force password |
| Système Multi-tenant (TenantScope, formation_id)         | Haute      | 4             | Middleware custom, scoping sur tous les modèles   |
| Modèles & Migrations (16 modèles, 24 migrations)         | Moyenne    | 5             | Relations Eloquent, casts, fillable               |
| MenuController (CRUD + hebdomadaire + workflow)          | Haute      | 5             | 8 endpoints, workflow validation, items           |
| CommandeController (CRUD + workflow + livraison)         | Haute      | 4             | Deadline 09h, validation, livraison, paiement     |
| RegimeSpecialController (CRUD + validation)              | Moyenne    | 3             | Workflow 3 états, types de régime                 |
| ConsommationController (saisie + KPIs + articles)        | Haute      | 4             | Agrégations SQL, filtres périodes                 |
| DashboardController (KPIs role-based + charts)           | Haute      | 4             | 4 variantes par rôle, graphiques                  |
| EtatController (rapports + devis + validation)           | Moyenne    | 3             | Agrégations, workflow devis                       |
| AdminController (users, services, params, audit, export) | Haute      | 5             | CRUD + bulk ops + CSV exports + audit log         |
| SuperAdminController (formations, licences, permissions) | Très Haute | 8             | 517 LOC, 13+ endpoints, multi-formation           |
| LicenceController (activation, vérification)             | Moyenne    | 2             | Clés RESTO-XXXX, essai/premium                    |
| Observers (notifications automatiques)                   | Moyenne    | 2             | 3 observers, notifications contextuelles          |
| **Sous-total Backend**                                   |            | **57 jours**  |                                                   |

### 2.2 Frontend Next.js

| Module                                          | Complexité | Jours estimés | Justification                                        |
| ----------------------------------------------- | ---------- | ------------- | ---------------------------------------------------- |
| Architecture (App Router, Layout, Auth context) | Moyenne    | 3             | Next.js 16, React 19, auth provider                  |
| API Client (93 méthodes, ~500 LOC)              | Haute      | 4             | Interceptors, gestion erreurs/tokens                 |
| Types TypeScript (209 lignes d'interfaces)      | Moyenne    | 1             | Typage complet des entités                           |
| Page Login (2 modes + sélecteur formation)      | Haute      | 3             | Login email + code, formation dynamique              |
| Page Super-Admin (4 273 LOC)                    | Très Haute | 10            | CRUD formations, users, licences, stats, permissions |
| Page Admin (1 755 LOC)                          | Très Haute | 6             | CRUD users/services, audit, exports, bulk ops        |
| Page Commandes (1 318 LOC)                      | Haute      | 5             | Formulaires, workflow, filtres, export PDF           |
| Page États (1 086 LOC)                          | Haute      | 4             | Rapport devis, validations, agrégation               |
| Page Menus Spéciaux (777 LOC)                   | Haute      | 3             | Régimes, formulaires, workflow                       |
| Page Menus Hebdo (761 LOC)                      | Haute      | 3             | Composition planning, validation, items              |
| Page Consommations (748 LOC)                    | Haute      | 3             | Saisie, KPIs, graphiques                             |
| Page Services (566 LOC)                         | Moyenne    | 2             | CRUD services                                        |
| Page Licence (495 LOC)                          | Moyenne    | 2             | Activation clé, affichage statut                     |
| Page Dashboard (368 LOC)                        | Haute      | 3             | KPIs dynamiques, charts, commandes récentes          |
| Page Profil (375 LOC)                           | Basse      | 1             | Édition nom/prénom, changement password              |
| Page Notifications (279 LOC)                    | Basse      | 1             | Liste, marquage lu, SSE                              |
| Sidebar + Topbar (585 LOC)                      | Moyenne    | 2             | Navigation par rôle, responsive, user info           |
| ForcePasswordChange + DarkMode                  | Basse      | 1             | Modal changement, toggle thème                       |
| Export PDF (jsPDF + autoTable)                  | Moyenne    | 2             | Templates PDF, en-têtes, données                     |
| **Sous-total Frontend**                         |            | **59 jours**  |                                                      |

### 2.3 Tests & Qualité

| Activité                               | Jours estimés | Justification                               |
| -------------------------------------- | ------------- | ------------------------------------------- |
| Tests Feature (13 fichiers, 131 tests) | 8             | Couverture complète 10 contrôleurs          |
| Test E2E (Playwright)                  | 1             | 1 spec de base                              |
| Debugging & corrections                | 5             | Itérations, fix permissions, tenant scoping |
| **Sous-total Tests**                   | **14 jours**  |                                             |

### 2.4 DevOps & Documentation

| Activité                       | Jours estimés | Justification                               |
| ------------------------------ | ------------- | ------------------------------------------- |
| Configuration Docker + Render  | 2             | Dockerfile, render.yaml, env vars           |
| Configuration Netlify + PWA    | 2             | netlify.toml, manifest.json, service worker |
| Documentation API (585 lignes) | 2             | Tous les endpoints documentés               |
| Documentation utilisateur      | 2             | Guide 387+ lignes                           |
| README + licence projet        | 1             |                                             |
| **Sous-total DevOps/Docs**     | **9 jours**   |                                             |

---

## 3. SYNTHÈSE DES COÛTS

### 3.1 Effort total

| Phase                  | Jours-homme         |
| ---------------------- | ------------------- |
| Backend Laravel        | 57                  |
| Frontend Next.js       | 59                  |
| Tests & Qualité        | 14                  |
| DevOps & Documentation | 9                   |
| **TOTAL**              | **139 jours-homme** |

Soit environ **7 mois** pour un développeur seul à temps plein (20 jours ouvrés/mois).

### 3.2 Coût estimé (grille tarifaire)

#### Grille développeur freelance Afrique de l'Ouest

| Profil                  | Taux jour (FCFA) | Coût total (FCFA) | Coût total (EUR) |
| ----------------------- | ---------------- | ----------------- | ---------------- |
| Junior (1-3 ans)        | 35 000           | 4 865 000         | ~7 400 €         |
| Intermédiaire (3-5 ans) | 60 000           | 8 340 000         | ~12 700 €        |
| Senior (5+ ans)         | 100 000          | 13 900 000        | ~21 200 €        |

#### Grille développeur freelance international

| Profil        | Taux jour (USD) | Coût total (USD) | Coût total (EUR) |
| ------------- | --------------- | ---------------- | ---------------- |
| Junior        | 150             | 20 850           | ~19 200 €        |
| Intermédiaire | 350             | 48 650           | ~44 800 €        |
| Senior        | 600             | 83 400           | ~76 800 €        |

### 3.3 Coût estimé via SSII / Agence

| Type d'agence                         | Coût estimé (FCFA)      | Coût estimé (EUR)  |
| ------------------------------------- | ----------------------- | ------------------ |
| Agence locale (Burkina/Côte d'Ivoire) | 15 000 000 – 25 000 000 | 23 000 – 38 000 €  |
| Agence offshore (Madagascar, Sénégal) | 10 000 000 – 18 000 000 | 15 000 – 27 000 €  |
| Agence européenne                     | 50 000 000 – 80 000 000 | 76 000 – 122 000 € |

---

## 4. VALEUR AJOUTÉE DU PRODUIT

### 4.1 Facteurs de valorisation

| Facteur                                        | Valeur                             |
| ---------------------------------------------- | ---------------------------------- |
| Multi-tenant (SaaS-ready)                      | ×1.5 — réutilisable pour N clients |
| Système de licences intégré                    | ×1.3 — monétisation prête          |
| Architecture moderne (Laravel 12 + Next.js 16) | ×1.2 — maintenabilité élevée       |
| Tests automatisés (131 tests)                  | ×1.2 — qualité assurée             |
| Déploiement cloud (Render + Netlify)           | ×1.1 — production-ready            |
| PWA capable (manifest + service worker)        | ×1.1 — usage mobile                |

### 4.2 Valeur de marché estimée

En tant que produit SaaS prêt à commercialiser :

| Évaluation                                     | Montant (FCFA)          | Montant (EUR)     |
| ---------------------------------------------- | ----------------------- | ----------------- |
| Coût de reproduction (freelance senior local)  | 13 900 000              | ~21 200 €         |
| Valeur produit (avec facteurs ×1.5 SaaS)       | 20 000 000 – 25 000 000 | 30 000 – 38 000 € |
| Valeur de cession (avec clientèle potentielle) | 30 000 000 – 50 000 000 | 46 000 – 76 000 € |

---

## 5. CONCLUSION

**Coût de développement estimé** :

> **8 340 000 FCFA (~12 700 €)** pour un développeur intermédiaire  
> **13 900 000 FCFA (~21 200 €)** pour un développeur senior

**Valeur produit SaaS** :

> **20 000 000 – 25 000 000 FCFA (~30 000 – 38 000 €)**

Le SGRH représente un investissement significatif avec un potentiel de retour élevé grâce à son architecture multi-tenant et son système de licences intégré, permettant une commercialisation rapide auprès des formations sanitaires du Burkina Faso et de la sous-région.

---

_Évaluation réalisée le 12 juillet 2025_

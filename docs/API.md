# Documentation API — SGRH Resto-H

> Système de Gestion de la Restauration Hospitalière  
> Version 1.0.0 — 11 avril 2026  
> Base URL : `https://sgrh-api.onrender.com/api`

---

## Authentification

Toutes les routes protégées nécessitent un token Bearer (Laravel Sanctum).

```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

---

## 1. Auth

### POST `/login`

Connexion utilisateur. Limité à 10 tentatives/min.

**Corps :**
| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `email` | string | ✅ | Email de l'utilisateur |
| `password` | string | ✅ | Mot de passe |
| `formation_code` | string | ❌ | Code de la formation sanitaire |

**Réponse 200 :**

```json
{
  "user": { "id": 1, "nom": "Kaboré", "prenom": "Serge", "role": "prestataire", ... },
  "token": "1|abc123..."
}
```

**Erreurs :** `401` identifiants invalides, `403` compte inactif, `429` trop de tentatives

### POST `/logout`

🔒 Auth requise. Révoque le token courant.

### GET `/me`

🔒 Retourne le profil de l'utilisateur connecté.

### PUT `/me/profile`

🔒 Met à jour le profil (nom, prénom).

| Champ    | Type   | Requis |
| -------- | ------ | ------ |
| `nom`    | string | ❌     |
| `prenom` | string | ❌     |

### POST `/me/password`

🔒 Change le mot de passe.

| Champ                   | Type   | Requis |
| ----------------------- | ------ | ------ |
| `current_password`      | string | ✅     |
| `password`              | string | ✅     |
| `password_confirmation` | string | ✅     |

---

## 2. Dashboard

### GET `/dashboard`

🔒 Tous les rôles. Retourne les KPIs, commandes récentes, graphiques.

**Réponse :**

```json
{
  "kpis": [{ "icon": "fa-bowl-food", "color": "blue", "val": 24, "label": "...", "trend": "up", "trendText": "..." }],
  "commandes_recentes": [...],
  "chart_semaine": { "labels": ["Lun",...], "malades": [...], "personnel": [...], "clients": [...] },
  "repartition": { "labels": ["Malades","Personnel","Clients ext."], "data": [5, 3, 2] }
}
```

Les KPIs varient selon le rôle : prestataire, dsgl, csah, sus/sut.

---

## 3. Menus

### GET `/menus`

🔒 Tous. Liste tous les menus de la formation.

### POST `/menus`

🔒 Rôles : `prestataire`, `dsgl`, `csah`

| Champ                   | Type    | Requis | Valeurs                               |
| ----------------------- | ------- | ------ | ------------------------------------- |
| `intitule`              | string  | ✅     | max 255                               |
| `type_repas`            | string  | ✅     | `petit_dejeuner`, `dejeuner`, `diner` |
| `portions_prevues`      | integer | ✅     | min 1                                 |
| `cout_unitaire`         | integer | ✅     | min 0 (FCFA)                          |
| `allergenes`            | string  | ❌     |                                       |
| `notes_nutritionnelles` | string  | ❌     |                                       |

### PUT `/menus/{id}`

🔒 Met à jour un menu. Mêmes champs (tous optionnels).

### DELETE `/menus/{id}`

🔒 Supprime un menu. Réponse : `204 No Content`

---

## 4. Menus Hebdomadaires

### GET `/menus-hebdomadaires`

🔒 Tous. Liste des menus hebdo avec items et relations.

**Query params :** `?semaine_debut=2026-04-06`

### GET `/menus-hebdomadaires/{id}`

🔒 Détails d'un menu hebdomadaire.

### POST `/menus-hebdomadaires`

🔒 Rôles : `prestataire`, `dsgl`, `csah`

| Champ                  | Type    | Requis            |
| ---------------------- | ------- | ----------------- |
| `semaine_debut`        | date    | ✅                |
| `semaine_fin`          | date    | ✅                |
| `cout_matieres`        | integer | ❌                |
| `cout_main_oeuvre`     | integer | ❌                |
| `items`                | array   | ❌                |
| `items.*.menu_id`      | integer | ✅                |
| `items.*.jour_semaine` | integer | ✅ (0-6, 0=Lundi) |

### POST `/menus-hebdomadaires/{id}/soumettre`

🔒 Rôles : `prestataire`, `dsgl`, `csah`. Soumet le menu pour validation.

### POST `/menus-hebdomadaires/{id}/items`

🔒 Ajoute un item au menu hebdo. Remplace si même jour+type_repas.

### POST `/menus-hebdomadaires/{id}/valider`

🔒 Rôle : `dsgl` uniquement. Valide le menu hebdomadaire.

### POST `/menus-hebdomadaires/{id}/rejeter`

🔒 Rôle : `dsgl` uniquement.

| Champ         | Type   | Requis |
| ------------- | ------ | ------ |
| `commentaire` | string | ✅     |

---

## 5. Commandes

### GET `/commandes`

🔒 Tous. Liste paginée (20/page).

**Query params :** `?page=1&type=malades&statut=validee&date_repas=2026-04-11&repas=dejeuner`

**Réponse :**

```json
{
  "data": [{ "id": 1, "reference": "#2401", "type": "malades", ... }],
  "meta": { "current_page": 1, "last_page": 3, "total": 45 }
}
```

### GET `/commandes/{id}`

🔒 Détails d'une commande avec relations (service, menu, soumis_par, valide_par).

### POST `/commandes`

🔒 Tous. **Deadline : avant 09h00** (sinon 422).

| Champ             | Type    | Requis | Valeurs                                  |
| ----------------- | ------- | ------ | ---------------------------------------- |
| `type`            | string  | ✅     | `malades`, `personnel`, `client_externe` |
| `service_id`      | integer | ✅     | ID service existant                      |
| `date_repas`      | date    | ✅     |                                          |
| `repas`           | string  | ✅     | `petit_dejeuner`, `dejeuner`, `diner`    |
| `nb_portions`     | integer | ✅     | min 1                                    |
| `menu_id`         | integer | ❌     |                                          |
| `heure_livraison` | string  | ❌     | ex: "11:30"                              |
| `montant`         | integer | ❌     | Pour clients externes                    |
| `client_nom`      | string  | ❌     | Pour clients externes                    |
| `observations`    | string  | ❌     |                                          |

### GET `/commandes-a-valider`

🔒 Rôles : `csah`, `dsgl`. Liste des commandes en attente de validation.

### POST `/commandes/{id}/valider`

🔒 Rôles : `csah`, `dsgl`. Valide une commande → statut `validee`.

### POST `/commandes/{id}/rejeter`

🔒 Rôles : `csah`, `dsgl`.

| Champ         | Type   | Requis |
| ------------- | ------ | ------ |
| `motif_rejet` | string | ✅     |

### POST `/commandes/{id}/livrer`

🔒 Rôle : `prestataire` uniquement. Commande doit avoir statut `validee`.

### POST `/commandes/{id}/paiement`

🔒 Rôles : `csah`, `dsgl`. Enregistre le paiement → `statut_paiement = paye`.

---

## 6. Régimes Spéciaux

### GET `/regimes-speciaux`

🔒 Tous.

**Query params :** `?statut=en_attente&service_id=1&type_regime=sans_sel`

### GET `/regimes-speciaux/{id}`

🔒 Détails d'un régime spécial.

### POST `/regimes-speciaux`

🔒 Tous.

| Champ                  | Type    | Requis | Valeurs                                                                                                   |
| ---------------------- | ------- | ------ | --------------------------------------------------------------------------------------------------------- |
| `patient_nom`          | string  | ✅     |                                                                                                           |
| `lit`                  | string  | ✅     | ex: "Ped-12"                                                                                              |
| `service_id`           | integer | ✅     |                                                                                                           |
| `type_regime`          | string  | ✅     | `sans_sel`, `diabetique`, `hyposode`, `post_op_mixe`, `hyper_proteine`, `sans_gluten`, `enrichi`, `autre` |
| `date_debut`           | date    | ✅     |                                                                                                           |
| `duree_jours`          | integer | ✅     | 1-365                                                                                                     |
| `medecin_prescripteur` | string  | ✅     |                                                                                                           |
| `instructions`         | string  | ❌     |                                                                                                           |

### PUT `/regimes-speciaux/{id}`

🔒 Modification possible uniquement si statut = `en_attente`.

### POST `/regimes-speciaux/{id}/valider`

🔒 Rôles : `csah`, `dsgl`.

### POST `/regimes-speciaux/{id}/rejeter`

🔒 Rôles : `csah`, `dsgl`.

| Champ         | Type   | Requis       |
| ------------- | ------ | ------------ |
| `motif_rejet` | string | ✅ (max 500) |

### POST `/regimes-speciaux/{id}/terminer`

🔒 Rôles : `csah`, `dsgl`. Termine un régime → statut `termine`.

---

## 7. Consommations

### GET `/consommations`

🔒 Tous.

**Query params :** `?periode=semaine` | `?periode=semaine_precedente` | `?periode=mois` | `?semaine_debut=2026-04-06&semaine_fin=2026-04-12`

**Réponse :**

```json
{
  "consommations": [...],
  "totaux": { "total_portions": 1016, "cout_prevu": 587500, "cout_reel": 597500, "ecart": 10000 }
}
```

### GET `/consommations/kpis`

🔒 KPIs de la semaine en cours.

**Réponse :**

```json
{
  "portions_servies": 1016,
  "cout_reel": 597500,
  "ecart_budgetaire": 10000,
  "taux_gaspillage": 1.7
}
```

### GET `/consommations/articles`

🔒 Articles consommés.

**Query params :** `?periode=semaine` | `?semaine_debut=2026-04-06`

### GET `/consommations/ecarts-services`

🔒 Écarts par service (prévisions vs réel).

### POST `/consommations`

🔒 Rôles : `csah`, `sut`.

| Champ          | Type    | Requis |
| -------------- | ------- | ------ |
| `date`         | date    | ✅     |
| `repas`        | string  | ✅     |
| `menu_servi`   | string  | ✅     |
| `nb_malades`   | integer | ✅     |
| `nb_personnel` | integer | ✅     |
| `nb_clients`   | integer | ✅     |
| `cout_prevu`   | integer | ✅     |
| `cout_reel`    | integer | ✅     |

`total_portions` et `ecart` sont calculés automatiquement.

---

## 8. États & Rapports

### GET `/etats/commandes`

🔒 Rôles : `dsgl`, `csah`.

**Query params :** `?semaine_debut=2026-04-06&semaine_fin=2026-04-12`

**Réponse :**

```json
{
  "semaine_debut": "2026-04-06",
  "semaine_fin": "2026-04-12",
  "services": [
    { "nom": "Pédiatrie", "jours": [24, 0, 0, 0, 0], "total": 24, "pct": "33%" }
  ],
  "totaux": [24, 18, 31, 12, 8],
  "grand_total": 93
}
```

### GET `/etats/devis`

🔒 Rôles : `dsgl`, `csah`. Liste des devis estimatifs.

### POST `/etats/devis`

🔒 Rôles : `dsgl`, `csah`. Crée un devis avec lignes.

| Champ                     | Type    | Requis     |
| ------------------------- | ------- | ---------- |
| `semaine_debut`           | date    | ✅         |
| `semaine_fin`             | date    | ✅         |
| `lignes`                  | array   | ✅ (min 1) |
| `lignes.*.article`        | string  | ✅         |
| `lignes.*.unite`          | string  | ✅         |
| `lignes.*.qte_estimee`    | numeric | ✅         |
| `lignes.*.prix_unitaire`  | integer | ✅         |
| `lignes.*.montant_estime` | integer | ✅         |

### POST `/etats/devis/{id}/valider`

🔒 Rôle : `dsgl` uniquement.

### POST `/etats/devis/{id}/rejeter`

🔒 Rôle : `dsgl` uniquement.

| Champ         | Type   | Requis |
| ------------- | ------ | ------ |
| `commentaire` | string | ✅     |

### GET `/etats/validations`

🔒 Rôles : `dsgl`, `csah`. Historique des validations (menus hebdo + devis).

---

## 9. Notifications

### GET `/notifications`

🔒 Tous. Notifications de l'utilisateur (max 20).

### POST `/notifications/{id}/lu`

🔒 Marque une notification comme lue.

### POST `/notifications/tout-lire`

🔒 Marque toutes les notifications comme lues.

---

## 10. Administration

Toutes les routes admin sont réservées au rôle **`dsgl`**.

### GET `/admin/users`

Liste des utilisateurs de la formation.

### POST `/admin/users`

Crée un utilisateur.

| Champ      | Type   | Requis | Valeurs                                     |
| ---------- | ------ | ------ | ------------------------------------------- |
| `nom`      | string | ✅     |                                             |
| `prenom`   | string | ✅     |                                             |
| `email`    | string | ✅     | unique                                      |
| `password` | string | ✅     | min 4                                       |
| `role`     | string | ✅     | `prestataire`, `dsgl`, `csah`, `sus`, `sut` |
| `service`  | string | ❌     |                                             |

### PUT `/admin/users/{id}`

Met à jour un utilisateur (mêmes champs, tous optionnels).

### POST `/admin/users/bulk-activate`

Active en masse. Corps : `{ "ids": [1, 2, 3] }`

### POST `/admin/users/bulk-deactivate`

Désactive en masse.

### GET `/admin/services`

Liste des services.

### POST `/admin/services`

Crée un service.

| Champ         | Type    | Requis |
| ------------- | ------- | ------ |
| `nom`         | string  | ✅     |
| `lits_actifs` | integer | ✅     |
| `responsable` | string  | ❌     |

### PUT `/admin/services/{id}`

Met à jour un service.

### GET `/admin/parametres`

Liste des paramètres système.

### PUT `/admin/parametres/{id}`

Met à jour la valeur d'un paramètre.

### GET `/admin/permissions`

Liste des permissions par rôle.

### GET `/admin/audit-logs`

Journal d'audit paginé (30/page).

**Query params :** `?page=1`

### GET `/admin/export/users`

Export CSV des utilisateurs.

### GET `/admin/export/services`

Export CSV des services.

### GET `/admin/export/audit-logs`

Export CSV du journal d'audit.

---

## 11. Licence

### GET `/licence`

🔓 Public. Statut de la licence.

**Réponse :**

```json
{
  "statut": "essai",
  "date_debut": "2026-04-01",
  "date_fin": "2026-04-30",
  "jours_restants": 19,
  "valide": true
}
```

### POST `/licence/activer`

🔒 Active une licence premium.

| Champ       | Type   | Requis |
| ----------- | ------ | ------ | ------------------------------------ |
| `cle`       | string | ✅     | Format : `RESTO-XXXX-XXXX-XXXX-XXXX` |
| `titulaire` | string | ❌     |

---

## 12. Super Admin

Routes sous `/super-admin/`. Réservées au rôle **`super_admin`**.

### GET `/super-admin/stats`

Statistiques globales du système.

### CRUD `/super-admin/formations`

Gestion des formations sanitaires (GET, POST, PUT, DELETE).

### GET `/super-admin/formations/{id}/users`

Utilisateurs d'une formation.

### POST `/super-admin/users/{id}/reset-password`

Réinitialise le mot de passe d'un utilisateur.

---

## Codes d'erreur

| Code  | Signification                         |
| ----- | ------------------------------------- |
| `200` | Succès                                |
| `201` | Créé avec succès                      |
| `204` | Supprimé (pas de contenu)             |
| `401` | Non authentifié                       |
| `403` | Accès non autorisé (rôle insuffisant) |
| `404` | Ressource non trouvée                 |
| `422` | Erreur de validation                  |
| `429` | Trop de tentatives                    |

---

## Rôles et permissions

| Rôle          | Description                                    | Accès principal                     |
| ------------- | ---------------------------------------------- | ----------------------------------- |
| `super_admin` | Administrateur système                         | Toutes les routes                   |
| `prestataire` | Prestataire de restauration                    | Menus, livraisons                   |
| `dsgl`        | Direction des Services Généraux et Logistiques | Admin, validation, états            |
| `csah`        | Chef Service Administratif et Hôtelier         | Validation commandes, consommations |
| `sus`         | Surveillant d'Unité de Soins                   | Commandes, régimes spéciaux         |
| `sut`         | Surveillant d'Unité Technique                  | Commandes, consommations            |

---

## Multi-tenancy

Toutes les données sont scopées par `formation_id`. Le scope est appliqué automatiquement via le middleware `TenantScope` basé sur le `formation_id` de l'utilisateur connecté.

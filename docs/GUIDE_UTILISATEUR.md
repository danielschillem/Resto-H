# Guide Utilisateur — SGRH Resto-H

> Système de Gestion de la Restauration Hospitalière  
> Version 1.0.0 — Avril 2026

---

## Table des matières

1. [Connexion](#1-connexion)
2. [Tableau de bord](#2-tableau-de-bord)
3. [Gestion des menus](#3-gestion-des-menus)
4. [Commandes de repas](#4-commandes-de-repas)
5. [Régimes spéciaux](#5-régimes-spéciaux)
6. [Consommations](#6-consommations)
7. [États et rapports](#7-états-et-rapports)
8. [Administration](#8-administration)
9. [Profil et notifications](#9-profil-et-notifications)
10. [Rôles et permissions](#10-rôles-et-permissions)

---

## 1. Connexion

### Comment se connecter

1. Rendez-vous sur l'application : **https://sgrh-app.netlify.app**
2. Sélectionnez votre **profil** (rôle) :
   - **Prestataire** — Prestataire de restauration
   - **DSGL** — Direction des Services Généraux et Logistiques
   - **CSAH** — Chef Service Administratif et Hôtelier
   - **SUS / SUT** — Surveillants d'unités
3. Saisissez votre **code d'accès** (mot de passe)
4. Cliquez sur **Se connecter**

### Comptes de démonstration

| Profil      | Email                        | Mot de passe |
| ----------- | ---------------------------- | ------------ |
| Prestataire | prestataire@chr-tenkodogo.bf | 1234         |
| DSGL        | dsgl@chr-tenkodogo.bf        | 1234         |
| CSAH        | csah@chr-tenkodogo.bf        | 1234         |
| SUS         | sus@chr-tenkodogo.bf         | 1234         |
| SUT         | sut@chr-tenkodogo.bf         | 1234         |

---

## 2. Tableau de bord

Le tableau de bord affiche un résumé personnalisé selon votre rôle :

### Prestataire

- **Portions prévues** — Nombre total de portions à préparer aujourd'hui
- **Commandes validées** — Nombre de commandes confirmées
- **Patients en cours** — Nombre total de lits actifs
- **Budget semaine** — Consommation réelle en FCFA

### DSGL

- **Documents à valider** — Commandes et menus en attente
- **Consommation semaine** — Coût total de la semaine en FCFA
- **Patients hospitalisés** — Capacité totale
- **Écart budgétaire** — Différence entre prévu et réel

### CSAH

- **Repas à servir** — Portions prévues pour aujourd'hui
- **Régimes spéciaux actifs** — Régimes validés en cours
- **Satisfaction** — Indicateur de satisfaction
- **Livraisons à l'heure** — Taux de ponctualité

### SUS / SUT

- **Patients dans mon service** — Lits actifs du service
- **Commandes du jour** — Commandes soumises aujourd'hui
- **Régimes spéciaux** — Régimes actifs du service
- **Portions prévues** — Portions commandées

### Graphiques

- **Graphique en barres** — Répartition des repas par jour de la semaine (malades, personnel, clients)
- **Graphique en anneau** — Répartition par type de commande

---

## 3. Gestion des menus

### Proposer un menu hebdomadaire

1. Accédez à **Menus Hebdo** dans le menu latéral
2. Cliquez sur **Nouveau menu hebdomadaire**
3. Sélectionnez la **période** (semaine début / fin)
4. Pour chaque jour, assignez un menu pour :
   - Petit-déjeuner
   - Déjeuner
   - Dîner
5. Renseignez les **coûts** (matières premières, main d'œuvre)
6. Cliquez sur **Soumettre** pour envoyer à validation

### Valider un menu (DSGL uniquement)

1. Les menus soumis apparaissent avec le statut **Soumis**
2. Cliquez sur **Valider** pour approuver
3. Ou cliquez sur **Rejeter** et indiquez le motif

### Gérer les plats

- **Ajouter un plat** : Nom, type de repas, portions prévues, coût unitaire
- **Modifier** : Cliquez sur le plat puis modifiez les champs
- **Supprimer** : Suppression possible si le plat n'est pas utilisé dans un menu actif

---

## 4. Commandes de repas

### Créer une commande

> **Important** : Les commandes doivent être soumises **avant 09h00**. Passé cet horaire, la création est bloquée.

1. Accédez à **Commandes** dans le menu latéral
2. Cliquez sur **Nouvelle commande**
3. Remplissez le formulaire :
   - **Type** : Malades, Personnel, ou Client externe
   - **Service** : Le service concerné
   - **Date du repas** et **repas** (petit-déjeuner, déjeuner, dîner)
   - **Nombre de portions**
   - **Menu** (optionnel) : Sélectionnez parmi les menus disponibles
   - Pour les clients externes : nom du client et montant
4. Cliquez sur **Enregistrer**

### Onglets de la page commandes

| Onglet               | Contenu                                                   |
| -------------------- | --------------------------------------------------------- |
| **Malades**          | Commandes de repas pour les patients hospitalisés         |
| **Personnel**        | Commandes pour le personnel de l'hôpital                  |
| **Clients externes** | Commandes pour les visiteurs et accompagnants             |
| **À valider**        | Commandes en attente de validation (CSAH/DSGL uniquement) |

### Filtrer les commandes

- **Par date** : Sélectionnez une date spécifique
- **Par repas** : Petit-déjeuner, Déjeuner, Dîner
- **Par statut** : En attente, Validée, En cours, Livrée, Rejetée

### Workflow de la commande

```
Créée (en_attente) → Validée (validee) → Livrée (livree)
                   ↘ Rejetée (rejetee)
```

### Valider ou rejeter (CSAH / DSGL)

1. Allez dans l'onglet **À valider**
2. Cliquez sur ✓ pour **valider** ou ✗ pour **rejeter**
3. En cas de rejet, saisissez le motif

### Livrer une commande (Prestataire)

1. Les commandes **validées** affichent un bouton 🚚
2. Cliquez sur le bouton puis **Confirmer la livraison**
3. Le statut passe à "Livrée"

> Seules les commandes avec le statut **Validée** peuvent être livrées.

### Enregistrer un paiement (CSAH / DSGL)

Pour les commandes de type **Client externe** :

1. Une fois la commande **livrée**, le bouton 💰 apparaît
2. Cliquez puis **Confirmer le paiement**
3. Le statut de paiement passe à "Payé"

### Exporter les données

- **Bon de livraison PDF** : Génère un document PDF récapitulatif avec toutes les commandes validées, les régimes spéciaux et un résumé
- **Bon de livraison CSV** : Export tableur des mêmes données

---

## 5. Régimes spéciaux

### Créer une demande de régime spécial

1. Accédez à **Régimes spéciaux** dans le menu latéral
2. Cliquez sur **Nouvelle demande**
3. Remplissez :
   - **Nom du patient** et **lit**
   - **Service**
   - **Type de régime** : Sans sel, Diabétique, Hyposodé, Post-opératoire mixé, Hyper-protéiné, Sans gluten, Enrichi, Autre
   - **Date de début** et **durée** (en jours)
   - **Médecin prescripteur**
   - **Instructions** (optionnel)

### Types de régimes

| Type           | Description                        |
| -------------- | ---------------------------------- |
| Sans sel       | Régime hyposodé strict             |
| Diabétique     | Contrôle glycémique                |
| Hyposodé       | Réduction de sel modérée           |
| Post-op. mixé  | Alimentation mixée post-opératoire |
| Hyper-protéiné | Apport protéique renforcé          |
| Sans gluten    | Exclusion du gluten                |
| Enrichi        | Alimentation enrichie              |
| Autre          | Régime personnalisé                |

### Workflow

```
En attente → Validé → Terminé
           ↘ Rejeté
```

### Pour le prestataire

Le prestataire voit les régimes en **lecture seule** — c'est une liste des régimes à prendre en compte pour les livraisons.

---

## 6. Consommations

### Saisir une consommation (CSAH / SUT)

1. Accédez à **Consommations**
2. Cliquez sur **Saisir une consommation**
3. Remplissez :
   - **Date** et **repas**
   - **Menu servi** (texte libre)
   - **Nombre de portions** : malades, personnel, clients
   - **Coût prévu** et **coût réel** (en FCFA)
4. Le total des portions et l'écart sont calculés automatiquement

### Indicateurs (KPIs)

- **Portions servies** — Total de la semaine
- **Coût réel** — Dépenses effectives en FCFA
- **Écart budgétaire** — Différence coût réel - coût prévu
- **Taux de gaspillage** — Pourcentage d'écart

### Filtrer par période

- **Semaine en cours**
- **Semaine précédente**
- **Mois en cours**

### Exporter

- **PDF** : Tableau des consommations avec calculs
- **CSV** : Export tableur pour analyse

---

## 7. États et rapports

Page accessible aux rôles **DSGL** et **CSAH**.

### Onglet 1 — État des commandes

Tableau récapitulatif des portions commandées par service et par jour de la semaine (Lundi à Vendredi), avec totaux et pourcentages.

### Onglet 2 — État des consommations

Liste des articles consommés avec :

- Quantités prévues vs réelles
- Écarts
- Coûts unitaires et totaux

Filtrable par période (semaine, semaine précédente, mois).

### Onglet 3 — Devis estimatif

- **Liste** des devis estimatifs soumis
- **Créer un devis** : Ajoutez des lignes (article, unité, quantité, prix unitaire)
- **Valider / Rejeter** (DSGL uniquement)

### Onglet 4 — Validation DSGL

Historique de toutes les validations (menus hebdomadaires et devis) :

- Document, période, soumis par, date de soumission, validé par, statut

### Exporter

Chaque onglet propose des boutons **PDF** et **CSV** pour l'export.

---

## 8. Administration

Page accessible au rôle **DSGL** uniquement.

### Onglet Utilisateurs

- **Lister** tous les utilisateurs de la formation
- **Créer** un utilisateur : nom, prénom, email, mot de passe, rôle, service
- **Modifier** : Changer les informations d'un utilisateur
- **Activer / Désactiver** : En masse ou individuellement
- **Exporter** la liste en CSV

### Onglet Services

- **Lister** les services hospitaliers
- **Créer** un service : nom, nombre de lits actifs, responsable
- **Modifier** les informations
- **Exporter** en CSV

### Onglet Paramètres

Consulter et modifier les paramètres système :

- Tarif malade par jour (FCFA)
- Tarif personnel par repas (FCFA)
- Tarif visiteur par couvert (FCFA)

### Onglet Permissions

Visualiser la matrice de permissions par rôle (lecture seule).

### Onglet Journal d'audit

Historique de toutes les actions du système :

- Utilisateur, action, entité, détails, adresse IP, date
- Paginé (30 entrées par page)
- Export CSV disponible

---

## 9. Profil et notifications

### Mon profil

1. Cliquez sur votre nom dans la barre latérale ou accédez à **Profil**
2. Vous pouvez modifier votre **nom** et **prénom**
3. Section **Changer le mot de passe** :
   - Mot de passe actuel
   - Nouveau mot de passe
   - Confirmation

### Notifications

- Accédez à **Notifications** dans le menu latéral
- Les notifications non lues sont marquées d'un point
- **Marquer comme lu** : Cliquez sur une notification
- **Tout marquer comme lu** : Bouton en haut de la liste
- Types de notifications : commande, menu, régime, devis, état

---

## 10. Rôles et permissions

### Matrice d'accès

| Fonctionnalité             | Prestataire | DSGL | CSAH | SUS | SUT |
| -------------------------- | :---------: | :--: | :--: | :-: | :-: |
| Dashboard                  |     ✅      |  ✅  |  ✅  | ✅  | ✅  |
| Proposer des menus         |     ✅      |  ✅  |  ✅  | ❌  | ❌  |
| Valider des menus          |     ❌      |  ✅  |  ❌  | ❌  | ❌  |
| Créer des commandes        |     ❌      |  ✅  |  ✅  | ✅  | ✅  |
| Valider des commandes      |     ❌      |  ✅  |  ✅  | ❌  | ❌  |
| Livrer des commandes       |     ✅      |  ❌  |  ❌  | ❌  | ❌  |
| Régimes spéciaux (créer)   |     ❌      |  ✅  |  ✅  | ✅  | ✅  |
| Régimes spéciaux (valider) |     ❌      |  ✅  |  ✅  | ❌  | ❌  |
| Consommations (saisir)     |     ❌      |  ❌  |  ✅  | ❌  | ✅  |
| États & Rapports           |     ❌      |  ✅  |  ✅  | ❌  | ❌  |
| Administration             |     ❌      |  ✅  |  ❌  | ❌  | ❌  |
| Bon de livraison (export)  |     ✅      |  ❌  |  ❌  | ❌  | ❌  |

### Deadline de commande

- **Avant 09h00** : Création de commandes ouverte
- **Après 09h00** : La création est bloquée automatiquement
- Un bandeau vert (avant) ou rouge (après) indique l'état du délai

---

## Support

En cas de problème, contactez l'administrateur DSGL de votre formation sanitaire.

**Application développée par :** DEVBACKEND — Daniel SCHILLEM  
**Licence :** Voir la page Licence dans l'application  
**Version :** 1.0.0

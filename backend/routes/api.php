<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommandeController;
use App\Http\Controllers\Api\ConsommationController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EtatController;
use App\Http\Controllers\Api\LicenceController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\RegimeSpecialController;
use App\Http\Controllers\Api\SuperAdminController;
use Illuminate\Support\Facades\Route;

// Auth publiques
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/login-code', [AuthController::class, 'loginByCode'])->middleware('throttle:10,1');

// Licence (publique pour la lecture)
Route::get('/licence', [LicenceController::class, 'index']);

// Formations sanitaires publiques (liste active pour page de connexion)
Route::get('/formations/active', [SuperAdminController::class, 'formationsActive']);
Route::get('/formations/public/{code}', [SuperAdminController::class, 'formationPublicInfo']);

// Routes protégées
Route::middleware('auth:sanctum')->group(function () {
    // Auth — tous les rôles
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me/profile', [AuthController::class, 'updateProfile']);
    Route::post('/me/password', [AuthController::class, 'changePassword'])->middleware('throttle:5,1');
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Licence — activation (gérant/dsgl uniquement par convention)
    Route::post('/licence/activer', [LicenceController::class, 'activer']);

    // Notifications — tous les rôles
    Route::get('/notifications', [AdminController::class, 'notifications']);
    Route::post('/notifications/{notification}/lu', [AdminController::class, 'marquerLu']);
    Route::post('/notifications/tout-lire', [AdminController::class, 'toutMarquerLu']);

    // ── Services : liste pour tous les rôles (formulaires, filtres) ────
    Route::get('/services', [AdminController::class, 'services']);

    // ── Menus : consultation pour tous les rôles ─────────────────────────
    Route::get('/menus', [MenuController::class, 'index']);
    Route::get('/menus/{menu}', [MenuController::class, 'show']);
    Route::get('/menus-hebdomadaires', [MenuController::class, 'hebdomadaires']);
    Route::get('/menus-hebdomadaires/{menuHebdomadaire}', [MenuController::class, 'showHebdomadaire']);

    // Menus : gestion (création, soumission) — prestataire, DSGL, CSAH
    Route::middleware('role:prestataire,dsgl,csah')->group(function () {
        Route::post('/menus', [MenuController::class, 'store']);
        Route::put('/menus/{menu}', [MenuController::class, 'update']);
        Route::delete('/menus/{menu}', [MenuController::class, 'destroy']);
        Route::post('/menus-hebdomadaires', [MenuController::class, 'storeHebdomadaire']);
        Route::post('/menus-hebdomadaires/{menuHebdomadaire}/soumettre', [MenuController::class, 'soumettre']);
        Route::post('/menus-hebdomadaires/{menuHebdomadaire}/items', [MenuController::class, 'addItem']);
    });

    // Validation menus hebdo : DSGL
    Route::middleware('role:dsgl')->group(function () {
        Route::post('/menus-hebdomadaires/{menuHebdomadaire}/valider', [MenuController::class, 'validerMenu']);
        Route::post('/menus-hebdomadaires/{menuHebdomadaire}/rejeter', [MenuController::class, 'rejeterMenu']);
    });

    // ── Commandes : tous les rôles peuvent consulter ────────────────────────
    Route::get('/commandes', [CommandeController::class, 'index']);
    Route::get('/commandes/{commande}', [CommandeController::class, 'show']);

    // Créer une commande : tous les rôles
    Route::post('/commandes', [CommandeController::class, 'store']);

    // Valider/rejeter : CSAH, DSGL
    Route::middleware('role:csah,dsgl')->group(function () {
        Route::get('/commandes-a-valider', [CommandeController::class, 'aValider']);
        Route::post('/commandes/{commande}/valider', [CommandeController::class, 'valider']);
        Route::post('/commandes/{commande}/rejeter', [CommandeController::class, 'rejeter']);
        Route::post('/commandes/{commande}/paiement', [CommandeController::class, 'enregistrerPaiement']);
    });

    // Livrer : prestataire
    Route::middleware('role:prestataire')->group(function () {
        Route::post('/commandes/{commande}/livrer', [CommandeController::class, 'livrer']);
    });

    // ── Régimes spéciaux : tous les rôles peuvent voir et créer ────────────
    Route::apiResource('regimes-speciaux', RegimeSpecialController::class)->only(['index', 'store', 'show'])->parameters(['regimes-speciaux' => 'regime']);
    Route::put('/regimes-speciaux/{regime}', [RegimeSpecialController::class, 'update']);

    // Valider/rejeter/terminer régimes : CSAH, DSGL
    Route::middleware('role:csah,dsgl')->group(function () {
        Route::post('/regimes-speciaux/{regime}/valider', [RegimeSpecialController::class, 'valider']);
        Route::post('/regimes-speciaux/{regime}/rejeter', [RegimeSpecialController::class, 'rejeter']);
        Route::post('/regimes-speciaux/{regime}/terminer', [RegimeSpecialController::class, 'terminer']);
    });

    // ── Consommations ───────────────────────────────────────────────────────
    Route::get('/consommations', [ConsommationController::class, 'index']);
    Route::get('/consommations/kpis', [ConsommationController::class, 'kpis']);
    Route::get('/consommations/articles', [ConsommationController::class, 'articles']);
    Route::get('/consommations/ecarts-services', [ConsommationController::class, 'ecartsParService']);

    // Saisie consommations : CSAH, SUT
    Route::middleware('role:csah,sut')->group(function () {
        Route::post('/consommations', [ConsommationController::class, 'store']);
    });

    // ── États & Rapports : DSGL, CSAH ──────────────────────────────────────
    Route::middleware('role:dsgl,csah')->group(function () {
        Route::get('/etats/commandes', [EtatController::class, 'etatCommandes']);
        Route::get('/etats/devis', [EtatController::class, 'devis']);
        Route::post('/etats/devis', [EtatController::class, 'storeDevis']);
        Route::get('/etats/validations', [EtatController::class, 'validations']);
    });

    // Validation devis : DSGL
    Route::middleware('role:dsgl')->group(function () {
        Route::post('/etats/devis/{devis}/valider', [EtatController::class, 'validerDevis']);
        Route::post('/etats/devis/{devis}/rejeter', [EtatController::class, 'rejeterDevis']);
    });

    // ── Administration : DSGL uniquement ──────────────────────────────────
    Route::middleware('role:dsgl')->group(function () {
        Route::get('/admin/users', [AdminController::class, 'users']);
        Route::post('/admin/users', [AdminController::class, 'storeUser']);
        Route::put('/admin/users/{user}', [AdminController::class, 'updateUser']);
        Route::get('/admin/services', [AdminController::class, 'services']);
        Route::post('/admin/services', [AdminController::class, 'storeService']);
        Route::put('/admin/services/{service}', [AdminController::class, 'updateService']);
        Route::get('/admin/parametres', [AdminController::class, 'parametres']);
        Route::put('/admin/parametres/{parametre}', [AdminController::class, 'updateParametre']);
        Route::get('/admin/permissions', [AdminController::class, 'permissions']);
        // Journal d'audit
        Route::get('/admin/audit-logs', [AdminController::class, 'auditLogs']);
        // Exports CSV
        Route::get('/admin/export/users', [AdminController::class, 'exportUsers']);
        Route::get('/admin/export/services', [AdminController::class, 'exportServices']);
        Route::get('/admin/export/audit-logs', [AdminController::class, 'exportAuditLogs']);
        // Opérations en masse
        Route::post('/admin/users/bulk-activate', [AdminController::class, 'bulkActivateUsers']);
        Route::post('/admin/users/bulk-deactivate', [AdminController::class, 'bulkDeactivateUsers']);
    });

    // ── Super Admin ─────────────────────────────────────────────────────────
    Route::middleware('super_admin')->prefix('super-admin')->group(function () {
        Route::get('/stats', [SuperAdminController::class, 'stats']);

        // Formations sanitaires
        Route::get('/formations', [SuperAdminController::class, 'formations']);
        Route::post('/formations', [SuperAdminController::class, 'storeFormation']);
        Route::put('/formations/{formation}', [SuperAdminController::class, 'updateFormation']);
        Route::delete('/formations/{formation}', [SuperAdminController::class, 'destroyFormation']);
        Route::get('/formations/{formation}/users', [SuperAdminController::class, 'formationUsers']);
        Route::post('/formations/{formation}/users', [SuperAdminController::class, 'storeFormationUser']);

        // Users
        Route::get('/users', [SuperAdminController::class, 'users']);
        Route::post('/users', [SuperAdminController::class, 'storeUser']);
        Route::put('/users/{user}', [SuperAdminController::class, 'updateUser']);
        Route::delete('/users/{user}', [SuperAdminController::class, 'destroyUser']);
        Route::post('/users/{user}/reset-password', [SuperAdminController::class, 'resetPassword']);

        // Permissions
        Route::get('/permissions', [SuperAdminController::class, 'permissions']);
        Route::post('/permissions', [SuperAdminController::class, 'updatePermissions']);

        // Licence
        Route::get('/licence', [SuperAdminController::class, 'licence']);
        Route::get('/formations/{formation}/licence', [SuperAdminController::class, 'formationLicence']);
        Route::post('/licence/activer', [SuperAdminController::class, 'activerLicence']);
        Route::post('/licence/reset', [SuperAdminController::class, 'resetEssai']);
        Route::get('/licence/generer-cle', [SuperAdminController::class, 'genererCle']);

        // Audit logs & Exports
        Route::get('/audit-logs', [SuperAdminController::class, 'auditLogs']);
        Route::get('/export/users', [SuperAdminController::class, 'exportUsers']);
        Route::get('/export/formations', [SuperAdminController::class, 'exportFormations']);
        Route::get('/export/audit-logs', [SuperAdminController::class, 'exportAuditLogs']);

        // Analytics
        Route::get('/analytics', [SuperAdminController::class, 'analytics']);

        // Services
        Route::get('/services', [SuperAdminController::class, 'services']);
        Route::post('/services', [SuperAdminController::class, 'storeService']);
        Route::put('/services/{service}', [SuperAdminController::class, 'updateService']);
        Route::delete('/services/{service}', [SuperAdminController::class, 'destroyService']);

        // Bulk operations
        Route::post('/users/bulk-activate', [SuperAdminController::class, 'bulkActivateUsers']);
        Route::post('/users/bulk-deactivate', [SuperAdminController::class, 'bulkDeactivateUsers']);
        Route::post('/formations/bulk-activate', [SuperAdminController::class, 'bulkActivateFormations']);
        Route::post('/formations/bulk-deactivate', [SuperAdminController::class, 'bulkDeactivateFormations']);

        // System config
        Route::get('/config', [SuperAdminController::class, 'systemConfig']);
        Route::post('/config', [SuperAdminController::class, 'updateSystemConfig']);
    });
});

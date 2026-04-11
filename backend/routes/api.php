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

// Temporary debug endpoint — REMOVE after testing
Route::get('/debug-db', function () {
    try {
        // Wipe and re-migrate since DB is in broken state
        \Illuminate\Support\Facades\Artisan::call('db:wipe', ['--force' => true]);
        $wipeOutput = \Illuminate\Support\Facades\Artisan::output();
        
        // Run migrations from scratch
        $exitCode = \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $migrateOutput = \Illuminate\Support\Facades\Artisan::output();
        
        // Seed
        $seedCode = \Illuminate\Support\Facades\Artisan::call('db:seed', ['--force' => true]);
        $seedOutput = \Illuminate\Support\Facades\Artisan::output();
        
        return response()->json([
            'wipe_output' => $wipeOutput,
            'migrate_exit_code' => $exitCode,
            'migrate_output' => $migrateOutput,
            'seed_exit_code' => $seedCode,
            'seed_output' => $seedOutput,
            'users_count' => \App\Models\User::count(),
            'users' => \App\Models\User::select('id', 'email', 'role')->get(),
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
        ], 500);
    }
});

// Licence (publique pour la lecture)
Route::get('/licence', [LicenceController::class, 'index']);

// Info publique d'une formation sanitaire (pour page de connexion dédiée)
Route::get('/formations/public/{code}', [SuperAdminController::class, 'formationPublicInfo']);

// Routes protégées
Route::middleware('auth:sanctum')->group(function () {
    // Auth — tous les rôles
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Licence — activation (gérant/dsgl uniquement par convention)
    Route::post('/licence/activer', [LicenceController::class, 'activer']);

    // Notifications — tous les rôles
    Route::get('/notifications', [AdminController::class, 'notifications']);
    Route::post('/notifications/{notification}/lu', [AdminController::class, 'marquerLu']);
    Route::post('/notifications/tout-lire', [AdminController::class, 'toutMarquerLu']);

    // ── Menus : gérant, CSAH (gestion), DSGL (validation) ─────────────────
    Route::middleware('role:gerant,dsgl,csah')->group(function () {
        Route::apiResource('menus', MenuController::class);
        Route::get('/menus-hebdomadaires', [MenuController::class, 'hebdomadaires']);
        Route::get('/menus-hebdomadaires/{menuHebdomadaire}', [MenuController::class, 'showHebdomadaire']);
        Route::post('/menus-hebdomadaires', [MenuController::class, 'storeHebdomadaire']);
        Route::post('/menus-hebdomadaires/{menuHebdomadaire}/soumettre', [MenuController::class, 'soumettre']);
        Route::post('/menus-hebdomadaires/{menuHebdomadaire}/items', [MenuController::class, 'addItem']);
    });

    // Validation menus hebdo : gérant, DSGL
    Route::middleware('role:gerant,dsgl')->group(function () {
        Route::post('/menus-hebdomadaires/{menuHebdomadaire}/valider', [MenuController::class, 'validerMenu']);
        Route::post('/menus-hebdomadaires/{menuHebdomadaire}/rejeter', [MenuController::class, 'rejeterMenu']);
    });

    // ── Commandes : tous les rôles peuvent consulter ────────────────────────
    Route::get('/commandes', [CommandeController::class, 'index']);
    Route::get('/commandes/{commande}', [CommandeController::class, 'show']);

    // Créer une commande : tous les rôles
    Route::post('/commandes', [CommandeController::class, 'store']);

    // Valider/rejeter/livrer : gérant, CSAH
    Route::middleware('role:gerant,csah')->group(function () {
        Route::get('/commandes-a-valider', [CommandeController::class, 'aValider']);
        Route::post('/commandes/{commande}/valider', [CommandeController::class, 'valider']);
        Route::post('/commandes/{commande}/rejeter', [CommandeController::class, 'rejeter']);
        Route::post('/commandes/{commande}/livrer', [CommandeController::class, 'livrer']);
        Route::post('/commandes/{commande}/paiement', [CommandeController::class, 'enregistrerPaiement']);
    });

    // ── Régimes spéciaux : tous les rôles peuvent voir et créer ────────────
    Route::apiResource('regimes-speciaux', RegimeSpecialController::class)->only(['index', 'store', 'show']);
    Route::put('/regimes-speciaux/{regime}', [RegimeSpecialController::class, 'update']);

    // Valider/rejeter/terminer régimes : gérant, CSAH
    Route::middleware('role:gerant,csah')->group(function () {
        Route::post('/regimes-speciaux/{regime}/valider', [RegimeSpecialController::class, 'valider']);
        Route::post('/regimes-speciaux/{regime}/rejeter', [RegimeSpecialController::class, 'rejeter']);
        Route::post('/regimes-speciaux/{regime}/terminer', [RegimeSpecialController::class, 'terminer']);
    });

    // ── Consommations ───────────────────────────────────────────────────────
    Route::get('/consommations', [ConsommationController::class, 'index']);
    Route::get('/consommations/kpis', [ConsommationController::class, 'kpis']);
    Route::get('/consommations/articles', [ConsommationController::class, 'articles']);
    Route::get('/consommations/ecarts-services', [ConsommationController::class, 'ecartsParService']);

    // Saisie consommations : gérant, CSAH, SUT
    Route::middleware('role:gerant,csah,sut')->group(function () {
        Route::post('/consommations', [ConsommationController::class, 'store']);
    });

    // ── États & Rapports : gérant, DSGL, CSAH ──────────────────────────────
    Route::middleware('role:gerant,dsgl,csah')->group(function () {
        Route::get('/etats/commandes', [EtatController::class, 'etatCommandes']);
        Route::get('/etats/devis', [EtatController::class, 'devis']);
        Route::post('/etats/devis', [EtatController::class, 'storeDevis']);
        Route::get('/etats/validations', [EtatController::class, 'validations']);
    });

    // Validation devis : gérant, DSGL
    Route::middleware('role:gerant,dsgl')->group(function () {
        Route::post('/etats/devis/{devis}/valider', [EtatController::class, 'validerDevis']);
        Route::post('/etats/devis/{devis}/rejeter', [EtatController::class, 'rejeterDevis']);
    });

    // ── Administration : gérant uniquement ─────────────────────────────────
    Route::middleware('role:gerant')->group(function () {
        Route::get('/admin/users', [AdminController::class, 'users']);
        Route::post('/admin/users', [AdminController::class, 'storeUser']);
        Route::put('/admin/users/{user}', [AdminController::class, 'updateUser']);
        Route::get('/admin/services', [AdminController::class, 'services']);
        Route::post('/admin/services', [AdminController::class, 'storeService']);
        Route::put('/admin/services/{service}', [AdminController::class, 'updateService']);
        Route::get('/admin/parametres', [AdminController::class, 'parametres']);
        Route::put('/admin/parametres/{parametre}', [AdminController::class, 'updateParametre']);
        Route::get('/admin/permissions', [AdminController::class, 'permissions']);
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
        Route::post('/licence/activer', [SuperAdminController::class, 'activerLicence']);
        Route::post('/licence/reset', [SuperAdminController::class, 'resetEssai']);
        Route::get('/licence/generer-cle', [SuperAdminController::class, 'genererCle']);
    });
});

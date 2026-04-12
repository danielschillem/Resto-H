<?php

namespace Tests\Feature;

use App\Models\FormationSanitaire;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $regular;
    private FormationSanitaire $formation;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->formation = FormationSanitaire::create([
            'nom' => 'CHR Test', 'code' => 'CHR-TEST', 'type' => 'CHR',
            'ville' => 'Ouaga', 'region' => 'Centre', 'is_active' => true,
        ]);

        $this->superAdmin = User::create([
            'nom' => 'Admin', 'prenom' => 'Super', 'email' => 'admin@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'super_admin', 'is_active' => true,
        ]);

        $this->regular = User::create([
            'nom' => 'User', 'prenom' => 'Regular', 'email' => 'user@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'dsgl', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);
    }

    // ── Stats ──────────────────────────────────────

    public function test_stats(): void
    {
        $response = $this->actingAs($this->superAdmin)->getJson('/api/super-admin/stats');

        $response->assertOk()
            ->assertJsonStructure([
                'total_formations', 'formations_actives', 'total_users', 'users_actifs',
                'roles', 'licence_statut', 'licence_jours', 'licence_fin',
            ]);
    }

    public function test_non_super_admin_cannot_access_stats(): void
    {
        $response = $this->actingAs($this->regular)->getJson('/api/super-admin/stats');

        $response->assertStatus(403);
    }

    // ── Formations CRUD ────────────────────────────

    public function test_list_formations(): void
    {
        $response = $this->actingAs($this->superAdmin)->getJson('/api/super-admin/formations');

        $response->assertOk();
        $this->assertGreaterThanOrEqual(1, count($response->json()));
    }

    public function test_create_formation(): void
    {
        $response = $this->actingAs($this->superAdmin)->postJson('/api/super-admin/formations', [
            'nom' => 'CHR Ouaga', 'code' => 'CHR-OUAGA', 'type' => 'CHR',
            'ville' => 'Ouagadougou', 'region' => 'Centre',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('nom', 'CHR Ouaga')
            ->assertJsonPath('code', 'CHR-OUAGA');
    }

    public function test_create_formation_with_prestataire(): void
    {
        $response = $this->actingAs($this->superAdmin)->postJson('/api/super-admin/formations', [
            'nom' => 'CHR Bobo', 'code' => 'CHR-BOBO', 'type' => 'CHR',
            'prestataire_nom' => 'Test', 'prestataire_prenom' => 'Prest',
            'prestataire_email' => 'prest@bobo.bf', 'prestataire_password' => 'abcd',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'prest@bobo.bf', 'role' => 'prestataire']);
    }

    public function test_update_formation(): void
    {
        $response = $this->actingAs($this->superAdmin)->putJson("/api/super-admin/formations/{$this->formation->id}", [
            'directeur' => 'Dr. Nouveau',
        ]);

        $response->assertOk()
            ->assertJsonPath('directeur', 'Dr. Nouveau');
    }

    public function test_delete_formation_without_users(): void
    {
        $empty = FormationSanitaire::create([
            'nom' => 'CHR Vide', 'code' => 'CHR-VIDE', 'type' => 'CHR', 'is_active' => true,
        ]);

        $response = $this->actingAs($this->superAdmin)->deleteJson("/api/super-admin/formations/{$empty->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('formations_sanitaires', ['id' => $empty->id]);
    }

    public function test_delete_formation_with_users_fails(): void
    {
        $response = $this->actingAs($this->superAdmin)->deleteJson("/api/super-admin/formations/{$this->formation->id}");

        $response->assertStatus(422);
    }

    // ── Formation users ────────────────────────────

    public function test_formation_users(): void
    {
        $response = $this->actingAs($this->superAdmin)->getJson("/api/super-admin/formations/{$this->formation->id}/users");

        $response->assertOk();
        $this->assertGreaterThanOrEqual(1, count($response->json()));
    }

    public function test_create_formation_user(): void
    {
        $response = $this->actingAs($this->superAdmin)->postJson("/api/super-admin/formations/{$this->formation->id}/users", [
            'nom' => 'Nouveau', 'prenom' => 'User', 'email' => 'new@test.bf',
            'password' => 'abcd', 'role' => 'sus',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('role', 'sus');
    }

    // ── Reset password ─────────────────────────────

    public function test_reset_password(): void
    {
        $response = $this->actingAs($this->superAdmin)->postJson("/api/super-admin/users/{$this->regular->id}/reset-password", [
            'password' => 'newpwd',
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Mot de passe réinitialisé.');
    }

    // ── Permissions ────────────────────────────────

    public function test_list_permissions(): void
    {
        $response = $this->actingAs($this->superAdmin)->getJson('/api/super-admin/permissions');

        $response->assertOk()
            ->assertJsonStructure(['all', 'grouped']);
    }

    // ── Licence ────────────────────────────────────

    public function test_licence_info(): void
    {
        $response = $this->actingAs($this->superAdmin)->getJson('/api/super-admin/licence');

        $response->assertOk()
            ->assertJsonStructure(['statut', 'date_debut', 'date_fin', 'jours_restants']);
    }

    public function test_activer_licence(): void
    {
        $response = $this->actingAs($this->superAdmin)->postJson('/api/super-admin/licence/activer', [
            'cle' => 'RESTO-ABCD-1234-EFGH-5678',
            'titulaire' => 'CHR Test',
            'formation_id' => $this->formation->id,
        ]);

        $response->assertOk();
    }

    public function test_generer_cle(): void
    {
        $response = $this->actingAs($this->superAdmin)->getJson('/api/super-admin/licence/generer-cle');

        $response->assertOk()
            ->assertJsonStructure(['cle']);
        $this->assertMatchesRegularExpression('/^RESTO-[A-Z0-9]{4}-/', $response->json('cle'));
    }

    // ── Analytics ──────────────────────────────────

    public function test_analytics(): void
    {
        $response = $this->actingAs($this->superAdmin)->getJson('/api/super-admin/analytics');

        $response->assertOk()
            ->assertJsonStructure([
                'users_over_time', 'commandes_over_time', 'roles_distribution',
                'total_commandes', 'total_montant',
            ]);
    }

    // ── Exports ────────────────────────────────────

    public function test_export_users_csv(): void
    {
        $response = $this->actingAs($this->superAdmin)->get('/api/super-admin/export/users');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
    }

    public function test_export_formations_csv(): void
    {
        $response = $this->actingAs($this->superAdmin)->get('/api/super-admin/export/formations');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
    }

    public function test_export_audit_logs_csv(): void
    {
        $response = $this->actingAs($this->superAdmin)->get('/api/super-admin/export/audit-logs');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
    }

    // ── Bulk operations ────────────────────────────

    public function test_bulk_activate_users(): void
    {
        $u = User::create(['nom' => 'X', 'prenom' => 'Y', 'email' => 'x@test.bf', 'password' => bcrypt('pwd'), 'role' => 'sus', 'is_active' => false, 'formation_id' => $this->formation->id]);

        $response = $this->actingAs($this->superAdmin)->postJson('/api/super-admin/users/bulk-activate', [
            'ids' => [$u->id],
        ]);

        $response->assertOk();
        $this->assertTrue(User::find($u->id)->is_active);
    }

    public function test_bulk_deactivate_users(): void
    {
        $response = $this->actingAs($this->superAdmin)->postJson('/api/super-admin/users/bulk-deactivate', [
            'ids' => [$this->regular->id],
        ]);

        $response->assertOk();
        $this->assertFalse(User::find($this->regular->id)->is_active);
    }

    // ── Public formation ───────────────────────────

    public function test_formation_public_info(): void
    {
        $response = $this->getJson('/api/formations/public/CHR-TEST');

        $response->assertOk()
            ->assertJsonPath('code', 'CHR-TEST');
    }

    public function test_formation_public_not_found(): void
    {
        $response = $this->getJson('/api/formations/public/INVALID');

        $response->assertStatus(404);
    }
}

<?php

namespace Tests\Feature;

use App\Models\FormationSanitaire;
use App\Models\Notification;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    private FormationSanitaire $formation;
    private User $dsgl;
    private User $sus;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->formation = FormationSanitaire::create([
            'nom' => 'CHR Test', 'code' => 'CHR-TEST', 'type' => 'CHR',
            'ville' => 'Ouaga', 'region' => 'Centre', 'is_active' => true,
        ]);

        $this->dsgl = User::create([
            'nom' => 'DSGL', 'prenom' => 'T', 'email' => 'dsgl@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'dsgl', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $this->sus = User::create([
            'nom' => 'SUS', 'prenom' => 'T', 'email' => 'sus@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'sus', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);
    }

    // ── Users ────────────────────────────────────

    public function test_list_users(): void
    {
        $response = $this->actingAs($this->dsgl)->getJson('/api/admin/users');

        $response->assertOk();
    }

    public function test_create_user(): void
    {
        $response = $this->actingAs($this->dsgl)->postJson('/api/admin/users', [
            'nom' => 'Nouveau',
            'prenom' => 'User',
            'email' => 'nouveau@test.bf',
            'password' => 'secret123',
            'role' => 'sus',
            'service' => 'Pédiatrie',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('nom', 'Nouveau');
    }

    public function test_update_user(): void
    {
        $user = User::create([
            'nom' => 'Old', 'prenom' => 'Name', 'email' => 'old@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'sus', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->dsgl)->putJson("/api/admin/users/{$user->id}", [
            'nom' => 'Updated',
        ]);

        $response->assertOk()
            ->assertJsonPath('nom', 'Updated');
    }

    public function test_sus_cannot_access_admin(): void
    {
        $response = $this->actingAs($this->sus)->getJson('/api/admin/users');

        $response->assertStatus(403);
    }

    public function test_bulk_activate_users(): void
    {
        $u1 = User::create(['nom' => 'A', 'prenom' => 'B', 'email' => 'a@test.bf', 'password' => bcrypt('pwd'), 'role' => 'sus', 'is_active' => false, 'formation_id' => $this->formation->id]);
        $u2 = User::create(['nom' => 'C', 'prenom' => 'D', 'email' => 'c@test.bf', 'password' => bcrypt('pwd'), 'role' => 'sut', 'is_active' => false, 'formation_id' => $this->formation->id]);

        $response = $this->actingAs($this->dsgl)->postJson('/api/admin/users/bulk-activate', [
            'user_ids' => [$u1->id, $u2->id],
        ]);

        $response->assertOk();
        $this->assertTrue(User::find($u1->id)->is_active);
        $this->assertTrue(User::find($u2->id)->is_active);
    }

    // ── Services ──────────────────────────────────

    public function test_list_services(): void
    {
        Service::create(['nom' => 'Chirurgie', 'lits_actifs' => 20, 'responsable' => 'Dr X', 'formation_id' => $this->formation->id]);

        $response = $this->actingAs($this->dsgl)->getJson('/api/admin/services');

        $response->assertOk();
    }

    public function test_create_service(): void
    {
        $response = $this->actingAs($this->dsgl)->postJson('/api/admin/services', [
            'nom' => 'Radiologie',
            'lits_actifs' => 5,
            'responsable' => 'Dr Y',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('nom', 'Radiologie');
    }

    // ── Parametres ────────────────────────────────

    public function test_list_parametres(): void
    {
        $response = $this->actingAs($this->dsgl)->getJson('/api/admin/parametres');

        $response->assertOk();
    }

    // ── Permissions ───────────────────────────────

    public function test_list_permissions(): void
    {
        $response = $this->actingAs($this->dsgl)->getJson('/api/admin/permissions');

        $response->assertOk();
    }

    // ── Audit Logs ────────────────────────────────

    public function test_list_audit_logs(): void
    {
        $response = $this->actingAs($this->dsgl)->getJson('/api/admin/audit-logs');

        $response->assertOk();
    }

    // ── Notifications ─────────────────────────────

    public function test_list_notifications(): void
    {
        Notification::create([
            'user_id' => $this->dsgl->id,
            'titre' => 'Test notif',
            'message' => 'Message test',
            'type' => 'commande',
            'lu' => false,
        ]);

        $response = $this->actingAs($this->dsgl)->getJson('/api/notifications');

        $response->assertOk();
    }

    public function test_marquer_notification_lue(): void
    {
        $notif = Notification::create([
            'user_id' => $this->dsgl->id,
            'titre' => 'Test', 'message' => 'Msg', 'type' => 'commande', 'lu' => false,
        ]);

        $response = $this->actingAs($this->dsgl)->postJson("/api/notifications/{$notif->id}/lu");

        $response->assertOk();
    }

    public function test_tout_marquer_lu(): void
    {
        Notification::create(['user_id' => $this->dsgl->id, 'titre' => 'A', 'message' => 'M', 'type' => 'commande', 'lu' => false]);
        Notification::create(['user_id' => $this->dsgl->id, 'titre' => 'B', 'message' => 'N', 'type' => 'menu', 'lu' => false]);

        $response = $this->actingAs($this->dsgl)->postJson('/api/notifications/tout-lire');

        $response->assertOk();
    }

    // ── Exports ───────────────────────────────────

    public function test_export_users_csv(): void
    {
        $response = $this->actingAs($this->dsgl)->get('/api/admin/export/users');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
    }

    public function test_export_services_csv(): void
    {
        $response = $this->actingAs($this->dsgl)->get('/api/admin/export/services');

        $response->assertOk();
    }

    public function test_export_audit_logs_csv(): void
    {
        $response = $this->actingAs($this->dsgl)->get('/api/admin/export/audit-logs');

        $response->assertOk();
    }
}

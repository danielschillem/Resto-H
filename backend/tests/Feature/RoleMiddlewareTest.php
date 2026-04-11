<?php

namespace Tests\Feature;

use App\Models\FormationSanitaire;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private FormationSanitaire $formation;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->formation = FormationSanitaire::create([
            'nom' => 'CHR Test', 'code' => 'CHR-TEST', 'type' => 'CHR',
            'ville' => 'Ouaga', 'region' => 'Centre', 'is_active' => true,
        ]);
    }

    private function makeUser(string $role): User
    {
        return User::create([
            'nom' => 'Test', 'prenom' => $role, 'email' => "{$role}-" . uniqid() . '@test.bf',
            'password' => bcrypt('pwd'), 'role' => $role, 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);
    }

    public function test_dsgl_can_access_admin(): void
    {
        $response = $this->actingAs($this->makeUser('dsgl'))->getJson('/api/admin/users');
        $response->assertOk();
    }

    public function test_sus_cannot_access_admin(): void
    {
        $response = $this->actingAs($this->makeUser('sus'))->getJson('/api/admin/users');
        $response->assertStatus(403);
    }

    public function test_dsgl_can_access_menus(): void
    {
        $response = $this->actingAs($this->makeUser('dsgl'))->getJson('/api/menus');
        $response->assertOk();
    }

    public function test_sut_cannot_access_menus(): void
    {
        $response = $this->actingAs($this->makeUser('sut'))->postJson('/api/menus', [
            'intitule' => 'Test', 'type_repas' => 'dejeuner', 'portions_prevues' => 10, 'cout_unitaire' => 100,
        ]);
        $response->assertStatus(403);
    }

    public function test_super_admin_bypasses_role_check(): void
    {
        $sa = User::create([
            'nom' => 'Super', 'prenom' => 'Admin', 'email' => 'sa-test@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'super_admin', 'is_active' => true,
        ]);

        $response = $this->actingAs($sa)->getJson('/api/admin/users');
        $response->assertOk();
    }

    public function test_non_super_admin_cannot_access_super_admin_routes(): void
    {
        $response = $this->actingAs($this->makeUser('prestataire'))->getJson('/api/super-admin/stats');
        $response->assertStatus(403);
    }

    public function test_super_admin_can_access_super_admin_routes(): void
    {
        $sa = User::create([
            'nom' => 'Super', 'prenom' => 'Admin', 'email' => 'sa2-test@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'super_admin', 'is_active' => true,
        ]);

        $response = $this->actingAs($sa)->getJson('/api/super-admin/stats');
        $response->assertOk();
    }

    public function test_dashboard_accessible_by_all_roles(): void
    {
        foreach (['prestataire', 'dsgl', 'csah', 'sus', 'sut'] as $role) {
            $response = $this->actingAs($this->makeUser($role))->getJson('/api/dashboard');
            $response->assertOk();
        }
    }
}

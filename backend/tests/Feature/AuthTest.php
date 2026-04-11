<?php

namespace Tests\Feature;

use App\Models\FormationSanitaire;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function createFormationAndUser(string $role = 'gerant'): array
    {
        $formation = FormationSanitaire::create([
            'nom' => 'CHR Test',
            'code' => 'CHR-TEST',
            'type' => 'CHR',
            'ville' => 'Ouagadougou',
            'region' => 'Centre',
            'is_active' => true,
        ]);

        $user = User::create([
            'nom' => 'Test',
            'prenom' => 'User',
            'email' => "{$role}@test.bf",
            'password' => bcrypt('password'),
            'role' => $role,
            'is_active' => true,
            'formation_id' => $formation->id,
        ]);

        return [$formation, $user];
    }

    public function test_login_with_valid_credentials(): void
    {
        [$formation, $user] = $this->createFormationAndUser();

        $response = $this->postJson('/api/login', [
            'email' => 'gerant@test.bf',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['user' => ['id', 'nom', 'prenom', 'email', 'role', 'permissions'], 'token']);
    }

    public function test_login_with_wrong_password(): void
    {
        $this->createFormationAndUser();

        $response = $this->postJson('/api/login', [
            'email' => 'gerant@test.bf',
            'password' => 'wrong',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_login_with_inactive_user(): void
    {
        [$formation, $user] = $this->createFormationAndUser();
        $user->update(['is_active' => false]);

        $response = $this->postJson('/api/login', [
            'email' => 'gerant@test.bf',
            'password' => 'password',
        ]);

        $response->assertStatus(422);
    }

    public function test_login_with_formation_code(): void
    {
        [$formation, $user] = $this->createFormationAndUser();

        $response = $this->postJson('/api/login', [
            'email' => 'gerant@test.bf',
            'password' => 'password',
            'formation_code' => 'CHR-TEST',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.formation_id', $formation->id);
    }

    public function test_login_with_wrong_formation_code(): void
    {
        $this->createFormationAndUser();

        $response = $this->postJson('/api/login', [
            'email' => 'gerant@test.bf',
            'password' => 'password',
            'formation_code' => 'WRONG-CODE',
        ]);

        $response->assertStatus(422);
    }

    public function test_logout(): void
    {
        [$formation, $user] = $this->createFormationAndUser();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout');

        $response->assertOk()
            ->assertJsonPath('message', 'Déconnexion réussie.');
    }

    public function test_me_returns_current_user(): void
    {
        [$formation, $user] = $this->createFormationAndUser();

        $response = $this->actingAs($user)
            ->getJson('/api/me');

        $response->assertOk()
            ->assertJsonPath('email', 'gerant@test.bf');
    }

    public function test_unauthenticated_access_rejected(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertStatus(401);
    }

    public function test_login_rate_limited(): void
    {
        $this->createFormationAndUser();

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/login', [
                'email' => 'gerant@test.bf',
                'password' => 'wrong',
            ]);
        }

        $response = $this->postJson('/api/login', [
            'email' => 'gerant@test.bf',
            'password' => 'wrong',
        ]);

        $response->assertStatus(429);
    }
}

<?php

namespace Tests\Feature;

use App\Models\FormationSanitaire;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    private FormationSanitaire $formation;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->formation = FormationSanitaire::create([
            'nom' => 'CHR Test', 'code' => 'CHR-TEST', 'type' => 'CHR',
            'ville' => 'Ouaga', 'region' => 'Centre', 'is_active' => true,
        ]);

        $this->user = User::create([
            'nom' => 'Test', 'prenom' => 'User', 'email' => 'test@test.bf',
            'password' => bcrypt('password123'), 'role' => 'sus', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);
    }

    public function test_get_profile(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/me');

        $response->assertOk()
            ->assertJsonPath('nom', 'Test')
            ->assertJsonPath('prenom', 'User');
    }

    public function test_update_profile(): void
    {
        $response = $this->actingAs($this->user)->putJson('/api/me/profile', [
            'nom' => 'Modifié',
            'prenom' => 'Aussi',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.nom', 'Modifié');
    }

    public function test_change_password(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/me/password', [
            'current_password' => 'password123',
            'new_password' => 'newpassword456',
            'new_password_confirmation' => 'newpassword456',
        ]);

        $response->assertOk();
    }

    public function test_change_password_wrong_current(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/me/password', [
            'current_password' => 'wrong',
            'new_password' => 'newpassword456',
            'new_password_confirmation' => 'newpassword456',
        ]);

        $response->assertStatus(422);
    }

    public function test_change_password_mismatch(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/me/password', [
            'current_password' => 'password123',
            'new_password' => 'newpassword456',
            'new_password_confirmation' => 'different',
        ]);

        $response->assertStatus(422);
    }

    public function test_unauthenticated_profile(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertStatus(401);
    }
}

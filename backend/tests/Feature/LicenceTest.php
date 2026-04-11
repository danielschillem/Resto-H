<?php

namespace Tests\Feature;

use App\Models\FormationSanitaire;
use App\Models\Licence;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LicenceTest extends TestCase
{
    use RefreshDatabase;

    private FormationSanitaire $formation;
    private User $dsgl;

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
    }

    public function test_licence_status_public(): void
    {
        $response = $this->getJson('/api/licence');

        $response->assertOk()
            ->assertJsonStructure(['statut', 'date_debut', 'date_fin', 'jours_restants', 'valide']);
    }

    public function test_activer_licence_valid_key(): void
    {
        $response = $this->actingAs($this->dsgl)->postJson('/api/licence/activer', [
            'cle' => 'RESTO-ABCD-1234-EFGH-5678',
            'titulaire' => 'CHR Tenkodogo',
        ]);

        $response->assertOk();
    }

    public function test_activer_licence_invalid_key(): void
    {
        $response = $this->actingAs($this->dsgl)->postJson('/api/licence/activer', [
            'cle' => 'INVALID-KEY',
        ]);

        $response->assertStatus(422);
    }

    public function test_activer_licence_wrong_format(): void
    {
        $response = $this->actingAs($this->dsgl)->postJson('/api/licence/activer', [
            'cle' => 'RESTO-ABC-1234-EFGH-5678',
        ]);

        $response->assertStatus(422);
    }
}

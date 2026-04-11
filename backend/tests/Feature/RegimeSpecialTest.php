<?php

namespace Tests\Feature;

use App\Models\FormationSanitaire;
use App\Models\RegimeSpecial;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegimeSpecialTest extends TestCase
{
    use RefreshDatabase;

    private FormationSanitaire $formation;
    private User $sus;
    private User $csah;
    private User $prestataire;
    private Service $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->formation = FormationSanitaire::create([
            'nom' => 'CHR Test', 'code' => 'CHR-TEST', 'type' => 'CHR',
            'ville' => 'Ouaga', 'region' => 'Centre', 'is_active' => true,
        ]);

        $this->sus = User::create([
            'nom' => 'SUS', 'prenom' => 'T', 'email' => 'sus@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'sus', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $this->csah = User::create([
            'nom' => 'CSAH', 'prenom' => 'T', 'email' => 'csah@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'csah', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $this->prestataire = User::create([
            'nom' => 'Prest', 'prenom' => 'T', 'email' => 'prest@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'prestataire', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $this->service = Service::create([
            'nom' => 'Pédiatrie', 'lits_actifs' => 28, 'responsable' => 'Dr X',
            'is_active' => true, 'formation_id' => $this->formation->id,
        ]);
    }

    public function test_list_regimes(): void
    {
        $this->createRegime();

        $response = $this->actingAs($this->sus)->getJson('/api/regimes-speciaux');

        $response->assertOk();
        $this->assertGreaterThanOrEqual(1, count($response->json()));
    }

    public function test_create_regime(): void
    {
        $response = $this->actingAs($this->sus)->postJson('/api/regimes-speciaux', [
            'patient_nom' => 'OUEDRAOGO K.',
            'lit' => 'Ped-05',
            'service_id' => $this->service->id,
            'type_regime' => 'sans_sel',
            'date_debut' => now()->format('Y-m-d'),
            'duree_jours' => 7,
            'medecin_prescripteur' => 'Dr. Kaboré',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('patient_nom', 'OUEDRAOGO K.')
            ->assertJsonPath('statut', 'en_attente')
            ->assertJsonPath('type_regime', 'sans_sel');
    }

    public function test_create_regime_validation_fails(): void
    {
        $response = $this->actingAs($this->sus)->postJson('/api/regimes-speciaux', [
            'patient_nom' => '',
            'type_regime' => 'regime_inexistant',
        ]);

        $response->assertStatus(422);
    }

    public function test_show_regime(): void
    {
        $regime = $this->createRegime();

        $response = $this->actingAs($this->sus)->getJson("/api/regimes-speciaux/{$regime->id}");

        $response->assertOk()
            ->assertJsonPath('patient_nom', 'TEST P.');
    }

    public function test_update_regime_en_attente(): void
    {
        $regime = $this->createRegime();

        $response = $this->actingAs($this->sus)->putJson("/api/regimes-speciaux/{$regime->id}", [
            'duree_jours' => 14,
        ]);

        $response->assertOk()
            ->assertJsonPath('duree_jours', 14);
    }

    public function test_cannot_update_regime_valide(): void
    {
        $regime = $this->createRegime();
        $regime->update(['statut' => 'valide']);

        $response = $this->actingAs($this->sus)->putJson("/api/regimes-speciaux/{$regime->id}", [
            'duree_jours' => 14,
        ]);

        $response->assertStatus(422);
    }

    public function test_valider_regime(): void
    {
        $regime = $this->createRegime();

        $response = $this->actingAs($this->csah)->postJson("/api/regimes-speciaux/{$regime->id}/valider");

        $response->assertOk()
            ->assertJsonPath('statut', 'valide');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'valider', 'entity_type' => 'regime_special',
        ]);
    }

    public function test_rejeter_regime(): void
    {
        $regime = $this->createRegime();

        $response = $this->actingAs($this->csah)->postJson("/api/regimes-speciaux/{$regime->id}/rejeter", [
            'motif_rejet' => 'Non justifié',
        ]);

        $response->assertOk()
            ->assertJsonPath('statut', 'rejete');
    }

    public function test_rejeter_requires_motif(): void
    {
        $regime = $this->createRegime();

        $response = $this->actingAs($this->csah)->postJson("/api/regimes-speciaux/{$regime->id}/rejeter", []);

        $response->assertStatus(422);
    }

    public function test_terminer_regime(): void
    {
        $regime = $this->createRegime();
        $regime->update(['statut' => 'valide']);

        $response = $this->actingAs($this->csah)->postJson("/api/regimes-speciaux/{$regime->id}/terminer");

        $response->assertOk()
            ->assertJsonPath('statut', 'termine');
    }

    public function test_filter_by_statut(): void
    {
        $this->createRegime();

        $response = $this->actingAs($this->sus)->getJson('/api/regimes-speciaux?statut=en_attente');

        $response->assertOk();
        foreach ($response->json() as $r) {
            $this->assertEquals('en_attente', $r['statut']);
        }
    }

    public function test_filter_by_type_regime(): void
    {
        $this->createRegime();

        $response = $this->actingAs($this->sus)->getJson('/api/regimes-speciaux?type_regime=diabetique');

        $response->assertOk();
        foreach ($response->json() as $r) {
            $this->assertEquals('diabetique', $r['type_regime']);
        }
    }

    private function createRegime(): RegimeSpecial
    {
        return RegimeSpecial::create([
            'patient_nom' => 'TEST P.',
            'lit' => 'Ped-01',
            'service_id' => $this->service->id,
            'type_regime' => 'sans_sel',
            'date_debut' => now()->format('Y-m-d'),
            'duree_jours' => 7,
            'medecin_prescripteur' => 'Dr. Test',
            'statut' => 'en_attente',
            'soumis_par' => $this->sus->id,
            'formation_id' => $this->formation->id,
        ]);
    }
}

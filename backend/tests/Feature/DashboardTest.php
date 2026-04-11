<?php

namespace Tests\Feature;

use App\Models\FormationSanitaire;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private FormationSanitaire $formation;
    private User $prestataire;
    private User $dsgl;
    private User $csah;
    private User $sus;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->formation = FormationSanitaire::create([
            'nom' => 'CHR Test', 'code' => 'CHR-TEST', 'type' => 'CHR',
            'ville' => 'Ouaga', 'region' => 'Centre', 'is_active' => true,
        ]);

        $this->prestataire = User::create([
            'nom' => 'Prest', 'prenom' => 'T', 'email' => 'prest@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'prestataire', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $this->dsgl = User::create([
            'nom' => 'DSGL', 'prenom' => 'T', 'email' => 'dsgl@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'dsgl', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $this->csah = User::create([
            'nom' => 'CSAH', 'prenom' => 'T', 'email' => 'csah@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'csah', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $this->sus = User::create([
            'nom' => 'SUS', 'prenom' => 'T', 'email' => 'sus@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'sus', 'service' => 'Chirurgie', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        Service::create(['nom' => 'Chirurgie', 'lits_actifs' => 20, 'responsable' => 'Dr X', 'is_active' => true, 'formation_id' => $this->formation->id]);
    }

    public function test_dashboard_prestataire(): void
    {
        $response = $this->actingAs($this->prestataire)->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonStructure(['kpis', 'commandes_recentes', 'chart_semaine', 'repartition']);

        $this->assertCount(4, $response->json('kpis'));
    }

    public function test_dashboard_dsgl(): void
    {
        $response = $this->actingAs($this->dsgl)->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonStructure(['kpis', 'commandes_recentes', 'chart_semaine', 'repartition']);
    }

    public function test_dashboard_csah(): void
    {
        $response = $this->actingAs($this->csah)->getJson('/api/dashboard');

        $response->assertOk();
        $kpis = $response->json('kpis');
        $this->assertCount(4, $kpis);
    }

    public function test_dashboard_sus(): void
    {
        $response = $this->actingAs($this->sus)->getJson('/api/dashboard');

        $response->assertOk();
        $kpis = $response->json('kpis');
        $this->assertCount(4, $kpis);
    }

    public function test_dashboard_chart_structure(): void
    {
        $response = $this->actingAs($this->dsgl)->getJson('/api/dashboard');

        $chart = $response->json('chart_semaine');
        $this->assertArrayHasKey('labels', $chart);
        $this->assertArrayHasKey('malades', $chart);
        $this->assertArrayHasKey('personnel', $chart);
        $this->assertArrayHasKey('clients', $chart);
        $this->assertCount(7, $chart['labels']);
    }

    public function test_dashboard_repartition(): void
    {
        $response = $this->actingAs($this->dsgl)->getJson('/api/dashboard');

        $rep = $response->json('repartition');
        $this->assertArrayHasKey('labels', $rep);
        $this->assertArrayHasKey('data', $rep);
        $this->assertCount(3, $rep['labels']);
    }

    public function test_dashboard_requires_auth(): void
    {
        $response = $this->getJson('/api/dashboard');

        $response->assertStatus(401);
    }
}

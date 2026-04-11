<?php

namespace Tests\Feature;

use App\Models\Consommation;
use App\Models\ConsommationArticle;
use App\Models\FormationSanitaire;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConsommationTest extends TestCase
{
    use RefreshDatabase;

    private FormationSanitaire $formation;
    private User $csah;
    private User $sut;
    private User $sus;
    private Service $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->formation = FormationSanitaire::create([
            'nom' => 'CHR Test', 'code' => 'CHR-TEST', 'type' => 'CHR',
            'ville' => 'Ouaga', 'region' => 'Centre', 'is_active' => true,
        ]);

        $this->csah = User::create([
            'nom' => 'CSAH', 'prenom' => 'T', 'email' => 'csah@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'csah', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $this->sut = User::create([
            'nom' => 'SUT', 'prenom' => 'T', 'email' => 'sut@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'sut', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $this->sus = User::create([
            'nom' => 'SUS', 'prenom' => 'T', 'email' => 'sus@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'sus', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $this->service = Service::create([
            'nom' => 'Chirurgie', 'lits_actifs' => 20, 'responsable' => 'Dr X',
            'is_active' => true, 'formation_id' => $this->formation->id,
        ]);
    }

    public function test_list_consommations(): void
    {
        $this->createConsommation();

        $response = $this->actingAs($this->csah)->getJson('/api/consommations');

        $response->assertOk()
            ->assertJsonStructure(['consommations', 'totaux']);
    }

    public function test_list_filtered_by_periode_semaine(): void
    {
        $this->createConsommation();

        $response = $this->actingAs($this->csah)->getJson('/api/consommations?periode=semaine');

        $response->assertOk();
    }

    public function test_kpis_returns_structure(): void
    {
        $this->createConsommation();

        $response = $this->actingAs($this->csah)->getJson('/api/consommations/kpis');

        $response->assertOk()
            ->assertJsonStructure(['portions_servies', 'cout_reel', 'ecart_budgetaire', 'taux_gaspillage']);
    }

    public function test_kpis_with_no_data(): void
    {
        $response = $this->actingAs($this->csah)->getJson('/api/consommations/kpis');

        $response->assertOk()
            ->assertJsonPath('portions_servies', 0)
            ->assertJsonPath('cout_reel', 0);
    }

    public function test_articles_returns_structure(): void
    {
        ConsommationArticle::create([
            'article' => 'Riz', 'unite' => 'kg', 'qte_prevue' => 100, 'qte_reelle' => 98,
            'ecart' => -2, 'cout_unitaire' => 650, 'cout_reel' => 63700,
            'semaine_debut' => Carbon::now()->startOfWeek()->format('Y-m-d'),
            'semaine_fin' => Carbon::now()->endOfWeek()->format('Y-m-d'),
            'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->csah)->getJson('/api/consommations/articles?periode=semaine');

        $response->assertOk()
            ->assertJsonStructure(['articles', 'total']);
        $this->assertGreaterThanOrEqual(1, count($response->json('articles')));
    }

    public function test_articles_with_no_matching_period(): void
    {
        ConsommationArticle::create([
            'article' => 'Riz', 'unite' => 'kg', 'qte_prevue' => 100, 'qte_reelle' => 98,
            'ecart' => -2, 'cout_unitaire' => 650, 'cout_reel' => 63700,
            'semaine_debut' => '2025-01-01', 'semaine_fin' => '2025-01-07',
            'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->csah)->getJson('/api/consommations/articles?periode=semaine');

        $response->assertOk();
        $this->assertCount(0, $response->json('articles'));
    }

    public function test_store_consommation(): void
    {
        $response = $this->actingAs($this->csah)->postJson('/api/consommations', [
            'date' => now()->format('Y-m-d'),
            'repas' => 'dejeuner',
            'menu_servi' => 'Riz gras',
            'nb_malades' => 140,
            'nb_personnel' => 20,
            'nb_clients' => 5,
            'cout_prevu' => 110000,
            'cout_reel' => 112000,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('menu_servi', 'Riz gras')
            ->assertJsonPath('total_portions', 165)
            ->assertJsonPath('ecart', 2000);
    }

    public function test_store_consommation_validation_fails(): void
    {
        $response = $this->actingAs($this->csah)->postJson('/api/consommations', [
            'date' => '',
            'repas' => 'invalid',
        ]);

        $response->assertStatus(422);
    }

    public function test_sus_cannot_store_consommation(): void
    {
        $response = $this->actingAs($this->sus)->postJson('/api/consommations', [
            'date' => now()->format('Y-m-d'),
            'repas' => 'dejeuner',
            'menu_servi' => 'Test',
            'nb_malades' => 10,
            'nb_personnel' => 2,
            'nb_clients' => 1,
            'cout_prevu' => 10000,
            'cout_reel' => 10500,
        ]);

        $response->assertStatus(403);
    }

    public function test_sut_can_store_consommation(): void
    {
        $response = $this->actingAs($this->sut)->postJson('/api/consommations', [
            'date' => now()->format('Y-m-d'),
            'repas' => 'diner',
            'menu_servi' => 'Haricot pain',
            'nb_malades' => 100,
            'nb_personnel' => 10,
            'nb_clients' => 0,
            'cout_prevu' => 55000,
            'cout_reel' => 54000,
        ]);

        $response->assertStatus(201);
    }

    public function test_ecarts_par_service(): void
    {
        $response = $this->actingAs($this->csah)->getJson('/api/consommations/ecarts-services');

        $response->assertOk()
            ->assertJsonStructure(['labels', 'prevu', 'reel']);
    }

    private function createConsommation(): Consommation
    {
        return Consommation::create([
            'date' => Carbon::now()->startOfWeek()->format('Y-m-d'),
            'repas' => 'dejeuner',
            'menu_servi' => 'Riz gras',
            'nb_malades' => 148,
            'nb_personnel' => 22,
            'nb_clients' => 6,
            'total_portions' => 176,
            'cout_prevu' => 112000,
            'cout_reel' => 115200,
            'ecart' => 3200,
            'formation_id' => $this->formation->id,
        ]);
    }
}

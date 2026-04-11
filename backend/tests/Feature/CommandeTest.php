<?php

namespace Tests\Feature;

use App\Models\Commande;
use App\Models\FormationSanitaire;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommandeTest extends TestCase
{
    use RefreshDatabase;

    private FormationSanitaire $formation;
    private User $prestataire;
    private User $csah;
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

        $this->prestataire = User::create([
            'nom' => 'Prestataire', 'prenom' => 'Test', 'email' => 'prestataire@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'prestataire', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $this->csah = User::create([
            'nom' => 'CSAH', 'prenom' => 'Test', 'email' => 'csah@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'csah', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $this->sus = User::create([
            'nom' => 'SUS', 'prenom' => 'Test', 'email' => 'sus@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'sus', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);

        $this->service = Service::create([
            'nom' => 'Chirurgie', 'lits_actifs' => 20, 'responsable' => 'Dr X',
            'is_active' => true, 'formation_id' => $this->formation->id,
        ]);
    }

    public function test_create_commande(): void
    {
        Carbon::setTestNow(Carbon::today()->setHour(7));

        $response = $this->actingAs($this->sus)->postJson('/api/commandes', [
            'type' => 'malades',
            'service_id' => $this->service->id,
            'date_repas' => now()->addDay()->format('Y-m-d'),
            'repas' => 'dejeuner',
            'nb_portions' => 20,
        ]);

        Carbon::setTestNow();

        $response->assertStatus(201)
            ->assertJsonPath('type', 'malades')
            ->assertJsonPath('nb_portions', 20);
    }

    public function test_list_commandes(): void
    {
        Carbon::setTestNow(Carbon::today()->setHour(7));

        $this->actingAs($this->sus)->postJson('/api/commandes', [
            'type' => 'malades', 'service_id' => $this->service->id,
            'date_repas' => now()->format('Y-m-d'), 'repas' => 'dejeuner', 'nb_portions' => 10,
        ]);

        Carbon::setTestNow();

        $response = $this->actingAs($this->sus)->getJson('/api/commandes');

        $response->assertOk();
    }

    public function test_valider_commande(): void
    {
        $cmd = $this->createCommande();

        $response = $this->actingAs($this->csah)
            ->postJson("/api/commandes/{$cmd->id}/valider");

        $response->assertOk()
            ->assertJsonPath('statut', 'validee');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'valider',
            'entity_type' => 'commande',
            'entity_id' => $cmd->id,
        ]);
    }

    public function test_rejeter_commande(): void
    {
        $cmd = $this->createCommande();

        $response = $this->actingAs($this->csah)
            ->postJson("/api/commandes/{$cmd->id}/rejeter", [
                'motif_rejet' => 'Stock insuffisant',
            ]);

        $response->assertOk()
            ->assertJsonPath('statut', 'rejetee');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'rejeter',
            'entity_type' => 'commande',
            'details' => 'Stock insuffisant',
        ]);
    }

    public function test_livrer_commande(): void
    {
        $cmd = $this->createCommande();
        $cmd->update(['statut' => 'validee']);

        $response = $this->actingAs($this->prestataire)
            ->postJson("/api/commandes/{$cmd->id}/livrer");

        $response->assertOk()
            ->assertJsonPath('statut', 'livree');
    }

    public function test_livrer_commande_non_validee_fails(): void
    {
        $cmd = $this->createCommande();

        $response = $this->actingAs($this->prestataire)
            ->postJson("/api/commandes/{$cmd->id}/livrer");

        $response->assertStatus(422);
    }

    public function test_paiement_commande(): void
    {
        $cmd = $this->createCommande();
        $cmd->update(['type' => 'client_externe', 'statut' => 'livree']);

        $response = $this->actingAs($this->csah)
            ->postJson("/api/commandes/{$cmd->id}/paiement");

        $response->assertOk()
            ->assertJsonPath('statut_paiement', 'paye');
    }

    public function test_sus_cannot_validate(): void
    {
        $cmd = $this->createCommande();

        $response = $this->actingAs($this->sus)
            ->postJson("/api/commandes/{$cmd->id}/valider");

        $response->assertStatus(403);
    }

    private function createCommande(): Commande
    {
        return Commande::create([
            'reference' => '#T001',
            'type' => 'malades',
            'service_id' => $this->service->id,
            'date_repas' => now()->format('Y-m-d'),
            'repas' => 'dejeuner',
            'nb_portions' => 10,
            'statut' => 'en_attente',
            'statut_paiement' => 'non_applicable',
            'soumis_par' => $this->sus->id,
            'formation_id' => $this->formation->id,
        ]);
    }
}


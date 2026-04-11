<?php

namespace Tests\Feature;

use App\Models\DevisEstimatif;
use App\Models\FormationSanitaire;
use App\Models\MenuHebdomadaire;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EtatTest extends TestCase
{
    use RefreshDatabase;

    private FormationSanitaire $formation;
    private User $dsgl;
    private User $csah;
    private User $prestataire;
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

        $this->sus = User::create([
            'nom' => 'SUS', 'prenom' => 'T', 'email' => 'sus@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'sus', 'is_active' => true,
            'formation_id' => $this->formation->id,
        ]);
    }

    // ── État des commandes ────────────────────────

    public function test_etat_commandes(): void
    {
        $response = $this->actingAs($this->dsgl)->getJson('/api/etats/commandes');

        $response->assertOk()
            ->assertJsonStructure(['semaine_debut', 'semaine_fin', 'services', 'totaux', 'grand_total']);
    }

    public function test_etat_commandes_with_custom_dates(): void
    {
        $start = now()->startOfWeek()->format('Y-m-d');
        $end = now()->endOfWeek()->format('Y-m-d');

        $response = $this->actingAs($this->csah)->getJson("/api/etats/commandes?semaine_debut={$start}&semaine_fin={$end}");

        $response->assertOk()
            ->assertJsonPath('semaine_debut', $start);
    }

    public function test_sus_cannot_access_etats(): void
    {
        $response = $this->actingAs($this->sus)->getJson('/api/etats/commandes');

        $response->assertStatus(403);
    }

    // ── Devis ─────────────────────────────────────

    public function test_list_devis(): void
    {
        $response = $this->actingAs($this->dsgl)->getJson('/api/etats/devis');

        $response->assertOk();
    }

    public function test_create_devis(): void
    {
        $response = $this->actingAs($this->dsgl)->postJson('/api/etats/devis', [
            'semaine_debut' => now()->startOfWeek()->format('Y-m-d'),
            'semaine_fin' => now()->endOfWeek()->format('Y-m-d'),
            'lignes' => [
                ['article' => 'Riz', 'unite' => 'kg', 'qte_estimee' => 500, 'prix_unitaire' => 650, 'montant_estime' => 325000],
                ['article' => 'Huile', 'unite' => 'L', 'qte_estimee' => 44, 'prix_unitaire' => 1100, 'montant_estime' => 48400],
            ],
        ]);

        $response->assertStatus(201);
        $this->assertCount(2, $response->json('lignes'));
        $this->assertEquals(373400, $response->json('total_estime'));
    }

    public function test_create_devis_validation_fails(): void
    {
        $response = $this->actingAs($this->dsgl)->postJson('/api/etats/devis', [
            'semaine_debut' => now()->format('Y-m-d'),
            'semaine_fin' => now()->subDay()->format('Y-m-d'),
            'lignes' => [],
        ]);

        $response->assertStatus(422);
    }

    public function test_valider_devis(): void
    {
        $devis = DevisEstimatif::create([
            'semaine_debut' => now()->startOfWeek(), 'semaine_fin' => now()->endOfWeek(),
            'statut' => 'soumis', 'total_estime' => 500000,
            'soumis_par' => $this->prestataire->id, 'date_soumission' => now(),
            'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->dsgl)->postJson("/api/etats/devis/{$devis->id}/valider");

        $response->assertOk()
            ->assertJsonPath('statut', 'valide');

        $this->assertDatabaseHas('audit_logs', ['action' => 'valider', 'entity_type' => 'devis']);
    }

    public function test_rejeter_devis(): void
    {
        $devis = DevisEstimatif::create([
            'semaine_debut' => now()->startOfWeek(), 'semaine_fin' => now()->endOfWeek(),
            'statut' => 'soumis', 'total_estime' => 500000,
            'soumis_par' => $this->prestataire->id, 'date_soumission' => now(),
            'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->dsgl)->postJson("/api/etats/devis/{$devis->id}/rejeter", [
            'commentaire' => 'Budget dépassé',
        ]);

        $response->assertOk()
            ->assertJsonPath('statut', 'rejete');
    }

    public function test_rejeter_devis_requires_commentaire(): void
    {
        $devis = DevisEstimatif::create([
            'semaine_debut' => now()->startOfWeek(), 'semaine_fin' => now()->endOfWeek(),
            'statut' => 'soumis', 'total_estime' => 500000,
            'soumis_par' => $this->prestataire->id, 'date_soumission' => now(),
            'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->dsgl)->postJson("/api/etats/devis/{$devis->id}/rejeter", []);

        $response->assertStatus(422);
    }

    public function test_csah_cannot_valider_devis(): void
    {
        $devis = DevisEstimatif::create([
            'semaine_debut' => now()->startOfWeek(), 'semaine_fin' => now()->endOfWeek(),
            'statut' => 'soumis', 'total_estime' => 500000,
            'soumis_par' => $this->prestataire->id, 'date_soumission' => now(),
            'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->csah)->postJson("/api/etats/devis/{$devis->id}/valider");

        $response->assertStatus(403);
    }

    // ── Validations ───────────────────────────────

    public function test_validations_list(): void
    {
        MenuHebdomadaire::create([
            'semaine_debut' => now()->startOfWeek(), 'semaine_fin' => now()->endOfWeek(),
            'statut' => 'soumis', 'soumis_par' => $this->prestataire->id,
            'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->dsgl)->getJson('/api/etats/validations');

        $response->assertOk();
    }
}

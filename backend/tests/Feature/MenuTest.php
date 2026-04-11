<?php

namespace Tests\Feature;

use App\Models\FormationSanitaire;
use App\Models\Menu;
use App\Models\MenuHebdomadaire;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuTest extends TestCase
{
    use RefreshDatabase;

    private FormationSanitaire $formation;
    private User $prestataire;
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

        $this->prestataire = User::create([
            'nom' => 'Prestataire', 'prenom' => 'T', 'email' => 'prest@test.bf',
            'password' => bcrypt('pwd'), 'role' => 'prestataire', 'is_active' => true,
            'formation_id' => $this->formation->id,
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

    // ── Menu CRUD ──────────────────────────────────

    public function test_list_menus(): void
    {
        Menu::create(['intitule' => 'Riz gras', 'type_repas' => 'dejeuner', 'portions_prevues' => 100, 'cout_unitaire' => 600, 'formation_id' => $this->formation->id]);

        $response = $this->actingAs($this->prestataire)->getJson('/api/menus');

        $response->assertOk();
        // Filter to our formation only
        $menus = collect($response->json())->where('formation_id', $this->formation->id);
        $this->assertGreaterThanOrEqual(1, $menus->count());
    }

    public function test_create_menu(): void
    {
        $response = $this->actingAs($this->prestataire)->postJson('/api/menus', [
            'intitule' => 'Tô sauce',
            'type_repas' => 'dejeuner',
            'portions_prevues' => 200,
            'cout_unitaire' => 580,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('intitule', 'Tô sauce')
            ->assertJsonPath('type_repas', 'dejeuner');
    }

    public function test_create_menu_validation_fails(): void
    {
        $response = $this->actingAs($this->prestataire)->postJson('/api/menus', [
            'intitule' => '',
            'type_repas' => 'brunch',
        ]);

        $response->assertStatus(422);
    }

    public function test_update_menu(): void
    {
        $menu = Menu::create(['intitule' => 'Pain', 'type_repas' => 'petit_dejeuner', 'portions_prevues' => 100, 'cout_unitaire' => 450, 'formation_id' => $this->formation->id]);

        $response = $this->actingAs($this->prestataire)->putJson("/api/menus/{$menu->id}", [
            'intitule' => 'Pain beurré',
            'cout_unitaire' => 500,
        ]);

        $response->assertOk()
            ->assertJsonPath('intitule', 'Pain beurré')
            ->assertJsonPath('cout_unitaire', 500);
    }

    public function test_delete_menu(): void
    {
        $menu = Menu::create(['intitule' => 'À suppr', 'type_repas' => 'diner', 'portions_prevues' => 50, 'cout_unitaire' => 300, 'formation_id' => $this->formation->id]);

        $response = $this->actingAs($this->prestataire)->deleteJson("/api/menus/{$menu->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('menus', ['id' => $menu->id]);
    }

    public function test_sus_cannot_create_menu(): void
    {
        $response = $this->actingAs($this->sus)->postJson('/api/menus', [
            'intitule' => 'Test', 'type_repas' => 'dejeuner', 'portions_prevues' => 10, 'cout_unitaire' => 100,
        ]);

        $response->assertStatus(403);
    }

    // ── Menu Hebdomadaire ──────────────────────────

    public function test_create_menu_hebdomadaire(): void
    {
        $menu = Menu::create(['intitule' => 'Riz', 'type_repas' => 'dejeuner', 'portions_prevues' => 100, 'cout_unitaire' => 650, 'formation_id' => $this->formation->id]);

        $response = $this->actingAs($this->prestataire)->postJson('/api/menus-hebdomadaires', [
            'semaine_debut' => now()->startOfWeek()->format('Y-m-d'),
            'semaine_fin' => now()->endOfWeek()->format('Y-m-d'),
            'cout_matieres' => 500000,
            'cout_main_oeuvre' => 100000,
            'items' => [
                ['menu_id' => $menu->id, 'jour_semaine' => 0],
                ['menu_id' => $menu->id, 'jour_semaine' => 1],
            ],
        ]);

        $response->assertStatus(201);
        $this->assertCount(2, $response->json('items'));
    }

    public function test_list_menus_hebdomadaires(): void
    {
        $response = $this->actingAs($this->prestataire)->getJson('/api/menus-hebdomadaires');

        $response->assertOk();
    }

    public function test_soumettre_menu_hebdomadaire(): void
    {
        $mh = MenuHebdomadaire::create([
            'semaine_debut' => now()->startOfWeek(), 'semaine_fin' => now()->endOfWeek(),
            'soumis_par' => $this->prestataire->id, 'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->prestataire)->postJson("/api/menus-hebdomadaires/{$mh->id}/soumettre");

        $response->assertOk()->assertJsonPath('statut', 'soumis');
    }

    public function test_valider_menu_hebdomadaire(): void
    {
        $mh = MenuHebdomadaire::create([
            'semaine_debut' => now()->startOfWeek(), 'semaine_fin' => now()->endOfWeek(),
            'statut' => 'soumis', 'soumis_par' => $this->prestataire->id, 'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->dsgl)->postJson("/api/menus-hebdomadaires/{$mh->id}/valider");

        $response->assertOk()->assertJsonPath('statut', 'valide');
        $this->assertDatabaseHas('audit_logs', ['action' => 'valider', 'entity_type' => 'menu_hebdomadaire']);
    }

    public function test_rejeter_menu_hebdomadaire(): void
    {
        $mh = MenuHebdomadaire::create([
            'semaine_debut' => now()->startOfWeek(), 'semaine_fin' => now()->endOfWeek(),
            'statut' => 'soumis', 'soumis_par' => $this->prestataire->id, 'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->dsgl)->postJson("/api/menus-hebdomadaires/{$mh->id}/rejeter", [
            'commentaire' => 'Menus trop chers',
        ]);

        $response->assertOk()->assertJsonPath('statut', 'rejete');
    }

    public function test_rejeter_requires_commentaire(): void
    {
        $mh = MenuHebdomadaire::create([
            'semaine_debut' => now()->startOfWeek(), 'semaine_fin' => now()->endOfWeek(),
            'statut' => 'soumis', 'soumis_par' => $this->prestataire->id, 'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->dsgl)->postJson("/api/menus-hebdomadaires/{$mh->id}/rejeter", []);

        $response->assertStatus(422);
    }

    public function test_add_item_to_hebdomadaire(): void
    {
        $menu = Menu::create(['intitule' => 'Riz', 'type_repas' => 'dejeuner', 'portions_prevues' => 100, 'cout_unitaire' => 650, 'formation_id' => $this->formation->id]);
        $mh = MenuHebdomadaire::create([
            'semaine_debut' => now()->startOfWeek(), 'semaine_fin' => now()->endOfWeek(),
            'soumis_par' => $this->prestataire->id, 'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->prestataire)->postJson("/api/menus-hebdomadaires/{$mh->id}/items", [
            'menu_id' => $menu->id,
            'jour_semaine' => 2,
        ]);

        $response->assertStatus(201);
    }

    public function test_prestataire_cannot_valider_menu(): void
    {
        $mh = MenuHebdomadaire::create([
            'semaine_debut' => now()->startOfWeek(), 'semaine_fin' => now()->endOfWeek(),
            'statut' => 'soumis', 'soumis_par' => $this->prestataire->id, 'formation_id' => $this->formation->id,
        ]);

        $response = $this->actingAs($this->prestataire)->postJson("/api/menus-hebdomadaires/{$mh->id}/valider");

        $response->assertStatus(403);
    }
}

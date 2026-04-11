<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\TenantScope;
use App\Models\AuditLog;
use App\Models\Menu;
use App\Models\MenuHebdomadaire;
use App\Models\MenuHebdomadaireItem;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    public function index(): JsonResponse
    {
        $query = Menu::orderBy('intitule');
        TenantScope::apply($query);
        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'intitule' => 'required|string|max:255',
            'type_repas' => 'required|in:petit_dejeuner,dejeuner,diner',
            'portions_prevues' => 'required|integer|min:1',
            'cout_unitaire' => 'required|integer|min:0',
            'allergenes' => 'nullable|string|max:255',
            'notes_nutritionnelles' => 'nullable|string',
        ]);

        $menu = Menu::create([
            ...$data,
            'formation_id' => TenantScope::$formationId,
        ]);

        return response()->json($menu, 201);
    }

    public function show(Menu $menu): JsonResponse
    {
        return response()->json($menu);
    }

    public function update(Request $request, Menu $menu): JsonResponse
    {
        $data = $request->validate([
            'intitule' => 'sometimes|string|max:255',
            'type_repas' => 'sometimes|in:petit_dejeuner,dejeuner,diner',
            'portions_prevues' => 'sometimes|integer|min:1',
            'cout_unitaire' => 'sometimes|integer|min:0',
            'allergenes' => 'nullable|string|max:255',
            'notes_nutritionnelles' => 'nullable|string',
        ]);

        $menu->update($data);

        return response()->json($menu);
    }

    public function destroy(Menu $menu): JsonResponse
    {
        $menu->delete();

        return response()->json(null, 204);
    }

    // --- Menus Hebdomadaires ---

    public function hebdomadaires(Request $request): JsonResponse
    {
        $query = MenuHebdomadaire::with(['items.menu', 'soumisPar', 'validePar']);
        TenantScope::apply($query);

        if ($request->has('semaine_debut')) {
            $query->where('semaine_debut', $request->semaine_debut);
        }

        return response()->json($query->orderByDesc('semaine_debut')->get());
    }

    public function storeHebdomadaire(Request $request): JsonResponse
    {
        $data = $request->validate([
            'semaine_debut' => 'required|date',
            'semaine_fin' => 'required|date|after_or_equal:semaine_debut',
            'cout_matieres' => 'nullable|integer|min:0',
            'cout_main_oeuvre' => 'nullable|integer|min:0',
            'items' => 'nullable|array',
            'items.*.menu_id' => 'required|exists:menus,id',
            'items.*.jour_semaine' => 'required|integer|min:0|max:6',
        ]);

        $menuHebdo = MenuHebdomadaire::create([
            'semaine_debut' => $data['semaine_debut'],
            'semaine_fin' => $data['semaine_fin'],
            'cout_matieres' => $data['cout_matieres'] ?? 0,
            'cout_main_oeuvre' => $data['cout_main_oeuvre'] ?? 0,
            'soumis_par' => $request->user()->id,
            'formation_id' => TenantScope::$formationId,
        ]);

        foreach ($data['items'] ?? [] as $item) {
            $menuHebdo->items()->create($item);
        }

        return response()->json($menuHebdo->load('items.menu'), 201);
    }

    public function showHebdomadaire(MenuHebdomadaire $menuHebdomadaire): JsonResponse
    {
        return response()->json($menuHebdomadaire->load(['items.menu', 'soumisPar', 'validePar']));
    }

    public function soumettre(MenuHebdomadaire $menuHebdomadaire): JsonResponse
    {
        $menuHebdomadaire->update([
            'statut' => 'soumis',
            'date_soumission' => now(),
        ]);

        AuditLog::record('soumettre', 'menu_hebdomadaire', $menuHebdomadaire->id, 'S' . $menuHebdomadaire->semaine_debut, null, request());

        return response()->json($menuHebdomadaire);
    }

    public function validerMenu(Request $request, MenuHebdomadaire $menuHebdomadaire): JsonResponse
    {
        $menuHebdomadaire->update([
            'statut' => 'valide',
            'valide_par' => $request->user()->id,
            'date_validation' => now(),
        ]);

        AuditLog::record('valider', 'menu_hebdomadaire', $menuHebdomadaire->id, 'S' . $menuHebdomadaire->semaine_debut, null, $request);

        return response()->json($menuHebdomadaire);
    }

    public function rejeterMenu(Request $request, MenuHebdomadaire $menuHebdomadaire): JsonResponse
    {
        $request->validate(['commentaire' => 'required|string']);

        $menuHebdomadaire->update([
            'statut' => 'rejete',
            'commentaire' => $request->commentaire,
        ]);

        AuditLog::record('rejeter', 'menu_hebdomadaire', $menuHebdomadaire->id, 'S' . $menuHebdomadaire->semaine_debut, $request->commentaire, $request);

        return response()->json($menuHebdomadaire);
    }

    public function addItem(Request $request, MenuHebdomadaire $menuHebdomadaire): JsonResponse
    {
        $data = $request->validate([
            'menu_id' => 'required|exists:menus,id',
            'jour_semaine' => 'required|integer|min:0|max:6',
        ]);

        $menu = Menu::findOrFail($data['menu_id']);

        // Replace any existing item in the same day+type slot
        $menuHebdomadaire->items()
            ->whereHas('menu', fn($q) => $q->where('type_repas', $menu->type_repas))
            ->where('jour_semaine', $data['jour_semaine'])
            ->delete();

        $item = $menuHebdomadaire->items()->create($data);

        return response()->json($item->load('menu'), 201);
    }
}
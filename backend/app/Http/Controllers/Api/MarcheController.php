<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnneeBudgetaire;
use App\Models\AuditLog;
use App\Models\Marche;
use App\Http\Middleware\TenantScope;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MarcheController extends Controller
{
    // ── Années budgétaires ──

    public function annees(Request $request): JsonResponse
    {
        $query = AnneeBudgetaire::query();
        TenantScope::apply($query);
        $annees = $query->orderByDesc('date_debut')->get();
        return response()->json($annees);
    }

    public function storeAnnee(Request $request): JsonResponse
    {
        $data = $request->validate([
            'libelle' => 'required|string|max:50',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date|after:date_debut',
            'is_active' => 'boolean',
        ]);

        $data['formation_id'] = auth()->user()->formation_id;

        // Si on active cette année, désactiver les autres
        if (!empty($data['is_active'])) {
            AnneeBudgetaire::where('formation_id', $data['formation_id'])->update(['is_active' => false]);
        }

        $annee = AnneeBudgetaire::create($data);
        return response()->json($annee, 201);
    }

    public function updateAnnee(Request $request, AnneeBudgetaire $annee): JsonResponse
    {
        $data = $request->validate([
            'libelle' => 'string|max:50',
            'date_debut' => 'date',
            'date_fin' => 'date|after:date_debut',
            'is_active' => 'boolean',
        ]);

        if (!empty($data['is_active'])) {
            AnneeBudgetaire::where('formation_id', $annee->formation_id)
                ->where('id', '!=', $annee->id)
                ->update(['is_active' => false]);
        }

        $annee->update($data);
        return response()->json($annee);
    }

    // ── Marchés ──

    public function index(Request $request): JsonResponse
    {
        $query = Marche::with('anneeBudgetaire');
        TenantScope::apply($query);

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('annee_budgetaire_id')) {
            $query->where('annee_budgetaire_id', $request->annee_budgetaire_id);
        }

        $marches = $query->orderByDesc('created_at')->get();
        return response()->json($marches);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reference' => 'required|string|max:100|unique:marches,reference',
            'objet' => 'required|string|max:255',
            'fournisseur' => 'required|string|max:255',
            'montant_initial' => 'required|numeric|min:0',
            'seuil_alerte' => 'numeric|min:0|max:100',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date|after:date_debut',
            'annee_budgetaire_id' => 'nullable|exists:annees_budgetaires,id',
        ]);

        $data['montant_restant'] = $data['montant_initial'];
        $data['montant_consomme'] = 0;
        $data['formation_id'] = auth()->user()->formation_id;

        $marche = Marche::create($data);

        AuditLog::record('creer', 'marche', $marche->id, $marche->reference, null, $request);

        return response()->json($marche->load('anneeBudgetaire'), 201);
    }

    public function show(Marche $marche): JsonResponse
    {
        $marche->load(['anneeBudgetaire', 'commandes' => function ($q) {
            $q->with('service')->latest()->take(20);
        }]);
        return response()->json($marche);
    }

    public function update(Request $request, Marche $marche): JsonResponse
    {
        $data = $request->validate([
            'objet' => 'string|max:255',
            'fournisseur' => 'string|max:255',
            'seuil_alerte' => 'numeric|min:0|max:100',
            'date_fin' => 'date',
            'statut' => 'in:actif,suspendu,cloture',
            'annee_budgetaire_id' => 'nullable|exists:annees_budgetaires,id',
        ]);

        $marche->update($data);

        AuditLog::record('modifier', 'marche', $marche->id, $marche->reference, null, $request);

        return response()->json($marche->load('anneeBudgetaire'));
    }

    public function destroy(Marche $marche): JsonResponse
    {
        if ($marche->montant_consomme > 0) {
            return response()->json(['message' => 'Impossible de supprimer un marché ayant des consommations.'], 422);
        }
        $marche->delete();

        AuditLog::record('supprimer', 'marche', $marche->id, $marche->reference, null, request());

        return response()->json(['message' => 'Marché supprimé']);
    }

    // ── KPIs & suivi budgétaire ──

    public function kpis(Request $request): JsonResponse
    {
        $query = Marche::query();
        TenantScope::apply($query);

        $marches = $query->get();

        $totalInitial = $marches->sum('montant_initial');
        $totalConsomme = $marches->sum('montant_consomme');
        $totalRestant = $marches->sum('montant_restant');
        $nbActifs = $marches->where('statut', 'actif')->count();
        $nbEnAlerte = $marches->filter(fn ($m) => $m->en_alerte && $m->statut === 'actif')->count();
        $nbEpuises = $marches->where('statut', 'epuise')->count();

        // Évolution des consommations par semaine (8 dernières semaines)
        $evolution = [];
        for ($i = 7; $i >= 0; $i--) {
            $debut = now()->startOfWeek()->subWeeks($i);
            $fin = (clone $debut)->endOfWeek();
            $label = 'S' . $debut->weekOfYear;

            $montantSemaine = \App\Models\Commande::query()
                ->whereNotNull('marche_id')
                ->whereIn('statut', ['validee', 'livree'])
                ->whereBetween('date_validation', [$debut, $fin])
                ->sum('montant');

            $evolution[] = [
                'semaine' => $label,
                'montant' => round($montantSemaine, 2),
            ];
        }

        return response()->json([
            'total_marches' => $marches->count(),
            'marches_actifs' => $nbActifs,
            'marches_en_alerte' => $nbEnAlerte,
            'marches_epuises' => $nbEpuises,
            'montant_total' => round($totalInitial, 2),
            'montant_consomme' => round($totalConsomme, 2),
            'montant_restant' => round($totalRestant, 2),
            'taux_consommation' => $totalInitial > 0 ? round(($totalConsomme / $totalInitial) * 100, 2) : 0,
            'evolution_hebdo' => $evolution,
            'alertes' => $marches->filter(fn ($m) => $m->en_alerte && $m->statut === 'actif')
                ->map(fn ($m) => [
                    'id' => $m->id,
                    'reference' => $m->reference,
                    'objet' => $m->objet,
                    'montant_restant' => $m->montant_restant,
                    'pourcentage_restant' => round(100 - $m->pourcentage_consomme, 2),
                ])->values(),
        ]);
    }

    // ── Coûts désagrégés ──

    public function coutsDesagreges(Request $request): JsonResponse
    {
        $query = \App\Models\Commande::query()
            ->whereIn('statut', ['validee', 'livree']);
        TenantScope::apply($query);

        // Filtres période
        $debut = $request->input('date_debut', now()->startOfMonth()->toDateString());
        $fin = $request->input('date_fin', now()->toDateString());
        $query->whereBetween('date_repas', [$debut, $fin]);

        $commandes = $query->with('service')->get();

        // Par service
        $parService = $commandes->groupBy(fn ($c) => $c->service->nom ?? 'N/A')
            ->map(fn ($group, $nom) => [
                'service' => $nom,
                'nb_commandes' => $group->count(),
                'nb_portions' => $group->sum('nb_portions'),
                'montant' => round($group->sum('montant'), 2),
            ])->values();

        // Par type de repas
        $parRepas = $commandes->groupBy('repas')
            ->map(fn ($group, $repas) => [
                'repas' => $repas,
                'nb_commandes' => $group->count(),
                'nb_portions' => $group->sum('nb_portions'),
                'montant' => round($group->sum('montant'), 2),
            ])->values();

        // Par type de commande
        $parType = $commandes->groupBy('type')
            ->map(fn ($group, $type) => [
                'type' => $type,
                'nb_commandes' => $group->count(),
                'nb_portions' => $group->sum('nb_portions'),
                'montant' => round($group->sum('montant'), 2),
            ])->values();

        return response()->json([
            'periode' => ['debut' => $debut, 'fin' => $fin],
            'total_montant' => round($commandes->sum('montant'), 2),
            'total_portions' => $commandes->sum('nb_portions'),
            'par_service' => $parService,
            'par_repas' => $parRepas,
            'par_type' => $parType,
        ]);
    }
}

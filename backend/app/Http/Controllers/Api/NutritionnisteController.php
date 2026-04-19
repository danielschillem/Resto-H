<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\TenantScope;
use App\Models\Commande;
use App\Models\Consommation;
use App\Models\Menu;
use App\Models\Patient;
use App\Models\RegimeSpecial;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NutritionnisteController extends Controller
{
    /**
     * Tableau de bord observatoire nutritionnel.
     */
    public function observatoire(Request $request): JsonResponse
    {
        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd = Carbon::now()->endOfWeek();
        $prevWeekStart = Carbon::now()->subWeek()->startOfWeek();
        $prevWeekEnd = Carbon::now()->subWeek()->endOfWeek();

        // KPIs globaux
        $patientsHospitalises = TenantScope::apply(Patient::query())->where('statut', 'hospitalise')->count();
        $regimesActifs = TenantScope::apply(RegimeSpecial::query())->where('statut', 'valide')->count();
        $portionsSemaine = (int) TenantScope::apply(Commande::query())
            ->where('type', 'malades')
            ->whereBetween('date_repas', [$weekStart, $weekEnd])
            ->sum('nb_portions');
        $portionsSemainePrecedente = (int) TenantScope::apply(Commande::query())
            ->where('type', 'malades')
            ->whereBetween('date_repas', [$prevWeekStart, $prevWeekEnd])
            ->sum('nb_portions');
        $coutSemaine = (int) TenantScope::apply(Consommation::query())
            ->whereBetween('date', [$weekStart, $weekEnd])
            ->sum('cout_reel');
        $coutMoyenPortion = $portionsSemaine > 0 ? round($coutSemaine / $portionsSemaine) : 0;

        return response()->json([
            'kpis' => [
                'patients_hospitalises' => $patientsHospitalises,
                'regimes_actifs' => $regimesActifs,
                'portions_semaine' => $portionsSemaine,
                'portions_evolution' => $portionsSemainePrecedente > 0
                    ? round((($portionsSemaine - $portionsSemainePrecedente) / $portionsSemainePrecedente) * 100, 1)
                    : 0,
                'cout_moyen_portion' => $coutMoyenPortion,
            ],
            'repartition_repas' => $this->repartitionRepas($weekStart, $weekEnd),
            'regimes_par_type' => $this->regimesParType(),
            'portions_par_service' => $this->portionsParService($weekStart, $weekEnd),
            'evolution_hebdo' => $this->evolutionHebdo(),
        ]);
    }

    /**
     * Répartition des portions par repas (semaine courante).
     */
    private function repartitionRepas($weekStart, $weekEnd): array
    {
        $data = TenantScope::apply(Commande::query())
            ->where('type', 'malades')
            ->whereBetween('date_repas', [$weekStart, $weekEnd])
            ->selectRaw("repas, SUM(nb_portions) as total")
            ->groupBy('repas')
            ->pluck('total', 'repas')
            ->toArray();

        return [
            'labels' => ['Petit-déjeuner', 'Déjeuner', 'Dîner'],
            'data' => [
                (int) ($data['petit_dejeuner'] ?? 0),
                (int) ($data['dejeuner'] ?? 0),
                (int) ($data['diner'] ?? 0),
            ],
        ];
    }

    /**
     * Répartition des régimes spéciaux par type.
     */
    private function regimesParType(): array
    {
        $data = TenantScope::apply(RegimeSpecial::query())
            ->where('statut', 'valide')
            ->selectRaw('type_regime, COUNT(*) as total')
            ->groupBy('type_regime')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        return [
            'labels' => $data->pluck('type_regime')->toArray(),
            'data' => $data->pluck('total')->map(fn($v) => (int) $v)->toArray(),
        ];
    }

    /**
     * Portions par service (semaine courante).
     */
    private function portionsParService($weekStart, $weekEnd): array
    {
        $data = TenantScope::apply(Commande::query())
            ->where('type', 'malades')
            ->whereBetween('date_repas', [$weekStart, $weekEnd])
            ->join('services', 'commandes.service_id', '=', 'services.id')
            ->selectRaw('services.nom as service, SUM(commandes.nb_portions) as total')
            ->groupBy('services.nom')
            ->orderByDesc('total')
            ->get();

        return [
            'labels' => $data->pluck('service')->toArray(),
            'data' => $data->pluck('total')->map(fn($v) => (int) $v)->toArray(),
        ];
    }

    /**
     * Évolution hebdomadaire des 8 dernières semaines.
     */
    private function evolutionHebdo(): array
    {
        $labels = [];
        $portions = [];
        $couts = [];

        for ($i = 7; $i >= 0; $i--) {
            $start = Carbon::now()->subWeeks($i)->startOfWeek();
            $end = Carbon::now()->subWeeks($i)->endOfWeek();
            $labels[] = 'S' . $start->weekOfYear;
            $portions[] = (int) TenantScope::apply(Commande::query())
                ->where('type', 'malades')
                ->whereBetween('date_repas', [$start, $end])
                ->sum('nb_portions');
            $couts[] = (int) TenantScope::apply(Consommation::query())
                ->whereBetween('date', [$start, $end])
                ->sum('cout_reel');
        }

        return [
            'labels' => $labels,
            'portions' => $portions,
            'couts' => $couts,
        ];
    }

    /**
     * Liste des régimes spéciaux actifs avec détails patients.
     */
    public function regimesActifs(): JsonResponse
    {
        $regimes = TenantScope::apply(RegimeSpecial::query())
            ->where('statut', 'valide')
            ->with('service')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($regimes);
    }

    /**
     * Analyse nutritionnelle : menus utilisés cette semaine avec coûts.
     */
    public function analyseMenus(Request $request): JsonResponse
    {
        $weekStart = $request->input('semaine_debut', Carbon::now()->startOfWeek()->format('Y-m-d'));
        $weekEnd = $request->input('semaine_fin', Carbon::now()->endOfWeek()->format('Y-m-d'));

        $menus = TenantScope::apply(Commande::query())
            ->whereBetween('date_repas', [$weekStart, $weekEnd])
            ->whereNotNull('menu_id')
            ->with('menu')
            ->selectRaw('menu_id, repas, SUM(nb_portions) as total_portions, COUNT(*) as nb_commandes')
            ->groupBy('menu_id', 'repas')
            ->get()
            ->map(function ($row) {
                return [
                    'menu' => $row->menu,
                    'repas' => $row->repas,
                    'total_portions' => (int) $row->total_portions,
                    'nb_commandes' => (int) $row->nb_commandes,
                    'cout_estime' => $row->menu ? $row->menu->cout_unitaire * $row->total_portions : 0,
                ];
            });

        return response()->json($menus);
    }

    /**
     * Propositions : le nutritionniste peut soumettre des propositions de menus.
     */
    public function proposerMenu(Request $request): JsonResponse
    {
        $data = $request->validate([
            'intitule' => 'required|string|max:255',
            'type_repas' => 'required|in:petit_dejeuner,dejeuner,diner',
            'portions_prevues' => 'nullable|integer|min:1',
            'cout_unitaire' => 'nullable|integer|min:0',
            'notes_nutritionnelles' => 'nullable|string',
            'allergenes' => 'nullable|string',
        ]);

        $menu = Menu::create([
            ...$data,
            'formation_id' => TenantScope::$formationId,
        ]);

        return response()->json($menu, 201);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\TenantScope;
use App\Models\Commande;
use App\Models\Consommation;
use App\Models\ConsommationArticle;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsommationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Consommation::query();
        TenantScope::apply($query);

        if ($request->has('semaine_debut') && $request->has('semaine_fin')) {
            $query->whereBetween('date', [$request->semaine_debut, $request->semaine_fin]);
        } elseif ($request->has('periode')) {
            match ($request->periode) {
                'semaine' => $query->whereBetween('date', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()]),
                'semaine_precedente' => $query->whereBetween('date', [Carbon::now()->subWeek()->startOfWeek(), Carbon::now()->subWeek()->endOfWeek()]),
                'mois' => $query->whereBetween('date', [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()]),
                default => null,
            };
        }

        $consommations = $query->orderBy('date')->orderByRaw("CASE repas WHEN 'petit_dejeuner' THEN 1 WHEN 'dejeuner' THEN 2 WHEN 'diner' THEN 3 END")->get();

        $totaux = [
            'total_portions' => $consommations->sum('total_portions'),
            'cout_prevu' => $consommations->sum('cout_prevu'),
            'cout_reel' => $consommations->sum('cout_reel'),
            'ecart' => $consommations->sum('ecart'),
        ];

        return response()->json([
            'consommations' => $consommations,
            'totaux' => $totaux,
        ]);
    }

    public function kpis(): JsonResponse
    {
        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd = Carbon::now()->endOfWeek();

        $semaine = TenantScope::apply(Consommation::query())->whereBetween('date', [$weekStart, $weekEnd]);

        $portionsServies = (int) $semaine->sum('total_portions');
        $coutReel = (int) $semaine->sum('cout_reel');
        $ecart = (int) (TenantScope::apply(Consommation::query())->whereBetween('date', [$weekStart, $weekEnd])
            ->selectRaw('COALESCE(SUM(cout_reel) - SUM(cout_prevu), 0) as e')->value('e'));
        $gaspillage = ($portionsServies > 0 && $coutReel > 0) ? round(($ecart / $coutReel) * 100, 1) : 0;

        return response()->json([
            'portions_servies' => $portionsServies,
            'cout_reel' => $coutReel,
            'ecart_budgetaire' => $ecart,
            'taux_gaspillage' => $gaspillage,
        ]);
    }

    public function articles(Request $request): JsonResponse
    {
        $query = ConsommationArticle::query();
        TenantScope::apply($query);

        if ($request->has('semaine_debut')) {
            $query->where('semaine_debut', $request->semaine_debut);
        } elseif ($request->has('periode')) {
            match ($request->periode) {
                'semaine' => $query->whereDate('semaine_debut', Carbon::now()->startOfWeek()->format('Y-m-d')),
                'semaine_precedente' => $query->whereDate('semaine_debut', Carbon::now()->subWeek()->startOfWeek()->format('Y-m-d')),
                'mois' => $query->whereBetween('semaine_debut', [Carbon::now()->startOfMonth()->format('Y-m-d'), Carbon::now()->endOfMonth()->format('Y-m-d')]),
                default => null,
            };
        }

        $articles = $query->get();
        $total = $articles->sum('cout_reel');

        return response()->json([
            'articles' => $articles,
            'total' => $total,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'repas' => 'required|in:petit_dejeuner,dejeuner,diner',
            'menu_servi' => 'required|string|max:255',
            'nb_malades' => 'required|integer|min:0',
            'nb_personnel' => 'required|integer|min:0',
            'nb_clients' => 'required|integer|min:0',
            'cout_prevu' => 'required|integer|min:0',
            'cout_reel' => 'required|integer|min:0',
        ]);

        $data['total_portions'] = $data['nb_malades'] + $data['nb_personnel'] + $data['nb_clients'];
        $data['ecart'] = $data['cout_reel'] - $data['cout_prevu'];

        $consommation = Consommation::create([
            ...$data,
            'formation_id' => TenantScope::$formationId,
        ]);

        return response()->json($consommation, 201);
    }

    public function ecartsParService(): JsonResponse
    {
        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd = Carbon::now()->endOfWeek();

        $services = Service::all();
        $labels = [];
        $prevu = [];
        $reel = [];

        foreach ($services as $service) {
            $labels[] = $service->nom;

            $portionsPrevu = Commande::where('service_id', $service->id)
                ->whereBetween('date_repas', [$weekStart, $weekEnd])
                ->whereIn('statut', ['valide', 'en_cours', 'livre'])
                ->sum('nb_portions');

            $portionsReel = Commande::where('service_id', $service->id)
                ->whereBetween('date_repas', [$weekStart, $weekEnd])
                ->where('statut', 'livre')
                ->sum('nb_portions');

            $prevu[] = (int) $portionsPrevu;
            $reel[] = (int) $portionsReel;
        }

        return response()->json([
            'labels' => $labels,
            'prevu' => $prevu,
            'reel' => $reel,
        ]);
    }
}

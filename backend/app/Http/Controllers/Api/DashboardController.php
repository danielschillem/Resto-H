<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\TenantScope;
use App\Models\Commande;
use App\Models\Consommation;
use App\Models\RegimeSpecial;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = Carbon::today();
        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd = Carbon::now()->endOfWeek();

        $kpis = $this->getKpis($user, $today, $weekStart, $weekEnd);
        $cmdQuery = TenantScope::apply(Commande::with(['service', 'menu'])->orderByDesc('created_at'));
        if (in_array($user->role, ['sus', 'sut']) && $user->service) {
            $cmdQuery->whereHas('service', fn($q) => $q->where('nom', $user->service));
        }
        $commandesRecentes = $cmdQuery->limit(5)->get();

        $chartData = $this->getWeekChartData($weekStart, $weekEnd);
        $repartition = $this->getRepartition();

        return response()->json([
            'kpis' => $kpis,
            'commandes_recentes' => $commandesRecentes,
            'chart_semaine' => $chartData,
            'repartition' => $repartition,
        ]);
    }

    private function getKpis($user, $today, $weekStart, $weekEnd): array
    {
        $portionsJour = TenantScope::apply(Commande::query())->whereDate('date_repas', $today)->sum('nb_portions');
        $commandesValidees = TenantScope::apply(Commande::query())->where('statut', 'validee')->whereDate('date_repas', $today)->count();
        $commandesAttente = TenantScope::apply(Commande::query())->where('statut', 'en_attente')->count();
        $patients = TenantScope::apply(Service::query())->sum('lits_actifs');
        $regimesActifs = TenantScope::apply(RegimeSpecial::query())->where('statut', 'valide')->count();
        $consoSemaine = TenantScope::apply(Consommation::query())->whereBetween('date', [$weekStart, $weekEnd])->sum('cout_reel');
        $ecartBudget = TenantScope::apply(Consommation::query())->whereBetween('date', [$weekStart, $weekEnd])
            ->selectRaw('SUM(cout_reel) - SUM(cout_prevu) as ecart')->value('ecart') ?? 0;

        return match ($user->role) {
            'prestataire' => [
                ['icon' => 'fa-bowl-food', 'color' => 'blue', 'val' => $portionsJour, 'label' => 'Portions prévues (auj.)', 'trend' => 'up', 'trendText' => 'Aujourd\'hui'],
                ['icon' => 'fa-clipboard-check', 'color' => 'green', 'val' => $commandesValidees, 'label' => 'Commandes validées', 'trend' => 'up', 'trendText' => $commandesAttente . ' en attente'],
                ['icon' => 'fa-bed', 'color' => 'teal', 'val' => $patients, 'label' => 'Patients en cours', 'trend' => 'up', 'trendText' => 'Capacité totale'],
                ['icon' => 'fa-sack-dollar', 'color' => 'amber', 'val' => number_format($consoSemaine, 0, ',', ' '), 'label' => 'Budget semaine (FCFA)', 'trend' => 'down', 'trendText' => 'Consommation réelle'],
            ],
            'dsgl' => [
                ['icon' => 'fa-file-circle-check', 'color' => 'green', 'val' => $commandesAttente, 'label' => 'Documents à valider', 'trend' => 'down', 'trendText' => 'En attente'],
                ['icon' => 'fa-chart-pie', 'color' => 'blue', 'val' => number_format($consoSemaine, 0, ',', ' '), 'label' => 'Consommation sem. (FCFA)', 'trend' => 'up', 'trendText' => 'Semaine en cours'],
                ['icon' => 'fa-users', 'color' => 'teal', 'val' => $patients, 'label' => 'Patients hospitalisés', 'trend' => 'up', 'trendText' => 'Lits actifs'],
                ['icon' => 'fa-scale-balanced', 'color' => 'amber', 'val' => number_format($ecartBudget, 0, ',', ' '), 'label' => 'Écart budgétaire (FCFA)', 'trend' => 'up', 'trendText' => 'Semaine en cours'],
            ],
            'csah' => [
                ['icon' => 'fa-bowl-food', 'color' => 'blue', 'val' => $portionsJour, 'label' => 'Repas à servir (auj.)', 'trend' => 'up', 'trendText' => 'Aujourd\'hui'],
                ['icon' => 'fa-heart-pulse', 'color' => 'red', 'val' => $regimesActifs, 'label' => 'Régimes spéciaux actifs', 'trend' => 'up', 'trendText' => 'Validés'],
                ['icon' => 'fa-star', 'color' => 'green', 'val' => '—', 'label' => 'Satisfaction (sem.)', 'trend' => 'up', 'trendText' => 'Non mesuré'],
                ['icon' => 'fa-clock', 'color' => 'amber', 'val' => '—', 'label' => "Livraisons à l'heure", 'trend' => 'up', 'trendText' => 'Non mesuré'],
            ],
            default => [
                [
                    'icon' => 'fa-bed',
                    'color' => 'teal',
                    'val' => $user->service
                        ? (TenantScope::apply(Service::query())->where('nom', $user->service)->value('lits_actifs') ?? 0)
                        : 0,
                    'label' => 'Patients dans mon service',
                    'trend' => 'up',
                    'trendText' => 'Lits actifs'
                ],
                [
                    'icon' => 'fa-clipboard-list',
                    'color' => 'blue',
                    'val' => $user->service
                        ? TenantScope::apply(Commande::query())->whereHas('service', fn($q) => $q->where('nom', $user->service))->whereDate('date_repas', $today)->count()
                        : 0,
                    'label' => 'Commandes du jour',
                    'trend' => 'up',
                    'trendText' => 'Mon service'
                ],
                [
                    'icon' => 'fa-heart-pulse',
                    'color' => 'red',
                    'val' => $user->service
                        ? TenantScope::apply(RegimeSpecial::query())->where('statut', 'valide')->whereHas('service', fn($q) => $q->where('nom', $user->service))->count()
                        : $regimesActifs,
                    'label' => 'Régimes spéciaux',
                    'trend' => 'down',
                    'trendText' => 'Actifs (validés)'
                ],
                [
                    'icon' => 'fa-circle-check',
                    'color' => 'green',
                    'val' => $user->service
                        ? TenantScope::apply(Commande::query())->whereHas('service', fn($q) => $q->where('nom', $user->service))->whereDate('date_repas', $today)->sum('nb_portions') ?? 0
                        : 0,
                    'label' => 'Portions prévues (auj.)',
                    'trend' => 'up',
                    'trendText' => 'Mon service'
                ],
            ],
        };
    }

    private function getWeekChartData($weekStart, $weekEnd): array
    {
        $jours = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        $malades = [];
        $personnel = [];
        $clients = [];

        $data = TenantScope::apply(Consommation::query())
            ->whereBetween('date', [$weekStart, $weekEnd])
            ->selectRaw("date, SUM(nb_malades) as malades, SUM(nb_personnel) as perso, SUM(nb_clients) as cli")
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy(fn($r) => Carbon::parse($r->date)->dayOfWeekIso);

        for ($d = 1; $d <= 7; $d++) {
            $row = $data->get($d);
            $malades[] = $row ? (int) $row->malades : 0;
            $personnel[] = $row ? (int) $row->perso : 0;
            $clients[] = $row ? (int) $row->cli : 0;
        }

        return [
            'labels' => $jours,
            'malades' => $malades,
            'personnel' => $personnel,
            'clients' => $clients,
        ];
    }

    private function getRepartition(): array
    {
        $total = TenantScope::apply(Commande::query())->count() ?: 1;
        $malades = TenantScope::apply(Commande::query())->where('type', 'malades')->count();
        $personnel = TenantScope::apply(Commande::query())->where('type', 'personnel')->count();
        $clients = TenantScope::apply(Commande::query())->where('type', 'client_externe')->count();

        return [
            'labels' => ['Malades', 'Personnel', 'Clients ext.'],
            'data' => [$malades, $personnel, $clients],
        ];
    }
}

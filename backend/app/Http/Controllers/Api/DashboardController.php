<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\TenantScope;
use App\Models\Commande;
use App\Models\Consommation;
use App\Models\DevisEstimatif;
use App\Models\Marche;
use App\Models\MenuHebdomadaire;
use App\Models\Notification;
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

        $response = [
            'kpis' => $kpis,
            'commandes_recentes' => $commandesRecentes,
            'chart_semaine' => $chartData,
            'repartition' => $repartition,
            'actions_urgentes' => $this->getActionsUrgentes($user),
        ];

        // Ajouter indicateurs marché pour DSGL / DAF
        if (in_array($user->role, ['dsgl', 'daf', 'super_admin'])) {
            $marchesActifs = TenantScope::apply(Marche::query())->where('statut', 'actif');
            $enAlerte = (clone $marchesActifs)->get()->filter(fn($m) => $m->en_alerte)->count();
            $budgetRestant = (clone $marchesActifs)->sum('montant_restant');
            $budgetTotal = (clone $marchesActifs)->sum('montant_initial');
            $response['marche_resume'] = [
                'marches_actifs' => (clone $marchesActifs)->count(),
                'en_alerte' => $enAlerte,
                'budget_restant' => $budgetRestant,
                'budget_total' => $budgetTotal,
                'taux_consommation' => $budgetTotal > 0 ? round((($budgetTotal - $budgetRestant) / $budgetTotal) * 100, 1) : 0,
            ];
        }

        return response()->json($response);
    }

    private function getActionsUrgentes($user): array
    {
        $actions = [];

        // Commandes en attente de validation
        $cmdAttente = TenantScope::apply(Commande::query())->where('statut', 'en_attente')->count();
        if ($cmdAttente > 0 && in_array($user->role, ['dsgl', 'csah', 'sus', 'super_admin'])) {
            $actions[] = [
                'icon' => 'fa-clipboard-list',
                'color' => 'amber',
                'label' => $cmdAttente . ' commande(s) à valider',
                'link' => '/commandes',
            ];
        }

        // Marchés en alerte
        if (in_array($user->role, ['dsgl', 'daf', 'super_admin'])) {
            $enAlerte = TenantScope::apply(Marche::query())->where('statut', 'actif')
                ->get()->filter(fn($m) => $m->en_alerte)->count();
            if ($enAlerte > 0) {
                $actions[] = [
                    'icon' => 'fa-triangle-exclamation',
                    'color' => 'red',
                    'label' => $enAlerte . ' marché(s) en alerte budget',
                    'link' => '/marches',
                ];
            }
        }

        // Régimes spéciaux en attente
        $regimesAttente = TenantScope::apply(RegimeSpecial::query())->where('statut', 'en_attente')->count();
        if ($regimesAttente > 0 && in_array($user->role, ['nutritionniste', 'dsgl', 'super_admin'])) {
            $actions[] = [
                'icon' => 'fa-heart-pulse',
                'color' => 'purple',
                'label' => $regimesAttente . ' régime(s) spécial(aux) à valider',
                'link' => '/menus-speciaux',
            ];
        }

        // Menus hebdomadaires soumis (en attente de validation)
        $menusSoumis = TenantScope::apply(MenuHebdomadaire::query())->where('statut', 'soumis')->count();
        if ($menusSoumis > 0 && in_array($user->role, ['dsgl', 'nutritionniste', 'super_admin'])) {
            $actions[] = [
                'icon' => 'fa-calendar-week',
                'color' => 'blue',
                'label' => $menusSoumis . ' menu(s) hebdo à valider',
                'link' => '/menus-hebdo',
            ];
        }

        // Devis en attente (DAF)
        $devisAttente = TenantScope::apply(DevisEstimatif::query())->where('statut', 'soumis')->count();
        if ($devisAttente > 0 && in_array($user->role, ['daf', 'dsgl', 'super_admin'])) {
            $actions[] = [
                'icon' => 'fa-file-invoice-dollar',
                'color' => 'green',
                'label' => $devisAttente . ' devis en attente de validation',
                'link' => '/validation-financiere',
            ];
        }

        // Commandes validées à livrer (prestataire)
        if ($user->role === 'prestataire') {
            $aLivrer = TenantScope::apply(Commande::query())->where('statut', 'validee')
                ->whereDate('date_repas', Carbon::today())->count();
            if ($aLivrer > 0) {
                $actions[] = [
                    'icon' => 'fa-truck',
                    'color' => 'teal',
                    'label' => $aLivrer . ' commande(s) à livrer aujourd\'hui',
                    'link' => '/commandes',
                ];
            }
        }

        // Notifications non lues
        $notifs = Notification::where('user_id', $user->id)->where('lu', false)->count();
        if ($notifs > 0) {
            $actions[] = [
                'icon' => 'fa-bell',
                'color' => 'amber',
                'label' => $notifs . ' notification(s) non lue(s)',
                'link' => '/notifications',
            ];
        }

        return $actions;
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
                ['icon' => 'fa-file-contract', 'color' => 'amber', 'val' => TenantScope::apply(Marche::query())->where('statut', 'actif')->count(), 'label' => 'Marchés actifs', 'trend' => 'up', 'trendText' => 'Budget en cours'],
            ],
            'csah' => [
                ['icon' => 'fa-bowl-food', 'color' => 'blue', 'val' => $portionsJour, 'label' => 'Repas à servir (auj.)', 'trend' => 'up', 'trendText' => 'Aujourd\'hui'],
                ['icon' => 'fa-heart-pulse', 'color' => 'red', 'val' => $regimesActifs, 'label' => 'Régimes spéciaux actifs', 'trend' => 'up', 'trendText' => 'Validés'],
                ['icon' => 'fa-truck', 'color' => 'green', 'val' => TenantScope::apply(Commande::query())->where('statut', 'livree')->whereDate('date_repas', $today)->count(), 'label' => 'Livraisons du jour', 'trend' => 'up', 'trendText' => 'Livrées aujourd\'hui'],
                ['icon' => 'fa-clock', 'color' => 'amber', 'val' => $commandesAttente, 'label' => 'En attente validation', 'trend' => 'down', 'trendText' => $commandesAttente . ' commande(s)'],
            ],
            'nutritionniste' => [
                ['icon' => 'fa-hospital-user', 'color' => 'purple', 'val' => $patients, 'label' => 'Patients hospitalisés', 'trend' => 'up', 'trendText' => 'Total en cours'],
                ['icon' => 'fa-heart-pulse', 'color' => 'red', 'val' => $regimesActifs, 'label' => 'Régimes spéciaux actifs', 'trend' => 'up', 'trendText' => 'Validés'],
                ['icon' => 'fa-bowl-food', 'color' => 'blue', 'val' => $portionsJour, 'label' => 'Portions prévues (auj.)', 'trend' => 'up', 'trendText' => 'Aujourd\'hui'],
                ['icon' => 'fa-microscope', 'color' => 'amber', 'val' => number_format($consoSemaine, 0, ',', ' '), 'label' => 'Coût semaine (FCFA)', 'trend' => 'down', 'trendText' => 'Consommation réelle'],
            ],
            'daf' => [
                ['icon' => 'fa-file-invoice-dollar', 'color' => 'blue', 'val' => $commandesAttente, 'label' => 'Documents en attente', 'trend' => 'down', 'trendText' => 'À valider'],
                ['icon' => 'fa-sack-dollar', 'color' => 'green', 'val' => number_format($consoSemaine, 0, ',', ' '), 'label' => 'Consommation sem. (FCFA)', 'trend' => 'up', 'trendText' => 'Semaine en cours'],
                ['icon' => 'fa-file-contract', 'color' => 'amber', 'val' => TenantScope::apply(Marche::query())->where('statut', 'actif')->count(), 'label' => 'Marchés actifs', 'trend' => 'up', 'trendText' => 'Budget en cours'],
                ['icon' => 'fa-chart-pie', 'color' => 'teal', 'val' => $portionsJour, 'label' => 'Portions prévues (auj.)', 'trend' => 'up', 'trendText' => 'Aujourd\'hui'],
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
        $counts = TenantScope::apply(Commande::query())
            ->selectRaw("COUNT(CASE WHEN type = 'malades' THEN 1 END) as malades")
            ->selectRaw("COUNT(CASE WHEN type = 'personnel' THEN 1 END) as personnel")
            ->selectRaw("COUNT(CASE WHEN type = 'client_externe' THEN 1 END) as clients")
            ->first();

        return [
            'labels' => ['Malades', 'Personnel', 'Clients ext.'],
            'data' => [
                (int) $counts->malades,
                (int) $counts->personnel,
                (int) $counts->clients,
            ],
        ];
    }
}

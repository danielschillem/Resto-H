<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\TenantScope;
use App\Models\AuditLog;
use App\Models\Commande;
use App\Models\DevisEstimatif;
use App\Models\MenuHebdomadaire;
use App\Models\Service;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EtatController extends Controller
{
    public function etatCommandes(Request $request): JsonResponse
    {
        $semaineDebut = $request->get('semaine_debut', Carbon::now()->startOfWeek()->format('Y-m-d'));
        $semaineFin = $request->get('semaine_fin', Carbon::now()->endOfWeek()->format('Y-m-d'));

        $services = TenantScope::apply(Service::query())->get();
        $data = [];

        $dailyTotals = array_fill(0, 5, 0);

        foreach ($services as $service) {
            $jours = [];
            $total = 0;
            $start = Carbon::parse($semaineDebut);

            for ($i = 0; $i < 5; $i++) {
                $date = $start->copy()->addDays($i);
                $count = (int) TenantScope::apply(Commande::query())
                    ->where('service_id', $service->id)
                    ->whereDate('date_repas', $date)
                    ->sum('nb_portions');
                $jours[] = $count;
                $total += $count;
                $dailyTotals[$i] += $count;
            }

            $data[] = [
                'nom' => $service->nom,
                'jours' => $jours,
                'total' => (int) $total,
            ];
        }

        $grandTotal = array_sum($dailyTotals);

        foreach ($data as &$d) {
            $d['pct'] = $grandTotal > 0 ? round($d['total'] / $grandTotal * 100, 1) . '%' : '0%';
        }
        unset($d);

        return response()->json([
            'semaine_debut' => $semaineDebut,
            'semaine_fin' => $semaineFin,
            'services' => $data,
            'totaux' => $dailyTotals,
            'grand_total' => $grandTotal,
        ]);
    }

    public function devis(Request $request): JsonResponse
    {
        $query = TenantScope::apply(DevisEstimatif::with(['lignes', 'soumisPar', 'validePar']));

        if ($request->has('statut')) {
            $query->where('statut', $request->statut);
        }

        return response()->json($query->orderByDesc('semaine_debut')->get());
    }

    public function storeDevis(Request $request): JsonResponse
    {
        $data = $request->validate([
            'semaine_debut' => 'required|date',
            'semaine_fin' => 'required|date|after_or_equal:semaine_debut',
            'lignes' => 'required|array|min:1',
            'lignes.*.article' => 'required|string|max:255',
            'lignes.*.unite' => 'required|string|max:50',
            'lignes.*.qte_estimee' => 'required|numeric|min:0',
            'lignes.*.prix_unitaire' => 'required|integer|min:0',
            'lignes.*.montant_estime' => 'required|integer|min:0',
        ]);

        $totalEstime = collect($data['lignes'])->sum('montant_estime');

        $devis = DevisEstimatif::create([
            'semaine_debut' => $data['semaine_debut'],
            'semaine_fin' => $data['semaine_fin'],
            'statut' => 'soumis',
            'total_estime' => $totalEstime,
            'soumis_par' => $request->user()->id,
            'date_soumission' => now(),
            'formation_id' => TenantScope::$formationId,
        ]);

        foreach ($data['lignes'] as $ligne) {
            $devis->lignes()->create($ligne);
        }

        return response()->json($devis->load('lignes'), 201);
    }

    public function validerDevis(Request $request, DevisEstimatif $devis): JsonResponse
    {
        $devis->update([
            'statut' => 'valide',
            'valide_par' => $request->user()->id,
            'date_validation' => now(),
        ]);

        AuditLog::record('valider', 'devis', $devis->id, 'S' . $devis->semaine_debut, null, $request);

        return response()->json($devis);
    }

    public function rejeterDevis(Request $request, DevisEstimatif $devis): JsonResponse
    {
        $request->validate(['commentaire' => 'required|string']);

        $devis->update([
            'statut' => 'rejete',
            'commentaire_rejet' => $request->commentaire,
        ]);

        AuditLog::record('rejeter', 'devis', $devis->id, 'S' . $devis->semaine_debut, $request->commentaire, $request);

        return response()->json($devis);
    }

    public function validations(): JsonResponse
    {
        $validations = collect();

        // Menus hebdomadaires
        TenantScope::apply(MenuHebdomadaire::with(['soumisPar', 'validePar']))->get()->each(function ($m) use ($validations) {
            $validations->push([
                'document' => 'Menus hebdo S' . \Carbon\Carbon::parse($m->semaine_debut)->weekOfYear,
                'periode' => \Carbon\Carbon::parse($m->semaine_debut)->format('d/m') . ' - ' . \Carbon\Carbon::parse($m->semaine_fin)->format('d/m'),
                'soumis_par' => $m->soumisPar?->full_name ?? '—',
                'date_soumission' => $m->date_soumission?->format('d/m H:i') ?? '—',
                'valide_par' => $m->validePar?->full_name ?? '—',
                'date_validation' => $m->date_validation?->format('d/m H:i') ?? '—',
                'statut' => $m->statut,
            ]);
        });

        // Devis
        TenantScope::apply(DevisEstimatif::with(['soumisPar', 'validePar']))->get()->each(function ($d) use ($validations) {
            $validations->push([
                'document' => 'Devis estimatif S' . $d->semaine_debut->weekOfYear,
                'periode' => $d->semaine_debut->format('d/m') . ' - ' . $d->semaine_fin->format('d/m'),
                'soumis_par' => $d->soumisPar?->full_name ?? '—',
                'date_soumission' => $d->date_soumission?->format('d/m H:i') ?? '—',
                'valide_par' => $d->validePar?->full_name ?? '—',
                'date_validation' => $d->date_validation?->format('d/m H:i') ?? '—',
                'statut' => $d->statut,
            ]);
        });

        return response()->json($validations->values());
    }
}

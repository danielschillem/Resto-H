<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ListeNominative;
use App\Models\Patient;
use App\Http\Middleware\TenantScope;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ListeNominativeController extends Controller
{
    /**
     * Liste nominative avec filtres date, repas, service
     */
    public function index(Request $request): JsonResponse
    {
        $query = ListeNominative::with(['patient:id,nom,prenom,sexe,age', 'service', 'lit.salle', 'enregistrePar']);
        TenantScope::apply($query);

        if ($request->filled('date')) {
            $query->whereDate('date', $request->date);
        } else {
            $query->whereDate('date', now()->toDateString());
        }

        if ($request->filled('repas')) {
            $query->where('repas', $request->repas);
        }

        if ($request->filled('service_id')) {
            $query->where('service_id', $request->service_id);
        }

        // SUS/SUT voient uniquement leur service
        $user = auth()->user();
        if (in_array($user->role, ['sus', 'sut'])) {
            $serviceId = \App\Models\Service::where('nom', $user->service)
                ->where('formation_id', $user->formation_id)
                ->value('id');
            if ($serviceId) {
                $query->where('service_id', $serviceId);
            }
        }

        $items = $query->orderBy('service_id')->orderBy('patient_id')->get();

        // Stats résumé
        $total = $items->count();
        $servis = $items->where('servi', true)->count();
        $parRegime = $items->groupBy('regime')
            ->map(fn($g, $r) => ['regime' => $r ?: 'Normal', 'count' => $g->count()])
            ->values();

        return response()->json([
            'items' => $items,
            'stats' => [
                'total_patients' => $total,
                'servis' => $servis,
                'non_servis' => $total - $servis,
                'par_regime' => $parRegime,
            ],
        ]);
    }

    /**
     * Créer une entrée (ou auto-générer pour tous les patients hospitalisés)
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'repas' => 'required|in:petit_dejeuner,dejeuner,diner',
            'patient_id' => 'nullable|exists:patients,id',
            'service_id' => 'required|exists:services,id',
            'lit_id' => 'nullable|exists:lits,id',
            'regime' => 'nullable|string|max:100',
            'observations' => 'nullable|string|max:500',
            'commande_id' => 'nullable|exists:commandes,id',
        ]);

        $user = auth()->user();
        $formationId = $user->formation_id;

        // Si pas de patient_id, générer pour tous les hospitalisés du service
        if (empty($data['patient_id'])) {
            $patients = Patient::where('statut', 'hospitalise')
                ->where('service_id', $data['service_id'])
                ->where('formation_id', $formationId)
                ->with('lit')
                ->get();

            $created = [];
            foreach ($patients as $patient) {
                // Vérifier doublon
                $exists = ListeNominative::where('date', $data['date'])
                    ->where('repas', $data['repas'])
                    ->where('patient_id', $patient->id)
                    ->exists();

                if (!$exists) {
                    // Chercher régime spécial du patient
                    $regime = \App\Models\RegimeSpecial::where('patient_nom', $patient->nom . ' ' . ($patient->prenom ?? ''))
                        ->where('statut', 'actif')
                        ->value('type_regime') ?? $data['regime'] ?? 'Normal';

                    $created[] = ListeNominative::create([
                        'date' => $data['date'],
                        'repas' => $data['repas'],
                        'patient_id' => $patient->id,
                        'service_id' => $data['service_id'],
                        'lit_id' => $patient->lit_id,
                        'regime' => $regime,
                        'observations' => $data['observations'] ?? null,
                        'enregistre_par' => $user->id,
                        'commande_id' => $data['commande_id'] ?? null,
                        'formation_id' => $formationId,
                    ]);
                }
            }

            return response()->json([
                'message' => count($created) . ' patient(s) ajouté(s) à la liste nominative',
                'items' => $created,
            ], 201);
        }

        // Création individuelle
        $data['enregistre_par'] = $user->id;
        $data['formation_id'] = $formationId;

        $item = ListeNominative::create($data);
        return response()->json($item->load(['patient', 'service', 'lit']), 201);
    }

    /**
     * Marquer comme servi / modifier observations
     */
    public function update(Request $request, ListeNominative $listeNominative): JsonResponse
    {
        $data = $request->validate([
            'servi' => 'boolean',
            'regime' => 'nullable|string|max:100',
            'observations' => 'nullable|string|max:500',
        ]);

        $listeNominative->update($data);
        return response()->json($listeNominative->load(['patient', 'service', 'lit']));
    }

    /**
     * Supprimer une entrée
     */
    public function destroy(ListeNominative $listeNominative): JsonResponse
    {
        $listeNominative->delete();
        return response()->json(['message' => 'Entrée supprimée']);
    }

    /**
     * Marquer tous comme servis pour un repas/date/service
     */
    public function marquerTousServis(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => 'required|date',
            'repas' => 'required|in:petit_dejeuner,dejeuner,diner',
            'service_id' => 'nullable|exists:services,id',
        ]);

        $query = ListeNominative::where('date', $data['date'])
            ->where('repas', $data['repas']);
        TenantScope::apply($query);

        if (!empty($data['service_id'])) {
            $query->where('service_id', $data['service_id']);
        }

        $count = $query->update(['servi' => true]);
        return response()->json(['message' => "$count patient(s) marqué(s) comme servi(s)"]);
    }
}

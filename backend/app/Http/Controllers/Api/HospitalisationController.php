<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\TenantScope;
use App\Models\Admission;
use App\Models\CategorieSalle;
use App\Models\Lit;
use App\Models\ListeNominative;
use App\Models\Patient;
use App\Models\Salle;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HospitalisationController extends Controller
{
    // ── Catégories de salles ─────────────────────────────────────────────

    public function categories(): JsonResponse
    {
        $query = CategorieSalle::orderBy('nom');
        TenantScope::apply($query);
        return response()->json($query->get());
    }

    public function storeCategorie(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'required|string|max:255',
            'nb_lits' => 'required|integer|min:1',
            'commodites' => 'nullable|string',
        ]);

        return response()->json(CategorieSalle::create([
            ...$data,
            'formation_id' => TenantScope::$formationId,
        ]), 201);
    }

    public function updateCategorie(Request $request, CategorieSalle $categorie): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'nb_lits' => 'sometimes|integer|min:1',
            'commodites' => 'nullable|string',
        ]);

        $categorie->update($data);
        return response()->json($categorie);
    }

    public function deleteCategorie(CategorieSalle $categorie): JsonResponse
    {
        $categorie->delete();
        return response()->json(['message' => 'Catégorie supprimée.']);
    }

    // ── Salles ───────────────────────────────────────────────────────────

    public function salles(Request $request): JsonResponse
    {
        $query = Salle::with(['service:id,nom', 'categorie:id,nom,nb_lits', 'lits'])->orderBy('numero');
        TenantScope::apply($query);

        if ($request->filled('service_id')) {
            $query->where('service_id', $request->service_id);
        }

        return response()->json($query->get());
    }

    public function storeSalle(Request $request): JsonResponse
    {
        $data = $request->validate([
            'numero' => 'required|string|max:255',
            'service_id' => 'required|integer|exists:services,id',
            'categorie_id' => 'nullable|integer|exists:categories_salles,id',
            'nb_lits' => 'required|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        $salle = Salle::create([
            ...$data,
            'formation_id' => TenantScope::$formationId,
        ]);

        // Auto-créer les lits
        for ($i = 1; $i <= $data['nb_lits']; $i++) {
            Lit::create([
                'numero' => (string) $i,
                'salle_id' => $salle->id,
                'formation_id' => TenantScope::$formationId,
            ]);
        }

        return response()->json($salle->load(['service:id,nom', 'categorie:id,nom,nb_lits', 'lits']), 201);
    }

    public function updateSalle(Request $request, Salle $salle): JsonResponse
    {
        $data = $request->validate([
            'numero' => 'sometimes|string|max:255',
            'service_id' => 'sometimes|integer|exists:services,id',
            'categorie_id' => 'nullable|integer|exists:categories_salles,id',
            'nb_lits' => 'sometimes|integer|min:0',
            'notes' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $salle->update($data);
        return response()->json($salle->load(['service:id,nom', 'categorie:id,nom,nb_lits', 'lits']));
    }

    public function deleteSalle(Salle $salle): JsonResponse
    {
        $salle->delete();
        return response()->json(['message' => 'Salle supprimée.']);
    }

    // ── Lits ─────────────────────────────────────────────────────────────

    public function lits(Request $request): JsonResponse
    {
        $query = Lit::with(['salle:id,numero,service_id', 'salle.service:id,nom'])->orderBy('numero');
        TenantScope::apply($query);

        if ($request->filled('salle_id')) {
            $query->where('salle_id', $request->salle_id);
        }

        return response()->json($query->get());
    }

    public function storeLit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'numero' => 'required|string|max:255',
            'salle_id' => 'required|integer|exists:salles,id',
            'notes' => 'nullable|string',
        ]);

        $lit = Lit::create([
            ...$data,
            'formation_id' => TenantScope::$formationId,
        ]);

        return response()->json($lit->load(['salle:id,numero,service_id']), 201);
    }

    public function updateLit(Request $request, Lit $lit): JsonResponse
    {
        $data = $request->validate([
            'numero' => 'sometimes|string|max:255',
            'salle_id' => 'sometimes|integer|exists:salles,id',
            'is_occupe' => 'sometimes|boolean',
            'notes' => 'nullable|string',
        ]);

        $lit->update($data);
        return response()->json($lit->load(['salle:id,numero,service_id']));
    }

    public function deleteLit(Lit $lit): JsonResponse
    {
        $lit->delete();
        return response()->json(['message' => 'Lit supprimé.']);
    }

    // ── Patients ─────────────────────────────────────────────────────────

    public function patients(Request $request): JsonResponse
    {
        $query = Patient::with(['lit:id,numero,salle_id', 'lit.salle:id,numero', 'service:id,nom'])
            ->orderByDesc('created_at');
        TenantScope::apply($query);

        if ($request->filled('service_id')) {
            $query->where('service_id', $request->service_id);
        }
        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($qb) use ($q) {
                $qb->where('nom', 'like', "%{$q}%")
                   ->orWhere('prenom', 'like', "%{$q}%");
            });
        }

        return response()->json($query->get());
    }

    public function storePatient(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'nullable|string|max:255',
            'sexe' => 'nullable|in:M,F',
            'age' => 'nullable|integer|min:0|max:200',
            'lit_id' => 'nullable|integer|exists:lits,id',
            'service_id' => 'required|integer|exists:services,id',
            'observations' => 'nullable|string',
        ]);

        $patient = Patient::create([
            ...$data,
            'statut' => 'hospitalise',
            'formation_id' => TenantScope::$formationId,
        ]);

        // Marquer le lit comme occupé
        if ($patient->lit_id) {
            Lit::where('id', $patient->lit_id)->update(['is_occupe' => true]);
        }

        return response()->json($patient->load(['lit:id,numero,salle_id', 'lit.salle:id,numero', 'service:id,nom']), 201);
    }

    public function showPatient(Patient $patient): JsonResponse
    {
        return response()->json($patient->load([
            'lit:id,numero,salle_id', 'lit.salle:id,numero,service_id', 'lit.salle.service:id,nom',
            'service:id,nom', 'admissions',
        ]));
    }

    public function updatePatient(Request $request, Patient $patient): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'prenom' => 'nullable|string|max:255',
            'sexe' => 'nullable|in:M,F',
            'age' => 'nullable|integer|min:0|max:200',
            'lit_id' => 'nullable|integer|exists:lits,id',
            'service_id' => 'sometimes|integer|exists:services,id',
            'statut' => 'sometimes|in:hospitalise,sorti,transfere',
            'observations' => 'nullable|string',
        ]);

        $oldLitId = $patient->lit_id;
        $patient->update($data);

        // Gérer l'occupation des lits
        if (isset($data['lit_id']) && $data['lit_id'] !== $oldLitId) {
            if ($oldLitId) {
                Lit::where('id', $oldLitId)->update(['is_occupe' => false]);
            }
            if ($data['lit_id']) {
                Lit::where('id', $data['lit_id'])->update(['is_occupe' => true]);
            }
        }

        // Si le patient sort, libérer le lit
        if (isset($data['statut']) && $data['statut'] === 'sorti' && $patient->lit_id) {
            Lit::where('id', $patient->lit_id)->update(['is_occupe' => false]);
            $patient->update(['lit_id' => null]);
        }

        return response()->json($patient->load(['lit:id,numero,salle_id', 'lit.salle:id,numero', 'service:id,nom']));
    }

    // ── Admissions ───────────────────────────────────────────────────────

    public function admissions(Request $request): JsonResponse
    {
        $query = Admission::with(['patient:id,nom,prenom', 'service:id,nom', 'lit:id,numero,salle_id', 'lit.salle:id,numero'])
            ->orderByDesc('date_admission');
        TenantScope::apply($query);

        if ($request->filled('service_id')) {
            $query->where('service_id', $request->service_id);
        }
        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        return response()->json($query->get());
    }

    public function storeAdmission(Request $request): JsonResponse
    {
        $data = $request->validate([
            'patient_id' => 'required|integer|exists:patients,id',
            'service_id' => 'required|integer|exists:services,id',
            'lit_id' => 'nullable|integer|exists:lits,id',
            'date_admission' => 'required|date',
            'motif' => 'nullable|string|max:255',
            'medecin_referent' => 'nullable|string|max:255',
            'observations' => 'nullable|string',
        ]);

        $admission = Admission::create([
            ...$data,
            'enregistre_par' => $request->user()->id,
            'formation_id' => TenantScope::$formationId,
        ]);

        // Mettre à jour le patient : lit + service + statut
        $patient = Patient::find($data['patient_id']);
        $updateData = ['service_id' => $data['service_id'], 'statut' => 'hospitalise'];
        if (isset($data['lit_id'])) {
            // Libérer l'ancien lit
            if ($patient->lit_id) {
                Lit::where('id', $patient->lit_id)->update(['is_occupe' => false]);
            }
            $updateData['lit_id'] = $data['lit_id'];
            Lit::where('id', $data['lit_id'])->update(['is_occupe' => true]);
        }
        $patient->update($updateData);

        // Auto-inscrire le patient sur la liste nominative pour les repas restants du jour
        $this->inscrireListeNominative($patient, $data['service_id'], $data['lit_id'] ?? null);

        return response()->json($admission->load([
            'patient:id,nom,prenom', 'service:id,nom', 'lit:id,numero,salle_id', 'lit.salle:id,numero',
        ]), 201);
    }

    public function updateAdmission(Request $request, Admission $admission): JsonResponse
    {
        $data = $request->validate([
            'date_sortie' => 'nullable|date',
            'observations' => 'nullable|string',
        ]);

        $admission->update($data);

        // Si date de sortie, libérer le lit et mettre patient sorti
        if (isset($data['date_sortie'])) {
            $patient = $admission->patient;
            if ($patient->lit_id) {
                Lit::where('id', $patient->lit_id)->update(['is_occupe' => false]);
            }
            $patient->update(['statut' => 'sorti', 'lit_id' => null]);
        }

        return response()->json($admission->load([
            'patient:id,nom,prenom', 'service:id,nom', 'lit:id,numero,salle_id',
        ]));
    }

    // ── Statistiques ─────────────────────────────────────────────────────

    public function stats(): JsonResponse
    {
        $sallesQuery = Salle::query();
        TenantScope::apply($sallesQuery);

        $litsQuery = Lit::query();
        TenantScope::apply($litsQuery);

        $patientsQuery = Patient::where('statut', 'hospitalise');
        TenantScope::apply($patientsQuery);

        return response()->json([
            'total_salles' => (clone $sallesQuery)->where('is_active', true)->count(),
            'total_lits' => (clone $litsQuery)->count(),
            'lits_occupes' => (clone $litsQuery)->where('is_occupe', true)->count(),
            'lits_libres' => (clone $litsQuery)->where('is_occupe', false)->count(),
            'patients_hospitalises' => $patientsQuery->count(),
        ]);
    }

    /**
     * Auto-inscrire un patient sur la liste nominative pour les repas restants du jour.
     */
    private function inscrireListeNominative(Patient $patient, int $serviceId, ?int $litId): void
    {
        $today = Carbon::today()->toDateString();
        $hour = Carbon::now()->hour;

        // Déterminer les repas restants selon l'heure d'admission
        $repas = [];
        if ($hour < 7) $repas = ['petit_dejeuner', 'dejeuner', 'diner'];
        elseif ($hour < 12) $repas = ['dejeuner', 'diner'];
        elseif ($hour < 19) $repas = ['diner'];
        // Après 19h, pas de repas restant

        $formationId = TenantScope::$formationId;
        $userId = auth()->id();

        foreach ($repas as $r) {
            ListeNominative::firstOrCreate(
                ['date' => $today, 'repas' => $r, 'patient_id' => $patient->id],
                [
                    'service_id' => $serviceId,
                    'lit_id' => $litId,
                    'regime' => 'Normal',
                    'servi' => false,
                    'enregistre_par' => $userId,
                    'formation_id' => $formationId,
                ]
            );
        }
    }
}

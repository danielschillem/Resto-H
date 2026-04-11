<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\TenantScope;
use App\Models\AuditLog;
use App\Models\Commande;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommandeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Commande::with(['service', 'menu', 'soumisPar', 'regimesSpeciaux']);

        // SUS & SUT voient uniquement leur propre service
        if (in_array($user->role, ['sus', 'sut']) && $user->service) {
            $query->whereHas('service', fn($q) => $q->where('nom', $user->service));
        }

        // Tenant scoping
        TenantScope::apply($query);

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }
        if ($request->has('service_id')) {
            $query->where('service_id', $request->service_id);
        }
        if ($request->has('repas')) {
            $query->where('repas', $request->repas);
        }
        if ($request->has('date')) {
            $query->whereDate('date_repas', $request->date);
        }
        if ($request->has('statut')) {
            $query->where('statut', $request->statut);
        }

        return response()->json(
            $query->orderByDesc('created_at')->paginate($request->integer('per_page', 20))
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => 'required|in:malades,personnel,client_externe',
            'service_id' => 'required|exists:services,id',
            'date_repas' => 'required|date',
            'repas' => 'required|in:petit_dejeuner,dejeuner,diner',
            'menu_id' => 'nullable|exists:menus,id',
            'nb_portions' => 'required|integer|min:1',
            'heure_livraison' => 'nullable|string|max:10',
            'montant' => 'nullable|integer|min:0',
            'client_nom' => 'nullable|string|max:255',
            'observations' => 'nullable|string',
            'regimes_speciaux' => 'nullable|array',
            'regimes_speciaux.*' => 'exists:regimes_speciaux,id',
        ]);

        // Deadline: commandes must be submitted before 09:00
        $now = Carbon::now();
        if ($now->hour >= 9) {
            return response()->json([
                'message' => 'Les commandes doivent être saisies avant 09h00. Heure actuelle : ' . $now->format('H:i'),
            ], 422);
        }

        $lastRef = Commande::orderByDesc('id')->value('reference');
        $nextNum = $lastRef ? ((int) str_replace(['#', 'P-', 'C-'], '', $lastRef)) + 1 : 2401;
        $prefix = match ($data['type']) {
            'personnel' => '#P-',
            'client_externe' => '#C-',
            default => '#',
        };

        $commande = Commande::create([
            ...$data,
            'reference' => $prefix . $nextNum,
            'soumis_par' => $request->user()->id,
            'statut' => 'en_attente',
            'statut_paiement' => $data['type'] === 'client_externe' ? 'en_attente' : 'non_applicable',
            'formation_id' => TenantScope::$formationId,
        ]);

        if (!empty($data['regimes_speciaux'])) {
            $commande->regimesSpeciaux()->attach($data['regimes_speciaux']);
        }

        return response()->json($commande->load(['service', 'menu', 'regimesSpeciaux']), 201);
    }

    public function show(Commande $commande): JsonResponse
    {
        return response()->json(
            $commande->load(['service', 'menu', 'soumisPar', 'validePar', 'regimesSpeciaux.service'])
        );
    }

    public function valider(Request $request, Commande $commande): JsonResponse
    {
        $commande->update([
            'statut' => 'validee',
            'valide_par' => $request->user()->id,
            'date_validation' => now(),
        ]);

        AuditLog::record('valider', 'commande', $commande->id, $commande->reference, null, $request);

        return response()->json($commande);
    }

    public function rejeter(Request $request, Commande $commande): JsonResponse
    {
        $request->validate([
            'motif_rejet' => 'required|string|max:500',
        ]);

        $commande->update([
            'statut' => 'rejetee',
            'motif_rejet' => $request->motif_rejet,
        ]);

        AuditLog::record('rejeter', 'commande', $commande->id, $commande->reference, $request->motif_rejet, $request);

        return response()->json($commande);
    }

    public function enregistrerPaiement(Commande $commande): JsonResponse
    {
        $commande->update(['statut_paiement' => 'paye']);

        AuditLog::record('paiement', 'commande', $commande->id, $commande->reference, null, request());

        return response()->json($commande);
    }

    public function aValider(): JsonResponse
    {
        $commandes = Commande::with(['service', 'soumisPar'])
            ->where('statut', 'en_attente')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($commandes);
    }

    public function livrer(Commande $commande): JsonResponse
    {
        if ($commande->statut !== 'validee') {
            return response()->json(['message' => 'Seules les commandes validées peuvent être livrées.'], 422);
        }

        $commande->update(['statut' => 'livree']);

        AuditLog::record('livrer', 'commande', $commande->id, $commande->reference, null, request());

        return response()->json($commande);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\TenantScope;
use App\Models\AuditLog;
use App\Models\Commande;
use App\Models\Marche;
use App\Models\Menu;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommandeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Commande::with(['service', 'menu', 'soumisPar', 'regimesSpeciaux', 'marche']);

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
            'marche_id' => 'nullable|exists:marches,id',
        ]);

        // Deadline: commandes must be submitted before 09:00 (désactivé en dev)
        $now = Carbon::now();
        if ($now->hour >= 9 && !app()->environment('local', 'testing')) {
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

        // Auto-calcul montant si menu sélectionné et pas de montant fourni
        if (empty($data['montant']) && !empty($data['menu_id'])) {
            $coutUnitaire = Menu::where('id', $data['menu_id'])->value('cout_unitaire');
            if ($coutUnitaire) {
                $data['montant'] = (int) ($coutUnitaire * $data['nb_portions']);
            }
        }

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

        AuditLog::record('creer', 'commande', $commande->id, $commande->reference, null, $request);

        return response()->json($commande->load(['service', 'menu', 'regimesSpeciaux']), 201);
    }

    public function show(Commande $commande): JsonResponse
    {
        return response()->json(
            $commande->load(['service', 'menu', 'soumisPar', 'validePar', 'regimesSpeciaux.service', 'marche'])
        );
    }

    public function valider(Request $request, Commande $commande): JsonResponse
    {
        $user = $request->user();

        // Double validation : SUS valide d'abord, puis CSAH/DSGL
        if ($user->role === 'sus') {
            // SUS ne peut valider que les commandes en_attente
            if ($commande->statut !== 'en_attente') {
                return response()->json(['message' => 'Cette commande ne peut pas être validée par le SUS dans son état actuel.'], 422);
            }
            $commande->update([
                'statut' => 'validee_sus',
                'valide_sus_par' => $user->id,
                'date_validation_sus' => now(),
            ]);
            AuditLog::record('valider_sus', 'commande', $commande->id, $commande->reference, null, $request);
            return response()->json($commande->load(['service', 'valideSusPar']));
        }

        // CSAH/DSGL valide (accepte en_attente si pas de SUS, ou validee_sus)
        if (!in_array($commande->statut, ['en_attente', 'validee_sus'])) {
            return response()->json(['message' => 'Cette commande ne peut pas être validée dans son état actuel.'], 422);
        }

        $commande->update([
            'statut' => 'validee',
            'valide_par' => $user->id,
            'date_validation' => now(),
        ]);

        // Imputation automatique sur le marché lié
        if ($commande->marche_id) {
            $marche = Marche::find($commande->marche_id);
            if ($marche && $marche->statut === 'actif') {
                $montant = $commande->montant ?? 0;
                if ($montant > 0) {
                    $marche->imputer($montant);

                    // Alerte fin de crédit si seuil atteint
                    if ($marche->en_alerte) {
                        $destinataires = User::where('formation_id', TenantScope::$formationId)
                            ->whereIn('role', ['dsgl', 'daf'])
                            ->where('is_active', true)
                            ->pluck('id');

                        foreach ($destinataires as $userId) {
                            Notification::create([
                                'user_id' => $userId,
                                'titre' => 'Alerte budget marché',
                                'message' => "Le marché {$marche->reference} ({$marche->objet}) a atteint le seuil d'alerte. Reste : " . number_format($marche->montant_restant, 0, ',', ' ') . " FCFA ({$marche->pourcentage_consomme}% consommé).",
                                'type' => 'alerte_marche',
                                'reference_id' => $marche->id,
                                'formation_id' => TenantScope::$formationId,
                            ]);
                        }
                    }
                }
            }
        }

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

    public function aValider(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Commande::with(['service', 'soumisPar', 'valideSusPar']);

        if ($user->role === 'sus') {
            // SUS voit les commandes en_attente de son service
            $query->where('statut', 'en_attente');
            if ($user->service) {
                $query->whereHas('service', fn($q) => $q->where('nom', $user->service));
            }
        } else {
            // CSAH/DSGL voient les commandes en_attente ou validee_sus
            $query->whereIn('statut', ['en_attente', 'validee_sus']);
        }

        TenantScope::apply($query);

        return response()->json($query->orderByDesc('created_at')->get());
    }

    public function livrer(Request $request, Commande $commande): JsonResponse
    {
        if ($commande->statut !== 'validee') {
            return response()->json(['message' => 'Seules les commandes validées peuvent être livrées.'], 422);
        }

        $data = $request->validate([
            'heure_livraison_effective' => 'nullable|string|max:10',
            'temperature' => 'nullable|string|max:50',
            'observations_livraison' => 'nullable|string|max:500',
        ]);

        $commande->update([
            'statut' => 'livree',
            'heure_livraison_effective' => $data['heure_livraison_effective'] ?? null,
            'temperature' => $data['temperature'] ?? null,
            'observations_livraison' => $data['observations_livraison'] ?? null,
        ]);

        AuditLog::record('livrer', 'commande', $commande->id, $commande->reference, null, request());

        return response()->json($commande);
    }
}

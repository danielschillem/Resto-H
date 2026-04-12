<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Licence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LicenceController extends Controller
{
    /**
     * Retourne le statut courant de la licence.
     * Route publique (pas d'auth requise).
     */
    public function index(Request $request): JsonResponse
    {
        $formationId = $request->query('formation_id');
        $licence = Licence::courant($formationId ? (int) $formationId : null);

        return response()->json([
            'statut' => $licence->statut,
            'date_debut' => $licence->date_debut->format('Y-m-d'),
            'date_fin' => $licence->date_fin->format('Y-m-d'),
            'jours_restants' => $licence->joursRestants(),
            'titulaire' => $licence->titulaire,
            'valide' => $licence->isValide(),
        ]);
    }

    /**
     * Active une licence premium avec une clé.
     * Clé valide : commence par RESTO- suivi de 16 caractères alphanumériques (4 groupes de 4).
     * Ex: RESTO-ABCD-1234-EFGH-5678
     */
    public function activer(Request $request): JsonResponse
    {
        $request->validate([
            'cle' => 'required|string|max:100',
            'titulaire' => 'nullable|string|max:150',
        ]);

        $cle = strtoupper(trim($request->cle));

        if (!preg_match('/^RESTO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $cle)) {
            return response()->json([
                'message' => 'Clé de licence invalide. Format attendu : RESTO-XXXX-XXXX-XXXX-XXXX',
            ], 422);
        }

        $formationId = auth()->user()?->formation_id;
        $licence = Licence::courant($formationId);

        $licence->update([
            'statut' => 'premium',
            'date_debut' => now(),
            'date_fin' => now()->addYear(),
            'cle_licence' => $cle,
            'titulaire' => $request->titulaire,
        ]);

        return response()->json([
            'message' => 'Licence premium activée avec succès.',
            'date_fin' => $licence->fresh()->date_fin->format('Y-m-d'),
            'titulaire' => $licence->titulaire,
        ]);
    }
}

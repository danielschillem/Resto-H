<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\TenantScope;
use App\Models\AuditLog;
use App\Models\RegimeSpecial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegimeSpecialController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = RegimeSpecial::with(['service', 'soumisPar', 'validePar']);
        TenantScope::apply($query);

        if ($request->has('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->has('service_id')) {
            $query->where('service_id', $request->service_id);
        }
        if ($request->has('type_regime')) {
            $query->where('type_regime', $request->type_regime);
        }

        return response()->json($query->orderByDesc('created_at')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'patient_nom' => 'required|string|max:255',
            'lit' => 'required|string|max:50',
            'service_id' => 'required|exists:services,id',
            'type_regime' => 'required|in:sans_sel,diabetique,hyposode,post_op_mixe,hyper_proteine,sans_gluten,enrichi,autre',
            'date_debut' => 'required|date',
            'duree_jours' => 'required|integer|min:1|max:365',
            'medecin_prescripteur' => 'required|string|max:255',
            'instructions' => 'nullable|string',
        ]);

        $regime = RegimeSpecial::create([
            ...$data,
            'soumis_par' => $request->user()->id,
            'statut' => 'en_attente',
            'formation_id' => TenantScope::$formationId,
        ]);

        return response()->json($regime->load('service'), 201);
    }

    public function show(RegimeSpecial $regime): JsonResponse
    {
        return response()->json($regime->load(['service', 'soumisPar', 'validePar']));
    }

    public function update(Request $request, RegimeSpecial $regime): JsonResponse
    {
        if (!in_array($regime->statut, ['en_attente'])) {
            return response()->json(['message' => 'Seuls les régimes en attente peuvent être modifiés.'], 422);
        }

        $data = $request->validate([
            'patient_nom' => 'sometimes|string|max:255',
            'lit' => 'sometimes|string|max:50',
            'service_id' => 'sometimes|exists:services,id',
            'type_regime' => 'sometimes|in:sans_sel,diabetique,hyposode,post_op_mixe,hyper_proteine,sans_gluten,enrichi,autre',
            'date_debut' => 'sometimes|date',
            'duree_jours' => 'sometimes|integer|min:1|max:365',
            'medecin_prescripteur' => 'sometimes|string|max:255',
            'instructions' => 'nullable|string',
        ]);

        $regime->update($data);

        return response()->json($regime->load('service'));
    }

    public function valider(Request $request, RegimeSpecial $regime): JsonResponse
    {
        $regime->update([
            'statut' => 'valide',
            'valide_par' => $request->user()->id,
        ]);

        AuditLog::record('valider', 'regime_special', $regime->id, $regime->patient_nom, null, $request);

        return response()->json($regime);
    }

    public function rejeter(Request $request, RegimeSpecial $regime): JsonResponse
    {
        $request->validate(['motif_rejet' => 'required|string|max:500']);

        $regime->update([
            'statut' => 'rejete',
            'motif_rejet' => $request->motif_rejet,
        ]);

        AuditLog::record('rejeter', 'regime_special', $regime->id, $regime->patient_nom, $request->motif_rejet, $request);

        return response()->json($regime);
    }

    public function terminer(RegimeSpecial $regime): JsonResponse
    {
        $regime->update(['statut' => 'termine']);

        AuditLog::record('terminer', 'regime_special', $regime->id, $regime->patient_nom, null, request());

        return response()->json($regime);
    }
}

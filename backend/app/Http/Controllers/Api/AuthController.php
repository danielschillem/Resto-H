<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FormationSanitaire;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'formation_code' => 'nullable|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants fournis sont incorrects.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Ce compte est désactivé.'],
            ]);
        }

        // ── Vérification tenant : si un code de formation est fourni,
        //    l'utilisateur DOIT appartenir à cette formation.
        //    Le super_admin est exempté (il n'a pas de formation_id).
        if ($request->filled('formation_code') && $user->role !== 'super_admin') {
            $formation = FormationSanitaire::where('code', strtoupper($request->formation_code))
                ->where('is_active', true)
                ->first();

            if (!$formation || $user->formation_id !== $formation->id) {
                throw ValidationException::withMessages([
                    'email' => ['Ces identifiants ne sont pas valides pour cette formation sanitaire.'],
                ]);
            }
        }

        $token = $user->createToken('sgrh-token')->plainTextToken;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'nom' => $user->nom,
                'prenom' => $user->prenom,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'role' => $user->role,
                'service' => $user->service,
                'formation_id' => $user->formation_id,
                'permissions' => $user->permissions,
            ],
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'nom' => $user->nom,
            'prenom' => $user->prenom,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'role' => $user->role,
            'service' => $user->service,
            'formation_id' => $user->formation_id,
            'permissions' => $user->permissions,
        ]);
    }
}

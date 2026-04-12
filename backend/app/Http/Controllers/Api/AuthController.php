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

        // Tracking last login
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

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
                'must_change_password' => (bool) $user->must_change_password,
            ],
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    /**
     * Login par sélection de formation + rôle + code d'accès.
     * Utilisé par la page de connexion générique (non super_admin).
     */
    public function loginByCode(Request $request): JsonResponse
    {
        $request->validate([
            'formation_id' => 'required|integer|exists:formations_sanitaires,id',
            'role' => 'required|string|in:prestataire,dsgl,csah,sus,sut',
            'code' => 'required|string',
        ]);

        $formation = FormationSanitaire::where('id', $request->formation_id)
            ->where('is_active', true)
            ->first();

        if (!$formation) {
            throw ValidationException::withMessages([
                'formation_id' => ['Cette formation sanitaire est inactive ou introuvable.'],
            ]);
        }

        // Trouver l'utilisateur par formation + rôle
        $user = User::where('formation_id', $formation->id)
            ->where('role', $request->role)
            ->first();

        if (!$user || !Hash::check($request->code, $user->password)) {
            throw ValidationException::withMessages([
                'code' => ['Code d\'accès incorrect pour ce profil.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'code' => ['Ce compte est désactivé. Contactez l\'administrateur.'],
            ]);
        }

        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

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
                'must_change_password' => (bool) $user->must_change_password,
            ],
            'token' => $token,
        ]);
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
            'last_login_at' => $user->last_login_at?->toISOString(),
            'last_login_ip' => $user->last_login_ip,
            'must_change_password' => (bool) $user->must_change_password,
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'prenom' => 'sometimes|string|max:255',
        ]);

        $user->update($data);

        return response()->json([
            'message' => 'Profil mis à jour.',
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
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $user->update([
            'password' => bcrypt($request->new_password),
            'password_changed_at' => now(),
            'must_change_password' => false,
        ]);

        return response()->json(['message' => 'Mot de passe modifié avec succès.']);
    }
}

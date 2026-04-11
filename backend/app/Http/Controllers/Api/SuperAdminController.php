<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FormationSanitaire;
use App\Models\Licence;
use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SuperAdminController extends Controller
{
    // ── Info publique (pas d'authentification requise) ──────────────────────

    public function formationPublicInfo(string $code): JsonResponse
    {
        $formation = FormationSanitaire::where('code', strtoupper($code))
            ->where('is_active', true)
            ->first(['id', 'nom', 'code', 'type', 'ville', 'region']);

        if (!$formation) {
            return response()->json(['message' => 'Formation introuvable ou inactive.'], 404);
        }

        return response()->json($formation);
    }

    // ── Stats globales ──────────────────────────────────────────────────────

    public function stats(): JsonResponse
    {
        $licence = Licence::courant();

        return response()->json([
            'total_formations' => FormationSanitaire::count(),
            'formations_actives' => FormationSanitaire::where('is_active', true)->count(),
            'total_users' => User::where('role', '!=', 'super_admin')->count(),
            'users_actifs' => User::where('role', '!=', 'super_admin')->where('is_active', true)->count(),
            'roles' => User::where('role', '!=', 'super_admin')
                ->selectRaw('role, count(*) as total')
                ->groupBy('role')
                ->pluck('total', 'role'),
            'licence_statut' => $licence->statut,
            'licence_jours' => $licence->joursRestants(),
            'licence_fin' => $licence->date_fin->format('Y-m-d'),
        ]);
    }

    // ── Gestion des formations sanitaires ──────────────────────────────────

    public function formations(): JsonResponse
    {
        $formations = FormationSanitaire::withCount('users')
            ->with(['users' => fn($q) => $q->where('role', 'gerant')->select('id', 'nom', 'prenom', 'email', 'formation_id')])
            ->orderBy('nom')
            ->get();

        return response()->json($formations);
    }

    public function storeFormation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:formations_sanitaires,code',
            'type' => 'required|string|max:50',
            'ville' => 'nullable|string|max:100',
            'region' => 'nullable|string|max:100',
            'telephone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'directeur' => 'nullable|string|max:255',
            // Gérant initial (optionnel)
            'gerant_nom' => 'nullable|string|max:255',
            'gerant_prenom' => 'nullable|string|max:255',
            'gerant_email' => 'nullable|email|unique:users,email',
            'gerant_password' => 'nullable|string|min:4',
        ]);

        $formation = FormationSanitaire::create([
            'nom' => $data['nom'],
            'code' => strtoupper($data['code']),
            'type' => $data['type'],
            'ville' => $data['ville'] ?? null,
            'region' => $data['region'] ?? null,
            'telephone' => $data['telephone'] ?? null,
            'email' => $data['email'] ?? null,
            'directeur' => $data['directeur'] ?? null,
            'is_active' => true,
        ]);

        // Créer le gérant si fourni
        if (!empty($data['gerant_email'])) {
            User::create([
                'formation_id' => $formation->id,
                'nom' => $data['gerant_nom'] ?? 'Gérant',
                'prenom' => $data['gerant_prenom'] ?? $formation->nom,
                'email' => $data['gerant_email'],
                'password' => bcrypt($data['gerant_password'] ?? '1234'),
                'role' => 'gerant',
                'is_active' => true,
            ]);
        }

        return response()->json($formation->load('users'), 201);
    }

    public function updateFormation(Request $request, FormationSanitaire $formation): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:formations_sanitaires,code,' . $formation->id,
            'type' => 'sometimes|string|max:50',
            'ville' => 'nullable|string|max:100',
            'region' => 'nullable|string|max:100',
            'telephone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'directeur' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $formation->update($data);

        return response()->json($formation->fresh());
    }

    public function destroyFormation(FormationSanitaire $formation): JsonResponse
    {
        // Safety: block deletion if formation has users
        if ($formation->users()->count() > 0) {
            return response()->json(['message' => 'Impossible de supprimer une formation avec des utilisateurs actifs.'], 422);
        }

        $formation->delete();

        return response()->json(['message' => 'Formation supprimée.']);
    }

    public function formationUsers(FormationSanitaire $formation): JsonResponse
    {
        return response()->json(
            $formation->users()->orderBy('nom')->get(['id', 'nom', 'prenom', 'email', 'role', 'service', 'is_active'])
        );
    }

    public function storeFormationUser(Request $request, FormationSanitaire $formation): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:4',
            'role' => 'required|in:gerant,dsgl,csah,sus,sut',
            'service' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            ...$data,
            'password' => bcrypt($data['password']),
            'formation_id' => $formation->id,
            'is_active' => true,
        ]);

        return response()->json($user, 201);
    }

    // ── Gestion des utilisateurs ────────────────────────────────────────────

    public function users(): JsonResponse
    {
        $users = User::where('role', '!=', 'super_admin')
            ->orderBy('nom')
            ->get(['id', 'nom', 'prenom', 'email', 'role', 'service', 'is_active', 'created_at']);

        return response()->json($users);
    }

    public function storeUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:4',
            'role' => 'required|in:gerant,dsgl,csah,sus,sut',
            'service' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            ...$data,
            'password' => bcrypt($data['password']),
        ]);

        return response()->json($user, 201);
    }

    public function updateUser(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'prenom' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:gerant,dsgl,csah,sus,sut',
            'service' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $user->update($data);

        return response()->json($user->fresh());
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'password' => 'required|string|min:4',
        ]);

        $user->update(['password' => bcrypt($data['password'])]);

        return response()->json(['message' => 'Mot de passe réinitialisé.']);
    }

    public function destroyUser(User $user): JsonResponse
    {
        if ($user->role === 'super_admin') {
            return response()->json(['message' => 'Impossible de supprimer le super admin.'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }

    // ── Gestion des permissions ─────────────────────────────────────────────

    public function permissions(): JsonResponse
    {
        return response()->json([
            'all' => RolePermission::allPermissions(),
            'grouped' => RolePermission::allGrouped(),
        ]);
    }

    public function updatePermissions(Request $request): JsonResponse
    {
        $data = $request->validate([
            'role' => 'required|in:gerant,dsgl,csah,sus,sut',
            'permissions' => 'required|array',
            'permissions.*' => 'string|in:' . implode(',', RolePermission::allPermissions()),
        ]);

        RolePermission::syncForRole($data['role'], $data['permissions']);

        return response()->json([
            'message' => 'Permissions mises à jour.',
            'permissions' => RolePermission::permissionsForRole($data['role']),
        ]);
    }

    // ── Gestion de la licence ───────────────────────────────────────────────

    public function licence(): JsonResponse
    {
        $licence = Licence::courant();

        return response()->json([
            'statut' => $licence->statut,
            'date_debut' => $licence->date_debut->format('Y-m-d'),
            'date_fin' => $licence->date_fin->format('Y-m-d'),
            'jours_restants' => $licence->joursRestants(),
            'titulaire' => $licence->titulaire,
            'cle_licence' => $licence->cle_licence,
            'valide' => $licence->isValide(),
        ]);
    }

    public function activerLicence(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cle' => 'required|string|max:100',
            'titulaire' => 'nullable|string|max:150',
            'duree_ans' => 'nullable|integer|min:1|max:5',
        ]);

        $cle = strtoupper(trim($data['cle']));

        if (!preg_match('/^RESTO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $cle)) {
            return response()->json(['message' => 'Clé de licence invalide.'], 422);
        }

        $duree = $data['duree_ans'] ?? 1;
        $licence = Licence::courant();
        $licence->update([
            'statut' => 'premium',
            'date_debut' => now(),
            'date_fin' => now()->addYears($duree),
            'cle_licence' => $cle,
            'titulaire' => $data['titulaire'] ?? $licence->titulaire,
        ]);

        return response()->json([
            'message' => "Licence premium activée pour {$duree} an(s).",
            'licence' => $licence->fresh(),
        ]);
    }

    public function resetEssai(): JsonResponse
    {
        $licence = Licence::courant();
        $licence->update([
            'statut' => 'essai',
            'date_debut' => now(),
            'date_fin' => now()->addDays(14),
            'cle_licence' => null,
            'titulaire' => null,
        ]);

        return response()->json(['message' => 'Licence réinitialisée en mode essai (14 jours).']);
    }

    public function genererCle(): JsonResponse
    {
        $segments = [];
        for ($i = 0; $i < 4; $i++) {
            $segments[] = strtoupper(Str::random(4));
        }
        $cle = 'RESTO-' . implode('-', $segments);

        return response()->json(['cle' => $cle]);
    }
}

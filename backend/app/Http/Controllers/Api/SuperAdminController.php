<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Commande;
use App\Models\Consommation;
use App\Models\FormationSanitaire;
use App\Models\Licence;
use App\Models\Parametre;
use App\Models\RolePermission;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
            ->with(['users' => fn($q) => $q->where('role', 'prestataire')->select('id', 'nom', 'prenom', 'email', 'formation_id')])
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
            // Prestataire initial (optionnel)
            'prestataire_nom' => 'nullable|string|max:255',
            'prestataire_prenom' => 'nullable|string|max:255',
            'prestataire_email' => 'nullable|email|unique:users,email',
            'prestataire_password' => 'nullable|string|min:4',
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

        // Créer le prestataire si fourni
        if (!empty($data['prestataire_email'])) {
            User::create([
                'formation_id' => $formation->id,
                'nom' => $data['prestataire_nom'] ?? 'Prestataire',
                'prenom' => $data['prestataire_prenom'] ?? $formation->nom,
                'email' => $data['prestataire_email'],
                'password' => bcrypt($data['prestataire_password'] ?? '1234'),
                'role' => 'prestataire',
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
            'role' => 'required|in:prestataire,dsgl,csah,sus,sut',
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
            'role' => 'required|in:prestataire,dsgl,csah,sus,sut',
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
            'role' => 'sometimes|in:prestataire,dsgl,csah,sus,sut',
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
            'role' => 'required|in:prestataire,dsgl,csah,sus,sut',
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

    // ── Phase 1 : Journal d'audit & Exports ────────────────────────────────

    public function auditLogs(Request $request): JsonResponse
    {
        $query = AuditLog::orderByDesc('created_at');

        if ($f = $request->query('action')) $query->where('action', $f);
        if ($f = $request->query('entity_type')) $query->where('entity_type', $f);
        if ($f = $request->query('user_name')) $query->where('user_name', 'like', "%{$f}%");
        if ($f = $request->query('formation_id')) $query->where('formation_id', $f);
        if ($f = $request->query('date_from')) $query->whereDate('created_at', '>=', $f);
        if ($f = $request->query('date_to')) $query->whereDate('created_at', '<=', $f);

        return response()->json($query->paginate(30));
    }

    public function exportUsers(): StreamedResponse
    {
        return $this->streamCsv(
            'utilisateurs.csv',
            ['ID', 'Nom', 'Prénom', 'Email', 'Rôle', 'Service', 'Actif', 'Dernière connexion', 'Créé le'],
            User::where('role', '!=', 'super_admin')->orderBy('nom')->cursor(),
            fn($u) => [$u->id, $u->nom, $u->prenom, $u->email, $u->role, $u->service ?? '', $u->is_active ? 'Oui' : 'Non', $u->last_login_at ?? '', $u->created_at->format('Y-m-d H:i')]
        );
    }

    public function exportFormations(): StreamedResponse
    {
        return $this->streamCsv(
            'formations.csv',
            ['ID', 'Nom', 'Code', 'Type', 'Ville', 'Région', 'Directeur', 'Actif', 'Nb utilisateurs'],
            FormationSanitaire::withCount('users')->orderBy('nom')->cursor(),
            fn($f) => [$f->id, $f->nom, $f->code, $f->type, $f->ville ?? '', $f->region ?? '', $f->directeur ?? '', $f->is_active ? 'Oui' : 'Non', $f->users_count]
        );
    }

    public function exportAuditLogs(Request $request): StreamedResponse
    {
        $query = AuditLog::orderByDesc('created_at');
        if ($f = $request->query('formation_id')) $query->where('formation_id', $f);

        return $this->streamCsv(
            'journal-audit.csv',
            ['ID', 'Date', 'Utilisateur', 'Action', 'Entité', 'ID Entité', 'Label', 'Détails', 'IP'],
            $query->cursor(),
            fn($l) => [$l->id, $l->created_at->format('Y-m-d H:i'), $l->user_name, $l->action, $l->entity_type, $l->entity_id ?? '', $l->entity_label ?? '', $l->details ?? '', $l->ip_address ?? '']
        );
    }

    private function streamCsv(string $filename, array $headers, $rows, \Closure $mapper): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows, $mapper) {
            echo "\xEF\xBB\xBF"; // BOM UTF-8
            $out = fopen('php://output', 'w');
            fputcsv($out, $headers, ';');
            foreach ($rows as $row) {
                fputcsv($out, $mapper($row), ';');
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    // ── Phase 2 : Analytics ─────────────────────────────────────────────────

    public function analytics(Request $request): JsonResponse
    {
        $days = (int) ($request->query('days') ?? 30);
        $from = Carbon::now()->subDays($days);

        // Évolution utilisateurs par jour (derniers N jours)
        $usersOverTime = User::where('role', '!=', 'super_admin')
            ->where('created_at', '>=', $from)
            ->selectRaw("DATE(created_at) as date, count(*) as total")
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get();

        // Commandes par jour
        $commandesOverTime = Commande::where('created_at', '>=', $from)
            ->selectRaw("DATE(created_at) as date, count(*) as total, COALESCE(sum(montant),0) as montant")
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get();

        // Consommations par jour
        $consommationsOverTime = Consommation::where('created_at', '>=', $from)
            ->selectRaw("DATE(created_at) as date, count(*) as total, COALESCE(sum(total_portions),0) as portions")
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get();

        // Répartition par rôle
        $rolesDistribution = User::where('role', '!=', 'super_admin')
            ->selectRaw('role, count(*) as total')
            ->groupBy('role')
            ->pluck('total', 'role');

        // Totaux globaux
        $totalCommandes = Commande::count();
        $totalMontant = Commande::sum('montant');
        $totalConsommations = Consommation::count();
        $totalPortions = Consommation::sum('total_portions');

        return response()->json([
            'users_over_time' => $usersOverTime,
            'commandes_over_time' => $commandesOverTime,
            'consommations_over_time' => $consommationsOverTime,
            'roles_distribution' => $rolesDistribution,
            'total_commandes' => $totalCommandes,
            'total_montant' => $totalMontant,
            'total_consommations' => $totalConsommations,
            'total_portions' => $totalPortions,
        ]);
    }

    // ── Phase 3 : Services CRUD ─────────────────────────────────────────────

    public function services(): JsonResponse
    {
        $services = Service::withCount('commandes')
            ->orderBy('nom')
            ->get();

        return response()->json($services);
    }

    public function storeService(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'required|string|max:255',
            'lits_actifs' => 'nullable|integer|min:0',
            'responsable' => 'nullable|string|max:255',
        ]);

        $service = Service::create([
            'nom' => $data['nom'],
            'lits_actifs' => $data['lits_actifs'] ?? 0,
            'responsable' => $data['responsable'] ?? null,
            'is_active' => true,
        ]);

        return response()->json($service, 201);
    }

    public function updateService(Request $request, Service $service): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'lits_actifs' => 'nullable|integer|min:0',
            'responsable' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $service->update($data);

        return response()->json($service->fresh());
    }

    public function destroyService(Service $service): JsonResponse
    {
        if ($service->commandes()->count() > 0) {
            return response()->json(['message' => 'Impossible de supprimer un service avec des commandes.'], 422);
        }
        $service->delete();
        return response()->json(['message' => 'Service supprimé.']);
    }

    // ── Phase 4 : Opérations en masse ───────────────────────────────────────

    public function bulkActivateUsers(Request $request): JsonResponse
    {
        $data = $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        $count = User::whereIn('id', $data['ids'])->where('role', '!=', 'super_admin')->update(['is_active' => true]);
        return response()->json(['message' => "{$count} utilisateur(s) activé(s)."]);
    }

    public function bulkDeactivateUsers(Request $request): JsonResponse
    {
        $data = $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        $count = User::whereIn('id', $data['ids'])->where('role', '!=', 'super_admin')->update(['is_active' => false]);
        return response()->json(['message' => "{$count} utilisateur(s) désactivé(s)."]);
    }

    public function bulkActivateFormations(Request $request): JsonResponse
    {
        $data = $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        $count = FormationSanitaire::whereIn('id', $data['ids'])->update(['is_active' => true]);
        return response()->json(['message' => "{$count} formation(s) activée(s)."]);
    }

    public function bulkDeactivateFormations(Request $request): JsonResponse
    {
        $data = $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        $count = FormationSanitaire::whereIn('id', $data['ids'])->update(['is_active' => false]);
        return response()->json(['message' => "{$count} formation(s) désactivée(s)."]);
    }

    // ── Phase 5 : Paramètres système ────────────────────────────────────────

    public function systemConfig(): JsonResponse
    {
        $params = Parametre::orderBy('cle')->get();
        return response()->json($params);
    }

    public function updateSystemConfig(Request $request): JsonResponse
    {
        $data = $request->validate([
            'configs' => 'required|array',
            'configs.*.cle' => 'required|string',
            'configs.*.valeur' => 'required|string',
        ]);

        foreach ($data['configs'] as $cfg) {
            Parametre::updateOrCreate(
                ['cle' => $cfg['cle']],
                ['valeur' => $cfg['valeur']]
            );
        }

        return response()->json(['message' => 'Configuration mise à jour.']);
    }
}

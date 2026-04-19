<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\TenantScope;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Parametre;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminController extends Controller
{
    // --- Users ---

    public function users(): JsonResponse
    {
        $query = User::orderBy('nom')->where('role', '!=', 'super_admin');
        TenantScope::apply($query);
        return response()->json($query->get(['id', 'nom', 'prenom', 'email', 'role', 'service', 'is_active', 'created_at', 'formation_id']));
    }

    public function storeUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:prestataire,dsgl,csah,sus,sut',
            'service' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            ...$data,
            'password' => bcrypt($data['password']),
            'formation_id' => TenantScope::$formationId,
        ]);

        AuditLog::record('creer', 'utilisateur', $user->id, $user->nom . ' ' . $user->prenom, null, $request);

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

        AuditLog::record('modifier', 'utilisateur', $user->id, $user->nom . ' ' . $user->prenom, null, $request);

        return response()->json($user);
    }

    // --- Services ---

    public function services(): JsonResponse
    {
        $query = Service::orderBy('nom');
        TenantScope::apply($query);
        return response()->json($query->get());
    }

    public function storeService(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'required|string|max:255',
            'lits_actifs' => 'required|integer|min:0',
            'responsable' => 'nullable|string|max:255',
        ]);

        $service = Service::create([
            ...$data,
            'formation_id' => TenantScope::$formationId,
        ]);

        AuditLog::record('creer', 'service', $service->id, $service->nom, null, $request);

        return response()->json($service, 201);
    }

    public function updateService(Request $request, Service $service): JsonResponse
    {
        $data = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'lits_actifs' => 'sometimes|integer|min:0',
            'responsable' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $service->update($data);

        AuditLog::record('modifier', 'service', $service->id, $service->nom, null, $request);

        return response()->json($service);
    }

    // --- Parametres ---

    public function parametres(): JsonResponse
    {
        $query = Parametre::query();
        TenantScope::apply($query);
        return response()->json($query->get());
    }

    public function storeParametre(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cle' => 'required|string|max:255',
            'valeur' => 'required|string',
            'description' => 'nullable|string|max:255',
        ]);

        $formationId = TenantScope::$formationId;

        // Vérifier unicité cle+formation_id
        $exists = Parametre::where('cle', $data['cle'])
            ->where('formation_id', $formationId)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Un paramètre avec cette clé existe déjà.'], 422);
        }

        $parametre = Parametre::create([
            ...$data,
            'formation_id' => $formationId,
        ]);

        return response()->json($parametre, 201);
    }

    public function updateParametre(Request $request, Parametre $parametre): JsonResponse
    {
        $request->validate(['valeur' => 'required|string']);

        $parametre->update(['valeur' => $request->valeur]);

        return response()->json($parametre);
    }

    public function deleteParametre(Parametre $parametre): JsonResponse
    {
        $parametre->delete();

        return response()->json(['message' => 'Paramètre supprimé.']);
    }

    // --- Permissions (lecture seule pour le gérant) ---

    public function permissions(): JsonResponse
    {
        return response()->json([
            'all' => \App\Models\RolePermission::allPermissions(),
            'grouped' => \App\Models\RolePermission::allGrouped(),
        ]);
    }

    // --- Notifications ---

    public function notifications(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $notifications = Notification::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();
        $unreadCount = Notification::where('user_id', $userId)->where('lu', false)->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    public function marquerLu(Notification $notification): JsonResponse
    {
        $notification->update(['lu' => true]);

        return response()->json($notification);
    }

    public function toutMarquerLu(Request $request): JsonResponse
    {
        Notification::where('user_id', $request->user()->id)
            ->where('lu', false)
            ->update(['lu' => true]);

        return response()->json(['message' => 'Toutes les notifications ont été marquées comme lues.']);
    }

    // --- Journal d'audit ---

    public function auditLogs(Request $request): JsonResponse
    {
        $query = AuditLog::orderByDesc('created_at');
        TenantScope::apply($query);

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }
        if ($request->filled('entity_type')) {
            $query->where('entity_type', $request->entity_type);
        }
        if ($request->filled('user_name')) {
            $query->where('user_name', 'like', '%' . $request->user_name . '%');
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->paginate(30);

        return response()->json($logs);
    }

    // --- Exports CSV ---

    public function exportUsers(): StreamedResponse
    {
        $query = User::orderBy('nom')->where('role', '!=', 'super_admin');
        TenantScope::apply($query);
        $users = $query->get(['nom', 'prenom', 'email', 'role', 'service', 'is_active', 'last_login_at', 'created_at']);

        return $this->streamCsv('utilisateurs.csv', ['Nom', 'Prénom', 'Email', 'Profil', 'Service', 'Actif', 'Dernière connexion', 'Créé le'], $users->map(fn($u) => [
            $u->nom, $u->prenom, $u->email, $u->role, $u->service ?? '', $u->is_active ? 'Oui' : 'Non',
            $u->last_login_at?->format('d/m/Y H:i') ?? '-', $u->created_at->format('d/m/Y'),
        ])->toArray());
    }

    public function exportServices(): StreamedResponse
    {
        $query = Service::orderBy('nom');
        TenantScope::apply($query);
        $services = $query->get();

        return $this->streamCsv('services.csv', ['Service', 'Lits actifs', 'Responsable', 'Actif'], $services->map(fn($s) => [
            $s->nom, $s->lits_actifs, $s->responsable ?? '-', $s->is_active ? 'Oui' : 'Non',
        ])->toArray());
    }

    public function exportAuditLogs(Request $request): StreamedResponse
    {
        $query = AuditLog::orderByDesc('created_at');
        TenantScope::apply($query);

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->limit(5000)->get();

        return $this->streamCsv('journal-audit.csv', ['Date', 'Utilisateur', 'Action', 'Entité', 'Libellé', 'Détails', 'IP'], $logs->map(fn($l) => [
            $l->created_at->format('d/m/Y H:i'), $l->user_name, $l->action,
            $l->entity_type, $l->entity_label ?? '', $l->details ?? '', $l->ip_address ?? '',
        ])->toArray());
    }

    // --- Opérations en masse ---

    public function bulkActivateUsers(Request $request): JsonResponse
    {
        $data = $request->validate(['user_ids' => 'required|array', 'user_ids.*' => 'integer|exists:users,id']);

        $query = User::whereIn('id', $data['user_ids'])->where('role', '!=', 'super_admin');
        TenantScope::apply($query);
        $count = $query->update(['is_active' => true]);

        return response()->json(['message' => "$count utilisateur(s) activé(s).", 'count' => $count]);
    }

    public function bulkDeactivateUsers(Request $request): JsonResponse
    {
        $data = $request->validate(['user_ids' => 'required|array', 'user_ids.*' => 'integer|exists:users,id']);

        $query = User::whereIn('id', $data['user_ids'])->where('role', '!=', 'super_admin');
        TenantScope::apply($query);
        $count = $query->update(['is_active' => false]);

        return response()->json(['message' => "$count utilisateur(s) désactivé(s).", 'count' => $count]);
    }

    // --- Helper CSV ---

    private function streamCsv(string $filename, array $headers, array $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM UTF-8
            fputcsv($out, $headers, ';');
            foreach ($rows as $row) {
                fputcsv($out, $row, ';');
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}

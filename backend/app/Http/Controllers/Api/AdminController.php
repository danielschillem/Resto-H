<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Middleware\TenantScope;
use App\Models\Notification;
use App\Models\Parametre;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            'password' => 'required|string|min:4',
            'role' => 'required|in:gerant,dsgl,csah,sus,sut',
            'service' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            ...$data,
            'password' => bcrypt($data['password']),
            'formation_id' => TenantScope::$formationId,
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

        return response()->json(Service::create([
            ...$data,
            'formation_id' => TenantScope::$formationId,
        ]), 201);
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

        return response()->json($service);
    }

    // --- Parametres ---

    public function parametres(): JsonResponse
    {
        $query = Parametre::query();
        TenantScope::apply($query);
        return response()->json($query->get());
    }

    public function updateParametre(Request $request, Parametre $parametre): JsonResponse
    {
        $request->validate(['valeur' => 'required|string']);

        $parametre->update(['valeur' => $request->valeur]);

        return response()->json($parametre);
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
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Vérifie que l'utilisateur possède au moins une des permissions requises.
     * Le super_admin bypass automatiquement.
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        // Super admin a toutes les permissions
        if ($user->role === 'super_admin') {
            return $next($request);
        }

        $userPermissions = $user->permissions;

        foreach ($permissions as $perm) {
            if (in_array($perm, $userPermissions, true)) {
                return $next($request);
            }
        }

        return response()->json(['message' => 'Permission insuffisante.'], 403);
    }
}

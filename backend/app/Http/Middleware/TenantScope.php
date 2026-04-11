<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Injecte le formation_id de l'utilisateur connecté dans le contexte de la requête.
 * Les contrôleurs peuvent ensuite appeler TenantScope::apply($query) pour filtrer.
 */
class TenantScope
{
    public static int|null $formationId = null;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Super admin n'a pas de formation_id — voit tout
        if ($user && $user->role !== 'super_admin') {
            self::$formationId = $user->formation_id;
        } else {
            self::$formationId = null;
        }

        return $next($request);
    }

    /**
     * Apply tenant scope to a query builder.
     * Use in controllers: TenantScope::apply($query)
     */
    public static function apply(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        if (self::$formationId !== null) {
            $query->where($query->getModel()->getTable() . '.formation_id', self::$formationId);
        }
        return $query;
    }
}

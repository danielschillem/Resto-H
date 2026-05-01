<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RolePermission extends Model
{
    protected $fillable = ['role', 'permission'];

    public static function permissionsForRole(string $role): array
    {
        return static::where('role', $role)->pluck('permission')->toArray();
    }

    public static function allGrouped(): array
    {
        $roles = ['prestataire', 'dsgl', 'csah', 'sus', 'sut', 'nutritionniste', 'daf'];
        $result = [];
        foreach ($roles as $role) {
            $result[$role] = static::where('role', $role)->pluck('permission')->toArray();
        }
        return $result;
    }

    public static function syncForRole(string $role, array $permissions): void
    {
        static::where('role', $role)->delete();
        $now = now();
        foreach ($permissions as $perm) {
            static::create(['role' => $role, 'permission' => $perm]);
        }
    }

    public static function allPermissions(): array
    {
        return [
            'dashboard',
            'menus',
            'menus.valider',
            'commandes',
            'commandes.valider',
            'commandes.livrer',
            'consommations',
            'etats',
            'etats.valider',
            'regimes',
            'regimes.valider',
            'admin',
            'licence',
            'observatoire',
            'validation_financiere',
            'marches',
            'marches.creer',
            'marches.modifier',
            'liste_nominative',
            'liste_nominative.creer',
            'hospitalisation',
            'hospitalisation.gerer',
        ];
    }
}

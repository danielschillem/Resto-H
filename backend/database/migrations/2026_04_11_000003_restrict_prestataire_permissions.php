<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Remove permissions the prestataire should not have
        DB::table('role_permissions')
            ->where('role', 'prestataire')
            ->whereIn('permission', ['menus.valider', 'consommations', 'etats', 'etats.valider'])
            ->delete();
    }

    public function down(): void
    {
        $now = now();
        foreach (['menus', 'consommations', 'etats'] as $perm) {
            DB::table('role_permissions')->insertOrIgnore([
                'role' => 'prestataire',
                'permission' => $perm,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }
};

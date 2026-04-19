<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $now = now();

        // Permissions par défaut pour le nutritionniste
        $nutriPerms = ['dashboard', 'menus', 'consommations', 'regimes', 'observatoire'];
        foreach ($nutriPerms as $perm) {
            DB::table('role_permissions')->insertOrIgnore([
                'role' => 'nutritionniste',
                'permission' => $perm,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Permissions par défaut pour le DAF
        $dafPerms = ['dashboard', 'commandes', 'consommations', 'etats', 'etats.valider', 'validation_financiere'];
        foreach ($dafPerms as $perm) {
            DB::table('role_permissions')->insertOrIgnore([
                'role' => 'daf',
                'permission' => $perm,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('role_permissions')->whereIn('role', ['nutritionniste', 'daf'])->delete();
    }
};

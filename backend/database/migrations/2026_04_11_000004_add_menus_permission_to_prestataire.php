<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Re-add 'menus' permission for prestataire (can propose menus)
        $exists = DB::table('role_permissions')
            ->where('role', 'prestataire')
            ->where('permission', 'menus')
            ->exists();

        if (!$exists) {
            DB::table('role_permissions')->insert([
                'role' => 'prestataire',
                'permission' => 'menus',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('role_permissions')
            ->where('role', 'prestataire')
            ->where('permission', 'menus')
            ->delete();
    }
};

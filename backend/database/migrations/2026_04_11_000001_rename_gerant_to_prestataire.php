<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Rename role 'gerant' -> 'prestataire' in users table
        DB::table('users')->where('role', 'gerant')->update(['role' => 'prestataire']);

        // Update seeded gerant email to prestataire
        DB::table('users')->where('email', 'gerant@chr-tenkodogo.bf')->update(['email' => 'prestataire@chr-tenkodogo.bf']);

        // Rename role in role_permissions table
        DB::table('role_permissions')->where('role', 'gerant')->update(['role' => 'prestataire']);

        // Update permissions for prestataire (ex-gerant):
        // Prestataire = traiteur: reçoit commandes, propose menus, livre. Pas de validation.
        DB::table('role_permissions')
            ->where('role', 'prestataire')
            ->whereIn('permission', ['commandes.valider', 'etats.valider', 'menus.valider', 'regimes.valider', 'admin', 'licence'])
            ->delete();

        // Add 'commandes.livrer' permission for prestataire
        DB::table('role_permissions')->insertOrIgnore([
            'role' => 'prestataire',
            'permission' => 'commandes.livrer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // DSGL validates everything - add missing permissions
        $dsglExisting = DB::table('role_permissions')->where('role', 'dsgl')->pluck('permission')->toArray();
        $dsglNeeded = ['dashboard', 'menus', 'menus.valider', 'commandes', 'commandes.valider', 'consommations', 'etats', 'etats.valider', 'regimes', 'regimes.valider', 'admin', 'licence'];
        $now = now();
        foreach ($dsglNeeded as $perm) {
            if (!in_array($perm, $dsglExisting)) {
                DB::table('role_permissions')->insertOrIgnore(['role' => 'dsgl', 'permission' => $perm, 'created_at' => $now, 'updated_at' => $now]);
            }
        }

        // CSAH: can see etats in read-only + commandes.valider + regimes.valider
        $csahExisting = DB::table('role_permissions')->where('role', 'csah')->pluck('permission')->toArray();
        $csahNeeded = ['dashboard', 'menus', 'commandes', 'commandes.valider', 'consommations', 'etats', 'regimes', 'regimes.valider'];
        foreach ($csahNeeded as $perm) {
            if (!in_array($perm, $csahExisting)) {
                DB::table('role_permissions')->insertOrIgnore(['role' => 'csah', 'permission' => $perm, 'created_at' => $now, 'updated_at' => $now]);
            }
        }
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'prestataire')->update(['role' => 'gerant']);
        DB::table('users')->where('email', 'prestataire@chr-tenkodogo.bf')->update(['email' => 'gerant@chr-tenkodogo.bf']);
        DB::table('role_permissions')->where('role', 'prestataire')->update(['role' => 'gerant']);
        DB::table('role_permissions')->where('role', 'prestataire')->where('permission', 'commandes.livrer')->delete();
    }
};

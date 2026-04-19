<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $permissions = [
            // DSGL: gestion complète marchés + listes
            ['role' => 'dsgl', 'permission' => 'marches'],
            ['role' => 'dsgl', 'permission' => 'marches.creer'],
            ['role' => 'dsgl', 'permission' => 'marches.modifier'],
            ['role' => 'dsgl', 'permission' => 'liste_nominative'],

            // CSAH: consultation marchés + gestion listes
            ['role' => 'csah', 'permission' => 'marches'],
            ['role' => 'csah', 'permission' => 'liste_nominative'],
            ['role' => 'csah', 'permission' => 'liste_nominative.creer'],

            // DAF: gestion marchés + consultation listes
            ['role' => 'daf', 'permission' => 'marches'],
            ['role' => 'daf', 'permission' => 'marches.creer'],
            ['role' => 'daf', 'permission' => 'marches.modifier'],
            ['role' => 'daf', 'permission' => 'liste_nominative'],

            // SUS: saisie listes nominatives
            ['role' => 'sus', 'permission' => 'liste_nominative'],
            ['role' => 'sus', 'permission' => 'liste_nominative.creer'],

            // SUT: consultation listes nominatives
            ['role' => 'sut', 'permission' => 'liste_nominative'],

            // Prestataire: consultation marchés
            ['role' => 'prestataire', 'permission' => 'marches'],
        ];

        foreach ($permissions as $p) {
            \Illuminate\Support\Facades\DB::table('role_permissions')->insertOrIgnore([
                'role' => $p['role'],
                'permission' => $p['permission'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        \Illuminate\Support\Facades\DB::table('role_permissions')
            ->whereIn('permission', [
                'marches', 'marches.creer', 'marches.modifier',
                'liste_nominative', 'liste_nominative.creer',
            ])
            ->delete();
    }
};

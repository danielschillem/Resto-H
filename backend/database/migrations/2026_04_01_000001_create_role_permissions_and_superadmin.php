<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Reconstruire la table users sans contrainte CHECK (SQLite)
        DB::statement('PRAGMA foreign_keys = OFF');
        DB::statement('
            CREATE TABLE users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom VARCHAR(255) NOT NULL,
                prenom VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                email_verified_at DATETIME,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(255) NOT NULL,
                service VARCHAR(255),
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                remember_token VARCHAR(100),
                created_at DATETIME,
                updated_at DATETIME
            )
        ');
        DB::statement('INSERT INTO users_new SELECT * FROM users');
        DB::statement('DROP TABLE users');
        DB::statement('ALTER TABLE users_new RENAME TO users');
        DB::statement('PRAGMA foreign_keys = ON');

        // Table des permissions par role
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('role');
            $table->string('permission');
            $table->timestamps();
            $table->unique(['role', 'permission']);
        });

        $defaults = [
            'gerant' => ['dashboard','menus','menus.valider','commandes','commandes.valider','consommations','etats','etats.valider','regimes','regimes.valider','admin','licence'],
            'dsgl'   => ['dashboard','menus.valider','commandes.valider','consommations','etats','etats.valider','regimes.valider','admin','licence'],
            'csah'   => ['dashboard','menus','commandes','commandes.valider','consommations','regimes','regimes.valider'],
            'sus'    => ['dashboard','commandes','regimes'],
            'sut'    => ['dashboard','commandes','consommations','regimes'],
        ];

        $now = now();
        foreach ($defaults as $role => $perms) {
            foreach ($perms as $perm) {
                DB::table('role_permissions')->insert(['role' => $role, 'permission' => $perm, 'created_at' => $now, 'updated_at' => $now]);
            }
        }

        DB::table('users')->insert([
            'nom' => 'Super', 'prenom' => 'Admin',
            'email' => 'superadmin@resto-h.bf',
            'password' => Hash::make('admin@2026'),
            'role' => 'super_admin', 'service' => null,
            'is_active' => 1, 'created_at' => $now, 'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        DB::table('users')->where('email', 'superadmin@resto-h.bf')->delete();
        Schema::dropIfExists('role_permissions');
    }
};

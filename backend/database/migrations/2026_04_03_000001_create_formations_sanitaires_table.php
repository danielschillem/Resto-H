<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('formations_sanitaires', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('code')->unique(); // ex: CHR-TENK
            $table->string('type')->default('hopital'); // hopital, clinique, csps, cm, chu
            $table->string('ville')->nullable();
            $table->string('region')->nullable();
            $table->string('telephone')->nullable();
            $table->string('email')->nullable();
            $table->string('directeur')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Ajouter formation_id aux tables métier
        $tables = [
            'users',
            'services',
            'menus',
            'menus_hebdomadaires',
            'commandes',
            'consommations',
            'consommation_articles',
            'devis_estimatifs',
            'regimes_speciaux',
            'notifications',
            'parametres',
        ];

        foreach ($tables as $tbl) {
            Schema::table($tbl, function (Blueprint $table) {
                $table->unsignedBigInteger('formation_id')->nullable();
            });
        }
    }

    public function down(): void
    {
        $tables = [
            'users',
            'services',
            'menus',
            'menus_hebdomadaires',
            'commandes',
            'consommations',
            'consommation_articles',
            'devis_estimatifs',
            'regimes_speciaux',
            'notifications',
            'parametres',
        ];

        foreach ($tables as $tbl) {
            Schema::table($tbl, function (Blueprint $table) use ($tbl) {
                $table->dropColumn('formation_id');
            });
        }

        Schema::dropIfExists('formations_sanitaires');
    }
};

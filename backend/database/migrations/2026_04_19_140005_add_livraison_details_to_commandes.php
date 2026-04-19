<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            $table->string('heure_livraison_effective', 10)->nullable()->after('heure_livraison');
            $table->string('temperature', 50)->nullable()->after('heure_livraison_effective');
            $table->string('observations_livraison', 500)->nullable()->after('temperature');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            $table->dropColumn(['heure_livraison_effective', 'temperature', 'observations_livraison']);
        });
    }
};

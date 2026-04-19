<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('marches')) return;

        Schema::create('marches', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->string('objet');
            $table->string('fournisseur');
            $table->decimal('montant_initial', 15, 2);
            $table->decimal('montant_consomme', 15, 2)->default(0);
            $table->decimal('montant_restant', 15, 2);
            $table->decimal('seuil_alerte', 5, 2)->default(20); // pourcentage restant déclenchant alerte
            $table->date('date_debut');
            $table->date('date_fin');
            $table->string('statut')->default('actif'); // actif, epuise, cloture, suspendu
            $table->foreignId('annee_budgetaire_id')->nullable()->constrained('annees_budgetaires')->nullOnDelete();
            $table->foreignId('formation_id')->constrained('formations_sanitaires')->cascadeOnDelete();
            $table->timestamps();
        });

        // Lier les commandes au marché
        Schema::table('commandes', function (Blueprint $table) {
            $table->foreignId('marche_id')->nullable()->after('valide_sus_par')
                  ->constrained('marches')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            $table->dropForeign(['marche_id']);
            $table->dropColumn('marche_id');
        });
        Schema::dropIfExists('marches');
    }
};

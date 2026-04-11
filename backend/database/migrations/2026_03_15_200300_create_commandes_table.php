<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commandes', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->enum('type', ['malades', 'personnel', 'client_externe']);
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->date('date_repas');
            $table->enum('repas', ['petit_dejeuner', 'dejeuner', 'diner']);
            $table->foreignId('menu_id')->nullable()->constrained('menus')->nullOnDelete();
            $table->integer('nb_portions')->default(1);
            $table->string('heure_livraison')->nullable();
            $table->integer('montant')->default(0);
            $table->enum('statut', ['en_attente', 'validee', 'en_cours', 'livree', 'rejetee'])->default('en_attente');
            $table->enum('statut_paiement', ['non_applicable', 'en_attente', 'paye'])->default('non_applicable');
            $table->string('client_nom')->nullable();
            $table->text('observations')->nullable();
            $table->string('motif_rejet')->nullable();
            $table->foreignId('soumis_par')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('valide_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('date_validation')->nullable();
            $table->timestamps();
        });

        Schema::create('commande_regimes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('commande_id')->constrained('commandes')->cascadeOnDelete();
            $table->foreignId('regime_special_id')->constrained('regimes_speciaux')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commande_regimes');
        Schema::dropIfExists('commandes');
    }
};

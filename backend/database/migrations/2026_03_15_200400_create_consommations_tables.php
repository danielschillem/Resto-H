<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consommations', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->enum('repas', ['petit_dejeuner', 'dejeuner', 'diner']);
            $table->string('menu_servi');
            $table->integer('nb_malades')->default(0);
            $table->integer('nb_personnel')->default(0);
            $table->integer('nb_clients')->default(0);
            $table->integer('total_portions')->default(0);
            $table->integer('cout_prevu')->default(0);
            $table->integer('cout_reel')->default(0);
            $table->integer('ecart')->default(0);
            $table->timestamps();
        });

        Schema::create('consommation_articles', function (Blueprint $table) {
            $table->id();
            $table->string('article');
            $table->string('unite');
            $table->decimal('qte_prevue', 10, 2)->default(0);
            $table->decimal('qte_reelle', 10, 2)->default(0);
            $table->decimal('ecart', 10, 2)->default(0);
            $table->integer('cout_unitaire')->default(0);
            $table->integer('cout_reel')->default(0);
            $table->date('semaine_debut');
            $table->date('semaine_fin');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consommation_articles');
        Schema::dropIfExists('consommations');
    }
};

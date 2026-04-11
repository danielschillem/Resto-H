<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menus', function (Blueprint $table) {
            $table->id();
            $table->string('intitule');
            $table->enum('type_repas', ['petit_dejeuner', 'dejeuner', 'diner']);
            $table->integer('portions_prevues')->default(0);
            $table->integer('cout_unitaire')->default(0);
            $table->string('allergenes')->nullable();
            $table->text('notes_nutritionnelles')->nullable();
            $table->timestamps();
        });

        Schema::create('menus_hebdomadaires', function (Blueprint $table) {
            $table->id();
            $table->date('semaine_debut');
            $table->date('semaine_fin');
            $table->enum('statut', ['brouillon', 'soumis', 'valide', 'rejete'])->default('brouillon');
            $table->foreignId('soumis_par')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('valide_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('date_soumission')->nullable();
            $table->timestamp('date_validation')->nullable();
            $table->integer('cout_matieres')->default(0);
            $table->integer('cout_main_oeuvre')->default(0);
            $table->text('commentaire')->nullable();
            $table->timestamps();
        });

        Schema::create('menu_hebdomadaire_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_hebdomadaire_id')->constrained('menus_hebdomadaires')->cascadeOnDelete();
            $table->foreignId('menu_id')->constrained('menus')->cascadeOnDelete();
            $table->tinyInteger('jour_semaine'); // 0=Lundi...6=Dimanche
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_hebdomadaire_items');
        Schema::dropIfExists('menus_hebdomadaires');
        Schema::dropIfExists('menus');
    }
};

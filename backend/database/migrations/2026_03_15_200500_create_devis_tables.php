<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devis_estimatifs', function (Blueprint $table) {
            $table->id();
            $table->date('semaine_debut');
            $table->date('semaine_fin');
            $table->enum('statut', ['brouillon', 'soumis', 'valide', 'rejete'])->default('brouillon');
            $table->integer('total_estime')->default(0);
            $table->foreignId('soumis_par')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('valide_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('date_soumission')->nullable();
            $table->timestamp('date_validation')->nullable();
            $table->timestamps();
        });

        Schema::create('devis_lignes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('devis_id')->constrained('devis_estimatifs')->cascadeOnDelete();
            $table->string('article');
            $table->string('unite');
            $table->decimal('qte_estimee', 10, 2)->default(0);
            $table->integer('prix_unitaire')->default(0);
            $table->integer('montant_estime')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devis_lignes');
        Schema::dropIfExists('devis_estimatifs');
    }
};

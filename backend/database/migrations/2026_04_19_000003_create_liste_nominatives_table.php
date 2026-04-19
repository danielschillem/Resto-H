<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('liste_nominatives')) return;

        Schema::create('liste_nominatives', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('repas'); // petit_dejeuner, dejeuner, diner
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->foreignId('lit_id')->nullable()->constrained('lits')->nullOnDelete();
            $table->string('regime')->nullable(); // normal, diabétique, sans sel, etc.
            $table->boolean('servi')->default(false);
            $table->text('observations')->nullable();
            $table->foreignId('enregistre_par')->constrained('users')->cascadeOnDelete();
            $table->foreignId('commande_id')->nullable()->constrained('commandes')->nullOnDelete();
            $table->foreignId('formation_id')->constrained('formations_sanitaires')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['date', 'repas', 'patient_id'], 'nominative_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('liste_nominatives');
    }
};

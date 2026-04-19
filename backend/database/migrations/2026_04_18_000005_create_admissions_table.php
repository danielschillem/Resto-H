<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('admissions')) return;

        Schema::create('admissions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('patient_id');
            $table->foreign('patient_id')->references('id')->on('patients')->cascadeOnDelete();
            $table->unsignedBigInteger('service_id');
            $table->foreign('service_id')->references('id')->on('services')->cascadeOnDelete();
            $table->unsignedBigInteger('lit_id')->nullable();
            $table->foreign('lit_id')->references('id')->on('lits')->nullOnDelete();
            $table->date('date_admission');
            $table->date('date_sortie')->nullable();
            $table->string('motif')->nullable();
            $table->string('medecin_referent')->nullable();
            $table->text('observations')->nullable();
            $table->unsignedBigInteger('enregistre_par')->nullable();
            $table->foreign('enregistre_par')->references('id')->on('users')->nullOnDelete();
            $table->unsignedBigInteger('formation_id')->nullable();
            $table->foreign('formation_id')->references('id')->on('formations_sanitaires')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admissions');
    }
};

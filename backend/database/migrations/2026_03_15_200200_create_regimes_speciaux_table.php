<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regimes_speciaux', function (Blueprint $table) {
            $table->id();
            $table->string('patient_nom');
            $table->string('lit');
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->enum('type_regime', [
                'sans_sel', 'diabetique', 'hyposode', 'post_op_mixe',
                'hyper_proteine', 'sans_gluten', 'enrichi', 'autre'
            ]);
            $table->date('date_debut');
            $table->integer('duree_jours')->default(7);
            $table->string('medecin_prescripteur');
            $table->text('instructions')->nullable();
            $table->enum('statut', ['en_attente', 'valide', 'rejete', 'termine'])->default('en_attente');
            $table->string('motif_rejet')->nullable();
            $table->foreignId('soumis_par')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('valide_par')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('regimes_speciaux');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('user_name');
            $table->string('action');           // valider, rejeter, livrer, paiement, soumettre, creer, modifier, supprimer
            $table->string('entity_type');       // commande, menu_hebdomadaire, regime_special, devis, user, formation, service
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('entity_label')->nullable(); // ex: référence commande, nom patient...
            $table->text('details')->nullable(); // JSON ou texte libre (motif rejet, etc.)
            $table->string('ip_address')->nullable();
            $table->unsignedBigInteger('formation_id')->nullable();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
            $table->index('user_id');
            $table->index('formation_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};

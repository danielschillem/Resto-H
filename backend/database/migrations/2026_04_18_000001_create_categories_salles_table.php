<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories_salles', function (Blueprint $table) {
            $table->id();
            $table->string('nom');              // Ex: "1 lit VIP", "2 lits standard"
            $table->integer('nb_lits')->default(1);
            $table->text('commodites')->nullable(); // Commodités associées
            $table->unsignedBigInteger('formation_id')->nullable();
            $table->foreign('formation_id')->references('id')->on('formations_sanitaires')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories_salles');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Idempotent: skip entirely if column already exists
        if (Schema::hasColumn('parametres', 'formation_id')) {
            return;
        }

        Schema::table('parametres', function (Blueprint $table) {
            $table->dropUnique(['cle']);
            $table->unsignedBigInteger('formation_id')->nullable()->after('description');
            $table->foreign('formation_id')->references('id')->on('formation_sanitaires')->cascadeOnDelete();
            $table->unique(['cle', 'formation_id']);
        });
    }

    public function down(): void
    {
        Schema::table('parametres', function (Blueprint $table) {
            $table->dropUnique(['cle', 'formation_id']);
            $table->dropForeign(['formation_id']);
            $table->dropColumn('formation_id');
            $table->unique('cle');
        });
    }
};

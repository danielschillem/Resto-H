<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('licences', function (Blueprint $table) {
            $table->unsignedBigInteger('formation_id')->nullable()->after('id');
            $table->foreign('formation_id')->references('id')->on('formations_sanitaires')->cascadeOnDelete();
        });

        // Drop the unique constraint on cle_licence so multiple formations can use the same key pattern
        Schema::table('licences', function (Blueprint $table) {
            $table->dropUnique(['cle_licence']);
        });
    }

    public function down(): void
    {
        Schema::table('licences', function (Blueprint $table) {
            $table->dropForeign(['formation_id']);
            $table->dropColumn('formation_id');
            $table->string('cle_licence')->nullable()->unique()->change();
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasColumn('commandes', 'valide_sus_par')) {
            return;
        }

        Schema::table('commandes', function (Blueprint $table) {
            $table->unsignedBigInteger('valide_sus_par')->nullable()->after('valide_par');
            $table->dateTime('date_validation_sus')->nullable()->after('date_validation');
            $table->foreign('valide_sus_par')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('commandes', function (Blueprint $table) {
            $table->dropForeign(['valide_sus_par']);
            $table->dropColumn(['valide_sus_par', 'date_validation_sus']);
        });
    }
};

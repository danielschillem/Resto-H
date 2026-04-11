<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('devis_estimatifs', function (Blueprint $table) {
            $table->text('commentaire_rejet')->nullable()->after('date_validation');
        });
    }

    public function down(): void
    {
        Schema::table('devis_estimatifs', function (Blueprint $table) {
            $table->dropColumn('commentaire_rejet');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('users')
            ->where('email', 'gerant@chr-tenkodogo.bf')
            ->update(['email' => 'prestataire@chr-tenkodogo.bf']);
    }

    public function down(): void
    {
        DB::table('users')
            ->where('email', 'prestataire@chr-tenkodogo.bf')
            ->update(['email' => 'gerant@chr-tenkodogo.bf']);
    }
};

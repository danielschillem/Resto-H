<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $weekStart = Carbon::now()->startOfWeek()->format('Y-m-d');
        $weekEnd = Carbon::now()->endOfWeek()->format('Y-m-d');

        // Update consommations: shift dates to current week
        $consommations = DB::table('consommations')->orderBy('date')->get();
        $dates = $consommations->pluck('date')->unique()->sort()->values();
        foreach ($dates as $i => $oldDate) {
            $newDate = Carbon::now()->startOfWeek()->addDays($i)->format('Y-m-d');
            DB::table('consommations')->where('date', $oldDate)->update(['date' => $newDate]);
        }

        // Update consommation_articles: shift to current week
        DB::table('consommation_articles')->update([
            'semaine_debut' => $weekStart,
            'semaine_fin' => $weekEnd,
        ]);

        // Update commandes: shift date_repas to today and this week
        $commandes = DB::table('commandes')->get();
        foreach ($commandes as $cmd) {
            $dayOffset = rand(0, 4); // Mon-Fri
            $newDate = Carbon::now()->startOfWeek()->addDays($dayOffset)->format('Y-m-d');
            DB::table('commandes')->where('id', $cmd->id)->update(['date_repas' => $newDate]);
        }
    }

    public function down(): void
    {
        // No rollback needed for seed data refresh
    }
};

<?php

namespace App\Providers;

use App\Models\Commande;
use App\Models\MenuHebdomadaire;
use App\Models\RegimeSpecial;
use App\Observers\CommandeObserver;
use App\Observers\MenuHebdomadaireObserver;
use App\Observers\RegimeSpecialObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Commande::observe(CommandeObserver::class);
        RegimeSpecial::observe(RegimeSpecialObserver::class);
        MenuHebdomadaire::observe(MenuHebdomadaireObserver::class);
    }
}

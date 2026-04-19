<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Consommation extends Model
{
    protected $fillable = [
        'date', 'repas', 'menu_servi', 'nb_malades',
        'nb_personnel', 'nb_clients', 'total_portions',
        'cout_prevu', 'cout_reel', 'ecart',
        'formation_id',
    ];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }
}

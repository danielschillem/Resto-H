<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CategorieSalle extends Model
{
    protected $table = 'categories_salles';

    protected $fillable = ['nom', 'nb_lits', 'commodites', 'formation_id'];

    public function salles(): HasMany
    {
        return $this->hasMany(Salle::class, 'categorie_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Menu extends Model
{
    protected $fillable = [
        'intitule', 'type_repas', 'portions_prevues',
        'cout_unitaire', 'allergenes', 'notes_nutritionnelles',
        'formation_id',
    ];

    public function commandes(): HasMany
    {
        return $this->hasMany(Commande::class);
    }
}

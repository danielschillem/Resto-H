<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AnneeBudgetaire extends Model
{
    protected $table = 'annees_budgetaires';

    protected $fillable = [
        'libelle',
        'date_debut',
        'date_fin',
        'is_active',
        'formation_id',
    ];

    protected $casts = [
        'date_debut' => 'date',
        'date_fin' => 'date',
        'is_active' => 'boolean',
    ];

    public function marches(): HasMany
    {
        return $this->hasMany(Marche::class, 'annee_budgetaire_id');
    }
}

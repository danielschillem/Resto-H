<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsommationArticle extends Model
{
    protected $table = 'consommation_articles';

    protected $fillable = [
        'article', 'unite', 'qte_prevue', 'qte_reelle',
        'ecart', 'cout_unitaire', 'cout_reel',
        'semaine_debut', 'semaine_fin',
    ];

    protected function casts(): array
    {
        return [
            'semaine_debut' => 'date',
            'semaine_fin' => 'date',
            'qte_prevue' => 'decimal:2',
            'qte_reelle' => 'decimal:2',
            'ecart' => 'decimal:2',
        ];
    }
}

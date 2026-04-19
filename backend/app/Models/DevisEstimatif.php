<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DevisEstimatif extends Model
{
    protected $table = 'devis_estimatifs';

    protected $fillable = [
        'semaine_debut',
        'semaine_fin',
        'statut',
        'total_estime',
        'soumis_par',
        'valide_par',
        'date_soumission',
        'date_validation',
        'commentaire_rejet',
        'formation_id',
    ];

    protected function casts(): array
    {
        return [
            'semaine_debut' => 'date',
            'semaine_fin' => 'date',
            'date_soumission' => 'datetime',
            'date_validation' => 'datetime',
        ];
    }

    public function lignes(): HasMany
    {
        return $this->hasMany(DevisLigne::class, 'devis_id');
    }

    public function soumisPar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'soumis_par');
    }

    public function validePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_par');
    }
}

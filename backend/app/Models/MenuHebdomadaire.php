<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuHebdomadaire extends Model
{
    protected $table = 'menus_hebdomadaires';

    protected $fillable = [
        'semaine_debut', 'semaine_fin', 'statut', 'soumis_par',
        'valide_par', 'date_soumission', 'date_validation',
        'cout_matieres', 'cout_main_oeuvre', 'commentaire',
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

    public function items(): HasMany
    {
        return $this->hasMany(MenuHebdomadaireItem::class);
    }

    public function soumisPar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'soumis_par');
    }

    public function validePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_par');
    }

    public function getCoutTotalAttribute(): int
    {
        return $this->cout_matieres + $this->cout_main_oeuvre;
    }
}

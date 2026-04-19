<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Marche extends Model
{
    protected $fillable = [
        'reference',
        'objet',
        'fournisseur',
        'montant_initial',
        'montant_consomme',
        'montant_restant',
        'seuil_alerte',
        'date_debut',
        'date_fin',
        'statut',
        'annee_budgetaire_id',
        'formation_id',
    ];

    protected $casts = [
        'montant_initial' => 'decimal:2',
        'montant_consomme' => 'decimal:2',
        'montant_restant' => 'decimal:2',
        'seuil_alerte' => 'decimal:2',
        'date_debut' => 'date',
        'date_fin' => 'date',
    ];

    protected $appends = ['pourcentage_consomme', 'en_alerte'];

    public function anneeBudgetaire(): BelongsTo
    {
        return $this->belongsTo(AnneeBudgetaire::class, 'annee_budgetaire_id');
    }

    public function commandes(): HasMany
    {
        return $this->hasMany(Commande::class, 'marche_id');
    }

    public function getPourcentageConsommeAttribute(): float
    {
        if ($this->montant_initial <= 0) return 0;
        return round(($this->montant_consomme / $this->montant_initial) * 100, 2);
    }

    public function getEnAlerteAttribute(): bool
    {
        if ($this->montant_initial <= 0) return false;
        $pourcentageRestant = ($this->montant_restant / $this->montant_initial) * 100;
        return $pourcentageRestant <= $this->seuil_alerte;
    }

    /**
     * Imputer un montant sur ce marché (appelé lors de la validation d'une commande).
     */
    public function imputer(float $montant): void
    {
        $this->montant_consomme += $montant;
        $this->montant_restant = $this->montant_initial - $this->montant_consomme;
        if ($this->montant_restant <= 0) {
            $this->statut = 'epuise';
        }
        $this->save();
    }
}

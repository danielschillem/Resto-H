<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Commande extends Model
{
    protected $fillable = [
        'reference', 'type', 'service_id', 'date_repas', 'repas',
        'menu_id', 'nb_portions', 'heure_livraison', 'montant',
        'statut', 'statut_paiement', 'client_nom', 'observations',
        'motif_rejet', 'soumis_par', 'valide_par', 'date_validation',
        'valide_sus_par', 'date_validation_sus',
        'marche_id',
        'heure_livraison_effective', 'temperature', 'observations_livraison',
        'formation_id',
    ];

    protected function casts(): array
    {
        return [
            'date_repas' => 'date',
            'date_validation' => 'datetime',
        ];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function menu(): BelongsTo
    {
        return $this->belongsTo(Menu::class);
    }

    public function soumisPar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'soumis_par');
    }

    public function validePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_par');
    }

    public function valideSusPar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_sus_par');
    }

    public function regimesSpeciaux(): BelongsToMany
    {
        return $this->belongsToMany(RegimeSpecial::class, 'commande_regimes', 'commande_id', 'regime_special_id');
    }

    public function marche(): BelongsTo
    {
        return $this->belongsTo(Marche::class);
    }
}

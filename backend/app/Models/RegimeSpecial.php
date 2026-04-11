<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegimeSpecial extends Model
{
    protected $table = 'regimes_speciaux';

    protected $fillable = [
        'patient_nom', 'lit', 'service_id', 'type_regime',
        'date_debut', 'duree_jours', 'medecin_prescripteur',
        'instructions', 'statut', 'motif_rejet',
        'soumis_par', 'valide_par',
        'formation_id',
    ];

    protected function casts(): array
    {
        return ['date_debut' => 'date'];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function soumisPar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'soumis_par');
    }

    public function validePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'valide_par');
    }

    public function getDateFinAttribute(): string
    {
        return $this->date_debut->addDays($this->duree_jours)->format('d/m');
    }
}

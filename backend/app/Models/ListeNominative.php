<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ListeNominative extends Model
{
    protected $table = 'liste_nominatives';

    protected $fillable = [
        'date',
        'repas',
        'patient_id',
        'service_id',
        'lit_id',
        'regime',
        'servi',
        'observations',
        'enregistre_par',
        'commande_id',
        'formation_id',
    ];

    protected $casts = [
        'date' => 'date',
        'servi' => 'boolean',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function lit(): BelongsTo
    {
        return $this->belongsTo(Lit::class);
    }

    public function enregistrePar(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enregistre_par');
    }

    public function commande(): BelongsTo
    {
        return $this->belongsTo(Commande::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Patient extends Model
{
    protected $fillable = [
        'nom', 'prenom', 'sexe', 'age', 'lit_id', 'service_id',
        'statut', 'observations', 'formation_id',
    ];

    public function lit(): BelongsTo
    {
        return $this->belongsTo(Lit::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function admissions(): HasMany
    {
        return $this->hasMany(Admission::class);
    }
}

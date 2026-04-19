<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Salle extends Model
{
    protected $fillable = ['numero', 'service_id', 'categorie_id', 'nb_lits', 'notes', 'is_active', 'formation_id'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function categorie(): BelongsTo
    {
        return $this->belongsTo(CategorieSalle::class, 'categorie_id');
    }

    public function lits(): HasMany
    {
        return $this->hasMany(Lit::class);
    }
}

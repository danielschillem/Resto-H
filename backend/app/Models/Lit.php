<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Lit extends Model
{
    protected $fillable = ['numero', 'salle_id', 'is_occupe', 'notes', 'formation_id'];

    protected function casts(): array
    {
        return ['is_occupe' => 'boolean'];
    }

    public function salle(): BelongsTo
    {
        return $this->belongsTo(Salle::class);
    }

    public function patient(): HasOne
    {
        return $this->hasOne(Patient::class);
    }
}

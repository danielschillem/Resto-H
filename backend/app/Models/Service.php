<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    protected $fillable = ['nom', 'lits_actifs', 'responsable', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function commandes(): HasMany
    {
        return $this->hasMany(Commande::class);
    }

    public function regimesSpeciaux(): HasMany
    {
        return $this->hasMany(RegimeSpecial::class, 'service_id');
    }
}

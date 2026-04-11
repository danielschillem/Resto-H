<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FormationSanitaire extends Model
{
    protected $table = 'formations_sanitaires';

    protected $fillable = [
        'nom',
        'code',
        'type',
        'ville',
        'region',
        'telephone',
        'email',
        'directeur',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'formation_id');
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class, 'formation_id');
    }

    public function prestataire(): ?User
    {
        return $this->users()->where('role', 'prestataire')->first();
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    public function getNbUsersAttribute(): int
    {
        return $this->users()->where('role', '!=', 'super_admin')->count();
    }

    public function getNbServicesAttribute(): int
    {
        return $this->services()->count();
    }

    protected $appends = ['nb_users', 'nb_services'];
}

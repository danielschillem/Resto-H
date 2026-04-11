<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'formation_id',
        'nom',
        'prenom',
        'email',
        'password',
        'role',
        'service',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function getFullNameAttribute(): string
    {
        return $this->nom . ' ' . $this->prenom;
    }

    public function getPermissionsAttribute(): array
    {
        if ($this->role === 'super_admin') {
            return RolePermission::allPermissions();
        }
        return RolePermission::permissionsForRole($this->role);
    }

    public function formation(): BelongsTo
    {
        return $this->belongsTo(FormationSanitaire::class, 'formation_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function commandesSoumises(): HasMany
    {
        return $this->hasMany(Commande::class, 'soumis_par');
    }
}

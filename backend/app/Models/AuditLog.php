<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'user_name',
        'action',
        'entity_type',
        'entity_id',
        'entity_label',
        'details',
        'ip_address',
        'formation_id',
    ];

    /**
     * Enregistre une entrée d'audit.
     */
    public static function record(
        string $action,
        string $entityType,
        ?int $entityId = null,
        ?string $entityLabel = null,
        ?string $details = null,
        ?Request $request = null,
    ): self {
        $user = $request?->user() ?? auth()->user();

        return static::create([
            'user_id' => $user?->id,
            'user_name' => $user ? ($user->prenom . ' ' . $user->nom) : 'Système',
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'entity_label' => $entityLabel,
            'details' => $details,
            'ip_address' => $request?->ip(),
            'formation_id' => $user?->formation_id,
        ]);
    }
}

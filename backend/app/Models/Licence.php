<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Licence extends Model
{
    protected $fillable = ['statut', 'date_debut', 'date_fin', 'cle_licence', 'titulaire', 'formation_id'];

    protected $casts = [
        'date_debut' => 'date',
        'date_fin' => 'date',
    ];

    public function formation(): BelongsTo
    {
        return $this->belongsTo(FormationSanitaire::class, 'formation_id');
    }

    public function isValide(): bool
    {
        if ($this->statut === 'premium') {
            return $this->date_fin->isFuture();
        }
        if ($this->statut === 'essai') {
            return $this->date_fin->isFuture();
        }
        return false;
    }

    public function joursRestants(): int
    {
        $diff = (int) now()->startOfDay()->diffInDays($this->date_fin->startOfDay(), false);
        return max(0, $diff);
    }

    /**
     * Retourne la licence courante pour une formation donnée.
     * Si aucune formation_id n'est fourni, retourne la première licence (rétrocompatibilité).
     */
    public static function courant(?int $formationId = null): self
    {
        $query = static::query();

        if ($formationId) {
            $query->where('formation_id', $formationId);
        }

        $licence = $query->first();

        if (!$licence) {
            $licence = static::create([
                'statut' => 'essai',
                'date_debut' => now(),
                'date_fin' => now()->addDays(14),
                'formation_id' => $formationId,
            ]);
        }

        // Met à jour le statut si l'essai est expiré
        if ($licence->statut === 'essai' && $licence->date_fin->isPast()) {
            $licence->update(['statut' => 'expire']);
            $licence->refresh();
        }

        // Met à jour le statut si le premium est expiré
        if ($licence->statut === 'premium' && $licence->date_fin->isPast()) {
            $licence->update(['statut' => 'expire']);
            $licence->refresh();
        }

        return $licence;
    }
}

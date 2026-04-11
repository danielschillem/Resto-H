<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Licence extends Model
{
    protected $fillable = ['statut', 'date_debut', 'date_fin', 'cle_licence', 'titulaire'];

    protected $casts = [
        'date_debut' => 'date',
        'date_fin' => 'date',
    ];

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

    public static function courant(): self
    {
        $licence = static::first();

        if (!$licence) {
            $licence = static::create([
                'statut' => 'essai',
                'date_debut' => now(),
                'date_fin' => now()->addDays(14),
            ]);
        }

        // Met à jour le statut si l'essai est expiré
        if ($licence->statut === 'essai' && $licence->date_fin->isPast()) {
            $licence->update(['statut' => 'expire']);
            $licence->refresh();
        }

        return $licence;
    }
}

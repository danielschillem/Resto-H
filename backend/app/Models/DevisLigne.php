<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DevisLigne extends Model
{
    protected $table = 'devis_lignes';

    protected $fillable = [
        'devis_id', 'article', 'unite',
        'qte_estimee', 'prix_unitaire', 'montant_estime',
    ];

    protected function casts(): array
    {
        return ['qte_estimee' => 'decimal:2'];
    }

    public function devis(): BelongsTo
    {
        return $this->belongsTo(DevisEstimatif::class, 'devis_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MenuHebdomadaireItem extends Model
{
    protected $table = 'menu_hebdomadaire_items';

    protected $fillable = ['menu_hebdomadaire_id', 'menu_id', 'jour_semaine'];

    public function menuHebdomadaire(): BelongsTo
    {
        return $this->belongsTo(MenuHebdomadaire::class);
    }

    public function menu(): BelongsTo
    {
        return $this->belongsTo(Menu::class);
    }
}

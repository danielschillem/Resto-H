<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Parametre extends Model
{
    protected $fillable = ['cle', 'valeur', 'description', 'formation_id'];
}

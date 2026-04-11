<?php

namespace App\Observers;

use App\Models\MenuHebdomadaire;
use App\Models\Notification;
use App\Models\User;

class MenuHebdomadaireObserver
{
    public function updated(MenuHebdomadaire $menu): void
    {
        if (!$menu->isDirty('statut')) {
            return;
        }

        $submitter = $menu->soumis_par ? User::find($menu->soumis_par) : null;

        match ($menu->statut) {
            'soumis' => $this->notifyRoles(
                ['gerant', 'dsgl'],
                'Menu hebdomadaire soumis',
                "Un menu hebdomadaire pour la semaine du " . \Carbon\Carbon::parse($menu->semaine_debut)->format('d/m') . " a été soumis pour validation.",
                'menu',
                $menu->id
            ),
            'valide' => $this->notifyUser(
                $submitter,
                'Menu hebdomadaire validé',
                "Le menu hebdomadaire semaine du " . \Carbon\Carbon::parse($menu->semaine_debut)->format('d/m') . " a été validé.",
                'menu',
                $menu->id
            ),
            'rejete' => $this->notifyUser(
                $submitter,
                'Menu hebdomadaire rejeté',
                "Le menu hebdomadaire semaine du " . \Carbon\Carbon::parse($menu->semaine_debut)->format('d/m') . " a été rejeté.",
                'menu',
                $menu->id
            ),
            default => null,
        };
    }

    private function notifyRoles(array $roles, string $titre, string $message, string $type, int $refId): void
    {
        User::whereIn('role', $roles)->where('is_active', true)->each(function ($user) use ($titre, $message, $type, $refId) {
            Notification::create([
                'user_id' => $user->id,
                'titre' => $titre,
                'message' => $message,
                'type' => $type,
                'reference_id' => $refId,
            ]);
        });
    }

    private function notifyUser(?User $user, string $titre, string $message, string $type, int $refId): void
    {
        if (!$user) {
            return;
        }

        Notification::create([
            'user_id' => $user->id,
            'titre' => $titre,
            'message' => $message,
            'type' => $type,
            'reference_id' => $refId,
        ]);
    }
}

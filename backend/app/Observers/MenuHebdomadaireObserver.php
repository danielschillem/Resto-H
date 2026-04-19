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
                ['prestataire', 'dsgl'],
                'Menu hebdomadaire soumis',
                "Un menu hebdomadaire pour la semaine du " . \Carbon\Carbon::parse($menu->semaine_debut)->format('d/m') . " a été soumis pour validation.",
                'menu',
                $menu->id,
                $menu->formation_id
            ),
            'valide' => $this->notifyUser(
                $submitter,
                'Menu hebdomadaire validé',
                "Le menu hebdomadaire semaine du " . \Carbon\Carbon::parse($menu->semaine_debut)->format('d/m') . " a été validé.",
                'menu',
                $menu->id,
                $menu->formation_id
            ),
            'rejete' => $this->notifyUser(
                $submitter,
                'Menu hebdomadaire rejeté',
                "Le menu hebdomadaire semaine du " . \Carbon\Carbon::parse($menu->semaine_debut)->format('d/m') . " a été rejeté.",
                'menu',
                $menu->id,
                $menu->formation_id
            ),
            default => null,
        };
    }

    private function notifyRoles(array $roles, string $titre, string $message, string $type, int $refId, ?int $formationId = null): void
    {
        User::whereIn('role', $roles)->where('is_active', true)
            ->when($formationId, fn ($q) => $q->where('formation_id', $formationId))
            ->each(function ($user) use ($titre, $message, $type, $refId, $formationId) {
            Notification::create([
                'user_id' => $user->id,
                'titre' => $titre,
                'message' => $message,
                'type' => $type,
                'reference_id' => $refId,
                'formation_id' => $formationId,
            ]);
        });
    }

    private function notifyUser(?User $user, string $titre, string $message, string $type, int $refId, ?int $formationId = null): void
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
            'formation_id' => $formationId,
        ]);
    }
}

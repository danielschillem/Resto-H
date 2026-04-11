<?php

namespace App\Observers;

use App\Models\Commande;
use App\Models\Notification;
use App\Models\User;

class CommandeObserver
{
    public function created(Commande $commande): void
    {
        // Notify gérant & CSAH when a new commande is submitted
        $this->notifyRoles(
            ['gerant', 'csah'],
            'Nouvelle commande',
            "Commande {$commande->reference} soumise — {$commande->nb_portions} portion(s) pour le service.",
            'commande',
            $commande->id
        );
    }

    public function updated(Commande $commande): void
    {
        if (!$commande->isDirty('statut')) {
            return;
        }

        $submitter = $commande->soumis_par ? User::find($commande->soumis_par) : null;

        match ($commande->statut) {
            'validee' => $this->notifyUser(
                $submitter,
                'Commande validée',
                "Votre commande {$commande->reference} a été validée et est en cours de préparation.",
                'commande',
                $commande->id
            ),
            'rejetee' => $this->notifyUser(
                $submitter,
                'Commande rejetée',
                "Votre commande {$commande->reference} a été rejetée. Motif : {$commande->motif_rejet}",
                'commande',
                $commande->id
            ),
            'livree' => $this->notifyUser(
                $submitter,
                'Commande livrée',
                "La commande {$commande->reference} a été livrée avec succès.",
                'commande',
                $commande->id
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

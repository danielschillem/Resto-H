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
            ['prestataire', 'csah'],
            'Nouvelle commande',
            "Commande {$commande->reference} soumise - {$commande->nb_portions} portion(s) pour le service.",
            'commande',
            $commande->id,
            $commande->formation_id
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
                $commande->id,
                $commande->formation_id
            ),
            'rejetee' => $this->notifyUser(
                $submitter,
                'Commande rejetée',
                "Votre commande {$commande->reference} a été rejetée. Motif : {$commande->motif_rejet}",
                'commande',
                $commande->id,
                $commande->formation_id
            ),
            'livree' => $this->notifyUser(
                $submitter,
                'Commande livrée',
                "La commande {$commande->reference} a été livrée avec succès.",
                'commande',
                $commande->id,
                $commande->formation_id
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

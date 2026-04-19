<?php

namespace App\Observers;

use App\Models\Notification;
use App\Models\RegimeSpecial;
use App\Models\User;

class RegimeSpecialObserver
{
    public function created(RegimeSpecial $regime): void
    {
        $this->notifyRoles(
            ['prestataire', 'csah'],
            'Nouveau régime spécial',
            "Demande de régime {$regime->type_regime} pour le patient {$regime->patient_nom}.",
            'regime',
            $regime->id,
            $regime->formation_id
        );
    }

    public function updated(RegimeSpecial $regime): void
    {
        if (!$regime->isDirty('statut')) {
            return;
        }

        $submitter = $regime->soumis_par ? User::find($regime->soumis_par) : null;

        match ($regime->statut) {
            'valide' => $this->notifyUser(
                $submitter,
                'Régime spécial validé',
                "Le régime {$regime->type_regime} pour {$regime->patient_nom} a été validé.",
                'regime',
                $regime->id,
                $regime->formation_id
            ),
            'rejete' => $this->notifyUser(
                $submitter,
                'Régime spécial rejeté',
                "Le régime {$regime->type_regime} pour {$regime->patient_nom} a été rejeté. Motif : {$regime->motif_rejet}",
                'regime',
                $regime->id,
                $regime->formation_id
            ),
            'termine' => $this->notifyUser(
                $submitter,
                'Régime spécial terminé',
                "Le régime {$regime->type_regime} pour {$regime->patient_nom} est terminé.",
                'regime',
                $regime->id,
                $regime->formation_id
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

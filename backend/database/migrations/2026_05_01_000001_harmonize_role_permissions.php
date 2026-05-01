<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Harmonise la matrice des permissions pour qu'elle corresponde
     * exactement aux routes protégées dans api.php.
     *
     * Matrice de référence :
     * ┌───────────────────────┬──────┬──────┬──────┬─────┬─────┬───────────────┬─────┐
     * │ Permission            │ pres │ dsgl │ csah │ sus │ sut │ nutritionniste│ daf │
     * ├───────────────────────┼──────┼──────┼──────┼─────┼─────┼───────────────┼─────┤
     * │ dashboard             │  ✓   │  ✓   │  ✓   │  ✓  │  ✓  │      ✓        │  ✓  │
     * │ menus                 │  ✓   │  ✓   │  ✓   │  ✓  │  ✓  │      ✓        │     │
     * │ menus.valider         │      │  ✓   │      │     │     │               │     │
     * │ commandes             │  ✓   │  ✓   │  ✓   │  ✓  │  ✓  │               │  ✓  │
     * │ commandes.valider     │      │  ✓   │  ✓   │  ✓  │     │               │     │
     * │ commandes.livrer      │  ✓   │      │      │     │     │               │     │
     * │ consommations         │      │  ✓   │  ✓   │     │  ✓  │      ✓        │  ✓  │
     * │ etats                 │      │  ✓   │  ✓   │     │     │               │  ✓  │
     * │ etats.valider         │      │  ✓   │      │     │     │               │  ✓  │
     * │ regimes               │  ✓   │  ✓   │  ✓   │  ✓  │  ✓  │      ✓        │     │
     * │ regimes.valider       │      │  ✓   │  ✓   │     │     │               │     │
     * │ admin                 │      │  ✓   │      │     │     │               │     │
     * │ licence               │      │  ✓   │      │     │     │               │     │
     * │ observatoire          │      │  ✓   │  ✓   │     │     │      ✓        │     │
     * │ validation_financiere │      │      │      │     │     │               │  ✓  │
     * │ marches               │  ✓   │  ✓   │  ✓   │  ✓  │     │               │  ✓  │
     * │ marches.creer         │      │  ✓   │      │     │     │               │  ✓  │
     * │ marches.modifier      │      │  ✓   │      │     │     │               │  ✓  │
     * │ liste_nominative      │      │  ✓   │  ✓   │  ✓  │  ✓  │      ✓        │  ✓  │
     * │ liste_nominative.creer│      │  ✓   │  ✓   │  ✓  │     │               │     │
     * │ hospitalisation       │  ✓   │  ✓   │  ✓   │  ✓  │  ✓  │      ✓        │  ✓  │
     * │ hospitalisation.gerer │      │  ✓   │  ✓   │  ✓  │     │               │     │
     * └───────────────────────┴──────┴──────┴──────┴─────┴─────┴───────────────┴─────┘
     */
    public function up(): void
    {
        // Reconstruire toute la table pour garantir la cohérence
        DB::table('role_permissions')->truncate();

        $now = now();

        $matrix = [
            'prestataire' => [
                'dashboard', 'menus', 'commandes', 'commandes.livrer',
                'regimes', 'marches', 'hospitalisation',
            ],
            'dsgl' => [
                'dashboard', 'menus', 'menus.valider',
                'commandes', 'commandes.valider',
                'consommations', 'etats', 'etats.valider',
                'regimes', 'regimes.valider',
                'admin', 'licence', 'observatoire',
                'marches', 'marches.creer', 'marches.modifier',
                'liste_nominative', 'liste_nominative.creer',
                'hospitalisation', 'hospitalisation.gerer',
            ],
            'csah' => [
                'dashboard', 'menus',
                'commandes', 'commandes.valider',
                'consommations', 'etats',
                'regimes', 'regimes.valider',
                'observatoire',
                'marches',
                'liste_nominative', 'liste_nominative.creer',
                'hospitalisation', 'hospitalisation.gerer',
            ],
            'sus' => [
                'dashboard', 'menus',
                'commandes', 'commandes.valider',
                'regimes', 'marches',
                'liste_nominative', 'liste_nominative.creer',
                'hospitalisation', 'hospitalisation.gerer',
            ],
            'sut' => [
                'dashboard', 'menus',
                'commandes', 'consommations',
                'regimes',
                'liste_nominative',
                'hospitalisation',
            ],
            'nutritionniste' => [
                'dashboard', 'menus',
                'consommations', 'regimes',
                'observatoire',
                'liste_nominative',
                'hospitalisation',
            ],
            'daf' => [
                'dashboard',
                'commandes', 'consommations',
                'etats', 'etats.valider',
                'validation_financiere',
                'marches', 'marches.creer', 'marches.modifier',
                'liste_nominative',
                'hospitalisation',
            ],
        ];

        $rows = [];
        foreach ($matrix as $role => $perms) {
            foreach ($perms as $perm) {
                $rows[] = [
                    'role' => $role,
                    'permission' => $perm,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        // Insert par lots de 50
        foreach (array_chunk($rows, 50) as $chunk) {
            DB::table('role_permissions')->insert($chunk);
        }
    }

    public function down(): void
    {
        // Pas de rollback fiable — la migration précédente reconstruit les permissions
    }
};

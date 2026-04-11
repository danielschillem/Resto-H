<?php

namespace Database\Seeders;

use App\Models\Commande;
use App\Models\Consommation;
use App\Models\ConsommationArticle;
use App\Models\DevisEstimatif;
use App\Models\FormationSanitaire;
use App\Models\Menu;
use App\Models\MenuHebdomadaire;
use App\Models\Notification;
use App\Models\Parametre;
use App\Models\RegimeSpecial;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Skip if already seeded
        if (FormationSanitaire::count() > 0) {
            return;
        }

        // --- Formation Sanitaire ---
        $formation = FormationSanitaire::create([
            'nom' => 'CHR Tenkodogo',
            'code' => 'CHR-TENK',
            'type' => 'CHR',
            'ville' => 'Tenkodogo',
            'region' => 'Centre-Est',
            'telephone' => '+226 40 71 06 06',
            'email' => 'direction@chr-tenkodogo.bf',
            'directeur' => 'Dr. Ouédraogo Blaise',
            'is_active' => true,
        ]);
        $fid = $formation->id;

        // --- Users ---
        $gerant = User::create(['nom' => 'Kaboré', 'prenom' => 'Serge', 'email' => 'gerant@chr-tenkodogo.bf', 'password' => Hash::make('1234'), 'role' => 'gerant', 'service' => 'Restauration', 'formation_id' => $fid]);
        $dsgl = User::create(['nom' => 'Traoré', 'prenom' => 'Aminata', 'email' => 'dsgl@chr-tenkodogo.bf', 'password' => Hash::make('1234'), 'role' => 'dsgl', 'service' => 'Direction', 'formation_id' => $fid]);
        $csah = User::create(['nom' => 'Ouédraogo', 'prenom' => 'Jean', 'email' => 'csah@chr-tenkodogo.bf', 'password' => Hash::make('1234'), 'role' => 'csah', 'service' => 'Hôtellerie', 'formation_id' => $fid]);
        $sus = User::create(['nom' => 'Sawadogo', 'prenom' => 'Fatou', 'email' => 'sus@chr-tenkodogo.bf', 'password' => Hash::make('1234'), 'role' => 'sus', 'service' => 'Pédiatrie', 'formation_id' => $fid]);
        User::create(['nom' => 'Compaoré', 'prenom' => 'Luc', 'email' => 'sut@chr-tenkodogo.bf', 'password' => Hash::make('1234'), 'role' => 'sut', 'service' => 'Laboratoire', 'is_active' => false, 'formation_id' => $fid]);

        // --- Services ---
        $pediatrie = Service::create(['nom' => 'Pédiatrie', 'lits_actifs' => 28, 'responsable' => 'Sawadogo F.', 'formation_id' => $fid]);
        $medecine = Service::create(['nom' => 'Médecine interne', 'lits_actifs' => 52, 'responsable' => 'Zongo A.', 'formation_id' => $fid]);
        $chirurgie = Service::create(['nom' => 'Chirurgie', 'lits_actifs' => 30, 'responsable' => 'Nana P.', 'formation_id' => $fid]);
        $gyneco = Service::create(['nom' => 'Gynéco-obstétrique', 'lits_actifs' => 40, 'responsable' => 'Ilboudo S.', 'formation_id' => $fid]);
        $urgences = Service::create(['nom' => 'Urgences 24h/24', 'lits_actifs' => 12, 'responsable' => 'Barro C.', 'formation_id' => $fid]);
        $bloc = Service::create(['nom' => 'Bloc opératoire', 'lits_actifs' => 0, 'responsable' => 'Traoré K.', 'formation_id' => $fid]);
        $labo = Service::create(['nom' => 'Laboratoire', 'lits_actifs' => 0, 'responsable' => 'Compaoré L.', 'formation_id' => $fid]);

        // --- Menus ---
        $menus = [
            Menu::create(['intitule' => 'Bouillie de mil + pain', 'type_repas' => 'petit_dejeuner', 'portions_prevues' => 180, 'cout_unitaire' => 500]),
            Menu::create(['intitule' => 'Pain + café', 'type_repas' => 'petit_dejeuner', 'portions_prevues' => 180, 'cout_unitaire' => 450]),
            Menu::create(['intitule' => 'Pain + omelette', 'type_repas' => 'petit_dejeuner', 'portions_prevues' => 180, 'cout_unitaire' => 550]),
            Menu::create(['intitule' => 'Pain + lait', 'type_repas' => 'petit_dejeuner', 'portions_prevues' => 180, 'cout_unitaire' => 480]),
            Menu::create(['intitule' => 'Riz sauce d\'arachide', 'type_repas' => 'dejeuner', 'portions_prevues' => 200, 'cout_unitaire' => 650]),
            Menu::create(['intitule' => 'Tô + sauce légumes', 'type_repas' => 'dejeuner', 'portions_prevues' => 200, 'cout_unitaire' => 580]),
            Menu::create(['intitule' => 'Riz gras au poulet', 'type_repas' => 'dejeuner', 'portions_prevues' => 200, 'cout_unitaire' => 750]),
            Menu::create(['intitule' => 'Haricot + plantain', 'type_repas' => 'dejeuner', 'portions_prevues' => 200, 'cout_unitaire' => 600]),
            Menu::create(['intitule' => 'Riz + légumes sautés', 'type_repas' => 'dejeuner', 'portions_prevues' => 200, 'cout_unitaire' => 620]),
            Menu::create(['intitule' => 'Riz gras + légumes', 'type_repas' => 'dejeuner', 'portions_prevues' => 200, 'cout_unitaire' => 680]),
            Menu::create(['intitule' => 'Poulet braisé + riz', 'type_repas' => 'dejeuner', 'portions_prevues' => 200, 'cout_unitaire' => 800]),
            Menu::create(['intitule' => 'Haricot + pain', 'type_repas' => 'diner', 'portions_prevues' => 180, 'cout_unitaire' => 500]),
            Menu::create(['intitule' => 'Riz + haricot', 'type_repas' => 'diner', 'portions_prevues' => 180, 'cout_unitaire' => 520]),
            Menu::create(['intitule' => 'Pâtes + légumes', 'type_repas' => 'diner', 'portions_prevues' => 180, 'cout_unitaire' => 550]),
            Menu::create(['intitule' => 'Riz + sauce', 'type_repas' => 'diner', 'portions_prevues' => 180, 'cout_unitaire' => 500]),
            Menu::create(['intitule' => 'Tô + poisson', 'type_repas' => 'diner', 'portions_prevues' => 180, 'cout_unitaire' => 620]),
            Menu::create(['intitule' => 'Haricot + riz', 'type_repas' => 'diner', 'portions_prevues' => 180, 'cout_unitaire' => 520]),
            Menu::create(['intitule' => 'Soupe + pain', 'type_repas' => 'diner', 'portions_prevues' => 180, 'cout_unitaire' => 480]),
        ];

        // --- Menu Hebdomadaire ---
        $weekStart = Carbon::now()->startOfWeek();
        $menuHebdo = MenuHebdomadaire::create([
            'semaine_debut' => $weekStart,
            'semaine_fin' => $weekStart->copy()->addDays(6),
            'statut' => 'soumis',
            'soumis_par' => $gerant->id,
            'date_soumission' => now()->subDays(2),
            'cout_matieres' => 685000,
            'cout_main_oeuvre' => 120000,
            'formation_id' => $fid,
        ]);

        // Map menus to days (simplified from prototype)
        $weekMenus = [
            [0, $menus[0], $menus[4], $menus[11]],  // Lundi
            [1, $menus[1], $menus[5], $menus[12]],  // Mardi
            [2, $menus[0], $menus[6], $menus[13]],  // Mercredi
            [3, $menus[2], $menus[7], $menus[14]],  // Jeudi
            [4, $menus[0], $menus[8], $menus[15]],  // Vendredi
            [5, $menus[3], $menus[9], $menus[16]],  // Samedi
            [6, $menus[0], $menus[10], $menus[17]], // Dimanche
        ];

        foreach ($weekMenus as [$jour, $petit, $dej, $din]) {
            $menuHebdo->items()->create(['menu_id' => $petit->id, 'jour_semaine' => $jour]);
            $menuHebdo->items()->create(['menu_id' => $dej->id, 'jour_semaine' => $jour]);
            $menuHebdo->items()->create(['menu_id' => $din->id, 'jour_semaine' => $jour]);
        }

        // --- Régimes Spéciaux ---
        RegimeSpecial::create(['patient_nom' => 'OUEDRAOGO S.', 'lit' => 'Pédiatrie-12', 'service_id' => $pediatrie->id, 'type_regime' => 'sans_sel', 'date_debut' => now(), 'duree_jours' => 7, 'medecin_prescripteur' => 'Dr. Kaboré', 'statut' => 'en_attente', 'soumis_par' => $sus->id]);
        RegimeSpecial::create(['patient_nom' => 'TAPSOBA R.', 'lit' => 'Med-08', 'service_id' => $medecine->id, 'type_regime' => 'diabetique', 'date_debut' => now(), 'duree_jours' => 14, 'medecin_prescripteur' => 'Dr. Zongo', 'statut' => 'en_attente', 'soumis_par' => $sus->id]);
        RegimeSpecial::create(['patient_nom' => 'SAWADOGO M.', 'lit' => 'Chir-03', 'service_id' => $chirurgie->id, 'type_regime' => 'post_op_mixe', 'date_debut' => now(), 'duree_jours' => 3, 'medecin_prescripteur' => 'Dr. Nana', 'statut' => 'en_attente', 'soumis_par' => $sus->id]);
        RegimeSpecial::create(['patient_nom' => 'COMPAORE A.', 'lit' => 'Gyn-06', 'service_id' => $gyneco->id, 'type_regime' => 'hyper_proteine', 'date_debut' => now(), 'duree_jours' => 5, 'medecin_prescripteur' => 'Dr. Ilboudo', 'statut' => 'en_attente', 'soumis_par' => $sus->id]);
        RegimeSpecial::create(['patient_nom' => 'BANCÉ L.', 'lit' => 'Med-11', 'service_id' => $medecine->id, 'type_regime' => 'hyposode', 'date_debut' => now()->subDays(5), 'duree_jours' => 7, 'medecin_prescripteur' => 'Dr. Zongo', 'statut' => 'valide', 'soumis_par' => $sus->id, 'valide_par' => $gerant->id]);
        RegimeSpecial::create(['patient_nom' => 'SOME W.', 'lit' => 'Pédiatrie-04', 'service_id' => $pediatrie->id, 'type_regime' => 'enrichi', 'date_debut' => now()->subDays(7), 'duree_jours' => 7, 'medecin_prescripteur' => 'Dr. Kaboré', 'statut' => 'valide', 'soumis_par' => $sus->id, 'valide_par' => $gerant->id]);
        RegimeSpecial::create(['patient_nom' => 'KABORE F.', 'lit' => 'Chir-09', 'service_id' => $chirurgie->id, 'type_regime' => 'post_op_mixe', 'date_debut' => now()->subDays(3), 'duree_jours' => 2, 'medecin_prescripteur' => 'Dr. Nana', 'statut' => 'termine', 'soumis_par' => $sus->id, 'valide_par' => $gerant->id]);
        RegimeSpecial::create(['patient_nom' => 'TIENDREBEOGO H.', 'lit' => 'Urg-02', 'service_id' => $urgences->id, 'type_regime' => 'sans_gluten', 'date_debut' => now()->subDays(4), 'duree_jours' => 5, 'medecin_prescripteur' => 'Dr. Barro', 'statut' => 'rejete', 'motif_rejet' => 'Non disponible en stock', 'soumis_par' => $sus->id]);

        // --- Commandes ---
        Commande::create(['reference' => '#2401', 'type' => 'malades', 'service_id' => $pediatrie->id, 'date_repas' => now(), 'repas' => 'dejeuner', 'menu_id' => $menus[6]->id, 'nb_portions' => 24, 'heure_livraison' => '11:30', 'statut' => 'validee', 'soumis_par' => $sus->id, 'valide_par' => $gerant->id, 'date_validation' => now()]);
        Commande::create(['reference' => '#2402', 'type' => 'personnel', 'service_id' => $medecine->id, 'date_repas' => now(), 'repas' => 'dejeuner', 'menu_id' => $menus[6]->id, 'nb_portions' => 42, 'heure_livraison' => '12:00', 'statut' => 'en_attente', 'soumis_par' => $sus->id]);
        Commande::create(['reference' => '#2403', 'type' => 'malades', 'service_id' => $chirurgie->id, 'date_repas' => now(), 'repas' => 'dejeuner', 'menu_id' => $menus[6]->id, 'nb_portions' => 18, 'heure_livraison' => '11:30', 'statut' => 'en_cours', 'soumis_par' => $sus->id]);
        Commande::create(['reference' => '#2404', 'type' => 'malades', 'service_id' => $gyneco->id, 'date_repas' => now(), 'repas' => 'dejeuner', 'menu_id' => $menus[6]->id, 'nb_portions' => 31, 'heure_livraison' => '11:30', 'statut' => 'en_attente', 'soumis_par' => $sus->id]);
        Commande::create(['reference' => '#2405', 'type' => 'personnel', 'service_id' => $urgences->id, 'date_repas' => now(), 'repas' => 'dejeuner', 'menu_id' => $menus[6]->id, 'nb_portions' => 12, 'heure_livraison' => '12:30', 'statut' => 'validee', 'soumis_par' => $sus->id, 'valide_par' => $gerant->id, 'date_validation' => now()]);
        Commande::create(['reference' => '#2407', 'type' => 'malades', 'service_id' => $medecine->id, 'date_repas' => now(), 'repas' => 'petit_dejeuner', 'menu_id' => $menus[0]->id, 'nb_portions' => 42, 'heure_livraison' => '07:00', 'statut' => 'validee', 'soumis_par' => $sus->id, 'valide_par' => $gerant->id, 'date_validation' => now()]);
        Commande::create(['reference' => '#P-101', 'type' => 'personnel', 'service_id' => $bloc->id, 'date_repas' => now(), 'repas' => 'dejeuner', 'menu_id' => $menus[6]->id, 'nb_portions' => 8, 'heure_livraison' => '12:30', 'statut' => 'validee', 'soumis_par' => $sus->id, 'valide_par' => $gerant->id, 'date_validation' => now()]);
        Commande::create(['reference' => '#P-102', 'type' => 'personnel', 'service_id' => $urgences->id, 'date_repas' => now(), 'repas' => 'diner', 'menu_id' => $menus[5]->id, 'nb_portions' => 12, 'heure_livraison' => '19:00', 'statut' => 'en_attente', 'soumis_par' => $sus->id]);
        Commande::create(['reference' => '#C-055', 'type' => 'client_externe', 'service_id' => $pediatrie->id, 'date_repas' => now(), 'repas' => 'dejeuner', 'menu_id' => $menus[6]->id, 'nb_portions' => 2, 'montant' => 2000, 'client_nom' => 'Visiteur (Pédiatrie)', 'statut' => 'livree', 'statut_paiement' => 'paye']);
        Commande::create(['reference' => '#C-056', 'type' => 'client_externe', 'service_id' => $medecine->id, 'date_repas' => now(), 'repas' => 'dejeuner', 'menu_id' => $menus[5]->id, 'nb_portions' => 1, 'montant' => 800, 'client_nom' => 'Visiteur (Médecine)', 'statut' => 'en_cours', 'statut_paiement' => 'en_attente']);

        // --- Consommations ---
        $consoData = [
            ['2026-03-09', 'petit_dejeuner', 'Bouillie mil', 145, 18, 4, 167, 85000, 82400],
            ['2026-03-09', 'dejeuner', 'Riz sauce arachide', 148, 22, 6, 176, 112000, 115200],
            ['2026-03-09', 'diner', 'Haricot + pain', 140, 14, 2, 156, 78000, 77100],
            ['2026-03-10', 'petit_dejeuner', 'Pain + café', 142, 20, 3, 165, 82500, 83000],
            ['2026-03-10', 'dejeuner', 'Tô + haricot', 149, 19, 5, 173, 108000, 107300],
            ['2026-03-11', 'dejeuner', 'Riz gras poulet', 151, 21, 7, 179, 118000, 122500],
        ];

        foreach ($consoData as [$date, $repas, $menu, $mal, $pers, $cli, $total, $prevu, $reel]) {
            Consommation::create([
                'date' => $date,
                'repas' => $repas,
                'menu_servi' => $menu,
                'nb_malades' => $mal,
                'nb_personnel' => $pers,
                'nb_clients' => $cli,
                'total_portions' => $total,
                'cout_prevu' => $prevu,
                'cout_reel' => $reel,
                'ecart' => $reel - $prevu,
            ]);
        }

        // --- Consommation Articles ---
        $articles = [
            ['Riz importé', 'kg', 480, 485, 5, 650, 315250],
            ['Huile végétale', 'L', 42, 43.2, 1.2, 1100, 47520],
            ['Viande bœuf', 'kg', 85, 83, -2, 3500, 290500],
            ['Légumes frais', 'kg', 120, 117, -3, 350, 40950],
            ['Pain de mie', 'unité', 300, 298, -2, 250, 74500],
        ];

        foreach ($articles as [$art, $unite, $qp, $qr, $ecart, $cu, $cr]) {
            ConsommationArticle::create([
                'article' => $art,
                'unite' => $unite,
                'qte_prevue' => $qp,
                'qte_reelle' => $qr,
                'ecart' => $ecart,
                'cout_unitaire' => $cu,
                'cout_reel' => $cr,
                'semaine_debut' => '2026-03-09',
                'semaine_fin' => '2026-03-15',
            ]);
        }

        // --- Devis Estimatif ---
        $devis = DevisEstimatif::create([
            'semaine_debut' => Carbon::now()->startOfWeek(),
            'semaine_fin' => Carbon::now()->endOfWeek(),
            'statut' => 'soumis',
            'total_estime' => 826650,
            'soumis_par' => $gerant->id,
            'date_soumission' => now()->subDays(7),
        ]);

        $devisLignes = [
            ['Riz importé', 'kg', 500, 650, 325000],
            ['Huile végétale', 'L', 44, 1100, 48400],
            ['Viande bœuf', 'kg', 88, 3500, 308000],
            ['Légumes frais', 'kg', 125, 350, 43750],
            ['Mil/Sorgho', 'kg', 60, 400, 24000],
            ['Pain de mie', 'unité', 310, 250, 77500],
        ];

        foreach ($devisLignes as [$art, $unite, $qte, $pu, $montant]) {
            $devis->lignes()->create([
                'article' => $art,
                'unite' => $unite,
                'qte_estimee' => $qte,
                'prix_unitaire' => $pu,
                'montant_estime' => $montant,
            ]);
        }

        // --- Paramètres ---
        Parametre::create(['cle' => 'tarif_malade_jour', 'valeur' => '2500', 'description' => 'Tarif malade par jour (FCFA)']);
        Parametre::create(['cle' => 'tarif_personnel_repas', 'valeur' => '1200', 'description' => 'Tarif personnel par repas (FCFA)']);
        Parametre::create(['cle' => 'tarif_visiteur_couvert', 'valeur' => '1000', 'description' => 'Tarif visiteur par couvert (FCFA)']);

        // --- Notifications ---
        foreach ([$gerant, $dsgl, $csah, $sus] as $user) {
            Notification::create(['user_id' => $user->id, 'titre' => 'Nouveau menu en attente', 'message' => 'Menu semaine 12 soumis par le gérant', 'type' => 'menu', 'lu' => false]);
            Notification::create(['user_id' => $user->id, 'titre' => 'Commande SUS/Pédiatrie', 'message' => '3 régimes spéciaux demandés', 'type' => 'commande', 'lu' => false]);
            Notification::create(['user_id' => $user->id, 'titre' => 'État de consommation validé', 'message' => 'Semaine 11 validée par DSGL', 'type' => 'etat', 'lu' => true]);
            Notification::create(['user_id' => $user->id, 'titre' => 'Alerte écart budgétaire', 'message' => 'Dépassement +12% sur les protéines', 'type' => 'devis', 'lu' => true]);
        }

        // --- Assigner formation_id à tous les enregistrements manquants ---
        foreach ([
            'menus',
            'menus_hebdomadaires',
            'commandes',
            'consommations',
            'consommation_articles',
            'devis_estimatifs',
            'regimes_speciaux',
            'notifications',
            'parametres',
        ] as $table) {
            \Illuminate\Support\Facades\DB::table($table)->whereNull('formation_id')->update(['formation_id' => $fid]);
        }
    }
}

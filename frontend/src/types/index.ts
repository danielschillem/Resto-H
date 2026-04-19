export interface User {
  id: number;
  nom: string;
  prenom: string;
  full_name: string;
  email: string;
  role:
    | "prestataire"
    | "dsgl"
    | "csah"
    | "sus"
    | "sut"
    | "nutritionniste"
    | "daf"
    | "super_admin";
  service: string | null;
  formation_id: number | null;
  is_active?: boolean;
  permissions?: string[];
  last_login_at?: string | null;
  last_login_ip?: string | null;
  must_change_password?: boolean;
}

export interface FormationSanitaire {
  id: number;
  nom: string;
  code: string;
  type: string;
  ville: string | null;
  region: string | null;
  telephone: string | null;
  email: string | null;
  directeur: string | null;
  is_active: boolean;
  nb_users: number;
  nb_services: number;
  users?: User[];
  licence_info?: {
    statut: "essai" | "premium" | "expire";
    date_fin: string;
    jours_restants: number;
    valide: boolean;
  };
}

export interface Service {
  id: number;
  nom: string;
  lits_actifs: number;
  responsable: string | null;
  is_active: boolean;
}

export interface Menu {
  id: number;
  intitule: string;
  type_repas: "petit_dejeuner" | "dejeuner" | "diner";
  portions_prevues: number;
  cout_unitaire: number;
  allergenes: string | null;
  notes_nutritionnelles: string | null;
}

export interface MenuHebdomadaireItem {
  id: number;
  menu_hebdomadaire_id: number;
  menu_id: number;
  jour_semaine: number;
  menu: Menu;
}

export interface MenuHebdomadaire {
  id: number;
  semaine_debut: string;
  semaine_fin: string;
  statut: "brouillon" | "soumis" | "valide" | "rejete";
  soumis_par: User | null;
  valide_par: User | null;
  date_soumission: string | null;
  date_validation: string | null;
  cout_matieres: number;
  cout_main_oeuvre: number;
  commentaire: string | null;
  items: MenuHebdomadaireItem[];
}

export interface RegimeSpecial {
  id: number;
  patient_nom: string;
  lit: string;
  service_id: number;
  service: Service;
  type_regime: string;
  date_debut: string;
  duree_jours: number;
  medecin_prescripteur: string;
  instructions: string | null;
  statut: "en_attente" | "valide" | "rejete" | "termine";
  motif_rejet: string | null;
}

export interface Commande {
  id: number;
  reference: string;
  type: "malades" | "personnel" | "client_externe";
  service_id: number;
  service: Service;
  date_repas: string;
  repas: "petit_dejeuner" | "dejeuner" | "diner";
  menu_id: number | null;
  menu: Menu | null;
  nb_portions: number;
  heure_livraison: string | null;
  montant: number;
  statut:
    | "en_attente"
    | "validee_sus"
    | "validee"
    | "en_cours"
    | "livree"
    | "rejetee";
  statut_paiement: "non_applicable" | "en_attente" | "paye";
  client_nom: string | null;
  observations: string | null;
  motif_rejet: string | null;
  soumis_par: User | null;
  valide_par: User | null;
  valide_sus_par: User | null;
  date_validation_sus: string | null;
  marche_id: number | null;
  marche: Marche | null;
  regimes_speciaux?: RegimeSpecial[];
}

export interface Consommation {
  id: number;
  date: string;
  repas: string;
  menu_servi: string;
  nb_malades: number;
  nb_personnel: number;
  nb_clients: number;
  total_portions: number;
  cout_prevu: number;
  cout_reel: number;
  ecart: number;
}

export interface KpiItem {
  icon: string;
  color: string;
  val: string | number;
  label: string;
  trend: "up" | "down";
  trendText: string;
}

export interface Notification {
  id: number;
  titre: string;
  message: string;
  lu: boolean;
  type: string | null;
  created_at: string;
}

export interface Parametre {
  id: number;
  cle: string;
  valeur: string;
  description: string | null;
}

export interface DevisEstimatif {
  id: number;
  reference?: string;
  semaine_debut: string;
  semaine_fin: string;
  statut: "brouillon" | "soumis" | "valide" | "rejete";
  total_estime: number;
  lignes: DevisLigne[];
  soumis_par: User | null;
  valide_par: User | null;
  date_soumission: string | null;
  date_validation: string | null;
  commentaire_rejet?: string;
}

export interface DevisLigne {
  id: number;
  article: string;
  unite: string;
  qte_estimee: number;
  prix_unitaire: number;
  montant_estime: number;
}

export interface ConsommationArticle {
  id: number;
  article: string;
  unite: string;
  qte_prevue: number;
  qte_reelle: number;
  ecart: number;
  cout_unitaire: number;
  cout_reel: number;
  semaine_debut: string;
  semaine_fin: string;
}

export interface NavItem {
  section?: string;
  id?: string;
  icon?: string;
  label?: string;
}

export interface Licence {
  statut: "essai" | "premium" | "expire";
  date_debut: string;
  date_fin: string;
  jours_restants: number;
  titulaire: string | null;
  valide: boolean;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  entity_label: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

// ── Hospitalisation ──────────────────────────────────────────────────────

export interface CategorieSalle {
  id: number;
  nom: string;
  nb_lits: number;
  commodites: string | null;
}

export interface Salle {
  id: number;
  numero: string;
  service_id: number;
  service: { id: number; nom: string } | null;
  categorie_id: number | null;
  categorie: { id: number; nom: string; nb_lits: number } | null;
  nb_lits: number;
  notes: string | null;
  is_active: boolean;
  lits: Lit[];
}

export interface Lit {
  id: number;
  numero: string;
  salle_id: number;
  salle?: { id: number; numero: string; service_id?: number };
  is_occupe: boolean;
  notes: string | null;
}

export interface Patient {
  id: number;
  nom: string;
  prenom: string | null;
  sexe: "M" | "F" | null;
  age: number | null;
  lit_id: number | null;
  lit: (Lit & { salle?: { id: number; numero: string } }) | null;
  service_id: number;
  service: { id: number; nom: string } | null;
  statut: "hospitalise" | "sorti" | "transfere";
  observations: string | null;
  created_at: string;
}

export interface Admission {
  id: number;
  patient_id: number;
  patient: { id: number; nom: string; prenom: string | null } | null;
  service_id: number;
  service: { id: number; nom: string } | null;
  lit_id: number | null;
  lit: (Lit & { salle?: { id: number; numero: string } }) | null;
  date_admission: string;
  date_sortie: string | null;
  motif: string | null;
  medecin_referent: string | null;
  observations: string | null;
  created_at: string;
}

export interface HospitalisationStats {
  total_salles: number;
  total_lits: number;
  lits_occupes: number;
  lits_libres: number;
  patients_hospitalises: number;
}

// ── Observatoire Nutritionniste ──────────────────────────────────────────

export interface ObservatoireData {
  kpis: {
    patients_hospitalises: number;
    regimes_actifs: number;
    portions_semaine: number;
    portions_evolution: number;
    cout_moyen_portion: number;
  };
  repartition_repas: ChartData;
  regimes_par_type: ChartData;
  portions_par_service: ChartData;
  evolution_hebdo: {
    labels: string[];
    portions: number[];
    couts: number[];
  };
}

export interface ChartData {
  labels: string[];
  data: number[];
}

export interface AnalyseMenu {
  menu: Menu | null;
  repas: string;
  total_portions: number;
  nb_commandes: number;
  cout_estime: number;
}

// ── Marchés & Budget ─────────────────────────────────────────────────────

export interface AnneeBudgetaire {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  is_active: boolean;
}

export interface Marche {
  id: number;
  reference: string;
  objet: string;
  fournisseur: string;
  montant_initial: number;
  montant_consomme: number;
  montant_restant: number;
  seuil_alerte: number;
  date_debut: string;
  date_fin: string;
  statut: "actif" | "epuise" | "cloture" | "suspendu";
  annee_budgetaire_id: number | null;
  annee_budgetaire: AnneeBudgetaire | null;
  pourcentage_consomme: number;
  en_alerte: boolean;
  commandes?: Commande[];
}

export interface MarcheKpis {
  total_marches: number;
  marches_actifs: number;
  marches_en_alerte: number;
  marches_epuises: number;
  montant_total: number;
  montant_consomme: number;
  montant_restant: number;
  taux_consommation: number;
  evolution_hebdo: { semaine: string; montant: number }[];
  alertes: {
    id: number;
    reference: string;
    objet: string;
    montant_restant: number;
    pourcentage_restant: number;
  }[];
}

export interface CoutsDesagreges {
  periode: { debut: string; fin: string };
  total_montant: number;
  total_portions: number;
  par_service: {
    service: string;
    nb_commandes: number;
    nb_portions: number;
    montant: number;
  }[];
  par_repas: {
    repas: string;
    nb_commandes: number;
    nb_portions: number;
    montant: number;
  }[];
  par_type: {
    type: string;
    nb_commandes: number;
    nb_portions: number;
    montant: number;
  }[];
}

// ── Liste Nominative ─────────────────────────────────────────────────────

export interface ListeNominativeItem {
  id: number;
  date: string;
  repas: string;
  patient_id: number;
  patient: {
    id: number;
    nom: string;
    prenom: string | null;
    sexe?: "M" | "F" | null;
    age?: number | null;
  } | null;
  service_id: number;
  service: { id: number; nom: string } | null;
  lit_id: number | null;
  lit: (Lit & { salle?: { id: number; numero: string } }) | null;
  regime: string | null;
  servi: boolean;
  observations: string | null;
  enregistre_par: User | null;
  commande_id: number | null;
}

export interface ListeNominativeResponse {
  items: ListeNominativeItem[];
  stats: {
    total_patients: number;
    servis: number;
    non_servis: number;
    par_regime: { regime: string; count: number }[];
  };
}

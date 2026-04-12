export interface User {
  id: number;
  nom: string;
  prenom: string;
  full_name: string;
  email: string;
  role: "prestataire" | "dsgl" | "csah" | "sus" | "sut" | "super_admin";
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
  statut: "en_attente" | "validee" | "en_cours" | "livree" | "rejetee";
  statut_paiement: "non_applicable" | "en_attente" | "paye";
  client_nom: string | null;
  observations: string | null;
  motif_rejet: string | null;
  soumis_par: User | null;
  valide_par: User | null;
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
  semaine_debut: string;
  semaine_fin: string;
  statut: "brouillon" | "soumis" | "valide" | "rejete";
  total_estime: number;
  lignes: DevisLigne[];
  soumis_par: User | null;
  valide_par: User | null;
  date_soumission: string | null;
  date_validation: string | null;
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

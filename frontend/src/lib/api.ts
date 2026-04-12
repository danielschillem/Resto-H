import { emitToast } from "@/components/Toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sgrh_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    emitToast("Erreur réseau — vérifiez votre connexion", "error");
    throw new Error("Erreur réseau");
  }

  if (res.status === 401) {
    localStorage.removeItem("sgrh_token");
    localStorage.removeItem("sgrh_user");
    window.location.href = "/login";
    throw new Error("Non authentifié");
  }

  if (res.status === 204) return null as T;

  if (res.status === 429) {
    emitToast("Trop de requêtes — veuillez patienter", "warning");
    throw new Error("Trop de requêtes");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message || `Erreur ${res.status}`;
    emitToast(msg, "error");
    throw new Error(msg);
  }

  return res.json();
}

// ── Public (no auth) ──────────────────────────────────────────────────────────
export function getFormationPublicInfo(code: string) {
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  return fetch(`${API_URL}/formations/public/${encodeURIComponent(code)}`, {
    headers: { Accept: "application/json" },
  }).then((r) => {
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("Erreur réseau");
    return r.json() as Promise<{
      id: number;
      nom: string;
      code: string;
      type: string;
      ville: string | null;
      region: string | null;
    }>;
  });
}

// Download file helper
async function downloadFile(path: string, filename: string): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = { Accept: "text/csv" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    emitToast("Erreur lors du téléchargement", "error");
    throw new Error("Export failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Auth
export const api = {
  login: (email: string, password: string, formation_code?: string) =>
    request<{ user: import("@/types").User; token: string }>("/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        ...(formation_code ? { formation_code } : {}),
      }),
    }),

  logout: () => request("/logout", { method: "POST" }),

  me: () => request<import("@/types").User>("/me"),

  // Profil & Mot de passe
  updateProfile: (data: { nom?: string; prenom?: string }) =>
    request<{ message: string; user: import("@/types").User }>("/me/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  changePassword: (data: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }) =>
    request<{ message: string }>("/me/password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Dashboard
  dashboard: () =>
    request<{
      kpis: import("@/types").KpiItem[];
      commandes_recentes: import("@/types").Commande[];
      chart_semaine: {
        labels: string[];
        malades: number[];
        personnel: number[];
        clients: number[];
      };
      repartition: { labels: string[]; data: number[] };
    }>("/dashboard"),

  // Menus
  menus: () => request<import("@/types").Menu[]>("/menus"),
  createMenu: (data: Record<string, unknown>) =>
    request<import("@/types").Menu>("/menus", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Menus Hebdomadaires
  menusHebdo: (params?: string) =>
    request<import("@/types").MenuHebdomadaire[]>(
      `/menus-hebdomadaires${params ? `?${params}` : ""}`,
    ),
  createMenuHebdo: (data: Record<string, unknown>) =>
    request<import("@/types").MenuHebdomadaire>("/menus-hebdomadaires", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  soumettreMenuHebdo: (id: number) =>
    request(`/menus-hebdomadaires/${id}/soumettre`, { method: "POST" }),
  validerMenuHebdo: (id: number) =>
    request(`/menus-hebdomadaires/${id}/valider`, { method: "POST" }),
  rejeterMenuHebdo: (id: number, commentaire: string) =>
    request(`/menus-hebdomadaires/${id}/rejeter`, {
      method: "POST",
      body: JSON.stringify({ commentaire }),
    }),
  addMenuHebdoItem: (hebdoId: number, menuId: number, jourSemaine: number) =>
    request<import("@/types").MenuHebdomadaireItem>(
      `/menus-hebdomadaires/${hebdoId}/items`,
      {
        method: "POST",
        body: JSON.stringify({ menu_id: menuId, jour_semaine: jourSemaine }),
      },
    ),

  // Commandes
  commandes: (params?: string) =>
    request<{
      data: import("@/types").Commande[];
      meta: { current_page: number; last_page: number; total: number };
    }>(`/commandes${params ? `?${params}` : ""}`),
  createCommande: (data: Record<string, unknown>) =>
    request<import("@/types").Commande>("/commandes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  showCommande: (id: number) =>
    request<import("@/types").Commande>(`/commandes/${id}`),
  commandesAValider: () =>
    request<import("@/types").Commande[]>("/commandes-a-valider"),
  validerCommande: (id: number) =>
    request(`/commandes/${id}/valider`, { method: "POST" }),
  rejeterCommande: (id: number, motif: string) =>
    request(`/commandes/${id}/rejeter`, {
      method: "POST",
      body: JSON.stringify({ motif_rejet: motif }),
    }),
  livrerCommande: (id: number) =>
    request(`/commandes/${id}/livrer`, { method: "POST" }),
  enregistrerPaiement: (id: number) =>
    request(`/commandes/${id}/paiement`, { method: "POST" }),

  // Régimes Spéciaux
  regimesSpeciaux: (params?: string) =>
    request<import("@/types").RegimeSpecial[]>(
      `/regimes-speciaux${params ? `?${params}` : ""}`,
    ),
  createRegime: (data: Record<string, unknown>) =>
    request<import("@/types").RegimeSpecial>("/regimes-speciaux", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  validerRegime: (id: number) =>
    request(`/regimes-speciaux/${id}/valider`, { method: "POST" }),
  rejeterRegime: (id: number, motif: string) =>
    request(`/regimes-speciaux/${id}/rejeter`, {
      method: "POST",
      body: JSON.stringify({ motif_rejet: motif }),
    }),
  updateRegime: (id: number, data: Record<string, unknown>) =>
    request<import("@/types").RegimeSpecial>(`/regimes-speciaux/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  terminerRegime: (id: number) =>
    request(`/regimes-speciaux/${id}/terminer`, { method: "POST" }),

  // Consommations
  consommations: (params?: string) =>
    request<{
      consommations: import("@/types").Consommation[];
      totaux: Record<string, number>;
    }>(`/consommations${params ? `?${params}` : ""}`),
  consoKpis: () => request("/consommations/kpis"),
  consoArticles: (params?: string) =>
    request<{
      articles: import("@/types").ConsommationArticle[];
      total: number;
    }>(`/consommations/articles${params ? `?${params}` : ""}`),
  ecartsServices: () =>
    request<{ labels: string[]; prevu: number[]; reel: number[] }>(
      "/consommations/ecarts-services",
    ),
  createConsommation: (data: Record<string, unknown>) =>
    request<import("@/types").Consommation>("/consommations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Etats
  etatCommandes: (params?: string) =>
    request(`/etats/commandes${params ? `?${params}` : ""}`),
  devis: (params?: string) =>
    request<import("@/types").DevisEstimatif[]>(
      `/etats/devis${params ? `?${params}` : ""}`,
    ),
  validerDevis: (id: number) =>
    request(`/etats/devis/${id}/valider`, { method: "POST" }),
  rejeterDevis: (id: number, commentaire: string) =>
    request(`/etats/devis/${id}/rejeter`, {
      method: "POST",
      body: JSON.stringify({ commentaire }),
    }),
  createDevis: (data: Record<string, unknown>) =>
    request<import("@/types").DevisEstimatif>("/etats/devis", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  validations: () => request("/etats/validations"),

  // Admin
  users: () => request<import("@/types").User[]>("/admin/users"),
  createUser: (data: Record<string, unknown>) =>
    request("/admin/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: number, data: Record<string, unknown>) =>
    request(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  services: () => request<import("@/types").Service[]>("/admin/services"),
  createService: (data: Record<string, unknown>) =>
    request("/admin/services", { method: "POST", body: JSON.stringify(data) }),
  updateService: (id: number, data: Record<string, unknown>) =>
    request(`/admin/services/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  parametres: () => request<import("@/types").Parametre[]>("/admin/parametres"),
  updateParametre: (id: number, valeur: string) =>
    request(`/admin/parametres/${id}`, {
      method: "PUT",
      body: JSON.stringify({ valeur }),
    }),
  adminPermissions: () =>
    request<{ all: string[]; grouped: Record<string, string[]> }>(
      "/admin/permissions",
    ),

  // Journal d'audit
  auditLogs: (params?: string) =>
    request<import("@/types").PaginatedResponse<import("@/types").AuditLog>>(
      `/admin/audit-logs${params ? `?${params}` : ""}`,
    ),

  // Exports (retournent des blobs)
  exportUsers: () => downloadFile("/admin/export/users", "utilisateurs.csv"),
  exportServices: () => downloadFile("/admin/export/services", "services.csv"),
  exportAuditLogs: (params?: string) =>
    downloadFile(
      `/admin/export/audit-logs${params ? `?${params}` : ""}`,
      "journal-audit.csv",
    ),

  // Opérations en masse
  bulkActivateUsers: (userIds: number[]) =>
    request<{ message: string; count: number }>("/admin/users/bulk-activate", {
      method: "POST",
      body: JSON.stringify({ user_ids: userIds }),
    }),
  bulkDeactivateUsers: (userIds: number[]) =>
    request<{ message: string; count: number }>(
      "/admin/users/bulk-deactivate",
      {
        method: "POST",
        body: JSON.stringify({ user_ids: userIds }),
      },
    ),

  // Notifications
  notifications: () =>
    request<{
      notifications: import("@/types").Notification[];
      unread_count: number;
    }>("/notifications"),
  marquerLu: (id: number) =>
    request(`/notifications/${id}/lu`, { method: "POST" }),
  toutMarquerLu: () => request("/notifications/tout-lire", { method: "POST" }),

  // Licence
  licence: (formationId?: number) =>
    request<import("@/types").Licence>(
      `/licence${formationId ? `?formation_id=${formationId}` : ""}`,
    ),
  activerLicence: (cle: string, titulaire?: string) =>
    request<{ message: string; date_fin: string; titulaire: string | null }>(
      "/licence/activer",
      {
        method: "POST",
        body: JSON.stringify({ cle, titulaire }),
      },
    ),

  // Super Admin
  saStats: () =>
    request<{
      total_formations: number;
      formations_actives: number;
      total_users: number;
      users_actifs: number;
      roles: Record<string, number>;
      licence_statut: string;
      licence_jours: number;
      licence_fin: string;
    }>("/super-admin/stats"),
  saUsers: () => request<import("@/types").User[]>("/super-admin/users"),
  saCreateUser: (data: Record<string, unknown>) =>
    request<import("@/types").User>("/super-admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  saUpdateUser: (id: number, data: Record<string, unknown>) =>
    request<import("@/types").User>(`/super-admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  saDeleteUser: (id: number) =>
    request(`/super-admin/users/${id}`, { method: "DELETE" }),
  saResetPassword: (id: number, password: string) =>
    request(`/super-admin/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  saPermissions: () =>
    request<{ all: string[]; grouped: Record<string, string[]> }>(
      "/super-admin/permissions",
    ),
  saUpdatePermissions: (role: string, permissions: string[]) =>
    request("/super-admin/permissions", {
      method: "POST",
      body: JSON.stringify({ role, permissions }),
    }),
  saLicence: () =>
    request<import("@/types").Licence & { cle_licence?: string }>(
      "/super-admin/licence",
    ),
  saFormationLicence: (formationId: number) =>
    request<import("@/types").Licence & { cle_licence?: string }>(
      `/super-admin/formations/${formationId}/licence`,
    ),
  saActiverLicence: (data: {
    cle: string;
    titulaire?: string;
    duree_ans?: number;
    formation_id: number;
  }) =>
    request("/super-admin/licence/activer", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  saResetEssai: (formationId: number) =>
    request("/super-admin/licence/reset", {
      method: "POST",
      body: JSON.stringify({ formation_id: formationId }),
    }),
  saGenererCle: () =>
    request<{ cle: string }>("/super-admin/licence/generer-cle"),
  // Formations sanitaires
  saFormations: () =>
    request<import("@/types").FormationSanitaire[]>("/super-admin/formations"),
  saCreateFormation: (data: Record<string, unknown>) =>
    request<import("@/types").FormationSanitaire>("/super-admin/formations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  saUpdateFormation: (id: number, data: Record<string, unknown>) =>
    request<import("@/types").FormationSanitaire>(
      `/super-admin/formations/${id}`,
      { method: "PUT", body: JSON.stringify(data) },
    ),
  saDeleteFormation: (id: number) =>
    request(`/super-admin/formations/${id}`, { method: "DELETE" }),
  saFormationUsers: (id: number) =>
    request<import("@/types").User[]>(`/super-admin/formations/${id}/users`),
  saCreateFormationUser: (formationId: number, data: Record<string, unknown>) =>
    request<import("@/types").User>(
      `/super-admin/formations/${formationId}/users`,
      { method: "POST", body: JSON.stringify(data) },
    ),

  // Super Admin — Audit & Exports
  saAuditLogs: (params?: string) =>
    request<import("@/types").PaginatedResponse<import("@/types").AuditLog>>(
      `/super-admin/audit-logs${params ? `?${params}` : ""}`,
    ),
  saExportUsers: () =>
    downloadFile("/super-admin/export/users", "utilisateurs.csv"),
  saExportFormations: () =>
    downloadFile("/super-admin/export/formations", "formations.csv"),
  saExportAuditLogs: (params?: string) =>
    downloadFile(
      `/super-admin/export/audit-logs${params ? `?${params}` : ""}`,
      "journal-audit.csv",
    ),

  // Super Admin — Analytics
  saAnalytics: (days?: number) =>
    request<{
      users_over_time: { date: string; total: number }[];
      commandes_over_time: { date: string; total: number; montant: number }[];
      consommations_over_time: {
        date: string;
        total: number;
        portions: number;
      }[];
      roles_distribution: Record<string, number>;
      total_commandes: number;
      total_montant: number;
      total_consommations: number;
      total_portions: number;
    }>(`/super-admin/analytics${days ? `?days=${days}` : ""}`),

  // Super Admin — Services
  saServices: () =>
    request<(import("@/types").Service & { commandes_count: number })[]>(
      "/super-admin/services",
    ),
  saCreateService: (data: Record<string, unknown>) =>
    request<import("@/types").Service>("/super-admin/services", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  saUpdateService: (id: number, data: Record<string, unknown>) =>
    request<import("@/types").Service>(`/super-admin/services/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  saDeleteService: (id: number) =>
    request(`/super-admin/services/${id}`, { method: "DELETE" }),

  // Super Admin — Bulk operations
  saBulkActivateUsers: (ids: number[]) =>
    request("/super-admin/users/bulk-activate", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  saBulkDeactivateUsers: (ids: number[]) =>
    request("/super-admin/users/bulk-deactivate", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  saBulkActivateFormations: (ids: number[]) =>
    request("/super-admin/formations/bulk-activate", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  saBulkDeactivateFormations: (ids: number[]) =>
    request("/super-admin/formations/bulk-deactivate", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),

  // Super Admin — System config
  saConfig: () => request<import("@/types").Parametre[]>("/super-admin/config"),
  saUpdateConfig: (configs: { cle: string; valeur: string }[]) =>
    request("/super-admin/config", {
      method: "POST",
      body: JSON.stringify({ configs }),
    }),
};

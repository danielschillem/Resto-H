"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Modal from "@/components/Modal";
import { User, Service, Parametre } from "@/types";
import { isEmailValid } from "@/lib/validation";

// ── Constantes ───────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { bg: string; color: string; label: string }> =
  {
    prestataire: { bg: "#DBEAFE", color: "#1E40AF", label: "Prestataire" },
    dsgl: { bg: "#EDE9FE", color: "#5B21B6", label: "DSGL" },
    csah: { bg: "#D1FAE5", color: "#065F46", label: "CSAH" },
    sus: { bg: "#FEF3C7", color: "#92400E", label: "SUS" },
    sut: { bg: "#FEF3C7", color: "#92400E", label: "SUT" },
  };

const PERM_LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  menus: "Menus",
  "menus.valider": "Valider menus",
  commandes: "Commandes",
  "commandes.valider": "Valider commandes",
  consommations: "Consommations",
  etats: "États & Rapports",
  "etats.valider": "Valider états",
  regimes: "Régimes spéciaux",
  "regimes.valider": "Valider régimes",
  admin: "Administration",
  licence: "Licence",
};

const TABS = [
  { id: "users", icon: "fa-users", label: "Utilisateurs" },
  { id: "services", icon: "fa-hospital", label: "Services" },
  { id: "params", icon: "fa-sliders", label: "Paramètres" },
  { id: "perms", icon: "fa-shield-halved", label: "Permissions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Composant principal ─────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<TabId>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [permAll, setPermAll] = useState<string[]>([]);
  const [permGrouped, setPermGrouped] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  // Recherche
  const [searchUser, setSearchUser] = useState("");
  const [searchService, setSearchService] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Modals utilisateurs
  const [userModal, setUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    role: "prestataire",
    service: "",
    password: "",
  });
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    role: "sus",
    service: "",
  });

  // Modals services
  const [serviceModal, setServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    nom: "",
    lits_actifs: 0,
    responsable: "",
  });
  const [editService, setEditService] = useState<Service | null>(null);
  const [editServiceForm, setEditServiceForm] = useState({
    nom: "",
    lits_actifs: 0,
    responsable: "",
  });

  // Modals paramètres
  const [editParam, setEditParam] = useState<{
    id: number;
    cle: string;
    valeur: string;
  } | null>(null);

  // ── Chargement ──────────────────────────────────────────────────────────────

  const load = () => {
    setLoading(true);
    Promise.all([
      api
        .users()
        .then(setUsers)
        .catch(() => {}),
      api
        .services()
        .then(setServices)
        .catch(() => {}),
      api
        .parametres()
        .then(setParametres)
        .catch(() => {}),
      api
        .adminPermissions()
        .then((d) => {
          setPermAll(d.all);
          setPermGrouped(d.grouped);
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  };
  useEffect(load, []);

  // ── Filtres ─────────────────────────────────────────────────────────────────

  const filteredUsers = users.filter((u) => {
    if (filterRole !== "all" && u.role !== filterRole) return false;
    if (filterActive === "active" && u.is_active === false) return false;
    if (filterActive === "inactive" && u.is_active !== false) return false;
    if (searchUser) {
      const q = searchUser.toLowerCase();
      const name = (u.full_name || `${u.prenom} ${u.nom}`).toLowerCase();
      return (
        name.includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredServices = services.filter((s) => {
    if (searchService) {
      const q = searchService.toLowerCase();
      return (
        s.nom.toLowerCase().includes(q) ||
        (s.responsable || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Handlers utilisateurs ──────────────────────────────────────────────────

  const handleCreateUser = async () => {
    if (!userForm.nom.trim()) return alert("Veuillez saisir le nom.");
    if (!userForm.prenom.trim()) return alert("Veuillez saisir le prénom.");
    if (!userForm.email.trim() || !isEmailValid(userForm.email))
      return alert("Veuillez saisir un email valide.");
    if (!userForm.password || userForm.password.length < 4)
      return alert("Le mot de passe doit contenir au moins 4 caractères.");
    await api.createUser(userForm);
    setUserModal(false);
    setUserForm({
      nom: "",
      prenom: "",
      email: "",
      role: "prestataire",
      service: "",
      password: "",
    });
    load();
  };

  const openEditUser = (u: User) => {
    setEditUserForm({ role: u.role, service: u.service || "" });
    setEditUser(u);
  };

  const handleEditUser = async () => {
    if (!editUser) return;
    await api.updateUser(editUser.id, editUserForm);
    setEditUser(null);
    load();
  };

  const handleToggleActive = async (u: User) => {
    await api.updateUser(u.id, { is_active: !u.is_active });
    load();
  };

  // ── Handlers services ──────────────────────────────────────────────────────

  const handleCreateService = async () => {
    if (!serviceForm.nom.trim())
      return alert("Veuillez saisir le nom du service.");
    if (Number(serviceForm.lits_actifs) < 0)
      return alert("Le nombre de lits ne peut pas être négatif.");
    await api.createService({
      ...serviceForm,
      lits_actifs: Number(serviceForm.lits_actifs),
    });
    setServiceModal(false);
    setServiceForm({ nom: "", lits_actifs: 0, responsable: "" });
    load();
  };

  const openEditService = (s: Service) => {
    setEditServiceForm({
      nom: s.nom,
      lits_actifs: s.lits_actifs || 0,
      responsable: s.responsable || "",
    });
    setEditService(s);
  };

  const handleEditService = async () => {
    if (!editService) return;
    await api.updateService(editService.id, {
      ...editServiceForm,
      lits_actifs: Number(editServiceForm.lits_actifs),
    });
    setEditService(null);
    load();
  };

  const handleToggleServiceActive = async (s: Service) => {
    await api.updateService(s.id, { is_active: !s.is_active });
    load();
  };

  // ── Handler paramètres ─────────────────────────────────────────────────────

  const handleUpdateParam = async (id: number, valeur: string) => {
    await api.updateParametre(id, valeur);
    load();
  };

  // ── KPI ─────────────────────────────────────────────────────────────────────

  const activeUsers = users.filter((u) => u.is_active !== false).length;
  const activeServices = services.filter((s) => s.is_active).length;
  const totalLits = services.reduce((sum, s) => sum + (s.lits_actifs || 0), 0);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
          color: "var(--text-sm)",
        }}
      >
        <i
          className="fa-solid fa-spinner fa-spin"
          style={{ fontSize: 28, marginRight: 12 }}
        />
        Chargement de l&apos;administration...
      </div>
    );
  }

  return (
    <>
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          <i
            className="fa-solid fa-gears"
            style={{ marginRight: 10, color: "var(--primary)" }}
          />
          Administration
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-sm)" }}>
          Gérez les utilisateurs, services hospitaliers, paramètres tarifaires
          et permissions du système.
        </p>
      </div>

      {/* ── KPI ───────────────────────────────────────────────────────────── */}
      <div className="grid-kpi" style={{ gap: 16, marginBottom: 24 }}>
        <StatCard
          icon="fa-users"
          iconBg="#DBEAFE"
          iconColor="var(--primary)"
          label="Utilisateurs"
          value={users.length}
          sub={`${activeUsers} actif${activeUsers > 1 ? "s" : ""}`}
        />
        <StatCard
          icon="fa-hospital"
          iconBg="#D1FAE5"
          iconColor="#065F46"
          label="Services"
          value={services.length}
          sub={`${activeServices} actif${activeServices > 1 ? "s" : ""}`}
        />
        <StatCard
          icon="fa-bed"
          iconBg="#FEF3C7"
          iconColor="#92400E"
          label="Lits actifs"
          value={totalLits}
          sub="capacité totale"
        />
        <StatCard
          icon="fa-sliders"
          iconBg="#EDE9FE"
          iconColor="#5B21B6"
          label="Paramètres"
          value={parametres.length}
          sub="tarifaires"
        />
      </div>

      {/* ── Onglets ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          borderBottom: "2px solid var(--border)",
          paddingBottom: 0,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              borderRadius: "8px 8px 0 0",
              background: tab === t.id ? "var(--primary)" : "transparent",
              color: tab === t.id ? "white" : "var(--text-sm)",
              transition: "all .15s",
              fontFamily: "inherit",
            }}
          >
            <i className={`fa-solid ${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Onglet Utilisateurs ────────────────────────────────────────────── */}
      {tab === "users" && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              <i
                className="fa-solid fa-users"
                style={{ marginRight: 8, color: "var(--primary)" }}
              />
              Utilisateurs du système
            </div>
            <button onClick={() => setUserModal(true)} style={btn}>
              <i className="fa-solid fa-user-plus" /> Nouvel utilisateur
            </button>
          </div>

          {/* Filtres */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <i
                className="fa-solid fa-search"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-sm)",
                  fontSize: 13,
                }}
              />
              <input
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Rechercher par nom, email..."
                style={{ ...inputStyle, paddingLeft: 36 }}
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{ ...inputStyle, width: "auto", minWidth: 130 }}
            >
              <option value="all">Tous les profils</option>
              {Object.entries(ROLE_BADGE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <select
              value={filterActive}
              onChange={(e) =>
                setFilterActive(e.target.value as "all" | "active" | "inactive")
              }
              style={{ ...inputStyle, width: "auto", minWidth: 130 }}
            >
              <option value="all">Tous statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>

          {/* Table */}
          {filteredUsers.length === 0 ? (
            <EmptyState
              icon="fa-users"
              text={
                searchUser || filterRole !== "all" || filterActive !== "all"
                  ? "Aucun utilisateur ne correspond aux critères"
                  : "Aucun utilisateur enregistré"
              }
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={thStyle}>Utilisateur</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Profil</th>
                    <th style={thStyle}>Service</th>
                    <th style={thStyle}>Statut</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const rb = ROLE_BADGE[u.role] || ROLE_BADGE.sus;
                    return (
                      <tr
                        key={u.id}
                        style={{ opacity: u.is_active !== false ? 1 : 0.6 }}
                      >
                        <td style={tdStyle}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: rb.bg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                fontSize: 13,
                                fontWeight: 700,
                                color: rb.color,
                              }}
                            >
                              {(u.prenom?.[0] || "").toUpperCase()}
                              {(u.nom?.[0] || "").toUpperCase()}
                            </div>
                            <b style={{ fontSize: 13 }}>
                              {u.full_name || `${u.prenom} ${u.nom}`}
                            </b>
                          </div>
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            fontSize: 12,
                            color: "var(--text-sm)",
                          }}
                        >
                          {u.email}
                        </td>
                        <td style={tdStyle}>
                          <Badge bg={rb.bg} color={rb.color}>
                            {rb.label}
                          </Badge>
                        </td>
                        <td style={tdStyle}>{u.service || "—"}</td>
                        <td style={tdStyle}>
                          <Badge
                            bg={u.is_active !== false ? "#D1FAE5" : "#F1F5F9"}
                            color={
                              u.is_active !== false ? "#065F46" : "#475569"
                            }
                          >
                            {u.is_active !== false ? "Actif" : "Inactif"}
                          </Badge>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              onClick={() => openEditUser(u)}
                              title="Modifier"
                              style={{
                                ...btnIcon,
                                color: "var(--primary)",
                                borderColor: "var(--primary)",
                              }}
                            >
                              <i className="fa-solid fa-pencil" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(u)}
                              title={
                                u.is_active !== false ? "Désactiver" : "Activer"
                              }
                              style={{
                                ...btnIcon,
                                color:
                                  u.is_active !== false
                                    ? "var(--danger)"
                                    : "var(--success)",
                                borderColor:
                                  u.is_active !== false
                                    ? "var(--danger)"
                                    : "var(--success)",
                              }}
                            >
                              <i
                                className={`fa-solid ${u.is_active !== false ? "fa-user-slash" : "fa-user-check"}`}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <TableFooter
            count={filteredUsers.length}
            total={users.length}
            label="utilisateur"
            hasFilter={
              !!(searchUser || filterRole !== "all" || filterActive !== "all")
            }
          />
        </div>
      )}

      {/* ── Onglet Services ────────────────────────────────────────────────── */}
      {tab === "services" && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              <i
                className="fa-solid fa-hospital"
                style={{ marginRight: 8, color: "#065F46" }}
              />
              Services hospitaliers
            </div>
            <button onClick={() => setServiceModal(true)} style={btn}>
              <i className="fa-solid fa-plus" /> Nouveau service
            </button>
          </div>

          {/* Recherche */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ position: "relative", maxWidth: 360 }}>
              <i
                className="fa-solid fa-search"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-sm)",
                  fontSize: 13,
                }}
              />
              <input
                value={searchService}
                onChange={(e) => setSearchService(e.target.value)}
                placeholder="Rechercher un service..."
                style={{ ...inputStyle, paddingLeft: 36 }}
              />
            </div>
          </div>

          {filteredServices.length === 0 ? (
            <EmptyState
              icon="fa-hospital"
              text={
                searchService
                  ? "Aucun service trouvé"
                  : "Aucun service enregistré"
              }
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={thStyle}>Service</th>
                    <th style={thStyle}>Lits actifs</th>
                    <th style={thStyle}>Responsable</th>
                    <th style={thStyle}>Statut</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((s) => (
                    <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.6 }}>
                      <td style={tdStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              background: s.is_active ? "#D1FAE5" : "#F1F5F9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <i
                              className="fa-solid fa-hospital"
                              style={{
                                fontSize: 14,
                                color: s.is_active ? "#065F46" : "#94A3B8",
                              }}
                            />
                          </div>
                          <b style={{ fontSize: 13 }}>{s.nom}</b>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <i
                            className="fa-solid fa-bed"
                            style={{ color: "var(--text-sm)", fontSize: 12 }}
                          />
                          {s.lits_actifs}
                        </span>
                      </td>
                      <td style={tdStyle}>{s.responsable || "—"}</td>
                      <td style={tdStyle}>
                        <Badge
                          bg={s.is_active ? "#D1FAE5" : "#F1F5F9"}
                          color={s.is_active ? "#065F46" : "#475569"}
                        >
                          {s.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => openEditService(s)}
                            title="Modifier"
                            style={{
                              ...btnIcon,
                              color: "var(--primary)",
                              borderColor: "var(--primary)",
                            }}
                          >
                            <i className="fa-solid fa-pencil" />
                          </button>
                          <button
                            onClick={() => handleToggleServiceActive(s)}
                            title={s.is_active ? "Désactiver" : "Activer"}
                            style={{
                              ...btnIcon,
                              color: s.is_active
                                ? "var(--danger)"
                                : "var(--success)",
                              borderColor: s.is_active
                                ? "var(--danger)"
                                : "var(--success)",
                            }}
                          >
                            <i
                              className={`fa-solid ${s.is_active ? "fa-toggle-off" : "fa-toggle-on"}`}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TableFooter
            count={filteredServices.length}
            total={services.length}
            label="service"
            hasFilter={!!searchService}
          />
        </div>
      )}

      {/* ── Onglet Paramètres ──────────────────────────────────────────────── */}
      {tab === "params" && (
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            <i
              className="fa-solid fa-sliders"
              style={{ marginRight: 8, color: "#5B21B6" }}
            />
            Paramètres tarifaires
          </div>
          <p
            style={{ fontSize: 12, color: "var(--text-sm)", marginBottom: 20 }}
          >
            Tarifs unitaires utilisés pour le calcul des coûts de restauration.
          </p>

          {parametres.length === 0 ? (
            <EmptyState icon="fa-sliders" text="Aucun paramètre configuré" />
          ) : (
            <div className="grid-3" style={{ gap: 16 }}>
              {parametres.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "#F8FAFC",
                    borderRadius: 12,
                    padding: 18,
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-sm)",
                      marginBottom: 6,
                      fontWeight: 500,
                    }}
                  >
                    {p.description || p.cle}
                  </div>
                  <div
                    style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}
                  >
                    {Number(p.valeur).toLocaleString("fr-FR")}{" "}
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text-sm)",
                      }}
                    >
                      FCFA
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setEditParam({ id: p.id, cle: p.cle, valeur: p.valeur })
                    }
                    style={{
                      ...btn,
                      background: "transparent",
                      color: "var(--primary)",
                      border: "1.5px solid var(--primary)",
                      padding: "5px 10px",
                      fontSize: 11,
                    }}
                  >
                    <i className="fa-solid fa-pencil" /> Modifier
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Permissions ─────────────────────────────────────────────── */}
      {tab === "perms" && permAll.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            <i
              className="fa-solid fa-shield-halved"
              style={{ marginRight: 8, color: "var(--primary)" }}
            />
            Matrice des permissions
          </div>
          <p
            style={{ fontSize: 12, color: "var(--text-sm)", marginBottom: 20 }}
          >
            Aperçu des accès par rôle — modifiable par le super-administrateur.
          </p>

          <div style={{ overflowX: "auto" }}>
            <table style={{ ...tableStyle, minWidth: 600 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={{ ...thStyle, width: 200 }}>Permission</th>
                  {Object.entries(ROLE_BADGE).map(([r, meta]) => (
                    <th
                      key={r}
                      style={{
                        ...thStyle,
                        textAlign: "center",
                        color: meta.color,
                      }}
                    >
                      {meta.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permAll.map((perm) => (
                  <tr key={perm}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>
                      <i
                        className="fa-solid fa-lock"
                        style={{
                          marginRight: 8,
                          fontSize: 11,
                          color: "var(--text-sm)",
                        }}
                      />
                      {PERM_LABELS[perm] || perm}
                    </td>
                    {Object.keys(ROLE_BADGE).map((r) => (
                      <td key={r} style={{ ...tdStyle, textAlign: "center" }}>
                        {(permGrouped[r] || []).includes(perm) ? (
                          <i
                            className="fa-solid fa-circle-check"
                            style={{ color: "var(--success)", fontSize: 16 }}
                          />
                        ) : (
                          <i
                            className="fa-solid fa-circle-xmark"
                            style={{ color: "#CBD5E1", fontSize: 16 }}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "perms" && permAll.length === 0 && (
        <div style={card}>
          <EmptyState
            icon="fa-shield-halved"
            text="Aucune permission configurée"
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
         ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Créer utilisateur ──────────────────────────────────────────────── */}
      <Modal
        open={userModal}
        onClose={() => setUserModal(false)}
        title="Nouvel utilisateur"
        icon="fa-user-plus"
        maxWidth={520}
        footer={
          <>
            <button onClick={() => setUserModal(false)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleCreateUser} style={btn}>
              <i className="fa-solid fa-check" /> Créer
            </button>
          </>
        }
      >
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nom</label>
            <input
              value={userForm.nom}
              onChange={(e) =>
                setUserForm({ ...userForm, nom: e.target.value })
              }
              placeholder="Nom de famille"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Prénom</label>
            <input
              value={userForm.prenom}
              onChange={(e) =>
                setUserForm({ ...userForm, prenom: e.target.value })
              }
              placeholder="Prénom"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={userForm.email}
            onChange={(e) =>
              setUserForm({ ...userForm, email: e.target.value })
            }
            placeholder="email@chr-tenkodogo.bf"
            style={inputStyle}
          />
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Profil</label>
            <select
              value={userForm.role}
              onChange={(e) =>
                setUserForm({ ...userForm, role: e.target.value })
              }
              style={inputStyle}
            >
              {Object.entries(ROLE_BADGE).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Service</label>
            <input
              value={userForm.service}
              onChange={(e) =>
                setUserForm({ ...userForm, service: e.target.value })
              }
              placeholder="Ex: Restauration"
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Code d&apos;accès</label>
          <input
            type="password"
            value={userForm.password}
            onChange={(e) =>
              setUserForm({ ...userForm, password: e.target.value })
            }
            placeholder="Définir un code (min. 4 caractères)"
            style={inputStyle}
          />
        </div>
      </Modal>

      {/* ── Modifier utilisateur ───────────────────────────────────────────── */}
      <Modal
        open={editUser !== null}
        onClose={() => setEditUser(null)}
        title="Modifier l'utilisateur"
        icon="fa-user-pen"
        maxWidth={440}
        footer={
          <>
            <button onClick={() => setEditUser(null)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleEditUser} style={btn}>
              <i className="fa-solid fa-check" /> Enregistrer
            </button>
          </>
        }
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: "#F8FAFC",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: ROLE_BADGE[editUser?.role || "sus"]?.bg || "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              color: ROLE_BADGE[editUser?.role || "sus"]?.color,
            }}
          >
            {(editUser?.prenom?.[0] || "").toUpperCase()}
            {(editUser?.nom?.[0] || "").toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {editUser?.full_name || `${editUser?.prenom} ${editUser?.nom}`}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-sm)" }}>
              {editUser?.email}
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Profil</label>
          <select
            value={editUserForm.role}
            onChange={(e) =>
              setEditUserForm({ ...editUserForm, role: e.target.value })
            }
            style={inputStyle}
          >
            {Object.entries(ROLE_BADGE).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Service</label>
          <input
            value={editUserForm.service}
            onChange={(e) =>
              setEditUserForm({ ...editUserForm, service: e.target.value })
            }
            placeholder="Ex: Restauration"
            style={inputStyle}
          />
        </div>
      </Modal>

      {/* ── Modifier paramètre ─────────────────────────────────────────────── */}
      <Modal
        open={editParam !== null}
        onClose={() => setEditParam(null)}
        title="Modifier le paramètre"
        icon="fa-sliders"
        maxWidth={400}
        footer={
          <>
            <button onClick={() => setEditParam(null)} style={btnSecondary}>
              Annuler
            </button>
            <button
              onClick={async () => {
                if (!editParam) return;
                await handleUpdateParam(editParam.id, editParam.valeur);
                setEditParam(null);
              }}
              style={btn}
            >
              <i className="fa-solid fa-check" /> Enregistrer
            </button>
          </>
        }
      >
        <div>
          <label style={labelStyle}>{editParam?.cle}</label>
          <input
            type="number"
            value={editParam?.valeur ?? ""}
            onChange={(e) =>
              setEditParam((prev) =>
                prev ? { ...prev, valeur: e.target.value } : null,
              )
            }
            style={inputStyle}
          />
          <p style={{ fontSize: 11, color: "var(--text-sm)", marginTop: 6 }}>
            Valeur en FCFA
          </p>
        </div>
      </Modal>

      {/* ── Créer service ──────────────────────────────────────────────────── */}
      <Modal
        open={serviceModal}
        onClose={() => setServiceModal(false)}
        title="Nouveau service hospitalier"
        icon="fa-hospital"
        maxWidth={440}
        footer={
          <>
            <button onClick={() => setServiceModal(false)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleCreateService} style={btn}>
              <i className="fa-solid fa-check" /> Créer
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nom du service</label>
          <input
            value={serviceForm.nom}
            onChange={(e) =>
              setServiceForm({ ...serviceForm, nom: e.target.value })
            }
            placeholder="Ex: Pédiatrie"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nombre de lits actifs</label>
          <input
            type="number"
            min={0}
            value={serviceForm.lits_actifs}
            onChange={(e) =>
              setServiceForm({
                ...serviceForm,
                lits_actifs: Number(e.target.value),
              })
            }
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Responsable</label>
          <input
            value={serviceForm.responsable}
            onChange={(e) =>
              setServiceForm({ ...serviceForm, responsable: e.target.value })
            }
            placeholder="Nom du responsable"
            style={inputStyle}
          />
        </div>
      </Modal>

      {/* ── Modifier service ───────────────────────────────────────────────── */}
      <Modal
        open={editService !== null}
        onClose={() => setEditService(null)}
        title="Modifier le service"
        icon="fa-hospital"
        maxWidth={440}
        footer={
          <>
            <button onClick={() => setEditService(null)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleEditService} style={btn}>
              <i className="fa-solid fa-check" /> Enregistrer
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nom du service</label>
          <input
            value={editServiceForm.nom}
            onChange={(e) =>
              setEditServiceForm({ ...editServiceForm, nom: e.target.value })
            }
            placeholder="Ex: Pédiatrie"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nombre de lits actifs</label>
          <input
            type="number"
            min={0}
            value={editServiceForm.lits_actifs}
            onChange={(e) =>
              setEditServiceForm({
                ...editServiceForm,
                lits_actifs: Number(e.target.value),
              })
            }
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Responsable</label>
          <input
            value={editServiceForm.responsable}
            onChange={(e) =>
              setEditServiceForm({
                ...editServiceForm,
                responsable: e.target.value,
              })
            }
            placeholder="Nom du responsable"
            style={inputStyle}
          />
        </div>
      </Modal>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Sous-composants
// ══════════════════════════════════════════════════════════════════════════════

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <i
          className={`fa-solid ${icon}`}
          style={{ fontSize: 18, color: iconColor }}
        />
      </div>
      <div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-sm)",
            textTransform: "uppercase",
            letterSpacing: ".5px",
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-sm)", marginTop: 2 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function Badge({
  bg,
  color,
  children,
}: {
  bg: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      {children}
    </span>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: "center", padding: 40, color: "var(--text-sm)" }}>
      <i
        className={`fa-solid ${icon}`}
        style={{
          fontSize: 28,
          marginBottom: 8,
          display: "block",
          opacity: 0.3,
        }}
      />
      {text}
    </div>
  );
}

function TableFooter({
  count,
  total,
  label,
  hasFilter,
}: {
  count: number;
  total: number;
  label: string;
  hasFilter: boolean;
}) {
  if (count === 0) return null;
  return (
    <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-sm)" }}>
      {count} {label}
      {count > 1 ? "s" : ""} affiché{count > 1 ? "s" : ""}
      {hasFilter && ` sur ${total}`}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "white",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  padding: 20,
  marginBottom: 16,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  padding: "11px 14px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-sm)",
  textTransform: "uppercase",
  letterSpacing: ".5px",
  borderBottom: "1px solid var(--border)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #F1F5F9",
  fontSize: 13,
  verticalAlign: "middle",
};

const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 14px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  background: "var(--primary)",
  color: "white",
  fontFamily: "inherit",
};

const btnSecondary: React.CSSProperties = {
  ...btn,
  background: "var(--border)",
  color: "var(--text)",
};

const btnIcon: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: 8,
  fontSize: 12,
  cursor: "pointer",
  background: "transparent",
  border: "1.5px solid",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 500,
  marginBottom: 6,
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid var(--border)",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
};

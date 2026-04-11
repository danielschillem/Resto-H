"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { User, Licence, AuditLog, Service, Parametre } from "@/types";

/* ── Palette claire ─────────────────────────────────────────────────────────── */
const C = {
  bg: "#f8fafc",
  card: "#ffffff",
  cardBorder: "#e2e8f0",
  text: "#1e293b",
  textSm: "#64748b",
  textXs: "#94a3b8",
  input: "#f1f5f9",
  inputBorder: "#cbd5e1",
  primary: "#2563eb",
  primaryLight: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
  topbar: "#ffffff",
  topbarBorder: "#e2e8f0",
  tagBg: (color: string) => color + "14",
};
const card: React.CSSProperties = {
  background: C.card,
  borderRadius: 12,
  border: `1px solid ${C.cardBorder}`,
  padding: 24,
  marginBottom: 16,
};
const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "8px 16px",
  borderRadius: 7,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  border: "none",
  fontFamily: "inherit",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: C.input,
  border: `1px solid ${C.inputBorder}`,
  borderRadius: 7,
  fontSize: 13,
  color: C.text,
  fontFamily: "inherit",
  outline: "none",
};
const ROLE_LABELS: Record<string, string> = {
  prestataire: "Prestataire",
  dsgl: "DSGL",
  csah: "CSAH",
  sus: "SUS",
  sut: "SUT",
  super_admin: "Super Admin",
};
const ROLE_COLORS: Record<string, string> = {
  prestataire: "#3B82F6",
  dsgl: "#8B5CF6",
  csah: "#10B981",
  sus: "#F59E0B",
  sut: "#F59E0B",
  super_admin: "#EF4444",
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
const ACTION_LABELS: Record<string, string> = {
  creation: "Création",
  modification: "Modification",
  suppression: "Suppression",
  validation: "Validation",
  rejet: "Rejet",
  connexion: "Connexion",
  deconnexion: "Déconnexion",
};

const thStyle: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  color: C.textSm,
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: ".5px",
};
const tdStyle: React.CSSProperties = { padding: "12px 16px", fontSize: 13 };
const labelSm: React.CSSProperties = {
  color: C.textSm,
  fontSize: 11,
  display: "block",
  marginBottom: 4,
};

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: C.card,
          borderRadius: 14,
          padding: 32,
          width: 440,
          border: `1px solid ${C.cardBorder}`,
          boxShadow: "0 20px 60px rgba(0,0,0,.12)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Stats Bar ──────────────────────────────────────────────────────────────── */
function StatsBar({ stats }: { stats: StatsData | null }) {
  if (!stats) return null;
  const items = [
    {
      label: "Utilisateurs",
      val: stats.total_users,
      icon: "fa-users",
      color: C.primary,
    },
    {
      label: "Actifs",
      val: stats.users_actifs,
      icon: "fa-user-check",
      color: C.success,
    },
    {
      label: "Formations",
      val: stats.total_formations ?? 0,
      icon: "fa-hospital",
      color: C.purple,
    },
    {
      label: "Formations actives",
      val: stats.formations_actives ?? 0,
      icon: "fa-hospital-user",
      color: C.cyan,
    },
    {
      label: "Licence",
      val:
        stats.licence_statut === "premium"
          ? "Premium"
          : stats.licence_statut === "essai"
            ? "Essai"
            : "Expirée",
      icon: "fa-crown",
      color: stats.licence_statut === "premium" ? C.warning : C.danger,
    },
    {
      label: "Jours restants",
      val: stats.licence_jours,
      icon: "fa-clock",
      color: C.purple,
    },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
        marginBottom: 24,
      }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            ...card,
            marginBottom: 0,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: C.tagBg(it.color),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i
              className={`fa-solid ${it.icon}`}
              style={{ color: it.color, fontSize: 16 }}
            />
          </div>
          <div>
            <div
              style={{
                color: C.textSm,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: ".5px",
              }}
            >
              {it.label}
            </div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: 18 }}>
              {it.val}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Utilisateurs ──────────────────────────────────────────────────────── */
function TabUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showReset, setShowReset] = useState<User | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    role: "sus",
    service: "",
  });
  const [editForm, setEditForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    role: "sus",
    service: "",
    is_active: true,
  });

  const load = useCallback(() => {
    api
      .saUsers()
      .then(setUsers)
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const filtered = users.filter((u) =>
    `${u.nom} ${u.prenom} ${u.email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const handleCreate = async () => {
    if (!form.nom.trim() || !form.prenom.trim())
      return alert("Nom et prénom requis.");
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return alert("Email invalide.");
    if (!form.password || form.password.length < 4)
      return alert("Mot de passe ≥ 4 caractères.");
    await api.saCreateUser({ ...form });
    setShowForm(false);
    setForm({
      nom: "",
      prenom: "",
      email: "",
      password: "",
      role: "sus",
      service: "",
    });
    load();
  };
  const handleEdit = async () => {
    if (!editUser) return;
    await api.saUpdateUser(editUser.id, editForm);
    setEditUser(null);
    load();
  };
  const handleDelete = async (u: User) => {
    if (!confirm(`Supprimer ${u.prenom} ${u.nom} ?`)) return;
    await api.saDeleteUser(u.id);
    load();
  };
  const handleReset = async () => {
    if (!showReset) return;
    await api.saResetPassword(showReset.id, newPwd);
    setShowReset(null);
    setNewPwd("");
  };
  const openEdit = (u: User) => {
    setEditForm({
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      role: u.role,
      service: u.service || "",
      is_active: u.is_active ?? true,
    });
    setEditUser(u);
  };

  const toggleSelect = (id: number) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  const toggleAll = () =>
    setSelected((s) =>
      s.length === filtered.length ? [] : filtered.map((u) => u.id),
    );
  const handleBulk = async (activate: boolean) => {
    if (!selected.length) return;
    if (activate) await api.saBulkActivateUsers(selected);
    else await api.saBulkDeactivateUsers(selected);
    setSelected([]);
    load();
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un utilisateur…"
          style={{ ...inputStyle, width: 280 }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selected.length > 0 && (
            <>
              <span style={{ fontSize: 12, color: C.textSm }}>
                {selected.length} sélectionné(s)
              </span>
              <button
                onClick={() => handleBulk(true)}
                style={{
                  ...btn,
                  padding: "6px 12px",
                  background: "#ecfdf5",
                  color: C.success,
                  fontSize: 12,
                }}
              >
                <i className="fa-solid fa-check" /> Activer
              </button>
              <button
                onClick={() => handleBulk(false)}
                style={{
                  ...btn,
                  padding: "6px 12px",
                  background: "#fef2f2",
                  color: C.danger,
                  fontSize: 12,
                }}
              >
                <i className="fa-solid fa-ban" /> Désactiver
              </button>
            </>
          )}
          <button
            onClick={() => api.saExportUsers()}
            style={{ ...btn, background: C.input, color: C.textSm }}
          >
            <i className="fa-solid fa-download" /> CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            style={{ ...btn, background: C.primary, color: "white" }}
          >
            <i className="fa-solid fa-plus" /> Nouvel utilisateur
          </button>
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
              <th style={{ ...thStyle, width: 40 }}>
                <input
                  type="checkbox"
                  checked={
                    selected.length === filtered.length && filtered.length > 0
                  }
                  onChange={toggleAll}
                />
              </th>
              {[
                "Utilisateur",
                "Email",
                "Rôle",
                "Service",
                "Statut",
                "Actions",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.input}` }}>
                <td style={tdStyle}>
                  <input
                    type="checkbox"
                    checked={selected.includes(u.id)}
                    onChange={() => toggleSelect(u.id)}
                  />
                </td>
                <td style={{ ...tdStyle, color: C.text, fontWeight: 500 }}>
                  {u.prenom} {u.nom}
                </td>
                <td style={{ ...tdStyle, color: C.textSm }}>{u.email}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      background: C.tagBg(ROLE_COLORS[u.role]),
                      color: ROLE_COLORS[u.role],
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: C.textSm }}>
                  {u.service || "—"}
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      color: u.is_active ? C.success : C.danger,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <i
                      className={`fa-solid fa-circle${u.is_active ? "" : "-xmark"}`}
                      style={{ marginRight: 4 }}
                    />
                    {u.is_active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => openEdit(u)}
                      style={{
                        ...btn,
                        padding: "5px 10px",
                        background: C.input,
                        color: C.textSm,
                      }}
                      title="Modifier"
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button
                      onClick={() => setShowReset(u)}
                      style={{
                        ...btn,
                        padding: "5px 10px",
                        background: "#fefce8",
                        color: C.warning,
                      }}
                      title="Reset MDP"
                    >
                      <i className="fa-solid fa-key" />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      style={{
                        ...btn,
                        padding: "5px 10px",
                        background: "#fef2f2",
                        color: C.danger,
                      }}
                      title="Supprimer"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: 24, textAlign: "center", color: C.textSm }}
                >
                  Aucun utilisateur
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3
            style={{
              color: C.text,
              marginBottom: 20,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Nouvel utilisateur
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(
              [
                ["nom", "Nom"],
                ["prenom", "Prénom"],
                ["email", "Email"],
                ["service", "Service"],
              ] as const
            ).map(([k, l]) => (
              <div key={k}>
                <label style={labelSm}>{l}</label>
                <input
                  value={(form as Record<string, string>)[k]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [k]: e.target.value }))
                  }
                  style={inputStyle}
                />
              </div>
            ))}
            <div>
              <label style={labelSm}>Mot de passe</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Rôle</label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
                style={inputStyle}
              >
                {["prestataire", "dsgl", "csah", "sus", "sut"].map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={handleCreate}
              style={{
                ...btn,
                background: C.primary,
                color: "white",
                flex: 1,
                justifyContent: "center",
              }}
            >
              Créer
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                ...btn,
                background: C.input,
                color: C.textSm,
                flex: 1,
                justifyContent: "center",
              }}
            >
              Annuler
            </button>
          </div>
        </Modal>
      )}

      {editUser && (
        <Modal onClose={() => setEditUser(null)}>
          <h3
            style={{
              color: C.text,
              marginBottom: 20,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Modifier {editUser.prenom} {editUser.nom}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(
              [
                ["nom", "Nom"],
                ["prenom", "Prénom"],
                ["email", "Email"],
                ["service", "Service"],
              ] as const
            ).map(([k, l]) => (
              <div key={k}>
                <label style={labelSm}>{l}</label>
                <input
                  value={
                    (editForm as Record<string, string | boolean>)[k] as string
                  }
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, [k]: e.target.value }))
                  }
                  style={inputStyle}
                />
              </div>
            ))}
            <div>
              <label style={labelSm}>Rôle</label>
              <select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, role: e.target.value }))
                }
                style={inputStyle}
              >
                {["prestataire", "dsgl", "csah", "sus", "sut"].map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: C.textSm,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, is_active: e.target.checked }))
                }
              />{" "}
              Compte actif
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={handleEdit}
              style={{
                ...btn,
                background: C.primary,
                color: "white",
                flex: 1,
                justifyContent: "center",
              }}
            >
              Enregistrer
            </button>
            <button
              onClick={() => setEditUser(null)}
              style={{
                ...btn,
                background: C.input,
                color: C.textSm,
                flex: 1,
                justifyContent: "center",
              }}
            >
              Annuler
            </button>
          </div>
        </Modal>
      )}

      {showReset && (
        <Modal onClose={() => setShowReset(null)}>
          <h3
            style={{
              color: C.text,
              marginBottom: 16,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Réinitialiser le mot de passe
          </h3>
          <p style={{ color: C.textSm, fontSize: 13, marginBottom: 16 }}>
            {showReset.prenom} {showReset.nom}
          </p>
          <input
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder="Nouveau mot de passe"
            style={{ ...inputStyle, marginBottom: 16 }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleReset}
              style={{
                ...btn,
                background: C.warning,
                color: "#111",
                flex: 1,
                justifyContent: "center",
              }}
            >
              Réinitialiser
            </button>
            <button
              onClick={() => setShowReset(null)}
              style={{
                ...btn,
                background: C.input,
                color: C.textSm,
                flex: 1,
                justifyContent: "center",
              }}
            >
              Annuler
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Tab: Permissions ───────────────────────────────────────────────────────── */
function TabPermissions() {
  const [allPerms, setAllPerms] = useState<string[]>([]);
  const [grouped, setGrouped] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api
      .saPermissions()
      .then((d) => {
        setAllPerms(d.all);
        setGrouped(d.grouped);
      })
      .catch(() => {});
  }, []);

  const toggle = (role: string, perm: string) => {
    const current = grouped[role] || [];
    setGrouped((g) => ({
      ...g,
      [role]: current.includes(perm)
        ? current.filter((p) => p !== perm)
        : [...current, perm],
    }));
  };
  const save = async (role: string) => {
    setSaving(role);
    try {
      await api.saUpdatePermissions(role, grouped[role] || []);
    } finally {
      setSaving(null);
    }
  };
  const roles = ["prestataire", "dsgl", "csah", "sus", "sut"];

  return (
    <div>
      <p style={{ color: C.textSm, fontSize: 13, marginBottom: 20 }}>
        Configurez les fonctionnalités accessibles pour chaque rôle.
      </p>
      <div style={{ ...card, overflow: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}
        >
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
              <th style={{ ...thStyle, width: 180 }}>Permission</th>
              {roles.map((r) => (
                <th
                  key={r}
                  style={{
                    ...thStyle,
                    textAlign: "center",
                    color: ROLE_COLORS[r],
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPerms.map((perm) => (
              <tr key={perm} style={{ borderBottom: `1px solid ${C.input}` }}>
                <td style={{ ...tdStyle, color: C.text }}>
                  {PERM_LABELS[perm] || perm}
                </td>
                {roles.map((r) => (
                  <td key={r} style={{ ...tdStyle, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={(grouped[r] || []).includes(perm)}
                      onChange={() => toggle(r, perm)}
                      style={{
                        width: 16,
                        height: 16,
                        cursor: "pointer",
                        accentColor: ROLE_COLORS[r],
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
        {roles.map((r) => (
          <button
            key={r}
            onClick={() => save(r)}
            disabled={saving === r}
            style={{
              ...btn,
              background: C.tagBg(ROLE_COLORS[r]),
              color: ROLE_COLORS[r],
              border: `1px solid ${ROLE_COLORS[r]}33`,
            }}
          >
            {saving === r ? (
              <i className="fa-solid fa-spinner fa-spin" />
            ) : (
              <i className="fa-solid fa-floppy-disk" />
            )}{" "}
            Sauver {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Tab: Licence ───────────────────────────────────────────────────────────── */
function TabLicence() {
  const [licence, setLicence] = useState<
    (Licence & { cle_licence?: string }) | null
  >(null);
  const [cle, setCle] = useState("");
  const [titulaire, setTitulaire] = useState("");
  const [duree, setDuree] = useState(1);
  const [generatedKey, setGeneratedKey] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = () => {
    api
      .saLicence()
      .then(setLicence)
      .catch(() => {});
  };
  useEffect(load, []);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const STATUS_CFG: Record<
    string,
    { bg: string; border: string; color: string; label: string }
  > = {
    essai: {
      bg: "#fffbeb",
      border: "#fde68a",
      color: "#92400e",
      label: "Période d'essai",
    },
    premium: {
      bg: "#ecfdf5",
      border: "#6ee7b7",
      color: "#065f46",
      label: "Premium actif",
    },
    expire: {
      bg: "#fef2f2",
      border: "#fca5a5",
      color: "#991b1b",
      label: "Expirée",
    },
  };
  const sc = licence ? STATUS_CFG[licence.statut] || STATUS_CFG.expire : null;

  const handleActiver = async () => {
    setErr("");
    setMsg("");
    try {
      await api.saActiverLicence({
        cle: cle.trim().toUpperCase(),
        titulaire: titulaire || undefined,
        duree_ans: duree,
      });
      setMsg("Licence activée avec succès !");
      setCle("");
      load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erreur");
    }
  };
  const handleReset = async () => {
    if (!confirm("Réinitialiser en mode essai 14 jours ?")) return;
    await api.saResetEssai();
    load();
  };
  const handleGenerer = async () => {
    const r = await api.saGenererCle();
    setGeneratedKey(r.cle);
    setCle(r.cle);
  };

  return (
    <div style={{ maxWidth: 640 }}>
      {licence && sc && (
        <div
          style={{
            ...card,
            background: sc.bg,
            border: `1px solid ${sc.border}`,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  color: C.textSm,
                  fontSize: 11,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Statut
              </div>
              <span
                style={{
                  background: sc.color + "14",
                  color: sc.color,
                  padding: "4px 14px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {sc.label}
              </span>
            </div>
            {licence.titulaire && (
              <div style={{ textAlign: "right" }}>
                <div style={{ color: C.textSm, fontSize: 11 }}>Titulaire</div>
                <div style={{ color: C.text, fontWeight: 600 }}>
                  {licence.titulaire}
                </div>
              </div>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 12,
            }}
          >
            {[
              ["Date début", fmtDate(licence.date_debut)],
              ["Expire le", fmtDate(licence.date_fin)],
              ["Jours restants", String(licence.jours_restants)],
            ].map(([l, v]) => (
              <div
                key={l}
                style={{
                  background: C.card,
                  borderRadius: 8,
                  padding: "12px 14px",
                  border: `1px solid ${C.cardBorder}`,
                }}
              >
                <div style={{ color: C.textSm, fontSize: 11, marginBottom: 4 }}>
                  {l}
                </div>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
          {licence.cle_licence && (
            <div
              style={{
                marginTop: 12,
                background: C.input,
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <div style={{ color: C.textSm, fontSize: 11, marginBottom: 4 }}>
                Clé active
              </div>
              <code
                style={{ color: C.success, fontSize: 13, letterSpacing: 1 }}
              >
                {licence.cle_licence}
              </code>
            </div>
          )}
        </div>
      )}

      <div style={card}>
        <h4
          style={{
            color: C.text,
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <i
            className="fa-solid fa-crown"
            style={{ marginRight: 8, color: C.warning }}
          />
          Activer une licence premium
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={cle}
              onChange={(e) => setCle(e.target.value.toUpperCase())}
              placeholder="RESTO-XXXX-XXXX-XXXX-XXXX"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={handleGenerer}
              style={{
                ...btn,
                background: C.input,
                color: C.textSm,
                whiteSpace: "nowrap",
              }}
            >
              <i className="fa-solid fa-wand-magic-sparkles" /> Générer
            </button>
          </div>
          {generatedKey && (
            <div
              style={{
                background: "#ecfdf5",
                borderRadius: 8,
                padding: "10px 14px",
                color: C.success,
                fontSize: 13,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <code style={{ letterSpacing: 1 }}>{generatedKey}</code>
              <button
                onClick={() => navigator.clipboard.writeText(generatedKey)}
                style={{
                  ...btn,
                  padding: "4px 10px",
                  background: C.input,
                  color: C.textSm,
                }}
              >
                <i className="fa-solid fa-copy" />
              </button>
            </div>
          )}
          <div>
            <label style={labelSm}>Titulaire</label>
            <input
              value={titulaire}
              onChange={(e) => setTitulaire(e.target.value)}
              placeholder="Nom de l'établissement"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelSm}>Durée (années)</label>
            <select
              value={duree}
              onChange={(e) => setDuree(Number(e.target.value))}
              style={{ ...inputStyle, width: 120 }}
            >
              {[1, 2, 3, 5].map((n) => (
                <option key={n} value={n}>
                  {n} an{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
          {err && (
            <div
              style={{
                background: "#fef2f2",
                borderRadius: 8,
                padding: "10px 14px",
                color: C.danger,
                fontSize: 13,
              }}
            >
              {err}
            </div>
          )}
          {msg && (
            <div
              style={{
                background: "#ecfdf5",
                borderRadius: 8,
                padding: "10px 14px",
                color: C.success,
                fontSize: 13,
              }}
            >
              {msg}
            </div>
          )}
          <button
            onClick={handleActiver}
            style={{
              ...btn,
              background: C.warning,
              color: "#111",
              alignSelf: "flex-start",
            }}
          >
            <i className="fa-solid fa-crown" /> Activer
          </button>
        </div>
      </div>

      <div style={{ ...card, borderColor: "#fca5a5" }}>
        <h4
          style={{
            color: C.danger,
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          <i
            className="fa-solid fa-triangle-exclamation"
            style={{ marginRight: 8 }}
          />
          Zone dangereuse
        </h4>
        <p style={{ color: C.textSm, fontSize: 13, marginBottom: 12 }}>
          Réinitialise la licence en période d'essai de 14 jours. Irréversible.
        </p>
        <button
          onClick={handleReset}
          style={{
            ...btn,
            background: "#fef2f2",
            color: C.danger,
            border: "1px solid #fca5a5",
          }}
        >
          <i className="fa-solid fa-rotate-left" /> Réinitialiser en essai
        </button>
      </div>
    </div>
  );
}

/* ── Tab: Journal d'audit (Phase 1) ─────────────────────────────────────────── */
function TabAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({
    user_name: "",
    action: "",
    entity_type: "",
  });

  const load = useCallback(
    (p: number = 1) => {
      const params = new URLSearchParams();
      params.set("page", String(p));
      if (filter.user_name) params.set("user_name", filter.user_name);
      if (filter.action) params.set("action", filter.action);
      if (filter.entity_type) params.set("entity_type", filter.entity_type);
      api
        .saAuditLogs(params.toString())
        .then((r) => {
          setLogs(r.data);
          setPage(r.current_page);
          setLastPage(r.last_page);
          setTotal(r.total);
        })
        .catch(() => {});
    },
    [filter],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          value={filter.user_name}
          onChange={(e) =>
            setFilter((f) => ({ ...f, user_name: e.target.value }))
          }
          placeholder="Utilisateur…"
          style={{ ...inputStyle, width: 180 }}
        />
        <select
          value={filter.action}
          onChange={(e) => setFilter((f) => ({ ...f, action: e.target.value }))}
          style={{ ...inputStyle, width: 160 }}
        >
          <option value="">Toutes actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={filter.entity_type}
          onChange={(e) =>
            setFilter((f) => ({ ...f, entity_type: e.target.value }))
          }
          style={{ ...inputStyle, width: 160 }}
        >
          <option value="">Tous types</option>
          {[
            "User",
            "Commande",
            "Menu",
            "MenuHebdomadaire",
            "RegimeSpecial",
            "Formation",
            "Service",
            "Parametre",
          ].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: C.textSm }}>{total} entrée(s)</span>
        <button
          onClick={() => api.saExportAuditLogs()}
          style={{ ...btn, background: C.input, color: C.textSm }}
        >
          <i className="fa-solid fa-download" /> CSV
        </button>
      </div>

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
              {[
                "Date",
                "Utilisateur",
                "Action",
                "Entité",
                "Label",
                "Détails",
                "IP",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={{ borderBottom: `1px solid ${C.input}` }}>
                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                  {new Date(l.created_at).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td style={{ ...tdStyle, fontWeight: 500, color: C.text }}>
                  {l.user_name}
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      background: "#eff6ff",
                      color: C.primary,
                      padding: "2px 8px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {ACTION_LABELS[l.action] || l.action}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: C.textSm }}>{l.entity_type}</td>
                <td style={{ ...tdStyle, color: C.text }}>
                  {l.entity_label || "—"}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    color: C.textSm,
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {l.details || "—"}
                </td>
                <td style={{ ...tdStyle, color: C.textXs, fontSize: 11 }}>
                  {l.ip_address || "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: 24, textAlign: "center", color: C.textSm }}
                >
                  Aucune entrée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {lastPage > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            style={{
              ...btn,
              background: "transparent",
              color: C.primary,
              border: `1.5px solid ${C.primary}`,
            }}
          >
            <i className="fa-solid fa-chevron-left" />
          </button>
          <span style={{ fontSize: 13, padding: "6px 12px", color: C.textSm }}>
            Page {page} / {lastPage}
          </span>
          <button
            disabled={page >= lastPage}
            onClick={() => load(page + 1)}
            style={{
              ...btn,
              background: "transparent",
              color: C.primary,
              border: `1.5px solid ${C.primary}`,
            }}
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Tab: Analytics (Phase 2) ───────────────────────────────────────────────── */
function TabAnalytics() {
  type AnalyticsData = {
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
  };

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    api
      .saAnalytics(days)
      .then(setData)
      .catch(() => {});
  }, [days]);

  const fmtMoney = (v: number) => v.toLocaleString("fr-FR") + " F";

  const MiniBarChart = ({
    items,
    valueKey,
    color,
  }: {
    items: { date: string; [k: string]: unknown }[];
    valueKey: string;
    color: string;
  }) => {
    if (!items.length)
      return (
        <div
          style={{
            color: C.textSm,
            fontSize: 13,
            padding: 20,
            textAlign: "center",
          }}
        >
          Aucune donnée
        </div>
      );
    const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1);
    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 2,
          height: 100,
          padding: "10px 0",
        }}
      >
        {items.map((it, i) => {
          const val = Number(it[valueKey]) || 0;
          const h = Math.max((val / max) * 80, 2);
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <div style={{ fontSize: 9, color: C.textXs }}>{val}</div>
              <div
                style={{
                  width: "100%",
                  maxWidth: 24,
                  height: h,
                  background: color,
                  borderRadius: 3,
                  transition: "height .3s",
                }}
              />
              {i % Math.ceil(items.length / 6) === 0 && (
                <div style={{ fontSize: 8, color: C.textXs, marginTop: 2 }}>
                  {it.date.slice(5)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const RolePie = ({ data: rd }: { data: Record<string, number> }) => {
    const entries = Object.entries(rd);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map(([role, count]) => (
          <div
            key={role}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: ROLE_COLORS[role] || C.textSm,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, fontSize: 13, color: C.text }}>
              {ROLE_LABELS[role] || role}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
              {count}
            </span>
            <div
              style={{
                width: 80,
                height: 6,
                background: C.input,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(count / total) * 100}%`,
                  height: "100%",
                  background: ROLE_COLORS[role] || C.textSm,
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!data)
    return (
      <div style={{ textAlign: "center", padding: 40, color: C.textSm }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 20 }} />
      </div>
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <p style={{ color: C.textSm, fontSize: 13 }}>
          Vue d&#39;ensemble de l&#39;activité sur la plateforme.
        </p>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{ ...inputStyle, width: 140 }}
        >
          {[7, 14, 30, 60, 90].map((d) => (
            <option key={d} value={d}>
              Derniers {d} jours
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Total commandes",
            val: data.total_commandes,
            icon: "fa-receipt",
            color: C.primary,
          },
          {
            label: "Montant cumulé",
            val: fmtMoney(data.total_montant),
            icon: "fa-coins",
            color: C.success,
          },
          {
            label: "Total consommations",
            val: data.total_consommations,
            icon: "fa-utensils",
            color: C.purple,
          },
          {
            label: "Total portions",
            val: data.total_portions.toLocaleString("fr-FR"),
            icon: "fa-bowl-food",
            color: C.warning,
          },
        ].map((k) => (
          <div
            key={k.label}
            style={{
              ...card,
              marginBottom: 0,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: C.tagBg(k.color),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className={`fa-solid ${k.icon}`}
                style={{ color: k.color, fontSize: 16 }}
              />
            </div>
            <div>
              <div
                style={{
                  color: C.textSm,
                  fontSize: 11,
                  textTransform: "uppercase",
                }}
              >
                {k.label}
              </div>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 17 }}>
                {k.val}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={card}>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.text,
              marginBottom: 8,
            }}
          >
            <i
              className="fa-solid fa-user-plus"
              style={{ marginRight: 6, color: C.primary }}
            />
            Nouveaux utilisateurs
          </h4>
          <MiniBarChart
            items={data.users_over_time}
            valueKey="total"
            color={C.primary}
          />
        </div>
        <div style={card}>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.text,
              marginBottom: 8,
            }}
          >
            <i
              className="fa-solid fa-receipt"
              style={{ marginRight: 6, color: C.success }}
            />
            Commandes
          </h4>
          <MiniBarChart
            items={data.commandes_over_time}
            valueKey="total"
            color={C.success}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.text,
              marginBottom: 8,
            }}
          >
            <i
              className="fa-solid fa-utensils"
              style={{ marginRight: 6, color: C.purple }}
            />
            Consommations
          </h4>
          <MiniBarChart
            items={data.consommations_over_time}
            valueKey="total"
            color={C.purple}
          />
        </div>
        <div style={card}>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: C.text,
              marginBottom: 12,
            }}
          >
            <i
              className="fa-solid fa-chart-pie"
              style={{ marginRight: 6, color: C.cyan }}
            />
            Répartition par rôle
          </h4>
          <RolePie data={data.roles_distribution} />
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Services (Phase 3) ────────────────────────────────────────────────── */
function TabServices() {
  type ServiceExt = Service & { commandes_count: number };
  const [services, setServices] = useState<ServiceExt[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editSvc, setEditSvc] = useState<ServiceExt | null>(null);
  const [form, setForm] = useState({
    nom: "",
    lits_actifs: 0,
    responsable: "",
  });
  const [editForm, setEditForm] = useState({
    nom: "",
    lits_actifs: 0,
    responsable: "",
    is_active: true,
  });

  const load = useCallback(() => {
    api
      .saServices()
      .then(setServices)
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const filtered = services.filter((s) =>
    s.nom.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async () => {
    if (!form.nom.trim()) return alert("Nom requis.");
    await api.saCreateService(form);
    setShowForm(false);
    setForm({ nom: "", lits_actifs: 0, responsable: "" });
    load();
  };
  const handleEdit = async () => {
    if (!editSvc) return;
    await api.saUpdateService(editSvc.id, editForm);
    setEditSvc(null);
    load();
  };
  const handleDelete = async (s: ServiceExt) => {
    if (!confirm(`Supprimer ${s.nom} ?`)) return;
    try {
      await api.saDeleteService(s.id);
      load();
    } catch {
      alert("Impossible de supprimer un service avec des commandes.");
    }
  };
  const openEdit = (s: ServiceExt) => {
    setEditForm({
      nom: s.nom,
      lits_actifs: s.lits_actifs,
      responsable: s.responsable || "",
      is_active: s.is_active,
    });
    setEditSvc(s);
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un service…"
          style={{ ...inputStyle, width: 280 }}
        />
        <button
          onClick={() => setShowForm(true)}
          style={{ ...btn, background: C.primary, color: "white" }}
        >
          <i className="fa-solid fa-plus" /> Nouveau service
        </button>
      </div>

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
              {[
                "Nom",
                "Lits actifs",
                "Responsable",
                "Commandes",
                "Statut",
                "Actions",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${C.input}` }}>
                <td style={{ ...tdStyle, color: C.text, fontWeight: 500 }}>
                  {s.nom}
                </td>
                <td style={{ ...tdStyle, color: C.text }}>{s.lits_actifs}</td>
                <td style={{ ...tdStyle, color: C.textSm }}>
                  {s.responsable || "—"}
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      background: "#eff6ff",
                      color: C.primary,
                      padding: "2px 8px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {s.commandes_count}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      color: s.is_active ? C.success : C.danger,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <i
                      className={`fa-solid fa-circle${s.is_active ? "" : "-xmark"}`}
                      style={{ marginRight: 4 }}
                    />
                    {s.is_active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => openEdit(s)}
                      style={{
                        ...btn,
                        padding: "5px 10px",
                        background: C.input,
                        color: C.textSm,
                      }}
                      title="Modifier"
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      style={{
                        ...btn,
                        padding: "5px 10px",
                        background: "#fef2f2",
                        color: C.danger,
                      }}
                      title="Supprimer"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: 24, textAlign: "center", color: C.textSm }}
                >
                  Aucun service
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3
            style={{
              color: C.text,
              marginBottom: 20,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Nouveau service
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelSm}>Nom</label>
              <input
                value={form.nom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nom: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Lits actifs</label>
              <input
                type="number"
                value={form.lits_actifs}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    lits_actifs: Number(e.target.value),
                  }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Responsable</label>
              <input
                value={form.responsable}
                onChange={(e) =>
                  setForm((f) => ({ ...f, responsable: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={handleCreate}
              style={{
                ...btn,
                background: C.primary,
                color: "white",
                flex: 1,
                justifyContent: "center",
              }}
            >
              Créer
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                ...btn,
                background: C.input,
                color: C.textSm,
                flex: 1,
                justifyContent: "center",
              }}
            >
              Annuler
            </button>
          </div>
        </Modal>
      )}

      {editSvc && (
        <Modal onClose={() => setEditSvc(null)}>
          <h3
            style={{
              color: C.text,
              marginBottom: 20,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Modifier {editSvc.nom}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelSm}>Nom</label>
              <input
                value={editForm.nom}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, nom: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Lits actifs</label>
              <input
                type="number"
                value={editForm.lits_actifs}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    lits_actifs: Number(e.target.value),
                  }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Responsable</label>
              <input
                value={editForm.responsable}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, responsable: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: C.textSm,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, is_active: e.target.checked }))
                }
              />{" "}
              Service actif
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={handleEdit}
              style={{
                ...btn,
                background: C.primary,
                color: "white",
                flex: 1,
                justifyContent: "center",
              }}
            >
              Enregistrer
            </button>
            <button
              onClick={() => setEditSvc(null)}
              style={{
                ...btn,
                background: C.input,
                color: C.textSm,
                flex: 1,
                justifyContent: "center",
              }}
            >
              Annuler
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Tab: Configuration système (Phase 5) ───────────────────────────────────── */
function TabConfig() {
  const [params, setParams] = useState<Parametre[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api
      .saConfig()
      .then((p) => {
        setParams(p);
        const m: Record<string, string> = {};
        p.forEach((x) => {
          m[x.cle] = x.valeur;
        });
        setEdits(m);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const configs = Object.entries(edits).map(([cle, valeur]) => ({
        cle,
        valeur,
      }));
      await api.saUpdateConfig(configs);
      setMsg("Configuration sauvegardée.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <p style={{ color: C.textSm, fontSize: 13, marginBottom: 20 }}>
        Paramètres système de l&#39;application.
      </p>
      <div style={card}>
        {params.length === 0 && (
          <p style={{ color: C.textSm, fontSize: 13 }}>
            Aucun paramètre configuré.
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {params.map((p) => (
            <div key={p.id}>
              <label style={{ ...labelSm, fontWeight: 600 }}>{p.cle}</label>
              {p.description && (
                <p
                  style={{ fontSize: 11, color: C.textXs, margin: "2px 0 4px" }}
                >
                  {p.description}
                </p>
              )}
              <input
                value={edits[p.cle] ?? p.valeur}
                onChange={(e) =>
                  setEdits((ed) => ({ ...ed, [p.cle]: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
          ))}
        </div>
        {msg && (
          <div
            style={{
              background: "#ecfdf5",
              borderRadius: 8,
              padding: "10px 14px",
              color: C.success,
              fontSize: 13,
              marginTop: 16,
            }}
          >
            {msg}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...btn,
            background: C.primary,
            color: "white",
            marginTop: 16,
          }}
        >
          {saving ? (
            <i className="fa-solid fa-spinner fa-spin" />
          ) : (
            <i className="fa-solid fa-floppy-disk" />
          )}{" "}
          Sauvegarder
        </button>
      </div>
    </div>
  );
}

/* ── Types ──────────────────────────────────────────────────────────────────── */
type StatsData = {
  total_users: number;
  users_actifs: number;
  roles: Record<string, number>;
  licence_statut: string;
  licence_jours: number;
  licence_fin: string;
  total_formations: number;
  formations_actives: number;
};

type TabKey =
  | "users"
  | "permissions"
  | "licence"
  | "audit"
  | "analytics"
  | "services"
  | "config";

/* ── Main Page ──────────────────────────────────────────────────────────────── */
export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("users");
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    api
      .saStats()
      .then((d) => setStats(d as StatsData))
      .catch(() => {});
  }, []);

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "users", label: "Utilisateurs", icon: "fa-users" },
    { key: "permissions", label: "Permissions", icon: "fa-shield-halved" },
    { key: "services", label: "Services", icon: "fa-building" },
    { key: "audit", label: "Journal", icon: "fa-clock-rotate-left" },
    { key: "analytics", label: "Analytics", icon: "fa-chart-line" },
    { key: "licence", label: "Licence", icon: "fa-crown" },
    { key: "config", label: "Config", icon: "fa-gear" },
  ];

  const licenceAlert =
    stats && stats.licence_jours <= 30 && stats.licence_statut !== "premium"
      ? stats.licence_jours <= 0
        ? "Votre licence a expiré !"
        : `Votre licence expire dans ${stats.licence_jours} jour(s).`
      : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Topbar */}
      <div
        style={{
          background: C.topbar,
          borderBottom: `1px solid ${C.topbarBorder}`,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 60,
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              background: C.primary,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i
              className="fa-solid fa-shield-halved"
              style={{ fontSize: 15, color: "white" }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>
              Resto-H
            </span>
            <span style={{ color: C.textSm, fontSize: 12, marginLeft: 8 }}>
              Administration Système
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <span style={{ color: C.textSm, fontSize: 13 }}>
            {user?.prenom} {user?.nom}
          </span>
          <button
            onClick={logout}
            style={{
              ...btn,
              background: C.input,
              color: C.textSm,
              padding: "7px 10px",
            }}
          >
            <i className="fa-solid fa-right-from-bracket" />{" "}
            <span className="topbar-date">Déconnexion</span>
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 16px" }}>
        {licenceAlert && (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 10,
              padding: "12px 20px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <i
              className="fa-solid fa-triangle-exclamation"
              style={{ color: C.warning, fontSize: 16 }}
            />
            <span
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 500,
                color: "#92400e",
              }}
            >
              {licenceAlert}
            </span>
            <button
              onClick={() => setTab("licence")}
              style={{
                ...btn,
                padding: "5px 12px",
                background: C.warning,
                color: "#111",
                fontSize: 12,
              }}
            >
              Gérer la licence
            </button>
          </div>
        )}

        <StatsBar stats={stats} />

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 24,
            background: C.card,
            padding: 4,
            borderRadius: 10,
            border: `1px solid ${C.cardBorder}`,
            overflowX: "auto",
            flexWrap: "nowrap",
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                ...btn,
                padding: "8px 16px",
                background: tab === t.key ? C.primary : "transparent",
                color: tab === t.key ? "white" : C.textSm,
                border: "none",
                whiteSpace: "nowrap",
              }}
            >
              <i className={`fa-solid ${t.icon}`} /> {t.label}
            </button>
          ))}
          <button
            onClick={() => router.push("/super-admin/formations")}
            style={{
              ...btn,
              padding: "8px 16px",
              background: "transparent",
              color: C.textSm,
              border: "none",
              whiteSpace: "nowrap",
            }}
          >
            <i className="fa-solid fa-hospital" /> Formations
          </button>
        </div>

        {tab === "users" && <TabUsers />}
        {tab === "permissions" && <TabPermissions />}
        {tab === "licence" && <TabLicence />}
        {tab === "audit" && <TabAudit />}
        {tab === "analytics" && <TabAnalytics />}
        {tab === "services" && <TabServices />}
        {tab === "config" && <TabConfig />}
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "20px 0",
          color: C.textXs,
          fontSize: 11,
        }}
      >
        © AIT &amp; ANABASE — Resto-H v1.0 — Super Admin
      </div>
    </div>
  );
}

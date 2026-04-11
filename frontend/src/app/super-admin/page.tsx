"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { User, Licence } from "@/types";

// ── Styles constants ──────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "#1e293b",
  borderRadius: 12,
  border: "1px solid #334155",
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
const inputDark: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 7,
  fontSize: 13,
  color: "white",
  fontFamily: "inherit",
  outline: "none",
};
const ROLE_LABELS: Record<string, string> = {
  gerant: "Gérant",
  dsgl: "DSGL",
  csah: "CSAH",
  sus: "SUS",
  sut: "SUT",
  super_admin: "Super Admin",
};
const ROLE_COLORS: Record<string, string> = {
  gerant: "#3B82F6",
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

// ── Sub-components ────────────────────────────────────────────────────────────

function StatsBar({
  stats,
}: {
  stats: ReturnType<typeof Object.create> | null;
}) {
  if (!stats) return null;
  const items = [
    {
      label: "Utilisateurs",
      val: stats.total_users,
      icon: "fa-users",
      color: "#3B82F6",
    },
    {
      label: "Actifs",
      val: stats.users_actifs,
      icon: "fa-user-check",
      color: "#10B981",
    },
    {
      label: "Formations",
      val: stats.total_formations ?? 0,
      icon: "fa-hospital",
      color: "#8B5CF6",
    },
    {
      label: "Formations actives",
      val: stats.formations_actives ?? 0,
      icon: "fa-hospital-user",
      color: "#06B6D4",
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
      color: stats.licence_statut === "premium" ? "#F59E0B" : "#EF4444",
    },
    {
      label: "Jours restants",
      val: stats.licence_jours,
      icon: "fa-clock",
      color: "#8B5CF6",
    },
  ];
  return (
    <div
      className="sa-grid-4"
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
              background: it.color + "22",
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
                color: "#64748B",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: ".5px",
              }}
            >
              {it.label}
            </div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>
              {it.val}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Utilisateurs ─────────────────────────────────────────────────────────
function TabUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showReset, setShowReset] = useState<User | null>(null);
  const [newPwd, setNewPwd] = useState("");
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

  const filtered = users.filter(
    (u) =>
      u.nom.toLowerCase().includes(search.toLowerCase()) ||
      u.prenom.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async () => {
    if (!form.nom.trim()) return alert("Veuillez saisir le nom.");
    if (!form.prenom.trim()) return alert("Veuillez saisir le prénom.");
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return alert("Veuillez saisir un email valide.");
    if (!form.password || form.password.length < 4)
      return alert("Le mot de passe doit contenir au moins 4 caractères.");
    await api.saCreateUser({ ...form, password: form.password });
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

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un utilisateur…"
          style={{ ...inputDark, width: 280 }}
        />
        <button
          onClick={() => setShowForm(true)}
          style={{ ...btn, background: "#1D4ED8", color: "white" }}
        >
          <i className="fa-solid fa-plus" /> Nouvel utilisateur
        </button>
      </div>

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              {[
                "Utilisateur",
                "Email",
                "Rôle",
                "Service",
                "Statut",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    color: "#64748B",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: ".5px",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #1e293b" }}>
                <td
                  style={{
                    padding: "12px 16px",
                    color: "white",
                    fontWeight: 500,
                  }}
                >
                  {u.prenom} {u.nom}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    color: "#94A3B8",
                    fontSize: 13,
                  }}
                >
                  {u.email}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span
                    style={{
                      background: ROLE_COLORS[u.role] + "22",
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
                <td
                  style={{
                    padding: "12px 16px",
                    color: "#64748B",
                    fontSize: 13,
                  }}
                >
                  {u.service || "—"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span
                    style={{
                      color: u.is_active ? "#10B981" : "#EF4444",
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
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => openEdit(u)}
                      style={{
                        ...btn,
                        padding: "5px 10px",
                        background: "#334155",
                        color: "#94A3B8",
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
                        background: "#334155",
                        color: "#F59E0B",
                      }}
                      title="Réinitialiser MDP"
                    >
                      <i className="fa-solid fa-key" />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      style={{
                        ...btn,
                        padding: "5px 10px",
                        background: "#450a0a",
                        color: "#fca5a5",
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
                  style={{ padding: 24, textAlign: "center", color: "#475569" }}
                >
                  Aucun utilisateur
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: 14,
              padding: 32,
              width: 440,
              border: "1px solid #334155",
            }}
          >
            <h3
              style={{
                color: "white",
                marginBottom: 20,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              Nouvel utilisateur
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["nom", "Nom"],
                ["prenom", "Prénom"],
                ["email", "Email"],
                ["service", "Service"],
              ].map(([k, l]) => (
                <div key={k}>
                  <label
                    style={{
                      color: "#94A3B8",
                      fontSize: 11,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {l}
                  </label>
                  <input
                    value={(form as Record<string, string>)[k]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [k]: e.target.value }))
                    }
                    style={inputDark}
                  />
                </div>
              ))}
              <div>
                <label
                  style={{
                    color: "#94A3B8",
                    fontSize: 11,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  style={inputDark}
                />
              </div>
              <div>
                <label
                  style={{
                    color: "#94A3B8",
                    fontSize: 11,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Rôle
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value }))
                  }
                  style={{ ...inputDark }}
                >
                  {["gerant", "dsgl", "csah", "sus", "sut"].map((r) => (
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
                  background: "#1D4ED8",
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
                  background: "#334155",
                  color: "#94A3B8",
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire édition */}
      {editUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: 14,
              padding: 32,
              width: 440,
              border: "1px solid #334155",
            }}
          >
            <h3
              style={{
                color: "white",
                marginBottom: 20,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              Modifier {editUser.prenom} {editUser.nom}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["nom", "Nom"],
                ["prenom", "Prénom"],
                ["email", "Email"],
                ["service", "Service"],
              ].map(([k, l]) => (
                <div key={k}>
                  <label
                    style={{
                      color: "#94A3B8",
                      fontSize: 11,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {l}
                  </label>
                  <input
                    value={
                      (editForm as Record<string, string | boolean>)[
                        k
                      ] as string
                    }
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, [k]: e.target.value }))
                    }
                    style={inputDark}
                  />
                </div>
              ))}
              <div>
                <label
                  style={{
                    color: "#94A3B8",
                    fontSize: 11,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Rôle
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, role: e.target.value }))
                  }
                  style={{ ...inputDark }}
                >
                  {["gerant", "dsgl", "csah", "sus", "sut"].map((r) => (
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
                  color: "#94A3B8",
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
                />
                Compte actif
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={handleEdit}
                style={{
                  ...btn,
                  background: "#1D4ED8",
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
                  background: "#334155",
                  color: "#94A3B8",
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset password */}
      {showReset && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: 14,
              padding: 32,
              width: 360,
              border: "1px solid #334155",
            }}
          >
            <h3
              style={{
                color: "white",
                marginBottom: 16,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              Réinitialiser le mot de passe
            </h3>
            <p style={{ color: "#64748B", fontSize: 13, marginBottom: 16 }}>
              {showReset.prenom} {showReset.nom}
            </p>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Nouveau mot de passe"
              style={{ ...inputDark, marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleReset}
                style={{
                  ...btn,
                  background: "#F59E0B",
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
                  background: "#334155",
                  color: "#94A3B8",
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Permissions ──────────────────────────────────────────────────────────
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
    const updated = current.includes(perm)
      ? current.filter((p) => p !== perm)
      : [...current, perm];
    setGrouped((g) => ({ ...g, [role]: updated }));
  };

  const save = async (role: string) => {
    setSaving(role);
    try {
      await api.saUpdatePermissions(role, grouped[role] || []);
    } finally {
      setSaving(null);
    }
  };

  const roles = ["gerant", "dsgl", "csah", "sus", "sut"];

  return (
    <div>
      <p style={{ color: "#64748B", fontSize: 13, marginBottom: 20 }}>
        Configurez les fonctionnalités accessibles pour chaque rôle. Les
        modifications sont appliquées immédiatement.
      </p>
      <div style={{ ...card, overflow: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              <th
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  color: "#64748B",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  width: 180,
                }}
              >
                Permission
              </th>
              {roles.map((r) => (
                <th
                  key={r}
                  style={{
                    padding: "10px 14px",
                    textAlign: "center",
                    color: ROLE_COLORS[r],
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allPerms.map((perm) => (
              <tr key={perm} style={{ borderBottom: "1px solid #1a2740" }}>
                <td
                  style={{
                    padding: "10px 14px",
                    color: "#CBD5E1",
                    fontSize: 13,
                  }}
                >
                  {PERM_LABELS[perm] || perm}
                </td>
                {roles.map((r) => (
                  <td
                    key={r}
                    style={{ padding: "10px 14px", textAlign: "center" }}
                  >
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
              background: ROLE_COLORS[r] + "22",
              color: ROLE_COLORS[r],
              border: `1px solid ${ROLE_COLORS[r]}44`,
            }}
          >
            {saving === r ? (
              <i className="fa-solid fa-spinner fa-spin" />
            ) : (
              <i className="fa-solid fa-floppy-disk" />
            )}
            Sauver {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Licence ──────────────────────────────────────────────────────────────
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
    { bg: string; color: string; label: string }
  > = {
    essai: { bg: "#422006", color: "#FCD34D", label: "Période d'essai" },
    premium: { bg: "#052e16", color: "#34D399", label: "Premium actif" },
    expire: { bg: "#450a0a", color: "#FCA5A5", label: "Expirée" },
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
      {/* Statut courant */}
      {licence && sc && (
        <div
          style={{
            ...card,
            background: sc.bg + "33",
            border: `1px solid ${sc.color}44`,
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
                  color: "#64748B",
                  fontSize: 11,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Statut
              </div>
              <span
                style={{
                  background: sc.bg,
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
                <div style={{ color: "#64748B", fontSize: 11 }}>Titulaire</div>
                <div style={{ color: "white", fontWeight: 600 }}>
                  {licence.titulaire}
                </div>
              </div>
            )}
          </div>
          <div className="grid-3" style={{ gap: 12 }}>
            {[
              ["Date début", fmtDate(licence.date_debut)],
              ["Expire le", fmtDate(licence.date_fin)],
              ["Jours restants", String(licence.jours_restants)],
            ].map(([l, v]) => (
              <div
                key={l}
                style={{
                  background: "#0f172a",
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{ color: "#64748B", fontSize: 11, marginBottom: 4 }}
                >
                  {l}
                </div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 16 }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
          {licence.cle_licence && (
            <div
              style={{
                marginTop: 12,
                background: "#0f172a",
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <div style={{ color: "#64748B", fontSize: 11, marginBottom: 4 }}>
                Clé active
              </div>
              <code
                style={{ color: "#34D399", fontSize: 13, letterSpacing: 1 }}
              >
                {licence.cle_licence}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Activer/générer */}
      <div style={card}>
        <h4
          style={{
            color: "white",
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <i
            className="fa-solid fa-crown"
            style={{ marginRight: 8, color: "#F59E0B" }}
          />
          Activer une licence premium
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={cle}
              onChange={(e) => setCle(e.target.value.toUpperCase())}
              placeholder="RESTO-XXXX-XXXX-XXXX-XXXX"
              style={{ ...inputDark, flex: 1 }}
            />
            <button
              onClick={handleGenerer}
              style={{
                ...btn,
                background: "#334155",
                color: "#94A3B8",
                whiteSpace: "nowrap",
              }}
            >
              <i className="fa-solid fa-wand-magic-sparkles" /> Générer
            </button>
          </div>
          {generatedKey && (
            <div
              style={{
                background: "#052e16",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#34D399",
                fontSize: 13,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <code style={{ letterSpacing: 1 }}>{generatedKey}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                }}
                style={{
                  ...btn,
                  padding: "4px 10px",
                  background: "#334155",
                  color: "#94A3B8",
                }}
              >
                <i className="fa-solid fa-copy" />
              </button>
            </div>
          )}
          <div>
            <label
              style={{
                color: "#94A3B8",
                fontSize: 11,
                display: "block",
                marginBottom: 4,
              }}
            >
              Titulaire
            </label>
            <input
              value={titulaire}
              onChange={(e) => setTitulaire(e.target.value)}
              placeholder="Nom de l'établissement"
              style={inputDark}
            />
          </div>
          <div>
            <label
              style={{
                color: "#94A3B8",
                fontSize: 11,
                display: "block",
                marginBottom: 4,
              }}
            >
              Durée (années)
            </label>
            <select
              value={duree}
              onChange={(e) => setDuree(Number(e.target.value))}
              style={{ ...inputDark, width: 120 }}
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
                background: "#450a0a",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#fca5a5",
                fontSize: 13,
              }}
            >
              {err}
            </div>
          )}
          {msg && (
            <div
              style={{
                background: "#052e16",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#34D399",
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
              background: "#F59E0B",
              color: "#111",
              alignSelf: "flex-start",
            }}
          >
            <i className="fa-solid fa-crown" /> Activer
          </button>
        </div>
      </div>

      {/* Reset essai */}
      <div style={{ ...card, borderColor: "#450a0a" }}>
        <h4
          style={{
            color: "#fca5a5",
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
        <p style={{ color: "#64748B", fontSize: 13, marginBottom: 12 }}>
          Réinitialise la licence en période d'essai de 14 jours. Irréversible.
        </p>
        <button
          onClick={handleReset}
          style={{
            ...btn,
            background: "#450a0a",
            color: "#fca5a5",
            border: "1px solid #7f1d1d",
          }}
        >
          <i className="fa-solid fa-rotate-left" /> Réinitialiser en essai
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"users" | "permissions" | "licence">("users");
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
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    api
      .saStats()
      .then((d) => setStats(d as StatsData))
      .catch(() => {});
  }, []);

  const tabs = [
    { key: "users", label: "Utilisateurs", icon: "fa-users" },
    {
      key: "permissions",
      label: "Rôles & Permissions",
      icon: "fa-shield-halved",
    },
    { key: "licence", label: "Licence", icon: "fa-crown" },
  ] as const;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Topbar */}
      <div
        style={{
          background: "#1e293b",
          borderBottom: "1px solid #334155",
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
              borderRadius: 9,
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <img
              src="/icons/icon-192.svg"
              alt="Resto-H"
              width={34}
              height={34}
              style={{ display: "block" }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Resto-H</span>
            <span
              className="topbar-date"
              style={{ color: "#475569", fontSize: 12, marginLeft: 8 }}
            >
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
          <span
            className="topbar-date"
            style={{ color: "#64748B", fontSize: 13 }}
          >
            {user?.prenom} {user?.nom}
          </span>
          <button
            onClick={logout}
            style={{
              ...btn,
              background: "#334155",
              color: "#94A3B8",
              padding: "7px 10px",
            }}
          >
            <i className="fa-solid fa-right-from-bracket" />
            <span className="topbar-date"> Déconnexion</span>
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 16px" }}>
        <StatsBar stats={stats} />

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 24,
            background: "#1e293b",
            padding: 4,
            borderRadius: 10,
            border: "1px solid #334155",
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
                padding: "8px 18px",
                background: tab === t.key ? "#1D4ED8" : "transparent",
                color: tab === t.key ? "white" : "#64748B",
                border: "none",
              }}
            >
              <i className={`fa-solid ${t.icon}`} /> {t.label}
            </button>
          ))}
          <button
            onClick={() => router.push("/super-admin/formations")}
            style={{
              ...btn,
              padding: "8px 18px",
              background: "transparent",
              color: "#64748B",
              border: "none",
            }}
          >
            <i className="fa-solid fa-hospital" /> Formations
          </button>
        </div>

        {tab === "users" && <TabUsers />}
        {tab === "permissions" && <TabPermissions />}
        {tab === "licence" && <TabLicence />}
      </div>

      <div
        style={{
          textAlign: "center",
          padding: "20px 0",
          color: "#334155",
          fontSize: 11,
        }}
      >
        © AIT &amp; ANABASE — Resto-H v1.0 — Super Admin
      </div>
    </div>
  );
}

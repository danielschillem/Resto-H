"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { FormationSanitaire, User } from "@/types";

// ── Styles ────────────────────────────────────────────────────────────────────
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

const TYPE_OPTIONS = ["CHR", "CHU", "CMA", "CSPS", "CM", "Clinique", "Autre"];
const REGION_OPTIONS = [
  "Boucle du Mouhoun",
  "Cascades",
  "Centre",
  "Centre-Est",
  "Centre-Nord",
  "Centre-Ouest",
  "Centre-Sud",
  "Est",
  "Hauts-Bassins",
  "Nord",
  "Plateau-Central",
  "Sahel",
  "Sud-Ouest",
];
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
const ROLES_ACTEURS = ["gerant", "dsgl", "csah", "sus", "sut"] as const;

const emptyForm = () => ({
  nom: "",
  code: "",
  type: "CHR",
  ville: "",
  region: "",
  telephone: "",
  email: "",
  directeur: "",
  gerant_nom: "",
  gerant_prenom: "",
  gerant_email: "",
  gerant_password: "",
});

const emptyEdit = (f: FormationSanitaire) => ({
  nom: f.nom,
  code: f.code,
  type: f.type,
  ville: f.ville ?? "",
  region: f.region ?? "",
  telephone: f.telephone ?? "",
  email: f.email ?? "",
  directeur: f.directeur ?? "",
  is_active: f.is_active,
});

const emptyActeur = () => ({
  nom: "",
  prenom: "",
  email: "",
  password: "",
  role: "sus" as string,
  service: "",
});

function getLoginUrl(code: string): string {
  if (typeof window === "undefined") return `/login/${code.toLowerCase()}`;
  return `${window.location.origin}/login/${code.toLowerCase()}`;
}

// ── CopyLinkRow ───────────────────────────────────────────────────────────────
function CopyLinkRow({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const url = getLoginUrl(code);
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          color: "#64748B",
          maxWidth: 160,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={url}
      >
        {url}
      </span>
      <button
        onClick={copy}
        style={{
          background: copied ? "#052e16" : "#1e3a5f",
          border: `1px solid ${copied ? "#14532d" : "#1e40af"}`,
          color: copied ? "#34D399" : "#60A5FA",
          borderRadius: 5,
          padding: "3px 8px",
          cursor: "pointer",
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`} />
        {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FormationsPage() {
  const router = useRouter();
  const [formations, setFormations] = useState<FormationSanitaire[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdLink, setCreatedLink] = useState<{
    nom: string;
    url: string;
  } | null>(null);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editFormation, setEditFormation] = useState<FormationSanitaire | null>(
    null,
  );
  const [manageUsers, setManageUsers] = useState<{
    formation: FormationSanitaire;
    users: User[];
  } | null>(null);

  // Forms
  const [form, setForm] = useState(emptyForm());
  const [editForm, setEditForm] = useState<ReturnType<typeof emptyEdit> | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  // Acteur form
  const [showActeurForm, setShowActeurForm] = useState(false);
  const [acteurForm, setActeurForm] = useState(emptyActeur());
  const [savingActeur, setSavingActeur] = useState(false);
  const [acteurError, setActeurError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.saFormations();
      setFormations(data);
    } catch {
      setError("Impossible de charger les formations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const notify = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleCreate = async () => {
    if (!form.nom.trim() || form.nom.trim().length < 3)
      return setError("Le nom doit contenir au moins 3 caractères.");
    if (!form.code.trim() || form.code.trim().length < 3)
      return setError("Le code doit contenir au moins 3 caractères.");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return setError("Email invalide.");
    setSaving(true);
    setError("");
    try {
      const created = (await api.saCreateFormation(form)) as FormationSanitaire;
      const code = (created.code || form.code).toUpperCase();
      setShowCreate(false);
      setCreatedLink({ nom: created.nom || form.nom, url: getLoginUrl(code) });
      setForm(emptyForm());
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editFormation || !editForm) return;
    setSaving(true);
    setError("");
    try {
      await api.saUpdateFormation(editFormation.id, editForm);
      setEditFormation(null);
      setEditForm(null);
      notify("Formation mise à jour");
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (f: FormationSanitaire) => {
    try {
      await api.saUpdateFormation(f.id, { is_active: !f.is_active });
      notify(f.is_active ? "Formation désactivée" : "Formation activée");
      load();
    } catch {
      setError("Erreur lors du changement de statut");
    }
  };

  const handleDelete = async (f: FormationSanitaire) => {
    if (!confirm(`Supprimer "${f.nom}" ? Cette action est irréversible.`))
      return;
    try {
      await api.saDeleteFormation(f.id);
      notify("Formation supprimée");
      load();
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Impossible de supprimer (utilisateurs associés ?)",
      );
    }
  };

  const handleOpenManageUsers = async (f: FormationSanitaire) => {
    try {
      const users = await api.saFormationUsers(f.id);
      setManageUsers({ formation: f, users });
      setShowActeurForm(false);
      setActeurForm(emptyActeur());
      setActeurError("");
    } catch {
      setError("Impossible de charger les utilisateurs");
    }
  };

  const handleAddActeur = async () => {
    if (!manageUsers) return;
    setSavingActeur(true);
    setActeurError("");
    try {
      await api.saCreateFormationUser(manageUsers.formation.id, acteurForm);
      const users = await api.saFormationUsers(manageUsers.formation.id);
      setManageUsers((prev) => (prev ? { ...prev, users } : null));
      setActeurForm(emptyActeur());
      setShowActeurForm(false);
      notify(`Acteur ajouté à ${manageUsers.formation.nom}`);
      load();
    } catch (e: unknown) {
      setActeurError(
        e instanceof Error ? e.message : "Erreur lors de la création",
      );
    } finally {
      setSavingActeur(false);
    }
  };

  const openEdit = (f: FormationSanitaire) => {
    setEditForm(emptyEdit(f));
    setEditFormation(f);
    setError("");
  };

  const filtered = formations.filter(
    (f) =>
      f.nom.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase()) ||
      (f.ville ?? "").toLowerCase().includes(search.toLowerCase()),
  );

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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.push("/super-admin")}
            style={{
              ...btn,
              background: "#334155",
              color: "#94A3B8",
              padding: "7px 10px",
            }}
          >
            <i className="fa-solid fa-arrow-left" />
          </button>
          <div
            style={{
              width: 34,
              height: 34,
              background: "#8B5CF6",
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="fa-solid fa-hospital" style={{ fontSize: 15 }} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              Formations Sanitaires
            </span>
            <span style={{ color: "#475569", fontSize: 12, marginLeft: 8 }}>
              Gestion multi-tenant
            </span>
          </div>
        </div>
        <span style={{ color: "#475569", fontSize: 13 }}>
          {filtered.length} formation{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ padding: "20px 16px" }}>
        {error && (
          <div
            style={{
              background: "#450a0a",
              border: "1px solid #7f1d1d",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 16,
              color: "#fca5a5",
              fontSize: 13,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {error}
            <button
              onClick={() => setError("")}
              style={{
                background: "none",
                border: "none",
                color: "#fca5a5",
                cursor: "pointer",
              }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}
        {success && (
          <div
            style={{
              background: "#052e16",
              border: "1px solid #14532d",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 16,
              color: "#34D399",
              fontSize: 13,
            }}
          >
            <i
              className="fa-solid fa-circle-check"
              style={{ marginRight: 8 }}
            />
            {success}
          </div>
        )}

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
            placeholder="Rechercher par nom, code, ville…"
            style={{ ...inputDark, width: 300 }}
          />
          <button
            onClick={() => {
              setShowCreate(true);
              setForm(emptyForm());
              setError("");
            }}
            style={{ ...btn, background: "#1D4ED8", color: "white" }}
          >
            <i className="fa-solid fa-plus" /> Nouvelle formation
          </button>
        </div>

        {/* Table */}
        <div style={{ ...card, padding: 0, overflow: "auto" }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "#475569" }}>
              <i
                className="fa-solid fa-spinner fa-spin"
                style={{ marginRight: 8 }}
              />
              Chargement…
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 960,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  {[
                    "Formation",
                    "Code",
                    "Type",
                    "Ville",
                    "Lien de connexion",
                    "Acteurs",
                    "Services",
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
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id} style={{ borderBottom: "1px solid #1a2740" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ color: "white", fontWeight: 600 }}>
                        {f.nom}
                      </div>
                      {f.directeur && (
                        <div style={{ color: "#64748B", fontSize: 12 }}>
                          Dir. {f.directeur}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <code
                        style={{
                          color: "#8B5CF6",
                          background: "#1e1b4b",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                      >
                        {f.code}
                      </code>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#94A3B8",
                        fontSize: 13,
                      }}
                    >
                      {f.type}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#94A3B8",
                        fontSize: 13,
                      }}
                    >
                      {f.ville ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <CopyLinkRow code={f.code} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => handleOpenManageUsers(f)}
                        style={{
                          ...btn,
                          padding: "4px 10px",
                          background: "#1e3a5f",
                          color: "#60A5FA",
                          fontSize: 12,
                          border: "1px solid #1e40af",
                        }}
                      >
                        <i className="fa-solid fa-users" /> {f.nb_users ?? 0}
                      </button>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#94A3B8",
                        fontSize: 13,
                      }}
                    >
                      {f.nb_services ?? 0}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        onClick={() => handleToggleActive(f)}
                        style={{
                          ...btn,
                          padding: "4px 10px",
                          fontSize: 12,
                          background: f.is_active ? "#052e16" : "#450a0a",
                          color: f.is_active ? "#34D399" : "#fca5a5",
                          border: `1px solid ${f.is_active ? "#14532d" : "#7f1d1d"}`,
                        }}
                      >
                        <i
                          className={`fa-solid fa-circle${f.is_active ? "-check" : "-xmark"}`}
                        />
                        {f.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => openEdit(f)}
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
                          onClick={() => handleDelete(f)}
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
                      colSpan={9}
                      style={{
                        padding: 32,
                        textAlign: "center",
                        color: "#475569",
                      }}
                    >
                      <i
                        className="fa-solid fa-hospital"
                        style={{
                          fontSize: 32,
                          display: "block",
                          marginBottom: 8,
                          opacity: 0.3,
                        }}
                      />
                      Aucune formation sanitaire
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal: Formation créée — lien de connexion ───────────── */}
      {createdLink && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: 16,
              padding: 36,
              width: "100%",
              maxWidth: 480,
              border: "1px solid #14532d",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                background: "#052e16",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <i
                className="fa-solid fa-circle-check"
                style={{ fontSize: 30, color: "#34D399" }}
              />
            </div>
            <h3
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Formation créée !
            </h3>
            <p style={{ color: "#94A3B8", fontSize: 14, marginBottom: 24 }}>
              <strong style={{ color: "white" }}>{createdLink.nom}</strong> est
              prête. Partagez ce lien aux utilisateurs :
            </p>
            <div
              style={{
                background: "#0f172a",
                borderRadius: 10,
                padding: "14px 16px",
                border: "1px solid #334155",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <i
                className="fa-solid fa-link"
                style={{ color: "#3B82F6", flexShrink: 0 }}
              />
              <span
                style={{
                  color: "#60A5FA",
                  fontSize: 13,
                  flex: 1,
                  wordBreak: "break-all",
                  textAlign: "left",
                }}
              >
                {createdLink.url}
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() =>
                  navigator.clipboard
                    .writeText(createdLink.url)
                    .then(() => notify("Lien copié !"))
                }
                style={{
                  ...btn,
                  background: "#1D4ED8",
                  color: "white",
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                <i className="fa-solid fa-copy" /> Copier le lien
              </button>
              <button
                onClick={() => setCreatedLink(null)}
                style={{
                  ...btn,
                  background: "#334155",
                  color: "#94A3B8",
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                Fermer
              </button>
            </div>
            <p style={{ color: "#475569", fontSize: 11, marginTop: 16 }}>
              <i
                className="fa-solid fa-circle-info"
                style={{ marginRight: 4 }}
              />
              Ce lien reste disponible dans la colonne &quot;Lien de
              connexion&quot; du tableau.
            </p>
          </div>
        </div>
      )}

      {/* ── Modal: Créer formation ────────────────────────────────── */}
      {showCreate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: 14,
              padding: 32,
              width: "100%",
              maxWidth: 600,
              border: "1px solid #334155",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3
              style={{
                color: "white",
                marginBottom: 24,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              <i
                className="fa-solid fa-hospital"
                style={{ marginRight: 10, color: "#8B5CF6" }}
              />
              Nouvelle formation sanitaire
            </h3>

            {/* Preview du lien */}
            {form.code && (
              <div
                style={{
                  background: "#0f172a",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 16,
                  border: "1px solid #1e40af",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <i
                  className="fa-solid fa-link"
                  style={{ color: "#3B82F6", fontSize: 12 }}
                />
                <span style={{ color: "#64748B", fontSize: 11 }}>
                  Lien de connexion :
                </span>
                <span style={{ color: "#60A5FA", fontSize: 11 }}>
                  {getLoginUrl(form.code.toUpperCase())}
                </span>
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    color: "#94A3B8",
                    fontSize: 11,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Nom de la formation *
                </label>
                <input
                  value={form.nom}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nom: e.target.value }))
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
                  Code unique *{" "}
                  <span style={{ color: "#475569" }}>
                    (définit l&#39;URL de connexion)
                  </span>
                </label>
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  style={inputDark}
                  placeholder="ex: CHR-TENK"
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
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                  style={{ ...inputDark }}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
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
                  Ville
                </label>
                <input
                  value={form.ville}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ville: e.target.value }))
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
                  Région
                </label>
                <select
                  value={form.region}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, region: e.target.value }))
                  }
                  style={{ ...inputDark }}
                >
                  <option value="">— Sélectionner —</option>
                  {REGION_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
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
                  Téléphone
                </label>
                <input
                  value={form.telephone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, telephone: e.target.value }))
                  }
                  style={inputDark}
                  placeholder="+226 XX XX XX XX"
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
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  style={inputDark}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    color: "#94A3B8",
                    fontSize: 11,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Directeur
                </label>
                <input
                  value={form.directeur}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, directeur: e.target.value }))
                  }
                  style={inputDark}
                />
              </div>
            </div>

            {/* Gérant initial */}
            <div
              style={{
                background: "#0f172a",
                borderRadius: 10,
                padding: 16,
                marginBottom: 20,
                border: "1px solid #334155",
              }}
            >
              <p
                style={{
                  color: "#64748B",
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".5px",
                  marginBottom: 12,
                }}
              >
                <i
                  className="fa-solid fa-user-tie"
                  style={{ marginRight: 6, color: "#3B82F6" }}
                />
                Gérant initial (optionnel)
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      color: "#94A3B8",
                      fontSize: 11,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Nom
                  </label>
                  <input
                    value={form.gerant_nom}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, gerant_nom: e.target.value }))
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
                    Prénom
                  </label>
                  <input
                    value={form.gerant_prenom}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, gerant_prenom: e.target.value }))
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
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.gerant_email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, gerant_email: e.target.value }))
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
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={form.gerant_password}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        gerant_password: e.target.value,
                      }))
                    }
                    style={inputDark}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: "#450a0a",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#fca5a5",
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleCreate}
                disabled={saving || !form.nom || !form.code}
                style={{
                  ...btn,
                  background: saving ? "#334155" : "#1D4ED8",
                  color: "white",
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                {saving ? (
                  <i className="fa-solid fa-spinner fa-spin" />
                ) : (
                  <i className="fa-solid fa-plus" />
                )}{" "}
                Créer la formation
              </button>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setError("");
                }}
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

      {/* ── Modal: Modifier formation ─────────────────────────────── */}
      {editFormation && editForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: 14,
              padding: 32,
              width: "100%",
              maxWidth: 560,
              border: "1px solid #334155",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3
              style={{
                color: "white",
                marginBottom: 24,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              <i
                className="fa-solid fa-pen"
                style={{ marginRight: 10, color: "#F59E0B" }}
              />
              Modifier {editFormation.nom}
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    color: "#94A3B8",
                    fontSize: 11,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Nom *
                </label>
                <input
                  value={editForm.nom}
                  onChange={(e) =>
                    setEditForm((f) => (f ? { ...f, nom: e.target.value } : f))
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
                  Code *
                </label>
                <input
                  value={editForm.code}
                  onChange={(e) =>
                    setEditForm((f) => (f ? { ...f, code: e.target.value } : f))
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
                  Type
                </label>
                <select
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm((f) => (f ? { ...f, type: e.target.value } : f))
                  }
                  style={{ ...inputDark }}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
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
                  Ville
                </label>
                <input
                  value={editForm.ville}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, ville: e.target.value } : f,
                    )
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
                  Région
                </label>
                <select
                  value={editForm.region}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, region: e.target.value } : f,
                    )
                  }
                  style={{ ...inputDark }}
                >
                  <option value="">— Sélectionner —</option>
                  {REGION_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
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
                  Téléphone
                </label>
                <input
                  value={editForm.telephone}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, telephone: e.target.value } : f,
                    )
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
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, email: e.target.value } : f,
                    )
                  }
                  style={inputDark}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    color: "#94A3B8",
                    fontSize: 11,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Directeur
                </label>
                <input
                  value={editForm.directeur}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, directeur: e.target.value } : f,
                    )
                  }
                  style={inputDark}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
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
                      setEditForm((f) =>
                        f ? { ...f, is_active: e.target.checked } : f,
                      )
                    }
                    style={{ width: 16, height: 16 }}
                  />
                  Formation active
                </label>
              </div>
            </div>
            {error && (
              <div
                style={{
                  background: "#450a0a",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: "#fca5a5",
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleEdit}
                disabled={saving}
                style={{
                  ...btn,
                  background: saving ? "#334155" : "#1D4ED8",
                  color: "white",
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                {saving ? (
                  <i className="fa-solid fa-spinner fa-spin" />
                ) : (
                  <i className="fa-solid fa-floppy-disk" />
                )}{" "}
                Enregistrer
              </button>
              <button
                onClick={() => {
                  setEditFormation(null);
                  setEditForm(null);
                  setError("");
                }}
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

      {/* ── Modal: Gérer les acteurs ──────────────────────────────── */}
      {manageUsers && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: 14,
              padding: 28,
              width: "100%",
              maxWidth: 620,
              border: "1px solid #334155",
              maxHeight: "90vh",
              overflowY: "auto",
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
                <h3
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  <i
                    className="fa-solid fa-users"
                    style={{ marginRight: 10, color: "#3B82F6" }}
                  />
                  Acteurs — {manageUsers.formation.nom}
                </h3>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ROLES_ACTEURS.map((r) => {
                    const count = manageUsers.users.filter(
                      (u) => u.role === r,
                    ).length;
                    return (
                      <span
                        key={r}
                        style={{
                          background: ROLE_COLORS[r] + "22",
                          color: ROLE_COLORS[r],
                          padding: "2px 8px",
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {ROLE_LABELS[r]}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => {
                  setManageUsers(null);
                  setShowActeurForm(false);
                }}
                style={{
                  ...btn,
                  padding: "6px 10px",
                  background: "#334155",
                  color: "#94A3B8",
                }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Lien de connexion dans le modal */}
            <div
              style={{
                background: "#0f172a",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
                border: "1px solid #334155",
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <i
                className="fa-solid fa-link"
                style={{ color: "#3B82F6", fontSize: 12 }}
              />
              <span style={{ color: "#64748B", fontSize: 12 }}>
                Lien de connexion :
              </span>
              <CopyLinkRow code={manageUsers.formation.code} />
            </div>

            {!showActeurForm && (
              <button
                onClick={() => {
                  setShowActeurForm(true);
                  setActeurForm(emptyActeur());
                  setActeurError("");
                }}
                style={{
                  ...btn,
                  background: "#1D4ED8",
                  color: "white",
                  marginBottom: 16,
                }}
              >
                <i className="fa-solid fa-user-plus" /> Affecter un acteur
              </button>
            )}

            {showActeurForm && (
              <div
                style={{
                  background: "#0f172a",
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 16,
                  border: "1px solid #334155",
                }}
              >
                <p
                  style={{
                    color: "#94A3B8",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: ".5px",
                    marginBottom: 12,
                  }}
                >
                  <i
                    className="fa-solid fa-user-plus"
                    style={{ marginRight: 6, color: "#1D4ED8" }}
                  />
                  Nouvel acteur dans {manageUsers.formation.nom}
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    <label
                      style={{
                        color: "#64748B",
                        fontSize: 11,
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Nom *
                    </label>
                    <input
                      value={acteurForm.nom}
                      onChange={(e) =>
                        setActeurForm((f) => ({ ...f, nom: e.target.value }))
                      }
                      style={inputDark}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        color: "#64748B",
                        fontSize: 11,
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Prénom *
                    </label>
                    <input
                      value={acteurForm.prenom}
                      onChange={(e) =>
                        setActeurForm((f) => ({ ...f, prenom: e.target.value }))
                      }
                      style={inputDark}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        color: "#64748B",
                        fontSize: 11,
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Email *
                    </label>
                    <input
                      type="email"
                      value={acteurForm.email}
                      onChange={(e) =>
                        setActeurForm((f) => ({ ...f, email: e.target.value }))
                      }
                      style={inputDark}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        color: "#64748B",
                        fontSize: 11,
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Mot de passe *
                    </label>
                    <input
                      type="password"
                      value={acteurForm.password}
                      onChange={(e) =>
                        setActeurForm((f) => ({
                          ...f,
                          password: e.target.value,
                        }))
                      }
                      style={inputDark}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        color: "#64748B",
                        fontSize: 11,
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Rôle *
                    </label>
                    <select
                      value={acteurForm.role}
                      onChange={(e) =>
                        setActeurForm((f) => ({ ...f, role: e.target.value }))
                      }
                      style={{ ...inputDark }}
                    >
                      {ROLES_ACTEURS.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        color: "#64748B",
                        fontSize: 11,
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Service
                    </label>
                    <input
                      value={acteurForm.service}
                      onChange={(e) =>
                        setActeurForm((f) => ({
                          ...f,
                          service: e.target.value,
                        }))
                      }
                      style={inputDark}
                      placeholder="ex: Restauration"
                    />
                  </div>
                </div>
                {acteurError && (
                  <div
                    style={{
                      background: "#450a0a",
                      borderRadius: 6,
                      padding: "8px 12px",
                      color: "#fca5a5",
                      fontSize: 12,
                      marginTop: 10,
                    }}
                  >
                    {acteurError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    onClick={handleAddActeur}
                    disabled={
                      savingActeur ||
                      !acteurForm.nom ||
                      !acteurForm.email ||
                      !acteurForm.password
                    }
                    style={{
                      ...btn,
                      background: savingActeur ? "#334155" : "#1D4ED8",
                      color: "white",
                      fontSize: 13,
                    }}
                  >
                    {savingActeur ? (
                      <i className="fa-solid fa-spinner fa-spin" />
                    ) : (
                      <i className="fa-solid fa-check" />
                    )}
                    Ajouter
                  </button>
                  <button
                    onClick={() => {
                      setShowActeurForm(false);
                      setActeurError("");
                    }}
                    style={{
                      ...btn,
                      background: "#334155",
                      color: "#94A3B8",
                      fontSize: 13,
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {manageUsers.users.length === 0 ? (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  color: "#475569",
                }}
              >
                <i
                  className="fa-solid fa-user-slash"
                  style={{
                    fontSize: 28,
                    display: "block",
                    marginBottom: 8,
                    opacity: 0.4,
                  }}
                />
                Aucun acteur — utilisez &quot;Affecter un acteur&quot; pour en
                ajouter
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ROLES_ACTEURS.map((role) => {
                  const acteurs = manageUsers.users.filter(
                    (u) => u.role === role,
                  );
                  if (acteurs.length === 0) return null;
                  return (
                    <div key={role}>
                      <div
                        style={{
                          color: ROLE_COLORS[role],
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: ".5px",
                          marginBottom: 6,
                          marginTop: 4,
                        }}
                      >
                        <i
                          className="fa-solid fa-circle-dot"
                          style={{ marginRight: 5, fontSize: 8 }}
                        />
                        {ROLE_LABELS[role]}
                      </div>
                      {acteurs.map((u) => (
                        <div
                          key={u.id}
                          style={{
                            background: "#1e293b",
                            borderRadius: 8,
                            padding: "10px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                color: "white",
                                fontWeight: 500,
                                fontSize: 13,
                              }}
                            >
                              {u.prenom} {u.nom}
                            </div>
                            <div style={{ color: "#64748B", fontSize: 12 }}>
                              {u.email}
                              {u.service ? ` · ${u.service}` : ""}
                            </div>
                          </div>
                          <span
                            style={{
                              color: u.is_active ? "#34D399" : "#fca5a5",
                              fontSize: 11,
                            }}
                          >
                            <i
                              className={`fa-solid fa-circle${u.is_active ? "" : "-xmark"}`}
                              style={{ marginRight: 4 }}
                            />
                            {u.is_active ? "Actif" : "Inactif"}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

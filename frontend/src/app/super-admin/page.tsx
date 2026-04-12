"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  User,
  Licence,
  AuditLog,
  Service,
  Parametre,
  FormationSanitaire,
} from "@/types";

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
const ROLES_ACTEURS = ["prestataire", "dsgl", "csah", "sus", "sut"] as const;

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

/* ── Helpers formation ──────────────────────────────────────────────────────── */
const emptyForm = () => ({
  nom: "",
  code: "",
  type: "CHR",
  ville: "",
  region: "",
  telephone: "",
  email: "",
  directeur: "",
  prestataire_nom: "",
  prestataire_prenom: "",
  prestataire_email: "",
  prestataire_password: "",
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

/* ── CopyLinkRow ───────────────────────────────────────────────────────────── */
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
          color: C.textSm,
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
          background: copied ? "#ecfdf5" : C.input,
          border: `1px solid ${copied ? "#14532d" : C.inputBorder}`,
          color: copied ? C.success : C.primary,
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

/* ── Modal ──────────────────────────────────────────────────────────────────── */
function Modal({
  children,
  onClose,
  width,
}: {
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
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
        padding: 16,
      }}
    >
      <div
        style={{
          background: C.card,
          borderRadius: 14,
          padding: 32,
          width: width ?? 440,
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

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 1 — Création Formation Sanitaire
   ════════════════════════════════════════════════════════════════════════════ */
function SectionCreation({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdLink, setCreatedLink] = useState<{
    nom: string;
    url: string;
  } | null>(null);

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
      setCreatedLink({ nom: created.nom || form.nom, url: getLoginUrl(code) });
      setForm(emptyForm());
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <p style={{ color: C.textSm, fontSize: 13, marginBottom: 20 }}>
        Créez une nouvelle formation sanitaire et son premier prestataire.
      </p>

      {createdLink && (
        <div
          style={{
            ...card,
            background: "#ecfdf5",
            border: "1px solid #14532d",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              background: "#d1fae5",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <i
              className="fa-solid fa-circle-check"
              style={{ fontSize: 30, color: C.success }}
            />
          </div>
          <h3
            style={{
              color: C.text,
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Formation créée !
          </h3>
          <p style={{ color: C.textSm, fontSize: 14, marginBottom: 16 }}>
            <strong style={{ color: C.text }}>{createdLink.nom}</strong> est
            prête. Partagez ce lien :
          </p>
          <div
            style={{
              background: C.card,
              borderRadius: 10,
              padding: "14px 16px",
              border: `1px solid ${C.cardBorder}`,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <i
              className="fa-solid fa-link"
              style={{ color: C.primary, flexShrink: 0 }}
            />
            <span
              style={{
                color: C.primaryLight,
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
              onClick={() => navigator.clipboard.writeText(createdLink.url)}
              style={{
                ...btn,
                background: C.primary,
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
                background: C.input,
                color: C.textSm,
                flex: 1,
                justifyContent: "center",
              }}
            >
              Fermer
            </button>
          </div>
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
            className="fa-solid fa-hospital"
            style={{ marginRight: 10, color: C.purple }}
          />
          Nouvelle formation sanitaire
        </h4>

        {form.code && (
          <div
            style={{
              background: C.input,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              border: `1px solid ${C.primary}33`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i
              className="fa-solid fa-link"
              style={{ color: C.primary, fontSize: 12 }}
            />
            <span style={{ color: C.textSm, fontSize: 11 }}>
              Lien de connexion :
            </span>
            <span style={{ color: C.primaryLight, fontSize: 11 }}>
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
            <label style={labelSm}>Nom de la formation *</label>
            <input
              value={form.nom}
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelSm}>
              Code unique *{" "}
              <span style={{ color: C.textXs }}>(définit l&apos;URL)</span>
            </label>
            <input
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
              style={inputStyle}
              placeholder="ex: CHR-TENK"
            />
          </div>
          <div>
            <label style={labelSm}>Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              style={inputStyle}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelSm}>Ville</label>
            <input
              value={form.ville}
              onChange={(e) =>
                setForm((f) => ({ ...f, ville: e.target.value }))
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelSm}>Région</label>
            <select
              value={form.region}
              onChange={(e) =>
                setForm((f) => ({ ...f, region: e.target.value }))
              }
              style={inputStyle}
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
            <label style={labelSm}>Téléphone</label>
            <input
              value={form.telephone}
              onChange={(e) =>
                setForm((f) => ({ ...f, telephone: e.target.value }))
              }
              style={inputStyle}
              placeholder="+226 XX XX XX XX"
            />
          </div>
          <div>
            <label style={labelSm}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              style={inputStyle}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelSm}>Directeur</label>
            <input
              value={form.directeur}
              onChange={(e) =>
                setForm((f) => ({ ...f, directeur: e.target.value }))
              }
              style={inputStyle}
            />
          </div>
        </div>

        <div
          style={{
            background: C.input,
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
            border: `1px solid ${C.cardBorder}`,
          }}
        >
          <p
            style={{
              color: C.textSm,
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: ".5px",
              marginBottom: 12,
            }}
          >
            <i
              className="fa-solid fa-user-tie"
              style={{ marginRight: 6, color: C.primary }}
            />{" "}
            Prestataire initial (optionnel)
          </p>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={labelSm}>Nom</label>
              <input
                value={form.prestataire_nom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, prestataire_nom: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Prénom</label>
              <input
                value={form.prestataire_prenom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, prestataire_prenom: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Email</label>
              <input
                type="email"
                value={form.prestataire_email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, prestataire_email: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Mot de passe</label>
              <input
                type="password"
                value={form.prestataire_password}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    prestataire_password: e.target.value,
                  }))
                }
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              borderRadius: 8,
              padding: "10px 14px",
              color: C.danger,
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}
        <button
          onClick={handleCreate}
          disabled={saving || !form.nom || !form.code}
          style={{
            ...btn,
            background: saving ? C.input : C.primary,
            color: saving ? C.textSm : "white",
          }}
        >
          {saving ? (
            <i className="fa-solid fa-spinner fa-spin" />
          ) : (
            <i className="fa-solid fa-plus" />
          )}{" "}
          Créer la formation
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 2 — Gestion de Formation Sanitaire
   ════════════════════════════════════════════════════════════════════════════ */
type GestionSubTab = "users" | "services" | "permissions" | "config";

function SectionGestion({ refreshKey }: { refreshKey: number }) {
  const [formations, setFormations] = useState<FormationSanitaire[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState<number[]>([]);

  // Detail view
  const [activeFormation, setActiveFormation] =
    useState<FormationSanitaire | null>(null);
  const [subTab, setSubTab] = useState<GestionSubTab>("users");

  // Edit modal
  const [editFormation, setEditFormation] = useState<FormationSanitaire | null>(
    null,
  );
  const [editForm, setEditForm] = useState<ReturnType<typeof emptyEdit> | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

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
  }, [load, refreshKey]);

  const notify = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
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
      if (activeFormation?.id === f.id) setActiveFormation(null);
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

  /* ── Detail view for a selected formation ── */
  if (activeFormation) {
    const subTabs: { key: GestionSubTab; label: string; icon: string }[] = [
      { key: "users", label: "Utilisateurs", icon: "fa-users" },
      { key: "services", label: "Services", icon: "fa-building" },
      { key: "permissions", label: "Permissions", icon: "fa-shield-halved" },
      { key: "config", label: "Configuration & Tarifs", icon: "fa-gear" },
    ];
    return (
      <div>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <button
            onClick={() => setActiveFormation(null)}
            style={{
              ...btn,
              background: C.input,
              color: C.textSm,
              padding: "7px 10px",
            }}
          >
            <i className="fa-solid fa-arrow-left" />
          </button>
          <div
            style={{
              width: 38,
              height: 38,
              background: C.tagBg(C.purple),
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i
              className="fa-solid fa-hospital"
              style={{ color: C.purple, fontSize: 16 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>
              {activeFormation.nom}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <code
                style={{
                  color: "#6d28d9",
                  background: "#ede9fe",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                {activeFormation.code}
              </code>
              <span style={{ color: C.textSm, fontSize: 12 }}>
                {activeFormation.type} · {activeFormation.ville ?? "—"}
              </span>
              <CopyLinkRow code={activeFormation.code} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => openEdit(activeFormation)}
              style={{
                ...btn,
                padding: "6px 12px",
                background: C.input,
                color: C.textSm,
                fontSize: 12,
              }}
            >
              <i className="fa-solid fa-pen" /> Modifier
            </button>
            <button
              onClick={() => handleToggleActive(activeFormation)}
              style={{
                ...btn,
                padding: "6px 12px",
                background: activeFormation.is_active ? "#fef2f2" : "#ecfdf5",
                color: activeFormation.is_active ? C.danger : C.success,
                fontSize: 12,
              }}
            >
              <i
                className={`fa-solid ${activeFormation.is_active ? "fa-ban" : "fa-check"}`}
              />{" "}
              {activeFormation.is_active ? "Désactiver" : "Activer"}
            </button>
          </div>
        </div>

        {success && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #14532d",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 12,
              color: C.success,
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

        {/* Sub-tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 20,
            background: C.card,
            padding: 4,
            borderRadius: 10,
            border: `1px solid ${C.cardBorder}`,
          }}
        >
          {subTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              style={{
                ...btn,
                padding: "8px 16px",
                background: subTab === t.key ? C.primary : "transparent",
                color: subTab === t.key ? "white" : C.textSm,
                border: "none",
                whiteSpace: "nowrap",
              }}
            >
              <i className={`fa-solid ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>

        {subTab === "users" && <SubTabUsers formation={activeFormation} />}
        {subTab === "services" && <SubTabServices />}
        {subTab === "permissions" && <SubTabPermissions />}
        {subTab === "config" && <SubTabConfig />}

        {/* Edit formation modal */}
        {editFormation && editForm && (
          <Modal
            onClose={() => {
              setEditFormation(null);
              setEditForm(null);
            }}
            width={560}
          >
            <h3
              style={{
                color: C.text,
                marginBottom: 24,
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              <i
                className="fa-solid fa-pen"
                style={{ marginRight: 10, color: C.warning }}
              />{" "}
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
                <label style={labelSm}>Nom *</label>
                <input
                  value={editForm.nom}
                  onChange={(e) =>
                    setEditForm((f) => (f ? { ...f, nom: e.target.value } : f))
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelSm}>Code *</label>
                <input
                  value={editForm.code}
                  onChange={(e) =>
                    setEditForm((f) => (f ? { ...f, code: e.target.value } : f))
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelSm}>Type</label>
                <select
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm((f) => (f ? { ...f, type: e.target.value } : f))
                  }
                  style={inputStyle}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelSm}>Ville</label>
                <input
                  value={editForm.ville}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, ville: e.target.value } : f,
                    )
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelSm}>Région</label>
                <select
                  value={editForm.region}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, region: e.target.value } : f,
                    )
                  }
                  style={inputStyle}
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
                <label style={labelSm}>Téléphone</label>
                <input
                  value={editForm.telephone}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, telephone: e.target.value } : f,
                    )
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelSm}>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, email: e.target.value } : f,
                    )
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelSm}>Directeur</label>
                <input
                  value={editForm.directeur}
                  onChange={(e) =>
                    setEditForm((f) =>
                      f ? { ...f, directeur: e.target.value } : f,
                    )
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
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
                  background: "#fef2f2",
                  borderRadius: 8,
                  padding: "10px 14px",
                  color: C.danger,
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
                  background: saving ? C.input : C.primary,
                  color: saving ? C.textSm : "white",
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

  /* ── Formation list view ── */
  return (
    <div>
      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: `1px solid ${C.danger}`,
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 16,
            color: C.danger,
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
              color: C.danger,
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
            background: "#ecfdf5",
            border: "1px solid #14532d",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 16,
            color: C.success,
            fontSize: 13,
          }}
        >
          <i className="fa-solid fa-circle-check" style={{ marginRight: 8 }} />
          {success}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, code, ville…"
          style={{ ...inputStyle, width: 300 }}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selected.length > 0 && (
            <>
              <span style={{ fontSize: 12, color: C.textSm }}>
                {selected.length} sélectionnée(s)
              </span>
              <button
                onClick={async () => {
                  await api.saBulkActivateFormations(selected);
                  setSelected([]);
                  notify("Formations activées");
                  load();
                }}
                style={{
                  ...btn,
                  background: "#ecfdf5",
                  color: C.success,
                  fontSize: 12,
                  padding: "6px 12px",
                }}
              >
                <i className="fa-solid fa-check-double" /> Activer
              </button>
              <button
                onClick={async () => {
                  await api.saBulkDeactivateFormations(selected);
                  setSelected([]);
                  notify("Formations désactivées");
                  load();
                }}
                style={{
                  ...btn,
                  background: "#fef2f2",
                  color: C.danger,
                  fontSize: 12,
                  padding: "6px 12px",
                }}
              >
                <i className="fa-solid fa-ban" /> Désactiver
              </button>
            </>
          )}
          <button
            onClick={() => api.saExportFormations()}
            style={{
              ...btn,
              background: C.input,
              color: C.textSm,
              fontSize: 12,
              padding: "6px 12px",
            }}
          >
            <i className="fa-solid fa-download" /> Export CSV
          </button>
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: C.textSm }}>
            <i
              className="fa-solid fa-spinner fa-spin"
              style={{ marginRight: 8 }}
            />{" "}
            Chargement…
          </div>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
                <th
                  style={{
                    ...thStyle,
                    width: 32,
                    padding: "12px 8px 12px 16px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      selected.length === filtered.length && filtered.length > 0
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? filtered.map((f) => f.id) : [],
                      )
                    }
                    style={{ width: 15, height: 15 }}
                  />
                </th>
                {[
                  "Formation",
                  "Code",
                  "Type",
                  "Ville",
                  "Lien",
                  "Acteurs",
                  "Statut",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={{ ...thStyle, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr
                  key={f.id}
                  style={{
                    borderBottom: `1px solid ${C.input}`,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setActiveFormation(f);
                    setSubTab("users");
                  }}
                >
                  <td
                    style={{ padding: "12px 8px 12px 16px" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(f.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, f.id]
                            : prev.filter((id) => id !== f.id),
                        )
                      }
                      style={{ width: 15, height: 15 }}
                    />
                  </td>
                  <td style={{ ...tdStyle, color: C.text, fontWeight: 600 }}>
                    {f.nom}
                    {f.directeur && (
                      <div style={{ color: C.textSm, fontSize: 12 }}>
                        Dir. {f.directeur}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <code
                      style={{
                        color: "#6d28d9",
                        background: "#ede9fe",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      {f.code}
                    </code>
                  </td>
                  <td style={{ ...tdStyle, color: C.textSm }}>{f.type}</td>
                  <td style={{ ...tdStyle, color: C.textSm }}>
                    {f.ville ?? "—"}
                  </td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <CopyLinkRow code={f.code} />
                  </td>
                  <td style={{ ...tdStyle, color: C.textSm }}>
                    {f.nb_users ?? 0}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        color: f.is_active ? C.success : C.danger,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <i
                        className={`fa-solid fa-circle${f.is_active ? "-check" : "-xmark"}`}
                        style={{ marginRight: 4 }}
                      />
                      {f.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => {
                          setActiveFormation(f);
                          setSubTab("users");
                        }}
                        style={{
                          ...btn,
                          padding: "5px 10px",
                          background: C.tagBg(C.primary),
                          color: C.primary,
                          fontSize: 12,
                        }}
                        title="Gérer"
                      >
                        <i className="fa-solid fa-cog" />
                      </button>
                      <button
                        onClick={() => openEdit(f)}
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
                        onClick={() => handleDelete(f)}
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
                    colSpan={9}
                    style={{
                      padding: 32,
                      textAlign: "center",
                      color: C.textSm,
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

      {/* Edit modal (list view) */}
      {editFormation && editForm && (
        <Modal
          onClose={() => {
            setEditFormation(null);
            setEditForm(null);
          }}
          width={560}
        >
          <h3
            style={{
              color: C.text,
              marginBottom: 24,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            <i
              className="fa-solid fa-pen"
              style={{ marginRight: 10, color: C.warning }}
            />{" "}
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
              <label style={labelSm}>Nom *</label>
              <input
                value={editForm.nom}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, nom: e.target.value } : f))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Code *</label>
              <input
                value={editForm.code}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, code: e.target.value } : f))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Type</label>
              <select
                value={editForm.type}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, type: e.target.value } : f))
                }
                style={inputStyle}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelSm}>Ville</label>
              <input
                value={editForm.ville}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, ville: e.target.value } : f))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Région</label>
              <select
                value={editForm.region}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, region: e.target.value } : f))
                }
                style={inputStyle}
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
              <label style={labelSm}>Téléphone</label>
              <input
                value={editForm.telephone}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, telephone: e.target.value } : f,
                  )
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => (f ? { ...f, email: e.target.value } : f))
                }
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelSm}>Directeur</label>
              <input
                value={editForm.directeur}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, directeur: e.target.value } : f,
                  )
                }
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
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
                background: "#fef2f2",
                borderRadius: 8,
                padding: "10px 14px",
                color: C.danger,
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
                background: saving ? C.input : C.primary,
                color: saving ? C.textSm : "white",
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

/* ── Sub-tab: Utilisateurs / Acteurs d'une formation ── */
function SubTabUsers({ formation }: { formation: FormationSanitaire }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [acteurForm, setActeurForm] = useState(emptyActeur());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.saFormationUsers(formation.id);
      setUsers(data);
    } catch {
      setError("Impossible de charger les utilisateurs");
    } finally {
      setLoading(false);
    }
  }, [formation.id]);

  useEffect(() => {
    load();
  }, [load]);

  const notify = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleAdd = async () => {
    if (!acteurForm.nom || !acteurForm.email || !acteurForm.password)
      return setError("Nom, email et mot de passe requis.");
    setSaving(true);
    setError("");
    try {
      await api.saCreateFormationUser(formation.id, acteurForm);
      setActeurForm(emptyActeur());
      setShowForm(false);
      notify("Acteur ajouté");
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {error && (
        <div
          style={{
            background: "#fef2f2",
            borderRadius: 8,
            padding: "10px 14px",
            color: C.danger,
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            background: "#ecfdf5",
            borderRadius: 8,
            padding: "10px 14px",
            color: C.success,
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          <i className="fa-solid fa-circle-check" style={{ marginRight: 8 }} />
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
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ROLES_ACTEURS.map((r) => {
            const count = users.filter((u) => u.role === r).length;
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
        <button
          onClick={() => {
            setShowForm(!showForm);
            setActeurForm(emptyActeur());
            setError("");
          }}
          style={{
            ...btn,
            background: showForm ? C.input : C.primary,
            color: showForm ? C.textSm : "white",
          }}
        >
          <i className={`fa-solid ${showForm ? "fa-xmark" : "fa-user-plus"}`} />{" "}
          {showForm ? "Annuler" : "Affecter un acteur"}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            ...card,
            background: C.input,
            border: `1px solid ${C.cardBorder}`,
            marginBottom: 16,
          }}
        >
          <p
            style={{
              color: C.textSm,
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: ".5px",
              marginBottom: 12,
            }}
          >
            <i
              className="fa-solid fa-user-plus"
              style={{ marginRight: 6, color: C.primary }}
            />{" "}
            Nouvel acteur dans {formation.nom}
          </p>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <div>
              <label style={labelSm}>Nom *</label>
              <input
                value={acteurForm.nom}
                onChange={(e) =>
                  setActeurForm((f) => ({ ...f, nom: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Prénom *</label>
              <input
                value={acteurForm.prenom}
                onChange={(e) =>
                  setActeurForm((f) => ({ ...f, prenom: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Email *</label>
              <input
                type="email"
                value={acteurForm.email}
                onChange={(e) =>
                  setActeurForm((f) => ({ ...f, email: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Mot de passe *</label>
              <input
                type="password"
                value={acteurForm.password}
                onChange={(e) =>
                  setActeurForm((f) => ({ ...f, password: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelSm}>Rôle *</label>
              <select
                value={acteurForm.role}
                onChange={(e) =>
                  setActeurForm((f) => ({ ...f, role: e.target.value }))
                }
                style={inputStyle}
              >
                {ROLES_ACTEURS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelSm}>Service</label>
              <input
                value={acteurForm.service}
                onChange={(e) =>
                  setActeurForm((f) => ({ ...f, service: e.target.value }))
                }
                style={inputStyle}
                placeholder="ex: Restauration"
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={
              saving ||
              !acteurForm.nom ||
              !acteurForm.email ||
              !acteurForm.password
            }
            style={{
              ...btn,
              background: saving ? C.input : C.primary,
              color: saving ? C.textSm : "white",
              marginTop: 12,
            }}
          >
            {saving ? (
              <i className="fa-solid fa-spinner fa-spin" />
            ) : (
              <i className="fa-solid fa-check" />
            )}{" "}
            Ajouter
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 32, color: C.textSm }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 20 }} />
        </div>
      ) : users.length === 0 ? (
        <div
          style={{ ...card, textAlign: "center", padding: 32, color: C.textSm }}
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
          Aucun acteur — utilisez &quot;Affecter un acteur&quot; pour en ajouter
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ROLES_ACTEURS.map((role) => {
            const acteurs = users.filter((u) => u.role === role);
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
                  />{" "}
                  {ROLE_LABELS[role]}
                </div>
                {acteurs.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      ...card,
                      marginBottom: 4,
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{ color: C.text, fontWeight: 500, fontSize: 13 }}
                      >
                        {u.prenom} {u.nom}
                      </div>
                      <div style={{ color: C.textSm, fontSize: 12 }}>
                        {u.email}
                        {u.service ? ` · ${u.service}` : ""}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span
                        style={{
                          color: u.is_active ? C.success : C.danger,
                          fontSize: 11,
                        }}
                      >
                        <i
                          className={`fa-solid fa-circle${u.is_active ? "" : "-xmark"}`}
                          style={{ marginRight: 4 }}
                        />
                        {u.is_active ? "Actif" : "Inactif"}
                      </span>
                      <button
                        onClick={async () => {
                          await api.saUpdateUser(u.id, {
                            is_active: !u.is_active,
                          });
                          notify(
                            u.is_active ? "Acteur désactivé" : "Acteur activé",
                          );
                          load();
                        }}
                        style={{
                          ...btn,
                          padding: "3px 7px",
                          background: C.input,
                          color: C.textSm,
                          fontSize: 11,
                        }}
                        title={u.is_active ? "Désactiver" : "Activer"}
                      >
                        <i
                          className={`fa-solid ${u.is_active ? "fa-ban" : "fa-check"}`}
                        />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Supprimer ${u.prenom} ${u.nom} ?`))
                            return;
                          try {
                            await api.saDeleteUser(u.id);
                            notify("Acteur supprimé");
                            load();
                          } catch (e: unknown) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "Erreur lors de la suppression",
                            );
                          }
                        }}
                        style={{
                          ...btn,
                          padding: "3px 7px",
                          background: "#fef2f2",
                          color: C.danger,
                          fontSize: 11,
                        }}
                        title="Supprimer"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Sub-tab: Services ─────────────────────────────────────────────────────── */
function SubTabServices() {
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

/* ── Sub-tab: Permissions ──────────────────────────────────────────────────── */
function SubTabPermissions() {
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

/* ── Sub-tab: Configuration & Tarifs ───────────────────────────────────────── */
function SubTabConfig() {
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

  const tarifKeys = [
    "tarif_malade_jour",
    "tarif_personnel_jour",
    "tarif_visiteur_jour",
  ];
  const tarifParams = params.filter((p) => tarifKeys.includes(p.cle));
  const otherParams = params.filter((p) => !tarifKeys.includes(p.cle));

  return (
    <div style={{ maxWidth: 640 }}>
      <p style={{ color: C.textSm, fontSize: 13, marginBottom: 20 }}>
        Paramètres système et tarifs de l&apos;application.
      </p>

      {/* Tarifs section */}
      <div style={{ ...card, border: `1px solid ${C.warning}33` }}>
        <h4
          style={{
            color: C.text,
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          <i
            className="fa-solid fa-coins"
            style={{ marginRight: 8, color: C.warning }}
          />{" "}
          Tarifs journaliers
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {[
            {
              key: "tarif_malade_jour",
              label: "Tarif malade / jour",
              icon: "fa-bed",
            },
            {
              key: "tarif_personnel_jour",
              label: "Tarif personnel / jour",
              icon: "fa-user-nurse",
            },
            {
              key: "tarif_visiteur_jour",
              label: "Tarif visiteur / jour",
              icon: "fa-person-walking",
            },
          ].map((t) => (
            <div key={t.key}>
              <label style={{ ...labelSm, fontWeight: 600 }}>
                <i
                  className={`fa-solid ${t.icon}`}
                  style={{ marginRight: 4, color: C.warning }}
                />{" "}
                {t.label}
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number"
                  value={
                    edits[t.key] ??
                    (tarifParams.find((p) => p.cle === t.key)?.valeur || "0")
                  }
                  onChange={(e) =>
                    setEdits((ed) => ({ ...ed, [t.key]: e.target.value }))
                  }
                  style={{ ...inputStyle, width: "100%" }}
                />
                <span
                  style={{
                    color: C.textSm,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  FCFA
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other params */}
      {otherParams.length > 0 && (
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
              className="fa-solid fa-gear"
              style={{ marginRight: 8, color: C.textSm }}
            />{" "}
            Autres paramètres
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {otherParams.map((p) => (
              <div key={p.id}>
                <label style={{ ...labelSm, fontWeight: 600 }}>{p.cle}</label>
                {p.description && (
                  <p
                    style={{
                      fontSize: 11,
                      color: C.textXs,
                      margin: "2px 0 4px",
                    }}
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
            marginTop: 16,
          }}
        >
          {msg}
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{ ...btn, background: C.primary, color: "white", marginTop: 16 }}
      >
        {saving ? (
          <i className="fa-solid fa-spinner fa-spin" />
        ) : (
          <i className="fa-solid fa-floppy-disk" />
        )}{" "}
        Sauvegarder
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 3 — Gestion des Licences
   ════════════════════════════════════════════════════════════════════════════ */
function SectionLicences() {
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
          />{" "}
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
          />{" "}
          Zone dangereuse
        </h4>
        <p style={{ color: C.textSm, fontSize: 13, marginBottom: 12 }}>
          Réinitialise la licence en période d&apos;essai de 14 jours.
          Irréversible.
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

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 4 — Journaux et Analytique
   ════════════════════════════════════════════════════════════════════════════ */
function SectionJournaux() {
  const [sub, setSub] = useState<"audit" | "analytics">("audit");

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          background: C.card,
          padding: 4,
          borderRadius: 10,
          border: `1px solid ${C.cardBorder}`,
          width: "fit-content",
        }}
      >
        <button
          onClick={() => setSub("audit")}
          style={{
            ...btn,
            padding: "7px 14px",
            background: sub === "audit" ? C.primary : "transparent",
            color: sub === "audit" ? "white" : C.textSm,
            border: "none",
          }}
        >
          <i className="fa-solid fa-clock-rotate-left" /> Journal d&apos;audit
        </button>
        <button
          onClick={() => setSub("analytics")}
          style={{
            ...btn,
            padding: "7px 14px",
            background: sub === "analytics" ? C.primary : "transparent",
            color: sub === "analytics" ? "white" : C.textSm,
            border: "none",
          }}
        >
          <i className="fa-solid fa-chart-line" /> Analytics
        </button>
      </div>
      {sub === "audit" && <TabAudit />}
      {sub === "analytics" && <TabAnalytics />}
    </div>
  );
}

/* ── Tab: Journal d'audit ───────────────────────────────────────────────────── */
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

/* ── Tab: Analytics ─────────────────────────────────────────────────────────── */
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
          Vue d&apos;ensemble de l&apos;activité sur la plateforme.
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
            />{" "}
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
            />{" "}
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
            />{" "}
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
            />{" "}
            Répartition par rôle
          </h4>
          <RolePie data={data.roles_distribution} />
        </div>
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

type SectionKey = "creation" | "gestion" | "licences" | "journaux";

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════════════ */
export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<SectionKey>("gestion");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api
      .saStats()
      .then((d) => setStats(d as StatsData))
      .catch(() => {});
  }, []);

  const sections: { key: SectionKey; label: string; icon: string }[] = [
    { key: "creation", label: "Création formation", icon: "fa-plus-circle" },
    { key: "gestion", label: "Gestion des formations", icon: "fa-hospital" },
    { key: "licences", label: "Gestion des licences", icon: "fa-crown" },
    { key: "journaux", label: "Journaux & Analytique", icon: "fa-chart-line" },
  ];

  const licenceAlert =
    stats && stats.licence_jours <= 30 && stats.licence_statut !== "premium"
      ? stats.licence_jours <= 0
        ? "Votre licence a expiré !"
        : `Votre licence expire dans ${stats.licence_jours} jour(s).`
      : null;

  // Suppress unused var warning
  void router;

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
              onClick={() => setSection("licences")}
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

        {/* Section tabs */}
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
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              style={{
                ...btn,
                padding: "8px 16px",
                background: section === s.key ? C.primary : "transparent",
                color: section === s.key ? "white" : C.textSm,
                border: "none",
                whiteSpace: "nowrap",
              }}
            >
              <i className={`fa-solid ${s.icon}`} /> {s.label}
            </button>
          ))}
        </div>

        {section === "creation" && (
          <SectionCreation
            onCreated={() => {
              setRefreshKey((k) => k + 1);
            }}
          />
        )}
        {section === "gestion" && <SectionGestion refreshKey={refreshKey} />}
        {section === "licences" && <SectionLicences />}
        {section === "journaux" && <SectionJournaux />}
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

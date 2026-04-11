"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Modal from "@/components/Modal";

const ROLE_LABELS: Record<string, string> = {
  prestataire: "Prestataire de Restauration",
  dsgl: "DSGL — Direction Gén. & Logistique",
  csah: "CSAH — Accueil & Hôtellerie",
  sus: "SUS — Soins",
  sut: "SUT — Technique",
  super_admin: "Super Administrateur",
};

export default function ProfilPage() {
  const { user, refresh } = useAuth();
  const [editModal, setEditModal] = useState(false);
  const [pwdModal, setPwdModal] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "" });
  const [pwdForm, setPwdForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const openEdit = () => {
    setForm({ nom: user.nom, prenom: user.prenom });
    setEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!form.nom.trim() || !form.prenom.trim())
      return alert("Nom et prénom sont requis.");
    setSaving(true);
    try {
      await api.updateProfile(form);
      refresh();
      setEditModal(false);
    } catch {
      /* toast handled */
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!pwdForm.current_password)
      return alert("Saisissez votre mot de passe actuel.");
    if (pwdForm.new_password.length < 4)
      return alert(
        "Le nouveau mot de passe doit contenir au moins 4 caractères.",
      );
    if (pwdForm.new_password !== pwdForm.new_password_confirmation)
      return alert("Les mots de passe ne correspondent pas.");
    setSaving(true);
    try {
      await api.changePassword(pwdForm);
      setPwdModal(false);
      setPwdForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
    } catch {
      /* toast handled */
    }
    setSaving(false);
  };

  const initial =
    user.prenom?.[0]?.toUpperCase() || user.nom?.[0]?.toUpperCase() || "?";

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Mon profil</h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}>
            Informations personnelles et sécurité
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 16 }}>
        {/* Info card */}
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 24,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {user.full_name || `${user.prenom} ${user.nom}`}
              </div>
              <div
                style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}
              >
                {user.email}
              </div>
              <span
                style={{
                  display: "inline-flex",
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  background: "#EDE9FE",
                  color: "#5B21B6",
                  marginTop: 6,
                }}
              >
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={fieldRow}>
              <span style={fieldLabel}>Nom</span>
              <span style={fieldValue}>{user.nom}</span>
            </div>
            <div style={fieldRow}>
              <span style={fieldLabel}>Prénom</span>
              <span style={fieldValue}>{user.prenom}</span>
            </div>
            <div style={fieldRow}>
              <span style={fieldLabel}>Email</span>
              <span style={fieldValue}>{user.email}</span>
            </div>
            <div style={fieldRow}>
              <span style={fieldLabel}>Rôle</span>
              <span style={fieldValue}>
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>
            <div style={fieldRow}>
              <span style={fieldLabel}>Service</span>
              <span style={fieldValue}>{user.service || "—"}</span>
            </div>
          </div>

          <button onClick={openEdit} style={{ ...btn, marginTop: 16 }}>
            <i className="fa-solid fa-pencil" /> Modifier mon profil
          </button>
        </div>

        {/* Security card */}
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            <i
              className="fa-solid fa-shield-halved"
              style={{ marginRight: 8, color: "var(--primary)" }}
            />
            Sécurité
          </div>

          <div
            style={{
              background: "#F8FAFC",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Mot de passe
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-sm)",
                marginBottom: 12,
              }}
            >
              Changez régulièrement votre mot de passe pour sécuriser votre
              compte.
            </p>
            <button onClick={() => setPwdModal(true)} style={btn}>
              <i className="fa-solid fa-key" /> Changer le mot de passe
            </button>
          </div>

          <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Dernière connexion
            </div>
            {user.last_login_at ? (
              <div style={{ fontSize: 12, color: "var(--text-sm)" }}>
                <div>
                  <i className="fa-solid fa-clock" style={{ marginRight: 6 }} />
                  {new Date(user.last_login_at).toLocaleString("fr-FR")}
                </div>
                {user.last_login_ip && (
                  <div style={{ marginTop: 4 }}>
                    <i
                      className="fa-solid fa-globe"
                      style={{ marginRight: 6 }}
                    />
                    IP : {user.last_login_ip}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--text-sm)" }}>
                Aucune information disponible
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit profile modal */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title="Modifier mon profil"
        icon="fa-user-pen"
        maxWidth={440}
        footer={
          <>
            <button onClick={() => setEditModal(false)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleSaveProfile} disabled={saving} style={btn}>
              <i className="fa-solid fa-check" />{" "}
              {saving ? "..." : "Enregistrer"}
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nom</label>
          <input
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Prénom</label>
          <input
            value={form.prenom}
            onChange={(e) => setForm({ ...form, prenom: e.target.value })}
            style={inputStyle}
          />
        </div>
      </Modal>

      {/* Change password modal */}
      <Modal
        open={pwdModal}
        onClose={() => setPwdModal(false)}
        title="Changer le mot de passe"
        icon="fa-key"
        maxWidth={440}
        footer={
          <>
            <button onClick={() => setPwdModal(false)} style={btnSecondary}>
              Annuler
            </button>
            <button
              onClick={handleChangePassword}
              disabled={saving}
              style={btn}
            >
              <i className="fa-solid fa-check" /> {saving ? "..." : "Confirmer"}
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Mot de passe actuel</label>
          <input
            type="password"
            value={pwdForm.current_password}
            onChange={(e) =>
              setPwdForm({ ...pwdForm, current_password: e.target.value })
            }
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nouveau mot de passe</label>
          <input
            type="password"
            value={pwdForm.new_password}
            onChange={(e) =>
              setPwdForm({ ...pwdForm, new_password: e.target.value })
            }
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Confirmer le nouveau mot de passe</label>
          <input
            type="password"
            value={pwdForm.new_password_confirmation}
            onChange={(e) =>
              setPwdForm({
                ...pwdForm,
                new_password_confirmation: e.target.value,
              })
            }
            style={inputStyle}
          />
        </div>
      </Modal>
    </>
  );
}

const card: React.CSSProperties = {
  background: "white",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  padding: 20,
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
};
const btnSecondary: React.CSSProperties = {
  ...btn,
  background: "var(--border)",
  color: "var(--text)",
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
const fieldRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 0",
  borderBottom: "1px solid #F1F5F9",
  fontSize: 13,
};
const fieldLabel: React.CSSProperties = {
  color: "var(--text-sm)",
  fontWeight: 500,
};
const fieldValue: React.CSSProperties = { fontWeight: 600 };

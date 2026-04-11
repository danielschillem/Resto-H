"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function ForcePasswordChange() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!user || !user.must_change_password) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.new_password.length < 4) {
      setError("Le nouveau mot de passe doit contenir au moins 4 caractères.");
      return;
    }
    if (form.new_password !== form.new_password_confirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    try {
      await api.changePassword(form);
      await refresh();
    } catch {
      setError("Le mot de passe actuel est incorrect.");
    }
    setSaving(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "white",
          borderRadius: 12,
          padding: 32,
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 20px 40px rgba(0,0,0,.2)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#FEF3C7",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <i
              className="fa-solid fa-key"
              style={{ fontSize: 24, color: "#92400E" }}
            />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>
            Changement de mot de passe requis
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 4 }}>
            Pour votre sécurité, veuillez définir un nouveau mot de passe.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#FEE2E2",
              color: "#991B1B",
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Mot de passe actuel</label>
          <input
            type="password"
            required
            value={form.current_password}
            onChange={(e) =>
              setForm({ ...form, current_password: e.target.value })
            }
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nouveau mot de passe</label>
          <input
            type="password"
            required
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Confirmer le nouveau mot de passe</label>
          <input
            type="password"
            required
            value={form.new_password_confirmation}
            onChange={(e) =>
              setForm({ ...form, new_password_confirmation: e.target.value })
            }
            style={inputStyle}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          style={{
            width: "100%",
            padding: "12px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            background: "var(--primary)",
            color: "white",
            fontFamily: "inherit",
          }}
        >
          {saving ? (
            <>
              <i className="fa-solid fa-spinner fa-spin" /> Enregistrement...
            </>
          ) : (
            <>
              <i className="fa-solid fa-check" /> Définir le nouveau mot de
              passe
            </>
          )}
        </button>
      </form>
    </div>
  );
}

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

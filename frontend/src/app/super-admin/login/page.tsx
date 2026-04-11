"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function SuperAdminLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/super-admin");
    } catch {
      setError("Identifiants incorrects.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 400,
          background: "#ffffff",
          borderRadius: 16,
          padding: 40,
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 60px rgba(0,0,0,.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 60,
              height: 60,
              background: "#2563eb",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <i
              className="fa-solid fa-shield-halved"
              style={{ fontSize: 26, color: "white" }}
            />
          </div>
          <h1
            style={{
              color: "#1e293b",
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Administration Système
          </h1>
          <p style={{ color: "#64748b", fontSize: 13 }}>
            Resto-H — Accès restreint
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label
              style={{
                color: "#64748b",
                fontSize: 12,
                fontWeight: 500,
                display: "block",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: ".5px",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="admin@resto-h.bf"
              style={{
                width: "100%",
                padding: "11px 14px",
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                fontSize: 14,
                color: "#1e293b",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label
              style={{
                color: "#64748b",
                fontSize: 12,
                fontWeight: 500,
                display: "block",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: ".5px",
              }}
            >
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "11px 14px",
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                fontSize: 14,
                color: "#1e293b",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#991b1b",
                fontSize: 13,
              }}
            >
              <i
                className="fa-solid fa-circle-exclamation"
                style={{ marginRight: 8 }}
              />
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              padding: "12px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? "wait" : "pointer",
              fontFamily: "inherit",
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            }}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" /> Connexion…
              </>
            ) : (
              "Se connecter"
            )}
          </button>
        </div>

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <a
            href="/login"
            style={{ color: "#94a3b8", fontSize: 12, textDecoration: "none" }}
          >
            ← Retour à la connexion utilisateur
          </a>
        </div>

        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 11,
            color: "#cbd5e1",
          }}
        >
          © AIT &amp; ANABASE — Resto-H v1.0
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const ROLES = [
  {
    key: "gerant",
    email: "gerant@chr-tenkodogo.bf",
    icon: "fa-utensils",
    name: "Gérant",
    desc: "Restauration",
    color: "var(--teal)",
  },
  {
    key: "dsgl",
    email: "dsgl@chr-tenkodogo.bf",
    icon: "fa-building-columns",
    name: "DSGL",
    desc: "Direction Gén.",
    color: "var(--primary)",
  },
  {
    key: "csah",
    email: "csah@chr-tenkodogo.bf",
    icon: "fa-concierge-bell",
    name: "CSAH",
    desc: "Accueil & Hôtellerie",
    color: "var(--success)",
  },
  {
    key: "sus",
    email: "sus@chr-tenkodogo.bf",
    icon: "fa-user-nurse",
    name: "SUS / SUT",
    desc: "Soins / Technique",
    color: "var(--purple)",
  },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const handleLogin = async () => {
    if (!selectedRole) {
      setError("Veuillez sélectionner un profil.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const role = ROLES.find((r) => r.key === selectedRole)!;
      await login(role.email, code || "1234");
      router.replace("/dashboard");
    } catch {
      setError("Code d'accès incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-left">
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: "50%",
            overflow: "hidden",
            marginBottom: 24,
            border: "3px solid rgba(255,255,255,0.3)",
          }}
        >
          <img
            src="/icons/icon-192.svg"
            alt="Resto-H"
            width={90}
            height={90}
            style={{ display: "block" }}
          />
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Resto-H
        </h1>
        <p
          style={{
            opacity: 0.8,
            textAlign: "center",
            maxWidth: 320,
            lineHeight: 1.6,
          }}
        >
          Système intégré de gestion de la restauration hospitalière
        </p>
        <span
          style={{
            display: "inline-block",
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 20,
            padding: "6px 16px",
            fontSize: 12,
            marginTop: 20,
            letterSpacing: 1,
          }}
        >
          SGRH — v1.0
        </span>
        <div
          style={{
            marginTop: 16,
            fontSize: 11,
            opacity: 0.5,
            textAlign: "center",
          }}
        >
          © AIT &amp; ANABASE
        </div>
        <a
          href="/super-admin/login"
          style={{
            display: "block",
            marginTop: 20,
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          Administration système
        </a>
      </div>
      <div className="login-right">
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          Connexion
        </h2>
        <p style={{ color: "var(--text-sm)", marginBottom: 32 }}>
          Sélectionnez votre profil et entrez votre code d&apos;accès
        </p>

        <div className="grid-2" style={{ gap: 12, marginBottom: 28 }}>
          {ROLES.map((r) => (
            <div
              key={r.key}
              onClick={() => {
                setSelectedRole(r.key);
                setError("");
              }}
              style={{
                border: `2px solid ${selectedRole === r.key ? "var(--primary)" : "var(--border)"}`,
                borderRadius: "var(--radius)",
                padding: "16px 12px",
                cursor: "pointer",
                textAlign: "center",
                background: selectedRole === r.key ? "#EFF6FF" : "white",
                boxShadow:
                  selectedRole === r.key
                    ? "0 0 0 3px rgba(37,99,235,.15)"
                    : "none",
                transition: "all .2s",
              }}
            >
              <i
                className={`fa-solid ${r.icon}`}
                style={{
                  fontSize: 22,
                  marginBottom: 8,
                  display: "block",
                  color: r.color,
                }}
              />
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                {r.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-sm)" }}>
                {r.desc}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              fontWeight: 500,
              marginBottom: 6,
              fontSize: 13,
            }}
          >
            Code d&apos;accès
          </label>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Entrez votre code"
            style={{
              width: "100%",
              padding: "11px 14px",
              border: "1.5px solid var(--border)",
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "inherit",
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "11px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            border: "none",
            background: "var(--primary)",
            color: "white",
            fontFamily: "inherit",
          }}
        >
          {loading ? (
            <i className="fa-solid fa-spinner fa-spin" />
          ) : (
            <i className="fa-solid fa-arrow-right-to-bracket" />
          )}
          Se connecter
        </button>

        {error && (
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--danger)" }}>
            <i className="fa-solid fa-circle-exclamation" /> {error}
          </div>
        )}
      </div>
    </div>
  );
}

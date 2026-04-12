"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const ROLES = [
  {
    key: "prestataire",
    icon: "fa-utensils",
    name: "Prestataire",
    desc: "Restauration",
    color: "var(--teal)",
  },
  {
    key: "dsgl",
    icon: "fa-building-columns",
    name: "DSGL",
    desc: "Direction Gén.",
    color: "var(--primary)",
  },
  {
    key: "csah",
    icon: "fa-concierge-bell",
    name: "CSAH",
    desc: "Accueil & Hôtellerie",
    color: "var(--success)",
  },
  {
    key: "sus",
    icon: "fa-user-nurse",
    name: "SUS / SUT",
    desc: "Soins / Technique",
    color: "var(--purple)",
  },
];

type Formation = {
  id: number;
  nom: string;
  code: string;
  type: string;
  ville: string | null;
  region: string | null;
};

export default function LoginPage() {
  const { user, loginByCode } = useAuth();
  const router = useRouter();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [selectedFormation, setSelectedFormation] = useState<number | null>(
    null,
  );
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingFormations, setLoadingFormations] = useState(true);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    api
      .formationsActive()
      .then((list) => {
        setFormations(list);
        if (list.length === 1) setSelectedFormation(list[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingFormations(false));
  }, []);

  const handleLogin = async () => {
    if (!selectedFormation) {
      setError("Veuillez sélectionner une formation sanitaire.");
      return;
    }
    if (!selectedRole) {
      setError("Veuillez sélectionner un profil.");
      return;
    }
    if (!code.trim()) {
      setError("Veuillez entrer votre code d'accès.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await loginByCode(selectedFormation, selectedRole, code);
      router.replace("/dashboard");
    } catch {
      setError("Code d'accès incorrect pour ce profil.");
    } finally {
      setLoading(false);
    }
  };

  const selectedF = formations.find((f) => f.id === selectedFormation);

  return (
    <div className="login-wrap">
      <div
        className="login-left"
        style={{
          backgroundImage: "url(/login-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 90,
              height: 90,
              background: "rgba(255,255,255,0.15)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              border: "3px solid rgba(255,255,255,0.3)",
            }}
          >
            <i
              className="fa-solid fa-hospital"
              style={{ fontSize: 40, color: "white" }}
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
            Plateforme de gestion de la restauration hospitalière
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
            RESTO-H — v2.0
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
      </div>
      <div className="login-right">
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          Connexion
        </h2>
        <p style={{ color: "var(--text-sm)", marginBottom: 24 }}>
          Sélectionnez votre structure, votre profil et entrez votre code
          d&apos;accès
        </p>

        {/* ── Sélection de la formation sanitaire ── */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 8,
              fontSize: 13,
            }}
          >
            <i
              className="fa-solid fa-hospital"
              style={{ marginRight: 6, color: "var(--teal)" }}
            />
            Formation sanitaire
          </label>
          {loadingFormations ? (
            <div style={{ color: "var(--text-sm)", fontSize: 13 }}>
              <i className="fa-solid fa-spinner fa-spin" /> Chargement…
            </div>
          ) : formations.length === 0 ? (
            <div
              style={{
                color: "var(--danger)",
                fontSize: 13,
                padding: "10px 14px",
                background: "#fef2f2",
                borderRadius: 8,
              }}
            >
              <i className="fa-solid fa-circle-exclamation" /> Aucune formation
              active disponible.
            </div>
          ) : (
            <select
              value={selectedFormation ?? ""}
              onChange={(e) => {
                setSelectedFormation(
                  e.target.value ? Number(e.target.value) : null,
                );
                setError("");
              }}
              style={{
                width: "100%",
                padding: "11px 14px",
                border: "1.5px solid var(--border)",
                borderRadius: 8,
                fontSize: 14,
                fontFamily: "inherit",
                background: "white",
                color: selectedFormation ? "inherit" : "var(--text-sm)",
              }}
            >
              <option value="">— Choisir une structure —</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                  {f.ville ? ` — ${f.ville}` : ""}
                  {f.type ? ` (${f.type})` : ""}
                </option>
              ))}
            </select>
          )}
          {selectedF && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "var(--text-sm)",
                display: "flex",
                gap: 12,
              }}
            >
              <span>
                <i className="fa-solid fa-tag" style={{ marginRight: 4 }} />
                {selectedF.code}
              </span>
              {selectedF.region && (
                <span>
                  <i
                    className="fa-solid fa-location-dot"
                    style={{ marginRight: 4 }}
                  />
                  {selectedF.region}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Sélection du profil ── */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 8,
              fontSize: 13,
            }}
          >
            <i
              className="fa-solid fa-user-tag"
              style={{ marginRight: 6, color: "var(--primary)" }}
            />
            Profil
          </label>
          <div className="grid-2" style={{ gap: 10 }}>
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
                  padding: "14px 10px",
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
                    fontSize: 20,
                    marginBottom: 6,
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
        </div>

        {/* ── Code d'accès ── */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 6,
              fontSize: 13,
            }}
          >
            <i
              className="fa-solid fa-lock"
              style={{ marginRight: 6, color: "var(--text-sm)" }}
            />
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

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
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

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
    <div className="sa-page">
      <style>{`
        .sa-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0c1222;
          background-image:
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 100%, rgba(139,92,246,0.08) 0%, transparent 50%);
          padding: 24px;
          font-family: inherit;
        }
        .sa-card {
          width: 100%;
          max-width: 420px;
          background: linear-gradient(170deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.85) 100%);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 44px 40px 36px;
          backdrop-filter: blur(24px);
          box-shadow: 0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset;
          animation: sa-appear 0.5s ease-out both;
        }
        @keyframes sa-appear {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .sa-logo-block {
          text-align: center;
          margin-bottom: 36px;
        }
        .sa-logo-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: linear-gradient(135deg, #6366f1, #3b82f6);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          box-shadow: 0 8px 32px rgba(99,102,241,0.3);
        }
        .sa-logo-icon i { font-size: 28px; color: #fff; }
        .sa-logo-title {
          font-size: 24px;
          font-weight: 800;
          color: #f8fafc;
          letter-spacing: -0.4px;
          margin: 0 0 2px;
        }
        .sa-logo-title span {
          background: linear-gradient(90deg, #818cf8, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .sa-logo-sub {
          font-size: 13px;
          color: #64748b;
          margin: 0;
        }
        .sa-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 14px;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.18);
          border-radius: 20px;
          padding: 4px 14px;
          font-size: 11px;
          color: #a5b4fc;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }
        .sa-badge i { font-size: 9px; }
        .sa-sep {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
          margin: 0 0 28px;
        }
        .sa-field { margin-bottom: 20px; }
        .sa-field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 7px;
          letter-spacing: 0.3px;
        }
        .sa-field-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .sa-field-icon {
          position: absolute;
          left: 14px;
          color: #475569;
          font-size: 14px;
          pointer-events: none;
          transition: color 0.2s;
        }
        .sa-field-wrap.focused .sa-field-icon { color: #818cf8; }
        .sa-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          font-size: 14px;
          color: #e2e8f0;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .sa-input::placeholder { color: #475569; }
        .sa-input:focus {
          border-color: #6366f1;
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .sa-pw-toggle {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: #475569;
          font-size: 14px;
          padding: 4px;
          transition: color 0.2s;
        }
        .sa-pw-toggle:hover { color: #94a3b8; }
        .sa-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.18);
          border-radius: 10px;
          padding: 11px 14px;
          margin-bottom: 20px;
          color: #fca5a5;
          font-size: 13px;
          animation: sa-shake 0.35s ease-out;
        }
        @keyframes sa-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(2px); }
        }
        .sa-submit {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.2px;
        }
        .sa-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #818cf8, #6366f1);
          box-shadow: 0 6px 24px rgba(99,102,241,0.35);
          transform: translateY(-1px);
        }
        .sa-submit:active:not(:disabled) { transform: translateY(0); }
        .sa-submit:disabled { opacity: 0.55; cursor: wait; }
        .sa-footer {
          text-align: center;
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .sa-back {
          color: #475569;
          font-size: 13px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: color 0.2s;
        }
        .sa-back:hover { color: #94a3b8; }
        .sa-copyright {
          margin-top: 14px;
          font-size: 11px;
          color: #1e293b;
        }
        @media (max-width: 480px) {
          .sa-card { padding: 32px 24px 28px; border-radius: 16px; }
        }
      `}</style>

      <div className="sa-card">
        {/* Logo Resto-H */}
        <div className="sa-logo-block">
          <div className="sa-logo-icon">
            <i className="fa-solid fa-hospital" />
          </div>
          <h1 className="sa-logo-title">
            <span>Resto</span>-H
          </h1>
          <p className="sa-logo-sub">Restauration Hospitalière</p>
          <div className="sa-badge">
            <i className="fa-solid fa-lock" />
            Administration système
          </div>
        </div>

        <div className="sa-sep" />

        {/* Email */}
        <div className="sa-field">
          <label className="sa-field-label">Adresse email</label>
          <div
            className={`sa-field-wrap${focused === "email" ? " focused" : ""}`}
          >
            <i className="fa-solid fa-envelope sa-field-icon" />
            <input
              className="sa-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="admin@resto-h.bf"
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div className="sa-field">
          <label className="sa-field-label">Mot de passe</label>
          <div className={`sa-field-wrap${focused === "pw" ? " focused" : ""}`}>
            <i className="fa-solid fa-key sa-field-icon" />
            <input
              className="sa-input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused("pw")}
              onBlur={() => setFocused(null)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{ paddingRight: 42 }}
            />
            <button
              type="button"
              className="sa-pw-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              title={showPassword ? "Masquer" : "Afficher"}
            >
              <i
                className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
              />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="sa-error">
            <i className="fa-solid fa-circle-xmark" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button className="sa-submit" onClick={handleLogin} disabled={loading}>
          {loading ? (
            <>
              <i
                className="fa-solid fa-circle-notch fa-spin"
                style={{ marginRight: 8 }}
              />
              Connexion…
            </>
          ) : (
            "Se connecter"
          )}
        </button>

        {/* Footer */}
        <div className="sa-footer">
          <a href="/login" className="sa-back">
            <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} />
            Retour à la connexion
          </a>
          <div className="sa-copyright">© AIT &amp; ANABASE — Resto-H v2.0</div>
        </div>
      </div>
    </div>
  );
}

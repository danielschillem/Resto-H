'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getFormationPublicInfo } from '@/lib/api';

type FormationInfo = {
    id: number;
    nom: string;
    code: string;
    type: string;
    ville: string | null;
    region: string | null;
};

// Icon based on type
function typeIcon(type: string) {
    const t = type.toLowerCase();
    if (t.includes('chu') || t.includes('chr')) return 'fa-hospital-user';
    if (t.includes('cma') || t.includes('clinique')) return 'fa-house-medical';
    return 'fa-hospital';
}

function typeColor(type: string) {
    const t = type.toLowerCase();
    if (t.includes('chu')) return '#EF4444';
    if (t.includes('chr')) return '#3B82F6';
    if (t.includes('cma')) return '#8B5CF6';
    if (t.includes('clinique')) return '#10B981';
    return 'var(--primary)';
}

export default function FormationLoginPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const { login, user } = useAuth();
    const router = useRouter();

    const [formation, setFormation] = useState<FormationInfo | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [loadingInfo, setLoadingInfo] = useState(true);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (user) router.replace('/dashboard');
    }, [user, router]);

    // Fetch formation info
    useEffect(() => {
        setLoadingInfo(true);
        getFormationPublicInfo(code)
            .then(info => {
                if (!info) setNotFound(true);
                else setFormation(info);
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoadingInfo(false));
    }, [code]);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Veuillez remplir votre email et mot de passe.');
            return;
        }
        if (!formation) return;
        setError('');
        setLoading(true);
        try {
            // Passe le code de formation au backend - il vérifiera que l'utilisateur
            // appartient bien à cette formation (validation côté serveur)
            await login(email.trim(), password, formation.code);
            router.replace('/dashboard');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : '';
            if (msg.includes('formation sanitaire') || msg.includes('formation')) {
                setError('Ces identifiants n\'appartiennent pas à cette formation sanitaire.');
            } else {
                setError('Email ou mot de passe incorrect.');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Loading ─────────────────────────────────────────────────────────────
    if (loadingInfo) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#3B82F6' }} />
            </div>
        );
    }

    // ── Not found ───────────────────────────────────────────────────────────
    if (notFound) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', padding: 24 }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 52, color: '#F59E0B', marginBottom: 20 }} />
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Formation introuvable</h2>
                <p style={{ color: '#64748B', marginBottom: 24, textAlign: 'center' }}>
                    Le code <code style={{ background: '#1e293b', padding: '2px 8px', borderRadius: 4, color: '#F59E0B' }}>{code}</code> ne correspond à aucune formation sanitaire active.
                </p>
                <a href="/login" style={{ color: '#3B82F6', textDecoration: 'none', fontSize: 14 }}>
                    <i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }} />Retour à la connexion générale
                </a>
            </div>
        );
    }

    const color = typeColor(formation!.type);

    return (
        <div className="login-wrap">
            {/* ── Left panel ─────────────────────────────────────────────── */}
            <div className="login-left" style={{ background: `linear-gradient(135deg, ${color} 0%, #0f172a 100%)` }}>
                <div style={{ width: 90, height: 90, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, border: '3px solid rgba(255,255,255,0.3)' }}>
                    <i className={`fa-solid ${typeIcon(formation!.type)}`} style={{ fontSize: 40, color: 'white' }} />
                </div>

                <h1 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center', marginBottom: 6, lineHeight: 1.3 }}>
                    {formation!.nom}
                </h1>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 }}>
                    <span style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                        {formation!.type}
                    </span>
                    {formation!.ville && (
                        <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 12px', fontSize: 12, opacity: 0.85 }}>
                            <i className="fa-solid fa-location-dot" style={{ marginRight: 5 }} />{formation!.ville}
                        </span>
                    )}
                </div>

                {formation!.region && (
                    <p style={{ opacity: 0.6, textAlign: 'center', fontSize: 12, marginBottom: 12 }}>{formation!.region}</p>
                )}

                <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '6px 16px', fontSize: 11, marginTop: 12, letterSpacing: 1 }}>
                    SGRH - Resto-H v1.0
                </span>
                <div style={{ marginTop: 10, fontSize: 11, opacity: 0.4, textAlign: 'center' }}>© AIT &amp; ANABASE</div>
            </div>

            {/* ── Right panel ────────────────────────────────────────────── */}
            <div className="login-right">
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Connexion</h2>
                <p style={{ color: 'var(--text-sm)', marginBottom: 28, fontSize: 14 }}>
                    Entrez vos identifiants pour accéder à votre espace
                </p>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 13 }}>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        placeholder="votre@email.com"
                        autoComplete="email"
                        style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                    />
                </div>

                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 13 }}>Mot de passe</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                    />
                </div>

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '11px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', border: 'none', background: color, color: 'white', fontFamily: 'inherit' }}
                >
                    {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-arrow-right-to-bracket" />}
                    Se connecter
                </button>

                {error && (
                    <div style={{ marginTop: 12, fontSize: 13, color: 'var(--danger)', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <i className="fa-solid fa-circle-exclamation" /> {error}
                    </div>
                )}

                <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                    <a href="/login" style={{ fontSize: 12, color: 'var(--text-sm)', textDecoration: 'none' }}>
                        Autres formations / connexion générale
                    </a>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Licence } from '@/types';
import { useAuth } from '@/lib/auth';

const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
    borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', border: 'none',
    background: 'var(--primary)', color: 'white', fontFamily: 'inherit',
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)',
    borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    letterSpacing: 1,
};

function StatutBadge({ statut }: { statut: string }) {
    const cfg: Record<string, { bg: string; color: string; label: string; icon: string }> = {
        essai: { bg: '#FEF3C7', color: '#92400E', label: 'Période d\'essai', icon: 'fa-clock' },
        premium: { bg: '#D1FAE5', color: '#065F46', label: 'Licence Premium', icon: 'fa-crown' },
        expire: { bg: '#FEE2E2', color: '#991B1B', label: 'Licence expirée', icon: 'fa-ban' },
    };
    const c = cfg[statut] || cfg.expire;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: c.bg, color: c.color }}>
            <i className={`fa-solid ${c.icon}`} />
            {c.label}
        </span>
    );
}

export default function LicencePage() {
    const { user } = useAuth();
    const [licence, setLicence] = useState<Licence | null>(null);
    const [cle, setCle] = useState('');
    const [titulaire, setTitulaire] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        api.licence().then(setLicence).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const canActivate = user?.role === 'gerant' || user?.role === 'dsgl';

    const handleActivate = async () => {
        if (!cle.trim()) { setError('Veuillez saisir une clé de licence.'); return; }
        setError(''); setSuccess(''); setSaving(true);
        try {
            await api.activerLicence(cle.trim().toUpperCase(), titulaire || undefined);
            const updated = await api.licence();
            setLicence(updated);
            setSuccess('Licence premium activée avec succès !');
            setCle('');
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erreur lors de l\'activation.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 28, color: 'var(--primary)' }} />
            </div>
        );
    }

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    return (
        <div style={{ maxWidth: 680 }}>
            <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Gestion de la Licence</h3>
                <p style={{ fontSize: 13, color: 'var(--text-sm)', marginTop: 2 }}>
                    Statut de votre abonnement Resto-H
                </p>
            </div>

            {/* Carte statut courant */}
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: 28, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-sm)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.6px' }}>Statut actuel</div>
                        <StatutBadge statut={licence?.statut || 'expire'} />
                    </div>
                    {licence?.statut === 'premium' && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-sm)' }}>Titulaire</div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{licence.titulaire || '—'}</div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '14px 16px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Date de début</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{licence ? fmtDate(licence.date_debut) : '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '14px 16px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Expire le</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{licence ? fmtDate(licence.date_fin) : '—'}</div>
                    </div>
                    <div style={{ background: licence && licence.jours_restants <= 3 ? '#FEE2E2' : licence && licence.jours_restants <= 7 ? '#FEF3C7' : 'var(--bg)', borderRadius: 8, padding: '14px 16px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Jours restants</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: licence && licence.jours_restants <= 3 ? 'var(--danger)' : licence && licence.jours_restants <= 7 ? '#92400E' : 'var(--text)' }}>
                            {licence?.statut === 'premium' ? '365 j/an' : `${licence?.jours_restants ?? 0} j`}
                        </div>
                    </div>
                </div>

                {licence?.statut === 'essai' && (
                    <div style={{ marginTop: 16, background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#78350F' }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />
                        Vous êtes en période d&apos;essai. Activez une licence premium pour un accès illimité.
                    </div>
                )}
                {licence?.statut === 'expire' && (
                    <div style={{ marginTop: 16, background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#991B1B' }}>
                        <i className="fa-solid fa-ban" style={{ marginRight: 8 }} />
                        Votre licence a expiré. Veuillez activer une nouvelle licence pour continuer.
                    </div>
                )}
            </div>

            {/* Activer une clé */}
            {canActivate && (
                <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--border)', padding: 28 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                        <i className="fa-solid fa-key" style={{ marginRight: 8, color: 'var(--primary)' }} />
                        Activer une licence premium
                    </h4>
                    <p style={{ fontSize: 13, color: 'var(--text-sm)', marginBottom: 20 }}>
                        Abonnement annuel. Format de clé : <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>RESTO-XXXX-XXXX-XXXX-XXXX</code>
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Clé de licence *</label>
                            <input
                                type="text"
                                value={cle}
                                onChange={e => setCle(e.target.value.toUpperCase())}
                                placeholder="RESTO-XXXX-XXXX-XXXX-XXXX"
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Titulaire (optionnel)</label>
                            <input
                                type="text"
                                value={titulaire}
                                onChange={e => setTitulaire(e.target.value)}
                                placeholder="Nom de l'établissement ou du titulaire"
                                style={inputStyle}
                            />
                        </div>

                        {error && (
                            <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 8 }} />{error}
                            </div>
                        )}
                        {success && (
                            <div style={{ background: '#D1FAE5', color: '#065F46', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                                <i className="fa-solid fa-circle-check" style={{ marginRight: 8 }} />{success}
                            </div>
                        )}

                        <button onClick={handleActivate} disabled={saving} style={{ ...btn, opacity: saving ? .7 : 1, alignSelf: 'flex-start' }}>
                            {saving
                                ? <><i className="fa-solid fa-spinner fa-spin" /> Activation…</>
                                : <><i className="fa-solid fa-crown" /> Activer la licence premium</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Info formule */}
            <div style={{ marginTop: 20, background: 'linear-gradient(135deg, #1B2E4B, #0f4c81)', borderRadius: 12, padding: 24, color: 'white' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, opacity: .7, textTransform: 'uppercase', letterSpacing: '.6px' }}>Formule Premium</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                        'Accès illimité à toutes les fonctionnalités',
                        'Menus hebdomadaires & régimes spéciaux',
                        'États, rapports & devis estimatifs',
                        'Support prioritaire AIT & ANABASE',
                        'Mises à jour incluses',
                        'Abonnement annuel renouvelable',
                    ].map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, opacity: .9 }}>
                            <i className="fa-solid fa-check" style={{ color: '#34D399', flexShrink: 0 }} />
                            {f}
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 16, fontSize: 12, opacity: .5 }}>
                    © AIT &amp; ANABASE — Resto-H v1.0
                </div>
            </div>
        </div>
    );
}

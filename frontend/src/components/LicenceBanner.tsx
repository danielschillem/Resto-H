'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Licence } from '@/types';

export default function LicenceBanner() {
    const [licence, setLicence] = useState<Licence | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        api.licence().then(setLicence).catch(() => { });
    }, []);

    if (!licence || dismissed) return null;

    // Premium valide avec plus de 30j restants → rien à afficher
    if (licence.statut === 'premium' && licence.jours_restants > 30) return null;

    // Essai avec plus de 7j restants → rien à afficher
    if (licence.statut === 'essai' && licence.jours_restants > 7) return null;

    const isExpire = licence.statut === 'expire';
    const isCritique = licence.jours_restants <= 3;

    const bg = isExpire ? '#FEE2E2' : isCritique ? '#FEF3C7' : '#EFF6FF';
    const color = isExpire ? '#991B1B' : isCritique ? '#78350F' : '#1D4ED8';
    const border = isExpire ? '#FCA5A5' : isCritique ? '#FCD34D' : '#BFDBFE';
    const icon = isExpire ? 'fa-ban' : isCritique ? 'fa-triangle-exclamation' : 'fa-clock';

    const message = isExpire
        ? 'Votre licence a expiré. L\'accès au système est limité.'
        : `Période d'essai : ${licence.jours_restants} jour${licence.jours_restants > 1 ? 's' : ''} restant${licence.jours_restants > 1 ? 's' : ''}.`;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: bg, borderBottom: `1px solid ${border}`,
            padding: '9px 24px', fontSize: 13, color,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className={`fa-solid ${icon}`} />
                <span>{message}</span>
                <Link href="/licence" style={{ color, fontWeight: 700, textDecoration: 'underline', marginLeft: 4 }}>
                    Gérer la licence
                </Link>
            </div>
            {!isExpire && (
                <button
                    onClick={() => setDismissed(true)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color, padding: '2px 6px', fontSize: 14 }}
                >
                    <i className="fa-solid fa-xmark" />
                </button>
            )}
        </div>
    );
}

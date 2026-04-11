'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const isLoginPage = pathname === '/super-admin/login';

    useEffect(() => {
        if (isLoginPage) return;
        if (!loading && !user) router.replace('/super-admin/login');
        if (!loading && user && user.role !== 'super_admin') router.replace('/dashboard');
    }, [user, loading, router, isLoginPage]);

    // La page login s'affiche sans vérification
    if (isLoginPage) return <>{children}</>;

    if (loading || !user || user.role !== 'super_admin') {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: '#3B82F6' }} />
            </div>
        );
    }

    return <>{children}</>;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import LicenceBanner from "@/components/LicenceBanner";
import ForcePasswordChange from "@/components/ForcePasswordChange";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role === "super_admin")
      router.replace("/super-admin");
  }, [user, loading, router]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <i
          className="fa-solid fa-spinner fa-spin"
          style={{ fontSize: 32, color: "var(--primary)" }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <ForcePasswordChange />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-shell">
        <LicenceBanner />
        <Topbar
          pathname={pathname}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
        />
        <div className="page-pad">{children}</div>
      </div>
    </div>
  );
}

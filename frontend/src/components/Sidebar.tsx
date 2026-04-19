"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useNotificationSSE } from "@/lib/useNotificationSSE";
import DarkModeToggle from "@/components/DarkModeToggle";
import { NavItem } from "@/types";

const NAV_ITEMS: Record<string, NavItem[]> = {
  prestataire: [
    { section: "Principal" },
    { id: "dashboard", icon: "fa-gauge-high", label: "Tableau de bord" },
    { section: "Menus" },
    {
      id: "menus-hebdo",
      icon: "fa-calendar-week",
      label: "Proposer des menus",
    },
    { section: "Commandes & Livraisons" },
    { id: "commandes", icon: "fa-clipboard-list", label: "Commandes à livrer" },
    { id: "menus-speciaux", icon: "fa-heart-pulse", label: "Régimes spéciaux" },
    { section: "Budget" },
    { id: "marches", icon: "fa-file-contract", label: "Marchés" },
    { section: "Système" },
    { id: "notifications", icon: "fa-bell", label: "Notifications" },
    { id: "profil", icon: "fa-user-circle", label: "Mon profil" },
  ],
  dsgl: [
    { section: "Principal" },
    { id: "dashboard", icon: "fa-gauge-high", label: "Tableau de bord" },
    { section: "Validation" },
    { id: "menus-hebdo", icon: "fa-calendar-check", label: "Validation menus" },
    { id: "commandes", icon: "fa-clipboard-list", label: "Commandes" },
    { id: "menus-speciaux", icon: "fa-heart-pulse", label: "Régimes spéciaux" },
    { id: "etats", icon: "fa-file-invoice", label: "Validation États/Devis" },
    { section: "Hospitalisation" },
    { id: "salles", icon: "fa-door-open", label: "Salles & Lits" },
    { id: "patients", icon: "fa-hospital-user", label: "Patients" },
    { section: "Budget & Marchés" },
    { id: "marches", icon: "fa-handshake", label: "Marchés" },
    {
      id: "liste-nominative",
      icon: "fa-list-check",
      label: "Liste nominative",
    },
    { section: "Supervision" },
    { id: "consommations", icon: "fa-chart-line", label: "Consommations" },
    { id: "services", icon: "fa-hospital", label: "Services" },
    { id: "notifications", icon: "fa-bell", label: "Notifications" },
    { id: "admin", icon: "fa-users-gear", label: "Administration" },
    { id: "licence", icon: "fa-key", label: "Licence" },
    { id: "profil", icon: "fa-user-circle", label: "Mon profil" },
  ],
  csah: [
    { section: "Principal" },
    { id: "dashboard", icon: "fa-gauge-high", label: "Tableau de bord" },
    { section: "Gestion" },
    { id: "menus-hebdo", icon: "fa-calendar-week", label: "Menus" },
    { id: "commandes", icon: "fa-clipboard-list", label: "Commandes" },
    { id: "menus-speciaux", icon: "fa-heart-pulse", label: "Régimes spéciaux" },
    { section: "Hospitalisation" },
    { id: "salles", icon: "fa-door-open", label: "Salles & Lits" },
    { id: "patients", icon: "fa-hospital-user", label: "Patients" },
    { section: "Budget & Marchés" },
    { id: "marches", icon: "fa-handshake", label: "Marchés" },
    {
      id: "liste-nominative",
      icon: "fa-list-check",
      label: "Liste nominative",
    },
    { section: "Suivi" },
    { id: "consommations", icon: "fa-chart-line", label: "Consommations" },
    { id: "etats", icon: "fa-file-invoice", label: "États & Rapports" },
    { section: "Système" },
    { id: "notifications", icon: "fa-bell", label: "Notifications" },
    { id: "profil", icon: "fa-user-circle", label: "Mon profil" },
  ],
  sus: [
    { section: "Principal" },
    { id: "dashboard", icon: "fa-gauge-high", label: "Tableau de bord" },
    { section: "Mon Service" },
    { id: "commandes", icon: "fa-cart-plus", label: "Mes commandes" },
    { id: "menus-speciaux", icon: "fa-heart-pulse", label: "Régimes patients" },
    { id: "menus-hebdo", icon: "fa-calendar-week", label: "Voir les menus" },
    { section: "Hospitalisation" },
    { id: "salles", icon: "fa-door-open", label: "Salles & Lits" },
    { id: "patients", icon: "fa-hospital-user", label: "Patients" },
    { section: "Listes" },
    {
      id: "liste-nominative",
      icon: "fa-list-check",
      label: "Liste nominative",
    },
    { section: "Système" },
    { id: "notifications", icon: "fa-bell", label: "Notifications" },
    { id: "profil", icon: "fa-user-circle", label: "Mon profil" },
  ],
  sut: [
    { section: "Principal" },
    { id: "dashboard", icon: "fa-gauge-high", label: "Tableau de bord" },
    { section: "Mon Service" },
    { id: "commandes", icon: "fa-cart-plus", label: "Mes commandes" },
    { id: "menus-speciaux", icon: "fa-heart-pulse", label: "Régimes patients" },
    { id: "menus-hebdo", icon: "fa-calendar-week", label: "Voir les menus" },
    { section: "Listes" },
    {
      id: "liste-nominative",
      icon: "fa-list-check",
      label: "Liste nominative",
    },
    { section: "Système" },
    { id: "notifications", icon: "fa-bell", label: "Notifications" },
    { id: "profil", icon: "fa-user-circle", label: "Mon profil" },
  ],
  nutritionniste: [
    { section: "Principal" },
    { id: "dashboard", icon: "fa-gauge-high", label: "Tableau de bord" },
    { section: "Observatoire" },
    {
      id: "observatoire",
      icon: "fa-microscope",
      label: "Observatoire nutritionnel",
    },
    { id: "menus-hebdo", icon: "fa-calendar-week", label: "Menus" },
    { id: "menus-speciaux", icon: "fa-heart-pulse", label: "Régimes spéciaux" },
    { section: "Suivi" },
    { id: "consommations", icon: "fa-chart-line", label: "Consommations" },
    { section: "Listes" },
    {
      id: "liste-nominative",
      icon: "fa-list-check",
      label: "Liste nominative",
    },
    { section: "Système" },
    { id: "notifications", icon: "fa-bell", label: "Notifications" },
    { id: "profil", icon: "fa-user-circle", label: "Mon profil" },
  ],
  daf: [
    { section: "Principal" },
    { id: "dashboard", icon: "fa-gauge-high", label: "Tableau de bord" },
    { section: "Validation financière" },
    {
      id: "validation-financiere",
      icon: "fa-file-invoice-dollar",
      label: "Devis & Budget",
    },
    { id: "commandes", icon: "fa-clipboard-list", label: "Commandes" },
    { section: "Budget & Marchés" },
    { id: "marches", icon: "fa-handshake", label: "Marchés" },
    {
      id: "liste-nominative",
      icon: "fa-list-check",
      label: "Liste nominative",
    },
    { section: "Suivi" },
    { id: "consommations", icon: "fa-chart-line", label: "Consommations" },
    { id: "etats", icon: "fa-file-invoice", label: "États & Rapports" },
    { section: "Système" },
    { id: "notifications", icon: "fa-bell", label: "Notifications" },
    { id: "profil", icon: "fa-user-circle", label: "Mon profil" },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  prestataire: "Prestataire de Restauration",
  dsgl: "DSGL - Direction Gén. & Logistique",
  csah: "CSAH - Accueil & Hôtellerie",
  sus: "SUS - Soins",
  sut: "SUT - Technique",
  nutritionniste: "Nutritionniste",
  daf: "DAF - Direction Admin. & Financière",
};

const ROLE_COLORS: Record<string, string> = {
  prestataire: "var(--teal)",
  dsgl: "var(--primary)",
  nutritionniste: "var(--amber, #f59e0b)",
  daf: "var(--info, #0ea5e9)",
  csah: "var(--success)",
  sus: "var(--purple)",
  sut: "var(--purple)",
};

export default function Sidebar({
  isOpen = true,
  onClose = () => {},
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { unreadCount } = useNotificationSSE();

  if (!user) return null;

  const items = NAV_ITEMS[user.role] || NAV_ITEMS.sus;
  const initial =
    user.prenom?.[0]?.toUpperCase() || user.nom?.[0]?.toUpperCase() || "?";

  return (
    <>
      {/* Backdrop mobile */}
      <div
        className={`sidebar-backdrop${isOpen ? " sidebar-open" : ""}`}
        onClick={onClose}
      />
      <div
        className={`sidebar-scroll sidebar-drawer${isOpen ? " sidebar-open" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 260,
          height: "100vh",
          background: "var(--navy)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid rgba(255,255,255,.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: "var(--primary)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className="fa-solid fa-hospital" style={{ fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Resto-H</div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,.5)",
                  marginTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: ".8px",
                }}
              >
                Restauration Hospitalière
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <DarkModeToggle />
            <button
              onClick={onClose}
              className="hamburger-btn"
              style={{
                background: "rgba(255,255,255,.1)",
                border: "none",
                color: "white",
                width: 32,
                height: 32,
                borderRadius: 6,
                cursor: "pointer",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        {/* Role badge */}
        <div
          style={{
            margin: "12px 20px",
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(255,255,255,.08)",
            fontSize: 12,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,.5)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: ".6px",
            }}
          >
            Profil connecté
          </div>
          <div style={{ color: "white", fontWeight: 600, marginTop: 2 }}>
            {user.role.toUpperCase()}
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "12px 0" }}>
          {items.map((item, i) => {
            if (item.section) {
              return (
                <div
                  key={`s-${i}`}
                  style={{
                    padding: "16px 20px 6px",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(255,255,255,.35)",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {item.section}
                </div>
              );
            }
            const href = `/${item.id}`;
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.id}
                href={href}
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 20px",
                  color: isActive ? "white" : "rgba(255,255,255,.7)",
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                  borderLeft: `3px solid ${isActive ? "var(--primary-light, #3B82F6)" : "transparent"}`,
                  background: isActive ? "rgba(37,99,235,.25)" : "transparent",
                  transition: "all .15s",
                }}
              >
                <i
                  className={`fa-solid ${item.icon}`}
                  style={{ width: 18, textAlign: "center", fontSize: 14 }}
                />
                <span>{item.label}</span>
                {item.id === "notifications" && unreadCount > 0 && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "var(--danger)",
                      color: "white",
                      fontSize: 10,
                      fontWeight: 700,
                      borderRadius: 10,
                      padding: "2px 7px",
                      minWidth: 18,
                      textAlign: "center",
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid rgba(255,255,255,.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: ROLE_COLORS[user.role] || "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {initial}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {user.full_name || `${user.prenom} ${user.nom}`}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>
                {ROLE_LABELS[user.role] || user.role}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              marginTop: 10,
              width: "100%",
              background: "rgba(255,255,255,.08)",
              color: "rgba(255,255,255,.7)",
              border: "none",
              padding: 9,
              borderRadius: 7,
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            <i className="fa-solid fa-right-from-bracket" /> Déconnexion
          </button>
          <div
            style={{
              marginTop: 12,
              textAlign: "center",
              fontSize: 10,
              color: "rgba(255,255,255,.3)",
              lineHeight: 1.6,
            }}
          >
            © AIT &amp; ANABASE
          </div>
        </div>
      </div>
    </>
  );
}

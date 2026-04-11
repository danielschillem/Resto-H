"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Notification } from "@/types";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Tableau de Bord",
  "/menus-hebdo": "Menus Hebdomadaires",
  "/menus-speciaux": "Menus Spéciaux",
  "/commandes": "Gestion des Commandes",
  "/consommations": "Suivi des Consommations",
  "/etats": "États & Rapports",
  "/admin": "Administration",
  "/notifications": "Notifications",
};

export default function Topbar({
  pathname,
  onMenuToggle,
}: {
  pathname: string;
  onMenuToggle?: () => void;
}) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .notifications()
      .then((data) => setNotifs(data.notifications))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unread = notifs.filter((n) => !n.lu).length;
  const title = PAGE_TITLES[pathname] || "SGRH";
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const markAllRead = async () => {
    await api.toutMarquerLu().catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, lu: true })));
  };

  return (
    <div
      style={{
        height: 60,
        background: "white",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Hamburger mobile */}
      <button
        className="hamburger-btn"
        onClick={onMenuToggle}
        style={{
          width: 36,
          height: 36,
          borderRadius: 7,
          border: "1.5px solid var(--border)",
          background: "white",
          cursor: "pointer",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-sm)",
          flexShrink: 0,
        }}
      >
        <i className="fa-solid fa-bars" />
      </button>

      <h2
        style={{
          fontSize: 16,
          fontWeight: 700,
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </h2>
      <div
        style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}
      >
        <div
          className="topbar-date"
          style={{ fontSize: 12, color: "var(--text-sm)", textAlign: "right" }}
        >
          <div style={{ fontWeight: 600 }}>{today}</div>
        </div>

        {/* Notifications */}
        <div ref={ref} style={{ position: "relative" }}>
          <button
            onClick={() => setOpen(!open)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              border: "1.5px solid var(--border)",
              background: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-sm)",
              position: "relative",
            }}
          >
            <i className="fa-solid fa-bell" />
            {unread > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 7,
                  right: 7,
                  width: 8,
                  height: 8,
                  background: "var(--danger)",
                  borderRadius: "50%",
                  border: "2px solid white",
                }}
              />
            )}
          </button>

          {open && (
            <div
              style={{
                position: "absolute",
                top: 48,
                right: 0,
                width: "min(340px, 90vw)",
                background: "white",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                zIndex: 300,
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  Notifications
                </span>
                <span
                  onClick={markAllRead}
                  style={{
                    fontSize: 12,
                    color: "var(--primary)",
                    cursor: "pointer",
                  }}
                >
                  Tout lire
                </span>
              </div>
              {notifs.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: "var(--text-sm)",
                    fontSize: 13,
                  }}
                >
                  Aucune notification
                </div>
              ) : (
                notifs.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid #F1F5F9",
                      background: n.lu ? "white" : "#EFF6FF",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}
                    >
                      {n.titre}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-sm)" }}>
                      {n.message}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}
                    >
                      {new Date(n.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => window.print()}
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            border: "1.5px solid var(--border)",
            background: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-sm)",
          }}
        >
          <i className="fa-solid fa-print" />
        </button>
      </div>
    </div>
  );
}

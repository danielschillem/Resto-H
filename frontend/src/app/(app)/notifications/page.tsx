"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Notification } from "@/types";

const TYPE_ICON: Record<string, { icon: string; color: string; bg: string }> = {
  commande: { icon: "fa-clipboard-list", color: "#1E40AF", bg: "#DBEAFE" },
  regime: { icon: "fa-heart-pulse", color: "#991B1B", bg: "#FEE2E2" },
  menu: { icon: "fa-calendar-week", color: "#065F46", bg: "#D1FAE5" },
  devis: { icon: "fa-file-invoice", color: "#5B21B6", bg: "#EDE9FE" },
};

function fmtDate(str: string): string {
  const d = new Date(str);
  return (
    d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = () => {
    setLoading(true);
    api
      .notifications()
      .then((data) => {
        setNotifs(data.notifications);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const handleMarkOne = async (id: number) => {
    await api.marquerLu(id);
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lu: true } : n)),
    );
  };

  const handleMarkAll = async () => {
    await api.toutMarquerLu();
    setNotifs((prev) => prev.map((n) => ({ ...n, lu: true })));
  };

  const displayed = filter === "unread" ? notifs.filter((n) => !n.lu) : notifs;
  const unreadCount = notifs.filter((n) => !n.lu).length;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Notifications</h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}>
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
              : "Toutes les notifications sont lues"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} style={btnSecondary}>
            <i className="fa-solid fa-check-double" /> Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(
          [
            ["all", "Toutes", notifs.length],
            ["unread", "Non lues", unreadCount],
          ] as [string, string, number][]
        ).map(([k, l, c]) => (
          <button
            key={k}
            onClick={() => setFilter(k as "all" | "unread")}
            style={
              {
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: filter === k ? 600 : 500,
                cursor: "pointer",
                border: "none",
                background: filter === k ? "var(--primary)" : "white",
                color: filter === k ? "white" : "var(--text)",
                border_color: "var(--border)",
                boxShadow: filter === k ? "none" : "0 0 0 1.5px var(--border)",
                fontFamily: "inherit",
              } as React.CSSProperties
            }
          >
            {l}
            {c > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  padding: "1px 7px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  background:
                    filter === k ? "rgba(255,255,255,.25)" : "#F1F5F9",
                  color: filter === k ? "white" : "var(--text-sm)",
                }}
              >
                {c}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "var(--text-sm)",
            }}
          >
            <i
              className="fa-solid fa-spinner fa-spin"
              style={{ fontSize: 24 }}
            />
          </div>
        )}
        {!loading && displayed.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: 48,
              background: "white",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              color: "var(--text-sm)",
            }}
          >
            <i
              className="fa-solid fa-bell-slash"
              style={{ fontSize: 28, marginBottom: 12, display: "block" }}
            />
            Aucune notification{filter === "unread" ? " non lue" : ""}
          </div>
        )}
        {displayed.map((n) => {
          const ti = TYPE_ICON[n.type || ""] || {
            icon: "fa-bell",
            color: "#475569",
            bg: "#F1F5F9",
          };
          return (
            <div
              key={n.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "14px 16px",
                background: n.lu ? "white" : "#EFF6FF",
                borderRadius: "var(--radius)",
                border: `1px solid ${n.lu ? "var(--border)" : "#BFDBFE"}`,
                transition: "background .2s",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: ti.bg,
                  color: ti.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <i className={`fa-solid ${ti.icon}`} style={{ fontSize: 16 }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 2,
                  }}
                >
                  <span style={{ fontWeight: n.lu ? 500 : 700, fontSize: 14 }}>
                    {n.titre}
                  </span>
                  {!n.lu && (
                    <span
                      style={{
                        display: "inline-flex",
                        padding: "2px 8px",
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        background: "var(--primary)",
                        color: "white",
                      }}
                    >
                      Nouveau
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-sm)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {n.message}
                </p>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                  {fmtDate(n.created_at)}
                </div>
              </div>

              {/* Mark read */}
              {!n.lu && (
                <button
                  onClick={() => handleMarkOne(n.id)}
                  title="Marquer comme lu"
                  style={{
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "transparent",
                    border: "1.5px solid #BFDBFE",
                    color: "var(--primary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <i className="fa-solid fa-check" style={{ fontSize: 12 }} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

const btnSecondary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 14px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  background: "var(--border)",
  color: "var(--text)",
  fontFamily: "inherit",
};

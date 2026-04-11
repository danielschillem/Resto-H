"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { KpiItem, Commande } from "@/types";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const KPI_COLORS: Record<string, { bg: string; color: string }> = {
  blue: { bg: "#EFF6FF", color: "var(--primary)" },
  teal: { bg: "#F0FDFA", color: "var(--teal)" },
  green: { bg: "#F0FDF4", color: "var(--success)" },
  amber: { bg: "#FFFBEB", color: "var(--warning)" },
  purple: { bg: "#F5F3FF", color: "var(--purple)" },
  red: { bg: "#FEF2F2", color: "var(--danger)" },
};

const BADGE_MAP: Record<string, { bg: string; color: string }> = {
  validee: { bg: "#D1FAE5", color: "#065F46" },
  en_attente: { bg: "#FEF3C7", color: "#92400E" },
  en_cours: { bg: "#DBEAFE", color: "#1E40AF" },
  livree: { bg: "#D1FAE5", color: "#065F46" },
  rejetee: { bg: "#FEE2E2", color: "#991B1B" },
};

const STATUT_LABELS: Record<string, string> = {
  validee: "Validée",
  en_attente: "En attente",
  en_cours: "En cours",
  livree: "Livrée",
  rejetee: "Rejetée",
};

const REPAS_LABELS: Record<string, string> = {
  petit_dejeuner: "Petit-déj.",
  dejeuner: "Déjeuner",
  diner: "Dîner",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [chartData, setChartData] = useState<{
    labels: string[];
    malades: number[];
    personnel: number[];
    clients: number[];
  } | null>(null);
  const [repartition, setRepartition] = useState<{
    labels: string[];
    data: number[];
  } | null>(null);
  const barRef = useRef<HTMLCanvasElement>(null);
  const donutRef = useRef<HTMLCanvasElement>(null);
  const chartsRef = useRef<{ bar?: Chart; donut?: Chart }>({});

  useEffect(() => {
    api
      .dashboard()
      .then((d) => {
        setKpis(d.kpis || []);
        setCommandes(d.commandes_recentes || []);
        setChartData(d.chart_semaine || null);
        setRepartition(d.repartition || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (chartData && barRef.current) {
      chartsRef.current.bar?.destroy();
      chartsRef.current.bar = new Chart(barRef.current, {
        type: "bar",
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: "Malades",
              data: chartData.malades,
              backgroundColor: "#3B82F6",
            },
            {
              label: "Personnel",
              data: chartData.personnel,
              backgroundColor: "#10B981",
            },
            {
              label: "Clients",
              data: chartData.clients,
              backgroundColor: "#F59E0B",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } },
        },
      });
    }
  }, [chartData]);

  useEffect(() => {
    if (repartition && donutRef.current) {
      chartsRef.current.donut?.destroy();
      chartsRef.current.donut = new Chart(donutRef.current, {
        type: "doughnut",
        data: {
          labels: repartition.labels,
          datasets: [
            {
              data: repartition.data,
              backgroundColor: [
                "#3B82F6",
                "#10B981",
                "#F59E0B",
                "#8B5CF6",
                "#EF4444",
              ],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } },
        },
      });
    }
  }, [repartition]);

  useEffect(() => {
    return () => {
      chartsRef.current.bar?.destroy();
      chartsRef.current.donut?.destroy();
    };
  }, []);

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
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>
            Bonjour, {user?.prenom || user?.nom}{" "}
            <i
              className="fa-solid fa-hand"
              style={{ marginLeft: 4, color: "#F59E0B" }}
            />
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}>
            Vue d&apos;ensemble de la journée
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid-kpi" style={{ gap: 16, marginBottom: 24 }}>
        {kpis.map((k, i) => {
          const c = KPI_COLORS[k.color] || KPI_COLORS.blue;
          return (
            <div
              key={i}
              style={{
                background: "white",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                padding: 20,
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: c.bg,
                  color: c.color,
                  flexShrink: 0,
                }}
              >
                <i className={`fa-solid ${k.icon}`} style={{ fontSize: 20 }} />
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
                  {k.val}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-sm)",
                    marginTop: 4,
                  }}
                >
                  {k.label}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    marginTop: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color:
                      k.trend === "up" ? "var(--success)" : "var(--danger)",
                  }}
                >
                  <i
                    className={`fa-solid ${k.trend === "up" ? "fa-arrow-trend-up" : "fa-arrow-trend-down"}`}
                  />
                  {k.trendText}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid-2-1" style={{ gap: 16, marginBottom: 24 }}>
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            padding: 20,
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              Consommations hebdomadaires
            </div>
            <div
              style={{ fontSize: 12, color: "var(--text-sm)", marginTop: 2 }}
            >
              Quantités servies par repas (semaine en cours)
            </div>
          </div>
          <div style={{ position: "relative", height: 240 }}>
            <canvas ref={barRef} />
          </div>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            padding: 20,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Répartition par type
          </div>
          <div style={{ position: "relative", height: 200 }}>
            <canvas ref={donutRef} />
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div
        style={{
          background: "white",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            Commandes récentes
          </div>
          <a
            href="/commandes"
            style={{
              fontSize: 12,
              color: "var(--primary)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Voir toutes <i className="fa-solid fa-arrow-right" />
          </a>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th style={thStyle}>Réf.</th>
                <th style={thStyle}>Service</th>
                <th style={thStyle}>Repas</th>
                <th style={thStyle}>Portions</th>
                <th style={thStyle}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {commandes.map((c) => {
                const badge = BADGE_MAP[c.statut] || BADGE_MAP.en_attente;
                return (
                  <tr key={c.id}>
                    <td style={tdStyle}>
                      <b>{c.reference}</b>
                    </td>
                    <td style={tdStyle}>{c.service?.nom}</td>
                    <td style={tdStyle}>{REPAS_LABELS[c.repas] || c.repas}</td>
                    <td style={tdStyle}>{c.nb_portions}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {STATUT_LABELS[c.statut] || c.statut}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {commandes.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      color: "var(--text-sm)",
                    }}
                  >
                    Aucune commande récente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const thStyle: React.CSSProperties = {
  padding: "11px 14px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-sm)",
  textTransform: "uppercase",
  letterSpacing: ".5px",
  borderBottom: "1px solid var(--border)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #F1F5F9",
  fontSize: 13,
  verticalAlign: "middle",
};

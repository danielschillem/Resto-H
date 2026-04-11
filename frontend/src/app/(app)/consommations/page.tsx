"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { downloadCsv, exportPdf } from "@/lib/export";
import { Consommation } from "@/types";
import Modal from "@/components/Modal";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export default function ConsommationsPage() {
  const [consommations, setConsommations] = useState<Consommation[]>([]);
  const [totaux, setTotaux] = useState<Record<string, number>>({});
  const [kpis, setKpis] = useState<{
    portions_servies: number;
    cout_reel: number;
    ecart_budgetaire: number;
    taux_gaspillage: number;
  }>({
    portions_servies: 0,
    cout_reel: 0,
    ecart_budgetaire: 0,
    taux_gaspillage: 0,
  });
  const [periode, setPeriode] = useState<string>("semaine");
  const [saisieModal, setSaisieModal] = useState(false);
  const [saisieForm, setSaisieForm] = useState({
    date: "",
    repas: "dejeuner",
    menu_servi: "",
    nb_malades: 0,
    nb_personnel: 0,
    nb_clients: 0,
    cout_prevu: 0,
    cout_reel: 0,
  });
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<Chart | null>(null);

  useEffect(() => {
    loadData();
  }, [periode]);

  const loadData = () => {
    api
      .consommations(`periode=${periode}`)
      .then((d) => {
        setConsommations(d.consommations || []);
        setTotaux(d.totaux || {});
      })
      .catch(() => {});
    api
      .consoKpis()
      .then((d) => setKpis(d as typeof kpis))
      .catch(() => {});
  };

  const HEADERS_CONSO = [
    "Date",
    "Repas",
    "Menu servi",
    "Malades",
    "Personnel",
    "Clients",
    "Total",
    "Coût prévu",
    "Coût réel",
    "Écart",
  ];
  const consoRows = () =>
    consommations.map((c) => [
      c.date,
      c.repas,
      c.menu_servi,
      c.nb_malades,
      c.nb_personnel,
      c.nb_clients,
      c.total_portions,
      c.cout_prevu ?? 0,
      c.cout_reel ?? 0,
      c.ecart ?? 0,
    ]);

  const exportConsoCsv = () => {
    downloadCsv(
      [HEADERS_CONSO, ...consoRows()],
      `consommations_${periode}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const exportConsoPdf = () => {
    exportPdf({
      title: "Suivi des Consommations",
      subtitle: `Période : ${periode === "semaine" ? "Semaine en cours" : periode === "semaine_precedente" ? "Semaine précédente" : "Ce mois"}`,
      headers: HEADERS_CONSO,
      rows: consoRows(),
      footerRow: totaux.total_portions
        ? [
            "TOTAL",
            "",
            "",
            "",
            "",
            "",
            totaux.total_portions,
            totaux.cout_prevu ?? 0,
            totaux.cout_reel ?? 0,
            totaux.ecart ?? 0,
          ]
        : undefined,
      filename: `consommations_${periode}_${new Date().toISOString().slice(0, 10)}.pdf`,
      orientation: "landscape",
    });
  };

  const handleSaisie = async () => {
    if (!saisieForm.date) return alert("Veuillez saisir la date.");
    if (!saisieForm.menu_servi.trim())
      return alert("Veuillez saisir le menu servi.");
    if (
      Number(saisieForm.nb_malades) < 0 ||
      Number(saisieForm.nb_personnel) < 0 ||
      Number(saisieForm.nb_clients) < 0
    )
      return alert("Les nombres ne peuvent pas être négatifs.");
    if (
      Number(saisieForm.nb_malades) +
        Number(saisieForm.nb_personnel) +
        Number(saisieForm.nb_clients) ===
      0
    )
      return alert("Au moins un nombre de portions doit être supérieur à 0.");
    if (Number(saisieForm.cout_prevu) < 0 || Number(saisieForm.cout_reel) < 0)
      return alert("Les coûts ne peuvent pas être négatifs.");
    await api.createConsommation({
      ...saisieForm,
      nb_malades: Number(saisieForm.nb_malades),
      nb_personnel: Number(saisieForm.nb_personnel),
      nb_clients: Number(saisieForm.nb_clients),
      cout_prevu: Number(saisieForm.cout_prevu),
      cout_reel: Number(saisieForm.cout_reel),
    });
    setSaisieModal(false);
    setSaisieForm({
      date: "",
      repas: "dejeuner",
      menu_servi: "",
      nb_malades: 0,
      nb_personnel: 0,
      nb_clients: 0,
      cout_prevu: 0,
      cout_reel: 0,
    });
    loadData();
  };

  useEffect(() => {
    api
      .ecartsServices()
      .then((data) => {
        if (chartRef.current && data) {
          chartInst.current?.destroy();
          chartInst.current = new Chart(chartRef.current, {
            type: "bar",
            data: {
              labels: data.labels,
              datasets: [
                {
                  label: "Prévu",
                  data: data.prevu,
                  backgroundColor: "#3B82F6",
                },
                { label: "Réel", data: data.reel, backgroundColor: "#F59E0B" },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom" } },
            },
          });
        }
      })
      .catch(() => {});
    return () => {
      chartInst.current?.destroy();
    };
  }, []);

  const KPI_DATA = [
    {
      icon: "fa-bowl-food",
      color: "blue",
      val: kpis.portions_servies || totaux.total_portions || "—",
      label: "Portions servies (sem.)",
      trend: "up",
      text: "+3.2% vs sem. préc.",
    },
    {
      icon: "fa-sack-dollar",
      color: "green",
      val: (kpis.cout_reel || totaux.cout_reel || 0).toLocaleString("fr-FR"),
      label: "Coût réel (FCFA)",
      trend: "down",
      text: "-1.8% vs prévision",
    },
    {
      icon: "fa-scale-balanced",
      color: "amber",
      val: `${(kpis.ecart_budgetaire || totaux.ecart || 0) > 0 ? "+" : ""}${(kpis.ecart_budgetaire || totaux.ecart || 0).toLocaleString("fr-FR")}`,
      label: "Écart budgétaire (FCFA)",
      trend: (kpis.ecart_budgetaire || 0) <= 0 ? "up" : "down",
      text: "vs prévision",
    },
    {
      icon: "fa-recycle",
      color: "teal",
      val: `${kpis.taux_gaspillage || 0}%`,
      label: "Taux de gaspillage",
      trend: "down",
      text: "Objectif < 5%",
    },
  ];

  const KPI_COLORS: Record<string, { bg: string; color: string }> = {
    blue: { bg: "#EFF6FF", color: "var(--primary)" },
    green: { bg: "#F0FDF4", color: "var(--success)" },
    amber: { bg: "#FFFBEB", color: "var(--warning)" },
    teal: { bg: "#F0FDFA", color: "var(--teal)" },
  };

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
            Suivi des Consommations
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}>
            Quantités servies, coûts réels et analyse des écarts
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportConsoPdf} style={btnSecondary}>
            <i className="fa-solid fa-file-pdf" /> PDF
          </button>
          <button onClick={exportConsoCsv} style={btnSecondary}>
            <i className="fa-solid fa-file-csv" /> CSV
          </button>
          <button onClick={() => setSaisieModal(true)} style={btn}>
            <i className="fa-solid fa-plus" /> Saisir
          </button>
        </div>
      </div>

      {/* Period filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(
          [
            ["semaine", "Semaine en cours"],
            ["semaine_precedente", "Semaine précédente"],
            ["mois", "Ce mois"],
          ] as [string, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setPeriode(k)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: periode === k ? 600 : 500,
              cursor: "pointer",
              border: "none",
              background: periode === k ? "var(--primary)" : "white",
              color: periode === k ? "white" : "var(--text)",
              boxShadow: periode === k ? "none" : "0 0 0 1.5px var(--border)",
              fontFamily: "inherit",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* KPI Grid */}
      <div className="grid-kpi" style={{ gap: 16, marginBottom: 24 }}>
        {KPI_DATA.map((k, i) => {
          const c = KPI_COLORS[k.color];
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
                  {k.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div
        style={{
          background: "white",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          padding: 20,
          marginBottom: 16,
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
            Tableau des consommations journalières
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Repas</th>
                <th style={thStyle}>Menu servi</th>
                <th style={thStyle}>Malades</th>
                <th style={thStyle}>Personnel</th>
                <th style={thStyle}>Clients</th>
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Coût prévu</th>
                <th style={thStyle}>Coût réel</th>
                <th style={thStyle}>Écart</th>
              </tr>
            </thead>
            <tbody>
              {consommations.map((c, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{c.date}</td>
                  <td style={tdStyle}>{c.repas}</td>
                  <td style={tdStyle}>{c.menu_servi}</td>
                  <td style={tdStyle}>{c.nb_malades}</td>
                  <td style={tdStyle}>{c.nb_personnel}</td>
                  <td style={tdStyle}>{c.nb_clients}</td>
                  <td style={tdStyle}>{c.total_portions}</td>
                  <td style={tdStyle}>
                    {c.cout_prevu?.toLocaleString("fr-FR")}
                  </td>
                  <td style={tdStyle}>
                    {c.cout_reel?.toLocaleString("fr-FR")}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 600,
                      color:
                        c.ecart > 0
                          ? "var(--danger)"
                          : c.ecart < 0
                            ? "var(--success)"
                            : "var(--text-sm)",
                    }}
                  >
                    {c.ecart > 0 ? "+" : ""}
                    {c.ecart?.toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
              {consommations.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      color: "var(--text-sm)",
                    }}
                  >
                    Aucune donnée
                  </td>
                </tr>
              )}
            </tbody>
            {totaux.total_portions && (
              <tfoot>
                <tr style={{ background: "#F8FAFC", fontWeight: 700 }}>
                  <td colSpan={6} style={tdStyle}>
                    TOTAL SEMAINE
                  </td>
                  <td style={tdStyle}>{totaux.total_portions}</td>
                  <td style={tdStyle}>
                    {totaux.cout_prevu?.toLocaleString("fr-FR")}
                  </td>
                  <td style={tdStyle}>
                    {totaux.cout_reel?.toLocaleString("fr-FR")}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      color:
                        (totaux.ecart || 0) > 0
                          ? "var(--danger)"
                          : "var(--success)",
                    }}
                  >
                    {(totaux.ecart || 0) > 0 ? "+" : ""}
                    {totaux.ecart?.toLocaleString("fr-FR")}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ gap: 16 }}>
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            padding: 20,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Analyse des écarts par service
          </div>
          <div style={{ position: "relative", height: 240 }}>
            <canvas ref={chartRef} />
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
            Gaspillage & surplus
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {consommations
              .filter((c) => c.ecart > 0)
              .slice(0, 2)
              .map((c, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    background: "#FEF2F2",
                    borderRadius: 8,
                    borderLeft: "4px solid var(--danger)",
                  }}
                >
                  <div
                    style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}
                  >
                    Surplus — {c.menu_servi}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-sm)" }}>
                    {c.date} · Écart coût : +{c.ecart?.toLocaleString("fr-FR")}{" "}
                    FCFA
                  </div>
                </div>
              ))}
            {consommations
              .filter((c) => c.ecart < 0)
              .slice(0, 1)
              .map((c, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    background: "#F0FDF4",
                    borderRadius: 8,
                    borderLeft: "4px solid var(--success)",
                  }}
                >
                  <div
                    style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}
                  >
                    Économie — {c.menu_servi}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-sm)" }}>
                    {c.date} · Économie : {c.ecart?.toLocaleString("fr-FR")}{" "}
                    FCFA
                  </div>
                </div>
              ))}
            {consommations.filter((c) => c.ecart !== 0).length === 0 && (
              <div
                style={{
                  padding: 16,
                  textAlign: "center",
                  color: "var(--text-sm)",
                  fontSize: 13,
                }}
              >
                <i
                  className="fa-solid fa-check-circle"
                  style={{ color: "var(--success)", marginRight: 6 }}
                />
                Aucun écart significatif sur la période
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saisie modal */}
      <Modal
        open={saisieModal}
        onClose={() => setSaisieModal(false)}
        title="Saisir une consommation"
        icon="fa-bowl-food"
        maxWidth={560}
        footer={
          <>
            <button onClick={() => setSaisieModal(false)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleSaisie} style={btn}>
              <i className="fa-solid fa-check" /> Enregistrer
            </button>
          </>
        }
      >
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={saisieForm.date}
              onChange={(e) =>
                setSaisieForm({ ...saisieForm, date: e.target.value })
              }
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Repas</label>
            <select
              value={saisieForm.repas}
              onChange={(e) =>
                setSaisieForm({ ...saisieForm, repas: e.target.value })
              }
              style={inputStyle}
            >
              <option value="petit_dejeuner">Petit-déjeuner</option>
              <option value="dejeuner">Déjeuner</option>
              <option value="diner">Dîner</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Menu servi</label>
          <input
            value={saisieForm.menu_servi}
            onChange={(e) =>
              setSaisieForm({ ...saisieForm, menu_servi: e.target.value })
            }
            placeholder="Ex: Riz gras au poulet"
            style={inputStyle}
          />
        </div>
        <div className="grid-3" style={{ gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Nb malades</label>
            <input
              type="number"
              min={0}
              value={saisieForm.nb_malades}
              onChange={(e) =>
                setSaisieForm({
                  ...saisieForm,
                  nb_malades: Number(e.target.value),
                })
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Nb personnel</label>
            <input
              type="number"
              min={0}
              value={saisieForm.nb_personnel}
              onChange={(e) =>
                setSaisieForm({
                  ...saisieForm,
                  nb_personnel: Number(e.target.value),
                })
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Nb clients</label>
            <input
              type="number"
              min={0}
              value={saisieForm.nb_clients}
              onChange={(e) =>
                setSaisieForm({
                  ...saisieForm,
                  nb_clients: Number(e.target.value),
                })
              }
              style={inputStyle}
            />
          </div>
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
          <div>
            <label style={labelStyle}>Coût prévu (FCFA)</label>
            <input
              type="number"
              min={0}
              value={saisieForm.cout_prevu}
              onChange={(e) =>
                setSaisieForm({
                  ...saisieForm,
                  cout_prevu: Number(e.target.value),
                })
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Coût réel (FCFA)</label>
            <input
              type="number"
              min={0}
              value={saisieForm.cout_reel}
              onChange={(e) =>
                setSaisieForm({
                  ...saisieForm,
                  cout_reel: Number(e.target.value),
                })
              }
              style={inputStyle}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 14px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  background: "var(--primary)",
  color: "white",
  fontFamily: "inherit",
};
const btnSecondary: React.CSSProperties = {
  ...btn,
  background: "var(--border)",
  color: "var(--text)",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 500,
  marginBottom: 6,
  fontSize: 13,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid var(--border)",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
};
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ObservatoireData, RegimeSpecial, AnalyseMenu } from "@/types";

export default function ObservatoirePage() {
  const { user } = useAuth();
  const [data, setData] = useState<ObservatoireData | null>(null);
  const [regimes, setRegimes] = useState<RegimeSpecial[]>([]);
  const [analyses, setAnalyses] = useState<AnalyseMenu[]>([]);
  const [tab, setTab] = useState<"dashboard" | "regimes" | "menus">(
    "dashboard",
  );
  const [loading, setLoading] = useState(true);
  const [showProposerModal, setShowProposerModal] = useState(false);
  const [formMenu, setFormMenu] = useState({
    intitule: "",
    type_repas: "dejeuner",
    notes_nutritionnelles: "",
    allergenes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [obs, reg, ana] = await Promise.all([
        api.nutriObservatoire(),
        api.nutriRegimesActifs(),
        api.nutriAnalyseMenus(),
      ]);
      setData(obs);
      setRegimes(reg);
      setAnalyses(ana);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <i
          className="fa-solid fa-spinner fa-spin"
          style={{ fontSize: 32, color: "var(--primary)" }}
        />
      </div>
    );
  }

  const handleProposerMenu = async () => {
    try {
      await api.nutriProposerMenu(formMenu);
      setShowProposerModal(false);
      setFormMenu({
        intitule: "",
        type_repas: "dejeuner",
        notes_nutritionnelles: "",
        allergenes: "",
      });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const kpis = data.kpis;

  // Export CSV des régimes actifs
  const exportCsvRegimes = () => {
    const header = "Patient;Service;Type régime;Durée;Médecin;Statut\n";
    const rows = regimes.map(r =>
      `${r.patient_nom};${r.service?.nom || ""};${r.type_regime};${r.duree_jours}j;${r.medecin_prescripteur};${r.statut}`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `regimes_actifs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Impression du rapport observatoire
  const printObservatoire = () => {
    const regimeRows = data.regimes_par_type.labels.map((l, i) => `<tr><td>${l}</td><td>${data.regimes_par_type.data[i]}</td></tr>`).join("");
    const serviceRows = data.portions_par_service.labels.map((l, i) => `<tr><td>${l}</td><td>${data.portions_par_service.data[i]}</td></tr>`).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Observatoire Nutritionnel</title><style>body{font-family:Arial,sans-serif;padding:24px}h2{color:#6366f1}table{border-collapse:collapse;width:100%;margin-bottom:24px}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f0f0f0;font-weight:600}.kpi{display:inline-block;padding:12px 20px;margin:4px;background:#f8fafc;border:1px solid #ddd;border-radius:8px;text-align:center}.kpi b{display:block;font-size:20px;margin-bottom:4px}</style></head><body>
    <h2>Observatoire Nutritionnel — ${new Date().toLocaleDateString("fr-FR")}</h2>
    <div style="margin-bottom:20px">
      <div class="kpi"><b>${kpis.patients_hospitalises}</b>Patients hospitalisés</div>
      <div class="kpi"><b>${kpis.regimes_actifs}</b>Régimes actifs</div>
      <div class="kpi"><b>${kpis.portions_semaine}</b>Portions/semaine</div>
      <div class="kpi"><b>${kpis.cout_moyen_portion.toLocaleString("fr")} FCFA</b>Coût moyen/portion</div>
    </div>
    <h3>Régimes par type</h3><table><thead><tr><th>Type</th><th>Nombre</th></tr></thead><tbody>${regimeRows}</tbody></table>
    <h3>Portions par service</h3><table><thead><tr><th>Service</th><th>Portions</th></tr></thead><tbody>${serviceRows}</tbody></table>
    <p style="font-size:11px;color:#666">Imprimé le ${new Date().toLocaleDateString("fr-FR")} — SGRH</p>
    </body></html>`);
    w.document.close();
    w.print();
  };

  // Alertes nutritionnelles automatiques
  const alertes: { icon: string; color: string; message: string }[] = [];
  const totalPatients = kpis.patients_hospitalises || 1;
  const ratioRegime = kpis.regimes_actifs / totalPatients;
  if (ratioRegime > 0.5) {
    alertes.push({ icon: "fa-triangle-exclamation", color: "#dc2626", message: `Taux élevé de régimes spéciaux : ${Math.round(ratioRegime * 100)}% des patients (${kpis.regimes_actifs}/${totalPatients})` });
  }
  if (kpis.cout_moyen_portion > 5000) {
    alertes.push({ icon: "fa-coins", color: "#f59e0b", message: `Coût moyen par portion élevé : ${kpis.cout_moyen_portion.toLocaleString("fr")} FCFA — vérifier les approvisionnements` });
  }
  const servicesData = data.portions_par_service;
  if (servicesData.data.length > 0) {
    const avgPortions = servicesData.data.reduce((a, b) => a + b, 0) / servicesData.data.length;
    servicesData.labels.forEach((label, i) => {
      if (servicesData.data[i] > avgPortions * 2) {
        alertes.push({ icon: "fa-chart-bar", color: "#7c3aed", message: `Service "${label}" : consommation très élevée (${servicesData.data[i]} portions, moy. ${Math.round(avgPortions)})` });
      }
    });
  }
  if (kpis.regimes_actifs === 0 && totalPatients > 10) {
    alertes.push({ icon: "fa-info-circle", color: "#2563eb", message: "Aucun régime spécial actif alors que " + totalPatients + " patients sont hospitalisés — vérifier les prescriptions" });
  }

  const kpiCards = [
    {
      icon: "fa-hospital-user",
      color: "#6366f1",
      label: "Patients hospitalisés",
      val: kpis.patients_hospitalises,
    },
    {
      icon: "fa-heart-pulse",
      color: "#ef4444",
      label: "Régimes spéciaux actifs",
      val: kpis.regimes_actifs,
    },
    {
      icon: "fa-bowl-food",
      color: "#3b82f6",
      label: "Portions cette semaine",
      val: kpis.portions_semaine,
      trend: kpis.portions_evolution,
    },
    {
      icon: "fa-coins",
      color: "#f59e0b",
      label: "Coût moyen / portion (FCFA)",
      val: kpis.cout_moyen_portion.toLocaleString("fr"),
    },
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            <i
              className="fa-solid fa-microscope"
              style={{ marginRight: 10, color: "var(--primary)" }}
            />
            Observatoire Nutritionnel
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              margin: "4px 0 0",
              fontSize: 14,
            }}
          >
            Analyse des données de restauration hospitalière
          </p>
        </div>
        {user?.role === "nutritionniste" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={exportCsvRegimes}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "10px 16px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <i className="fa-solid fa-file-csv" style={{ marginRight: 4 }} /> CSV Régimes
            </button>
            <button
              onClick={printObservatoire}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "10px 16px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <i className="fa-solid fa-print" style={{ marginRight: 4 }} /> Imprimer
            </button>
            <button
              onClick={() => setShowProposerModal(true)}
              style={{
                background: "var(--primary)",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <i className="fa-solid fa-plus" style={{ marginRight: 6 }} />{" "}
              Proposer un menu
            </button>
          </div>
        )}
      </div>

      {/* Alertes nutritionnelles */}
      {alertes.length > 0 && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "#991B1B" }}>
            <i className="fa-solid fa-exclamation-triangle" style={{ marginRight: 8 }} />
            Alertes nutritionnelles
          </div>
          {alertes.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13, color: a.color }}>
              <i className={`fa-solid ${a.icon}`} />
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {kpiCards.map((k, i) => (
          <div
            key={i}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "18px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: `${k.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i
                  className={`fa-solid ${k.icon}`}
                  style={{ color: k.color, fontSize: 18 }}
                />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{k.val}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {k.label}
                </div>
              </div>
            </div>
            {k.trend !== undefined && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: k.trend >= 0 ? "#22c55e" : "#ef4444",
                }}
              >
                <i
                  className={`fa-solid fa-arrow-${k.trend >= 0 ? "up" : "down"}`}
                  style={{ marginRight: 4 }}
                />
                {Math.abs(k.trend)}% vs semaine précédente
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "2px solid var(--border)",
          marginBottom: 24,
        }}
      >
        {(
          [
            ["dashboard", "Tableau de bord"],
            ["regimes", "Régimes actifs"],
            ["menus", "Analyse menus"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: "none",
              border: "none",
              padding: "10px 20px",
              cursor: "pointer",
              fontWeight: tab === key ? 700 : 500,
              fontSize: 13,
              color: tab === key ? "var(--primary)" : "var(--text-secondary)",
              borderBottom:
                tab === key
                  ? "2px solid var(--primary)"
                  : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dashboard tab */}
      {tab === "dashboard" && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          {/* Répartition par repas */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px" }}>
              <i
                className="fa-solid fa-chart-pie"
                style={{ marginRight: 8, color: "#6366f1" }}
              />
              Répartition par repas
            </h3>
            {data.repartition_repas.labels.map((label, i) => {
              const total = data.repartition_repas.data.reduce(
                (a, b) => a + b,
                0,
              );
              const pct =
                total > 0
                  ? Math.round((data.repartition_repas.data[i] / total) * 100)
                  : 0;
              const colors = ["#f59e0b", "#3b82f6", "#8b5cf6"];
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      marginBottom: 4,
                    }}
                  >
                    <span>{label}</span>
                    <span style={{ fontWeight: 600 }}>
                      {data.repartition_repas.data[i]} portions ({pct}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: "var(--border)",
                    }}
                  >
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: colors[i],
                        width: `${pct}%`,
                        transition: "width .3s",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Régimes par type */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px" }}>
              <i
                className="fa-solid fa-heart-pulse"
                style={{ marginRight: 8, color: "#ef4444" }}
              />
              Régimes spéciaux par type
            </h3>
            {data.regimes_par_type.labels.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                Aucun régime actif
              </p>
            ) : (
              data.regimes_par_type.labels.map((label, i) => {
                const max = Math.max(...data.regimes_par_type.data);
                const pct =
                  max > 0
                    ? Math.round((data.regimes_par_type.data[i] / max) * 100)
                    : 0;
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        marginBottom: 4,
                      }}
                    >
                      <span>{label}</span>
                      <span style={{ fontWeight: 600 }}>
                        {data.regimes_par_type.data[i]}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: "var(--border)",
                      }}
                    >
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          background: "#ef4444",
                          width: `${pct}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Portions par service */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px" }}>
              <i
                className="fa-solid fa-hospital"
                style={{ marginRight: 8, color: "#22c55e" }}
              />
              Portions par service
            </h3>
            {data.portions_par_service.labels.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                Aucune donnée
              </p>
            ) : (
              data.portions_par_service.labels.map((label, i) => {
                const max = Math.max(...data.portions_par_service.data);
                const pct =
                  max > 0
                    ? Math.round(
                        (data.portions_par_service.data[i] / max) * 100,
                      )
                    : 0;
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        marginBottom: 4,
                      }}
                    >
                      <span>{label}</span>
                      <span style={{ fontWeight: 600 }}>
                        {data.portions_par_service.data[i]}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: "var(--border)",
                      }}
                    >
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          background: "#22c55e",
                          width: `${pct}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Évolution hebdomadaire */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px" }}>
              <i
                className="fa-solid fa-chart-line"
                style={{ marginRight: 8, color: "#3b82f6" }}
              />
              Évolution sur 8 semaines
            </h3>
            <div
              style={{
                display: "flex",
                gap: 4,
                alignItems: "flex-end",
                height: 120,
              }}
            >
              {data.evolution_hebdo.labels.map((label, i) => {
                const maxP = Math.max(...data.evolution_hebdo.portions, 1);
                const h = Math.round(
                  (data.evolution_hebdo.portions[i] / maxP) * 100,
                );
                return (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div
                      style={{ fontSize: 10, fontWeight: 600, marginBottom: 4 }}
                    >
                      {data.evolution_hebdo.portions[i]}
                    </div>
                    <div
                      style={{
                        height: `${h}%`,
                        minHeight: 4,
                        background: "#3b82f6",
                        borderRadius: "4px 4px 0 0",
                        margin: "0 auto",
                        width: "70%",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-secondary)",
                        marginTop: 4,
                      }}
                    >
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Régimes tab */}
      {tab === "regimes" && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Patient
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Service
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Type régime
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Lit
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Durée
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Instructions
                </th>
              </tr>
            </thead>
            <tbody>
              {regimes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Aucun régime actif
                  </td>
                </tr>
              ) : (
                regimes.map((r) => (
                  <tr
                    key={r.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={{ padding: "10px 16px", fontWeight: 600 }}>
                      {r.patient_nom}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      {r.service?.nom || "-"}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <span
                        style={{
                          background: "#fef3c7",
                          color: "#92400e",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        {r.type_regime}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px" }}>{r.lit || "-"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      {r.duree_jours} jours
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.instructions || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Menus tab */}
      {tab === "menus" && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Menu
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Repas
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Portions
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Commandes
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    fontWeight: 600,
                  }}
                >
                  Coût estimé (FCFA)
                </th>
              </tr>
            </thead>
            <tbody>
              {analyses.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Aucune donnée cette semaine
                  </td>
                </tr>
              ) : (
                analyses.map((a, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={{ padding: "10px 16px", fontWeight: 600 }}>
                      {a.menu?.intitule || "-"}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <span
                        style={{
                          background:
                            a.repas === "petit_dejeuner"
                              ? "#fef3c7"
                              : a.repas === "dejeuner"
                                ? "#dbeafe"
                                : "#ede9fe",
                          color:
                            a.repas === "petit_dejeuner"
                              ? "#92400e"
                              : a.repas === "dejeuner"
                                ? "#1e40af"
                                : "#5b21b6",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        {a.repas === "petit_dejeuner"
                          ? "Petit-déj."
                          : a.repas === "dejeuner"
                            ? "Déjeuner"
                            : "Dîner"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {a.total_portions}
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right" }}>
                      {a.nb_commandes}
                    </td>
                    <td
                      style={{
                        padding: "10px 16px",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {a.cout_estime.toLocaleString("fr")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal proposer menu */}
      {showProposerModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: 14,
              padding: 28,
              width: 480,
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>
              <i
                className="fa-solid fa-lightbulb"
                style={{ marginRight: 8, color: "#f59e0b" }}
              />
              Proposer un nouveau menu
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Intitulé *
                </label>
                <input
                  value={formMenu.intitule}
                  onChange={(e) =>
                    setFormMenu({ ...formMenu, intitule: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontSize: 13,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Type de repas *
                </label>
                <select
                  value={formMenu.type_repas}
                  onChange={(e) =>
                    setFormMenu({ ...formMenu, type_repas: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontSize: 13,
                  }}
                >
                  <option value="petit_dejeuner">Petit-déjeuner</option>
                  <option value="dejeuner">Déjeuner</option>
                  <option value="diner">Dîner</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Notes nutritionnelles
                </label>
                <textarea
                  value={formMenu.notes_nutritionnelles}
                  onChange={(e) =>
                    setFormMenu({
                      ...formMenu,
                      notes_nutritionnelles: e.target.value,
                    })
                  }
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontSize: 13,
                    resize: "vertical",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Allergènes
                </label>
                <input
                  value={formMenu.allergenes}
                  onChange={(e) =>
                    setFormMenu({ ...formMenu, allergenes: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontSize: 13,
                  }}
                  placeholder="Ex: gluten, lactose..."
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                onClick={() => setShowProposerModal(false)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleProposerMenu}
                disabled={!formMenu.intitule}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--primary)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  opacity: formMenu.intitule ? 1 : 0.5,
                }}
              >
                Soumettre la proposition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

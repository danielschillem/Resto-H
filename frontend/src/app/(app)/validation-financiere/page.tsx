"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { DevisEstimatif } from "@/types";

const STATUT_COLORS: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  brouillon: { bg: "#f3f4f6", color: "#374151", label: "Brouillon" },
  soumis: { bg: "#fef3c7", color: "#92400e", label: "En attente" },
  valide: { bg: "#dcfce7", color: "#166534", label: "Validé" },
  rejete: { bg: "#fee2e2", color: "#991b1b", label: "Rejeté" },
};

export default function ValidationFinancierePage() {
  const [devis, setDevis] = useState<DevisEstimatif[]>([]);
  const [etatCmd, setEtatCmd] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<"devis" | "etat">("devis");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [selectedDevis, setSelectedDevis] = useState<DevisEstimatif | null>(
    null,
  );
  const [showRejetModal, setShowRejetModal] = useState(false);
  const [rejetComment, setRejetComment] = useState("");
  const [rejetId, setRejetId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, e] = await Promise.all([
        api.dafDevis(filter ? { statut: filter } : undefined),
        api.dafEtatCommandes(),
      ]);
      setDevis(d);
      setEtatCmd(e);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleValider = async (id: number) => {
    try {
      await api.dafValiderDevis(id);
      load();
      setSelectedDevis(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejeter = async () => {
    if (!rejetId || !rejetComment) return;
    try {
      await api.dafRejeterDevis(rejetId, rejetComment);
      setShowRejetModal(false);
      setRejetComment("");
      setRejetId(null);
      setSelectedDevis(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <i
          className="fa-solid fa-spinner fa-spin"
          style={{ fontSize: 32, color: "var(--primary)" }}
        />
      </div>
    );
  }

  const devisSoumis = devis.filter((d) => d.statut === "soumis").length;
  const totalValides = devis
    .filter((d) => d.statut === "valide")
    .reduce((s, d) => s + d.total_estime, 0);

  const printDevis = (d: DevisEstimatif) => {
    const lignesHtml = d.lignes
      .map(
        (l) =>
          `<tr><td style="padding:6px 10px;border:1px solid #ddd">${l.article}</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:right">${l.qte_estimee}</td><td style="padding:6px 10px;border:1px solid #ddd">${l.unite}</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:right">${l.prix_unitaire.toLocaleString("fr")}</td><td style="padding:6px 10px;border:1px solid #ddd;text-align:right;font-weight:600">${l.montant_estime.toLocaleString("fr")}</td></tr>`,
      )
      .join("");
    const statutLabel = STATUT_COLORS[d.statut]?.label || d.statut;
    const statutColor =
      d.statut === "valide"
        ? "#166534"
        : d.statut === "rejete"
          ? "#991b1b"
          : "#92400e";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document
      .write(`<html><head><title>Devis ${d.reference || ""}</title><style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#f0f0f0;padding:8px 10px;border:1px solid #ddd;font-size:12px;text-align:left}td{font-size:12px}.stamp{display:inline-block;padding:8px 24px;border:3px solid ${statutColor};color:${statutColor};font-size:18px;font-weight:700;border-radius:8px;transform:rotate(-5deg);margin-top:20px}</style></head><body>
    <h2>Devis Estimatif — Semaine du ${d.semaine_debut ? new Date(d.semaine_debut).toLocaleDateString("fr") : "-"}</h2>
    <p><b>Référence:</b> ${d.reference || "-"} | <b>Soumis par:</b> ${d.soumis_par ? d.soumis_par.prenom + " " + d.soumis_par.nom : "-"} | <b>Date:</b> ${d.date_soumission ? new Date(d.date_soumission).toLocaleDateString("fr") : "-"}</p>
    <table><thead><tr><th>Article</th><th style="text-align:right">Qté</th><th>Unité</th><th style="text-align:right">P.U.</th><th style="text-align:right">Montant</th></tr></thead><tbody>${lignesHtml}</tbody><tfoot><tr style="font-weight:700"><td colspan="4" style="padding:8px 10px;text-align:right;border:1px solid #ddd">TOTAL</td><td style="padding:8px 10px;text-align:right;border:1px solid #ddd">${d.total_estime.toLocaleString("fr")} FCFA</td></tr></tfoot></table>
    <div style="text-align:center;margin-top:30px"><span class="stamp">${statutLabel.toUpperCase()}</span></div>
    ${d.commentaire_rejet ? `<p style="margin-top:20px;color:#991b1b"><b>Motif de rejet:</b> ${d.commentaire_rejet}</p>` : ""}
    <p style="margin-top:30px;font-size:11px;color:#666">Imprimé le ${new Date().toLocaleDateString("fr-FR")} — SGRH</p>
    </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          <i
            className="fa-solid fa-file-invoice-dollar"
            style={{ marginRight: 10, color: "var(--primary)" }}
          />
          Validation Financière
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            margin: "4px 0 0",
            fontSize: 14,
          }}
        >
          Validation des devis estimatifs et suivi budgétaire
        </p>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "#fef3c718",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i
              className="fa-solid fa-clock"
              style={{ color: "#f59e0b", fontSize: 18 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{devisSoumis}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Devis en attente
            </div>
          </div>
        </div>
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "#dcfce718",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i
              className="fa-solid fa-check-circle"
              style={{ color: "#22c55e", fontSize: 18 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {devis.filter((d) => d.statut === "valide").length}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Devis validés
            </div>
          </div>
        </div>
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "#3b82f618",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i
              className="fa-solid fa-sack-dollar"
              style={{ color: "#3b82f6", fontSize: 18 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {totalValides.toLocaleString("fr")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Total validé (FCFA)
            </div>
          </div>
        </div>
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "#ef444418",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i
              className="fa-solid fa-xmark-circle"
              style={{ color: "#ef4444", fontSize: 18 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {devis.filter((d) => d.statut === "rejete").length}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Devis rejetés
            </div>
          </div>
        </div>
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
            ["devis", "Devis estimatifs"],
            ["etat", "État des commandes"],
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
            {key === "devis" && devisSoumis > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 8,
                }}
              >
                {devisSoumis}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Devis tab */}
      {tab === "devis" && (
        <>
          {/* Filter */}
          <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
            {["", "soumis", "valide", "rejete"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: "pointer",
                  border:
                    filter === f
                      ? "1px solid var(--primary)"
                      : "1px solid var(--border)",
                  background: filter === f ? "var(--primary)" : "transparent",
                  color: filter === f ? "#fff" : "var(--text-primary)",
                  fontWeight: filter === f ? 600 : 400,
                }}
              >
                {f === ""
                  ? "Tous"
                  : f === "soumis"
                    ? "En attente"
                    : f === "valide"
                      ? "Validés"
                      : "Rejetés"}
              </button>
            ))}
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
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
                    Période
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "12px 16px",
                      fontWeight: 600,
                    }}
                  >
                    Total estimé (FCFA)
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px 16px",
                      fontWeight: 600,
                    }}
                  >
                    Soumis par
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "12px 16px",
                      fontWeight: 600,
                    }}
                  >
                    Statut
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: "12px 16px",
                      fontWeight: 600,
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {devis.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: 24,
                        textAlign: "center",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Aucun devis
                    </td>
                  </tr>
                ) : (
                  devis.map((d) => {
                    const st =
                      STATUT_COLORS[d.statut] || STATUT_COLORS.brouillon;
                    return (
                      <tr
                        key={d.id}
                        style={{ borderBottom: "1px solid var(--border)" }}
                      >
                        <td style={{ padding: "10px 16px", fontWeight: 600 }}>
                          {new Date(d.semaine_debut).toLocaleDateString("fr")} -{" "}
                          {new Date(d.semaine_fin).toLocaleDateString("fr")}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            textAlign: "right",
                            fontWeight: 600,
                          }}
                        >
                          {d.total_estime.toLocaleString("fr")}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          {d.soumis_par
                            ? `${d.soumis_par.prenom} ${d.soumis_par.nom}`
                            : "-"}
                        </td>
                        <td
                          style={{ padding: "10px 16px", textAlign: "center" }}
                        >
                          <span
                            style={{
                              background: st.bg,
                              color: st.color,
                              padding: "2px 10px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td
                          style={{ padding: "10px 16px", textAlign: "center" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              gap: 6,
                            }}
                          >
                            <button
                              onClick={() => setSelectedDevis(d)}
                              style={{
                                background: "var(--bg-hover)",
                                border: "1px solid var(--border)",
                                padding: "4px 10px",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              <i className="fa-solid fa-eye" />
                            </button>
                            {d.statut === "soumis" && (
                              <>
                                <button
                                  onClick={() => handleValider(d.id)}
                                  style={{
                                    background: "#dcfce7",
                                    border: "1px solid #86efac",
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    fontSize: 12,
                                    color: "#166534",
                                  }}
                                >
                                  <i className="fa-solid fa-check" />
                                </button>
                                <button
                                  onClick={() => {
                                    setRejetId(d.id);
                                    setShowRejetModal(true);
                                  }}
                                  style={{
                                    background: "#fee2e2",
                                    border: "1px solid #fca5a5",
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    fontSize: 12,
                                    color: "#991b1b",
                                  }}
                                >
                                  <i className="fa-solid fa-xmark" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* État commandes tab */}
      {tab === "etat" && etatCmd && (
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
              className="fa-solid fa-table"
              style={{ marginRight: 8, color: "#3b82f6" }}
            />
            Récapitulatif commandes — Semaine du{" "}
            {etatCmd.semaine_debut as string}
          </h3>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontWeight: 600,
                  }}
                >
                  Service
                </th>
                {["Lun", "Mar", "Mer", "Jeu", "Ven"].map((j) => (
                  <th
                    key={j}
                    style={{
                      textAlign: "right",
                      padding: "10px 12px",
                      fontWeight: 600,
                    }}
                  >
                    {j}
                  </th>
                ))}
                <th
                  style={{
                    textAlign: "right",
                    padding: "10px 12px",
                    fontWeight: 600,
                  }}
                >
                  Total
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "10px 12px",
                    fontWeight: 600,
                  }}
                >
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {(
                (etatCmd.services as Array<{
                  nom: string;
                  jours: number[];
                  total: number;
                  pct: string;
                }>) || []
              ).map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                    {s.nom}
                  </td>
                  {s.jours.map((v: number, j: number) => (
                    <td
                      key={j}
                      style={{ padding: "8px 12px", textAlign: "right" }}
                    >
                      {v}
                    </td>
                  ))}
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontWeight: 700,
                    }}
                  >
                    {s.total}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {s.pct}
                  </td>
                </tr>
              ))}
              <tr style={{ background: "var(--bg-hover)", fontWeight: 700 }}>
                <td style={{ padding: "8px 12px" }}>TOTAL</td>
                {((etatCmd.totaux as number[]) || []).map((v, i) => (
                  <td
                    key={i}
                    style={{ padding: "8px 12px", textAlign: "right" }}
                  >
                    {v}
                  </td>
                ))}
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  {etatCmd.grand_total as number}
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Devis detail modal */}
      {selectedDevis && (
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
              width: 600,
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                <i
                  className="fa-solid fa-file-invoice"
                  style={{ marginRight: 8, color: "var(--primary)" }}
                />
                Devis —{" "}
                {new Date(selectedDevis.semaine_debut).toLocaleDateString("fr")}
              </h2>
              <button
                onClick={() => setSelectedDevis(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 13 }}>
                <strong>Total estimé:</strong>{" "}
                {selectedDevis.total_estime.toLocaleString("fr")} FCFA
              </div>
              <div style={{ fontSize: 13 }}>
                <strong>Statut:</strong>{" "}
                {STATUT_COLORS[selectedDevis.statut]?.label}
              </div>
              <div style={{ fontSize: 13 }}>
                <strong>Soumis par:</strong>{" "}
                {selectedDevis.soumis_par
                  ? `${selectedDevis.soumis_par.prenom} ${selectedDevis.soumis_par.nom}`
                  : "-"}
              </div>
              <div style={{ fontSize: 13 }}>
                <strong>Date soumission:</strong>{" "}
                {selectedDevis.date_soumission
                  ? new Date(selectedDevis.date_soumission).toLocaleDateString(
                      "fr",
                    )
                  : "-"}
              </div>
            </div>
            {selectedDevis.commentaire_rejet && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  fontSize: 13,
                }}
              >
                <strong style={{ color: "#991b1b" }}>
                  <i
                    className="fa-solid fa-comment-slash"
                    style={{ marginRight: 6 }}
                  />
                  Motif de rejet:
                </strong>{" "}
                {selectedDevis.commentaire_rejet}
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 12,
              }}
            >
              <button
                onClick={() => printDevis(selectedDevis)}
                style={{
                  padding: "6px 14px",
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                <i className="fa-solid fa-print" style={{ marginRight: 4 }} />{" "}
                Imprimer ce devis
              </button>
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>
                    Article
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 10px" }}>
                    Qté
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>
                    Unité
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 10px" }}>
                    P.U.
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 10px" }}>
                    Montant
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedDevis.lignes.map((l) => (
                  <tr
                    key={l.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={{ padding: "6px 10px" }}>{l.article}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      {l.qte_estimee}
                    </td>
                    <td style={{ padding: "6px 10px" }}>{l.unite}</td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      {l.prix_unitaire.toLocaleString("fr")}
                    </td>
                    <td
                      style={{
                        padding: "6px 10px",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {l.montant_estime.toLocaleString("fr")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700 }}>
                  <td
                    colSpan={4}
                    style={{ padding: "8px 10px", textAlign: "right" }}
                  >
                    TOTAL
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right" }}>
                    {selectedDevis.total_estime.toLocaleString("fr")} FCFA
                  </td>
                </tr>
              </tfoot>
            </table>
            {selectedDevis.statut === "soumis" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  onClick={() => {
                    setRejetId(selectedDevis.id);
                    setShowRejetModal(true);
                  }}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 8,
                    border: "1px solid #fca5a5",
                    background: "#fee2e2",
                    color: "#991b1b",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <i className="fa-solid fa-xmark" style={{ marginRight: 6 }} />
                  Rejeter
                </button>
                <button
                  onClick={() => handleValider(selectedDevis.id)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 8,
                    border: "none",
                    background: "#22c55e",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <i className="fa-solid fa-check" style={{ marginRight: 6 }} />
                  Valider
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rejet modal */}
      {showRejetModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: 14,
              padding: 28,
              width: 420,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>
              <i
                className="fa-solid fa-xmark-circle"
                style={{ marginRight: 8, color: "#ef4444" }}
              />
              Motif du rejet
            </h2>
            <textarea
              value={rejetComment}
              onChange={(e) => setRejetComment(e.target.value)}
              rows={4}
              placeholder="Indiquez le motif du rejet..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                fontSize: 13,
                resize: "vertical",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 16,
              }}
            >
              <button
                onClick={() => {
                  setShowRejetModal(false);
                  setRejetComment("");
                  setRejetId(null);
                }}
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
                onClick={handleRejeter}
                disabled={!rejetComment}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#ef4444",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  opacity: rejetComment ? 1 : 0.5,
                }}
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

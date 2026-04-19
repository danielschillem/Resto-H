"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { downloadCsv, exportPdf } from "@/lib/export";
import Modal from "@/components/Modal";
import { DevisEstimatif, ConsommationArticle } from "@/types";

type Tab = "commandes" | "conso" | "devis" | "validation" | "synthese";

export default function EtatsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("commandes");
  const [etatCmd, setEtatCmd] = useState<{
    services: { nom: string; jours: number[]; total: number; pct: string }[];
    totaux: number[];
  } | null>(null);
  const [devis, setDevis] = useState<DevisEstimatif[]>([]);
  const [articles, setArticles] = useState<ConsommationArticle[]>([]);
  const [articlesTotal, setArticlesTotal] = useState(0);
  const [validations, setValidations] = useState<
    {
      document: string;
      periode: string;
      soumis_par: string;
      date_soumission: string;
      valide_par: string;
      date_validation: string;
      statut: string;
    }[]
  >([]);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [rejectMotif, setRejectMotif] = useState("");
  const [articlesPeriode, setArticlesPeriode] = useState<
    "semaine" | "semaine_precedente" | "mois"
  >("semaine");
  const [devisModal, setDevisModal] = useState(false);
  const [devisForm, setDevisForm] = useState({
    semaine_debut: "",
    semaine_fin: "",
  });
  const [devisLignes, setDevisLignes] = useState([
    {
      article: "",
      unite: "kg",
      qte_estimee: 0,
      prix_unitaire: 0,
      montant_estime: 0,
    },
  ]);

  // Synthèse mensuelle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [synthese, setSynthese] = useState<any>(null);
  const [synthMois, setSynthMois] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const loadSynthese = (mois: string) => {
    api
      .syntheseMensuelle(mois)
      .then(setSynthese)
      .catch(() => {});
  };

  useEffect(() => {
    if (tab === "synthese") loadSynthese(synthMois);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, synthMois]);

  useEffect(() => {
    api
      .etatCommandes()
      .then((d) => setEtatCmd(d as typeof etatCmd))
      .catch(() => {});
    api
      .devis()
      .then(setDevis)
      .catch(() => {});
    api
      .validations()
      .then((d) => setValidations((d as typeof validations) || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api
      .consoArticles(`periode=${articlesPeriode}`)
      .then((d) => {
        setArticles(d.articles);
        setArticlesTotal(d.total);
      })
      .catch(() => {});
  }, [articlesPeriode]);

  const handleValiderDevis = async (id: number) => {
    await api.validerDevis(id);
    api
      .devis()
      .then(setDevis)
      .catch(() => {});
  };

  const handleCreateDevis = async () => {
    if (!devisForm.semaine_debut || !devisForm.semaine_fin)
      return showToast("Veuillez saisir les dates de période.", "error");
    if (devisForm.semaine_fin <= devisForm.semaine_debut)
      return showToast(
        "La date de fin doit être postérieure à la date de début.",
        "error",
      );
    const hasEmptyLine = devisLignes.some((l) => !l.article.trim());
    if (hasEmptyLine)
      return showToast("Tous les articles doivent être renseignés.", "error");
    const hasInvalidQte = devisLignes.some(
      (l) => l.qte_estimee <= 0 || l.prix_unitaire <= 0,
    );
    if (hasInvalidQte)
      return showToast(
        "Les quantités et prix doivent être supérieurs à 0.",
        "error",
      );
    const lignes = devisLignes.map((l) => ({
      ...l,
      montant_estime: Math.round(l.qte_estimee * l.prix_unitaire),
    }));
    await api.createDevis({ ...devisForm, lignes });
    setDevisModal(false);
    setDevisForm({ semaine_debut: "", semaine_fin: "" });
    setDevisLignes([
      {
        article: "",
        unite: "kg",
        qte_estimee: 0,
        prix_unitaire: 0,
        montant_estime: 0,
      },
    ]);
    api
      .devis()
      .then(setDevis)
      .catch(() => {});
  };

  const updateLigne = (i: number, field: string, value: string | number) => {
    setDevisLignes((prev) =>
      prev.map((l, idx) =>
        idx === i
          ? {
              ...l,
              [field]: value,
              montant_estime:
                field === "qte_estimee"
                  ? Math.round(Number(value) * l.prix_unitaire)
                  : field === "prix_unitaire"
                    ? Math.round(l.qte_estimee * Number(value))
                    : l.montant_estime,
            }
          : l,
      ),
    );
  };

  const addLigne = () =>
    setDevisLignes((prev) => [
      ...prev,
      {
        article: "",
        unite: "kg",
        qte_estimee: 0,
        prix_unitaire: 0,
        montant_estime: 0,
      },
    ]);
  const removeLigne = (i: number) =>
    setDevisLignes((prev) => prev.filter((_, idx) => idx !== i));

  const exportArticlesCsv = () => {
    downloadCsv(
      [
        [
          "Article",
          "Unité",
          "Qté prévue",
          "Qté réelle",
          "Écart",
          "Coût unit.",
          "Coût réel",
        ],
        ...articles.map((r) => [
          r.article,
          r.unite,
          r.qte_prevue,
          r.qte_reelle,
          r.ecart,
          r.cout_unitaire,
          r.cout_reel,
        ]),
      ],
      `conso_articles_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const exportDevisCsv = () => {
    if (!currentDevis) return;
    downloadCsv(
      [
        [
          "Article",
          "Unité",
          "Qté estimée",
          "Prix unit. (FCFA)",
          "Montant estimé (FCFA)",
        ],
        ...(currentDevis.lignes ?? []).map((l) => [
          l.article,
          l.unite,
          l.qte_estimee,
          l.prix_unitaire,
          l.montant_estime,
        ]),
        ["TOTAL", "", "", "", currentDevis.total_estime ?? ""],
      ],
      `devis_${currentDevis.semaine_debut}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const exportCommandesCsv = () => {
    if (!etatCmd) return;
    downloadCsv(
      [
        ["Service", "Lun", "Mar", "Mer", "Jeu", "Ven", "Total", "% du total"],
        ...etatCmd.services.map((s) => [s.nom, ...s.jours, s.total, s.pct]),
      ],
      `etat_commandes_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const exportCommandesPdf = () => {
    if (!etatCmd) return;
    exportPdf({
      title: "État récapitulatif des commandes",
      subtitle: "Semaine en cours",
      headers: ["Service", "Lun", "Mar", "Mer", "Jeu", "Ven", "Total", "%"],
      rows: etatCmd.services.map((s) => [s.nom, ...s.jours, s.total, s.pct]),
      footerRow: ["TOTAL", ...etatCmd.totaux],
      filename: `etat_commandes_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  const exportArticlesPdf = () => {
    const hdrs = [
      "Article",
      "Unité",
      "Qté prévue",
      "Qté réelle",
      "Écart",
      "Coût unit.",
      "Coût réel",
    ];
    exportPdf({
      title: "État des consommations - Articles",
      subtitle:
        articlesPeriode === "semaine"
          ? "Semaine en cours"
          : articlesPeriode === "semaine_precedente"
            ? "Semaine précédente"
            : "Ce mois",
      headers: hdrs,
      rows: articles.map((r) => [
        r.article,
        r.unite,
        r.qte_prevue,
        r.qte_reelle,
        r.ecart,
        r.cout_unitaire,
        r.cout_reel,
      ]),
      footerRow: [
        "TOTAL",
        "",
        "",
        "",
        "",
        "",
        `${articlesTotal.toLocaleString("fr-FR")} FCFA`,
      ],
      filename: `conso_articles_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  const exportDevisPdf = () => {
    if (!currentDevis) return;
    exportPdf({
      title: "Devis estimatif",
      subtitle: `Semaine du ${fmtDate(currentDevis.semaine_debut)} au ${fmtDate(currentDevis.semaine_fin)}`,
      headers: [
        "Article",
        "Unité",
        "Qté estimée",
        "Prix unit. (FCFA)",
        "Montant estimé (FCFA)",
      ],
      rows: (currentDevis.lignes ?? []).map((l) => [
        l.article,
        l.unite,
        l.qte_estimee,
        l.prix_unitaire,
        l.montant_estime,
      ]),
      footerRow: [
        "TOTAL ESTIMÉ",
        "",
        "",
        "",
        `${(currentDevis.total_estime ?? 0).toLocaleString("fr-FR")} FCFA`,
      ],
      filename: `devis_${currentDevis.semaine_debut}_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  const [devisIdx, setDevisIdx] = useState(0);
  const currentDevis = devis.length > 0 ? (devis[devisIdx] ?? devis[0]) : null;

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
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>États & Rapports</h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}>
            Bilan des consommations, devis estimatif et validation DSGL
          </p>
        </div>
        {tab === "devis" && (
          <button onClick={() => setDevisModal(true)} style={btnStyle}>
            <i className="fa-solid fa-plus" /> Nouveau devis
          </button>
        )}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid var(--border)",
          marginBottom: 20,
        }}
      >
        {(
          [
            { key: "commandes", label: "État des commandes" },
            { key: "conso", label: "État des consommations" },
            { key: "devis", label: "Devis estimatif" },
            { key: "validation", label: "Validation DSGL" },
            { key: "synthese", label: "Synthèse mensuelle" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <div
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 500,
              color: tab === t.key ? "var(--primary)" : "var(--text-sm)",
              borderBottom: `2px solid ${tab === t.key ? "var(--primary)" : "transparent"}`,
              marginBottom: -2,
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      {/* État des commandes */}
      {tab === "commandes" && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                État récapitulatif des commandes - Semaine en cours
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={exportCommandesPdf} style={btnExport}>
                <i className="fa-solid fa-file-pdf" /> PDF
              </button>
              <button onClick={exportCommandesCsv} style={btnExport}>
                <i className="fa-solid fa-file-csv" /> CSV
              </button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={thStyle}>Service</th>
                  <th style={thStyle}>Lun</th>
                  <th style={thStyle}>Mar</th>
                  <th style={thStyle}>Mer</th>
                  <th style={thStyle}>Jeu</th>
                  <th style={thStyle}>Ven</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}>% du total</th>
                </tr>
              </thead>
              <tbody>
                {etatCmd?.services?.map((s, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{s.nom}</td>
                    {s.jours.map((j, di) => (
                      <td key={di} style={tdStyle}>
                        {j}
                      </td>
                    ))}
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{s.total}</td>
                    <td style={tdStyle}>{s.pct}</td>
                  </tr>
                ))}
                {(!etatCmd?.services || etatCmd.services.length === 0) && (
                  <tr>
                    <td
                      colSpan={8}
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
              {etatCmd?.totaux && (
                <tfoot>
                  <tr style={{ fontWeight: 700, background: "#F8FAFC" }}>
                    <td style={tdStyle}>TOTAL</td>
                    {etatCmd.totaux.map((t, i) => (
                      <td key={i} style={tdStyle}>
                        {t}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* État des consommations */}
      {tab === "conso" && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              État des consommations - Articles
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["semaine", "semaine_precedente", "mois"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setArticlesPeriode(p)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 16,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1.5px solid var(--border)",
                    background:
                      articlesPeriode === p ? "var(--primary)" : "white",
                    color: articlesPeriode === p ? "white" : "var(--text-sm)",
                    fontFamily: "inherit",
                  }}
                >
                  {p === "semaine"
                    ? "Semaine"
                    : p === "semaine_precedente"
                      ? "Sem. préc."
                      : "Ce mois"}
                </button>
              ))}
              <button onClick={exportArticlesPdf} style={btnExport}>
                <i className="fa-solid fa-file-pdf" /> PDF
              </button>
              <button onClick={exportArticlesCsv} style={btnExport}>
                <i className="fa-solid fa-file-csv" /> CSV
              </button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={thStyle}>Article</th>
                  <th style={thStyle}>Unité</th>
                  <th style={thStyle}>Qté prévue</th>
                  <th style={thStyle}>Qté réelle</th>
                  <th style={thStyle}>Écart</th>
                  <th style={thStyle}>Coût unit.</th>
                  <th style={thStyle}>Coût réel</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((r, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{r.article}</td>
                    <td style={tdStyle}>{r.unite}</td>
                    <td style={tdStyle}>{r.qte_prevue}</td>
                    <td style={tdStyle}>{r.qte_reelle}</td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: 600,
                        color: r.ecart > 0 ? "var(--danger)" : "var(--success)",
                      }}
                    >
                      {r.ecart > 0 ? "+" : ""}
                      {r.ecart}
                    </td>
                    <td style={tdStyle}>
                      {r.cout_unitaire.toLocaleString("fr-FR")}
                    </td>
                    <td style={tdStyle}>
                      {r.cout_reel.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
                {articles.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                        color: "var(--text-sm)",
                      }}
                    >
                      Aucun article enregistré
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, background: "#F8FAFC" }}>
                  <td colSpan={6} style={tdStyle}>
                    TOTAL SEMAINE
                  </td>
                  <td style={tdStyle}>
                    {articlesTotal.toLocaleString("fr-FR")} FCFA
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Devis estimatif */}
      {tab === "devis" && currentDevis && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                Devis estimatif - Semaine du{" "}
                {fmtDate(currentDevis.semaine_debut)} au{" "}
                {fmtDate(currentDevis.semaine_fin)}
              </div>
              <div
                style={{ fontSize: 12, color: "var(--text-sm)", marginTop: 2 }}
              >
                {currentDevis.statut === "soumis"
                  ? "En attente de validation DSGL"
                  : currentDevis.statut === "valide"
                    ? "Validé"
                    : currentDevis.statut}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {devis.length > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    onClick={() => setDevisIdx((i) => Math.max(0, i - 1))}
                    disabled={devisIdx === 0}
                    style={{ ...btnNav, opacity: devisIdx === 0 ? 0.4 : 1 }}
                  >
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                  <span style={{ fontSize: 12, color: "var(--text-sm)" }}>
                    {devisIdx + 1}/{devis.length}
                  </span>
                  <button
                    onClick={() =>
                      setDevisIdx((i) => Math.min(devis.length - 1, i + 1))
                    }
                    disabled={devisIdx >= devis.length - 1}
                    style={{
                      ...btnNav,
                      opacity: devisIdx >= devis.length - 1 ? 0.4 : 1,
                    }}
                  >
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                </div>
              )}
              <span
                style={{
                  display: "inline-flex",
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  background:
                    currentDevis.statut === "valide" ? "#D1FAE5" : "#FEF3C7",
                  color:
                    currentDevis.statut === "valide" ? "#065F46" : "#92400E",
                }}
              >
                {currentDevis.statut === "valide" ? "Validé" : "En attente"}
              </span>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={thStyle}>Article</th>
                  <th style={thStyle}>Unité</th>
                  <th style={thStyle}>Qté estimée</th>
                  <th style={thStyle}>Prix unit. (FCFA)</th>
                  <th style={thStyle}>Montant estimé (FCFA)</th>
                </tr>
              </thead>
              <tbody>
                {currentDevis.lignes?.map((l, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{l.article}</td>
                    <td style={tdStyle}>{l.unite}</td>
                    <td style={tdStyle}>{l.qte_estimee}</td>
                    <td style={tdStyle}>
                      {l.prix_unitaire?.toLocaleString("fr-FR")}
                    </td>
                    <td style={tdStyle}>
                      {l.montant_estime?.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, background: "#F8FAFC" }}>
                  <td colSpan={4} style={tdStyle}>
                    TOTAL ESTIMÉ
                  </td>
                  <td style={tdStyle}>
                    {currentDevis.total_estime?.toLocaleString("fr-FR")} FCFA
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {currentDevis.statut === "soumis" && (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button onClick={exportDevisPdf} style={btnExport}>
                <i className="fa-solid fa-file-pdf" /> PDF
              </button>
              <button onClick={exportDevisCsv} style={btnExport}>
                <i className="fa-solid fa-file-csv" /> CSV
              </button>
              <button
                onClick={() => handleValiderDevis(currentDevis.id)}
                style={{
                  ...btnStyle,
                  background: "var(--success)",
                  color: "white",
                }}
              >
                <i className="fa-solid fa-check-circle" /> Valider le devis
              </button>
              <button
                onClick={() => setRejectModal(currentDevis.id)}
                style={{
                  ...btnStyle,
                  background: "transparent",
                  color: "var(--danger)",
                  border: "1.5px solid var(--danger)",
                }}
              >
                <i className="fa-solid fa-times-circle" /> Rejeter
              </button>
            </div>
          )}
          {currentDevis.statut === "valide" && (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button onClick={exportDevisPdf} style={btnExport}>
                <i className="fa-solid fa-file-pdf" /> PDF
              </button>
              <button onClick={exportDevisCsv} style={btnExport}>
                <i className="fa-solid fa-file-csv" /> CSV
              </button>
            </div>
          )}
        </div>
      )}
      {tab === "devis" && !currentDevis && (
        <div style={card}>
          <p style={{ color: "var(--text-sm)", textAlign: "center" }}>
            Aucun devis disponible
          </p>
        </div>
      )}

      {/* Validation DSGL */}
      {tab === "validation" && (
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Historique des validations
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={thStyle}>Document</th>
                  <th style={thStyle}>Période</th>
                  <th style={thStyle}>Soumis par</th>
                  <th style={thStyle}>Date soumission</th>
                  <th style={thStyle}>Validé par</th>
                  <th style={thStyle}>Date validation</th>
                  <th style={thStyle}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {validations.map((v, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{v.document}</td>
                    <td style={tdStyle}>{v.periode}</td>
                    <td style={tdStyle}>{v.soumis_par}</td>
                    <td style={tdStyle}>{v.date_soumission}</td>
                    <td style={tdStyle}>{v.valide_par || "-"}</td>
                    <td style={tdStyle}>{v.date_validation || "-"}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background:
                            v.statut === "Validé" ? "#D1FAE5" : "#FEF3C7",
                          color: v.statut === "Validé" ? "#065F46" : "#92400E",
                        }}
                      >
                        {v.statut}
                      </span>
                    </td>
                  </tr>
                ))}
                {validations.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        ...tdStyle,
                        textAlign: "center",
                        color: "var(--text-sm)",
                      }}
                    >
                      Aucune validation
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject modal */}
      <Modal
        open={rejectModal !== null}
        onClose={() => setRejectModal(null)}
        title="Motif de rejet"
        icon="fa-times-circle"
        iconColor="var(--danger)"
        maxWidth={440}
        footer={
          <>
            <button
              onClick={() => setRejectModal(null)}
              style={{
                ...btnStyle,
                background: "var(--border)",
                color: "var(--text)",
              }}
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                if (rejectModal === null) return;
                await api.rejeterDevis(rejectModal, rejectMotif);
                setRejectModal(null);
                setRejectMotif("");
                api
                  .devis()
                  .then(setDevis)
                  .catch(() => {});
              }}
              style={{
                ...btnStyle,
                background: "var(--danger)",
                color: "white",
              }}
            >
              <i className="fa-solid fa-ban" /> Confirmer
            </button>
          </>
        }
      >
        <div>
          <label style={labelStyle}>Commentaire</label>
          <textarea
            value={rejectMotif}
            onChange={(e) => setRejectMotif(e.target.value)}
            placeholder="Précisions..."
            style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
          />
        </div>
      </Modal>

      {/* Devis creation modal */}
      <Modal
        open={devisModal}
        onClose={() => setDevisModal(false)}
        title="Nouveau devis estimatif"
        icon="fa-file-invoice"
        maxWidth={700}
        footer={
          <>
            <button
              onClick={() => setDevisModal(false)}
              style={{
                ...btnStyle,
                background: "var(--border)",
                color: "var(--text)",
                padding: "7px 14px",
                fontSize: 12,
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleCreateDevis}
              style={{
                ...btnStyle,
                background: "var(--primary)",
                color: "white",
                padding: "7px 14px",
                fontSize: 12,
              }}
            >
              <i className="fa-solid fa-paper-plane" /> Soumettre
            </button>
          </>
        }
      >
        <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Semaine début</label>
            <input
              type="date"
              value={devisForm.semaine_debut}
              onChange={(e) =>
                setDevisForm({ ...devisForm, semaine_debut: e.target.value })
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Semaine fin</label>
            <input
              type="date"
              value={devisForm.semaine_fin}
              onChange={(e) =>
                setDevisForm({ ...devisForm, semaine_fin: e.target.value })
              }
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          Lignes du devis
        </div>
        <div className="table-wrap">
          {devisLignes.map((l, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto",
                gap: 8,
                marginBottom: 8,
                alignItems: "center",
                minWidth: 520,
              }}
            >
              <input
                placeholder="Article"
                value={l.article}
                onChange={(e) => updateLigne(i, "article", e.target.value)}
                style={{ ...inputStyle, padding: "8px 10px", fontSize: 12 }}
              />
              <select
                value={l.unite}
                onChange={(e) => updateLigne(i, "unite", e.target.value)}
                style={{ ...inputStyle, padding: "8px 10px", fontSize: 12 }}
              >
                {["kg", "L", "g", "unité", "sac", "boîte", "bouteille"].map(
                  (u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ),
                )}
              </select>
              <input
                type="number"
                placeholder="Qté"
                min={0}
                value={l.qte_estimee}
                onChange={(e) =>
                  updateLigne(i, "qte_estimee", Number(e.target.value))
                }
                style={{ ...inputStyle, padding: "8px 10px", fontSize: 12 }}
              />
              <input
                type="number"
                placeholder="Prix unit."
                min={0}
                value={l.prix_unitaire}
                onChange={(e) =>
                  updateLigne(i, "prix_unitaire", Number(e.target.value))
                }
                style={{ ...inputStyle, padding: "8px 10px", fontSize: 12 }}
              />
              <div
                style={{
                  padding: "8px 10px",
                  background: "#F8FAFC",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: "right",
                }}
              >
                {Math.round(l.qte_estimee * l.prix_unitaire).toLocaleString(
                  "fr-FR",
                )}
              </div>
              <button
                onClick={() => removeLigne(i)}
                style={{
                  ...btnStyle,
                  background: "var(--danger)",
                  color: "white",
                  padding: "8px 10px",
                  fontSize: 12,
                  border: "none",
                }}
                disabled={devisLignes.length === 1}
              >
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <button
            onClick={addLigne}
            style={{
              ...btnStyle,
              background: "transparent",
              color: "var(--primary)",
              border: "1.5px solid var(--primary)",
              padding: "6px 12px",
              fontSize: 12,
            }}
          >
            <i className="fa-solid fa-plus" /> Ajouter une ligne
          </button>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            Total estimé :{" "}
            {devisLignes
              .reduce(
                (s, l) => s + Math.round(l.qte_estimee * l.prix_unitaire),
                0,
              )
              .toLocaleString("fr-FR")}{" "}
            FCFA
          </div>
        </div>
      </Modal>

      {/* ── Synthèse mensuelle ─────────────────────────────────────────────── */}
      {tab === "synthese" && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              <i
                className="fa-solid fa-chart-pie"
                style={{ marginRight: 8, color: "var(--primary)" }}
              />
              Synthèse mensuelle
              {synthese?.mois_label ? ` — ${synthese.mois_label}` : ""}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="month"
                value={synthMois}
                onChange={(e) => setSynthMois(e.target.value)}
                style={{ ...inputStyle, width: "auto", minWidth: 160 }}
              />
              <button
                onClick={() => {
                  if (!synthese) return;
                  const k = synthese.kpis;
                  const w = window.open("", "_blank");
                  if (!w) return;
                  w.document
                    .write(`<html><head><title>Synthèse mensuelle — ${synthese.mois_label}</title>
                    <style>body{font-family:Arial,sans-serif;padding:20px;color:#333}h2{margin-bottom:8px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f0f0f0}.kpi{display:inline-block;background:#f8f8f8;border:1px solid #ddd;border-radius:8px;padding:12px 18px;margin:6px;text-align:center;min-width:140px}.kpi .val{font-size:20px;font-weight:700}.kpi .lab{font-size:11px;color:#888}@media print{button{display:none}}</style></head><body>
                    <h2>Rapport de synthèse mensuelle — SGRH</h2>
                    <p style="font-size:12px;color:#666">${synthese.mois_label} — Imprimé le ${new Date().toLocaleDateString("fr-FR")}</p>
                    <div style="margin:16px 0">
                      <div class="kpi"><div class="val">${k.nb_commandes}</div><div class="lab">Commandes</div></div>
                      <div class="kpi"><div class="val">${k.total_portions?.toLocaleString("fr-FR")}</div><div class="lab">Portions</div></div>
                      <div class="kpi"><div class="val">${k.total_montant?.toLocaleString("fr-FR")} F</div><div class="lab">Coût total</div></div>
                      <div class="kpi"><div class="val">${k.cout_moyen_portion?.toLocaleString("fr-FR")} F</div><div class="lab">Coût / portion</div></div>
                      <div class="kpi"><div class="val">${k.taux_rejet}%</div><div class="lab">Taux de rejet</div></div>
                      <div class="kpi"><div class="val">${k.nb_livrees}</div><div class="lab">Livrées</div></div>
                      <div class="kpi"><div class="val">${k.nb_regimes}</div><div class="lab">Régimes spéciaux</div></div>
                      <div class="kpi"><div class="val">${k.marches_actifs}</div><div class="lab">Marchés actifs</div></div>
                    </div>
                    <h3>Par service</h3>
                    <table><thead><tr><th>Service</th><th>Commandes</th><th>Portions</th><th>Montant (FCFA)</th></tr></thead><tbody>
                    ${(synthese.par_service || []).map((s: { service: string; count: number; portions: number; montant: number }) => `<tr><td>${s.service}</td><td>${s.count}</td><td>${s.portions}</td><td>${s.montant?.toLocaleString("fr-FR")}</td></tr>`).join("")}
                    </tbody></table>
                    <h3 style="margin-top:16px">Par repas</h3>
                    <table><thead><tr><th>Type</th><th>Portions</th><th>Montant (FCFA)</th></tr></thead><tbody>
                    ${Object.entries(synthese.par_repas || {})
                      .map(([type, d]: [string, unknown]) => {
                        const data = d as { portions: number; montant: number };
                        return `<tr><td>${type === "petit_dejeuner" ? "Petit-déjeuner" : type === "dejeuner" ? "Déjeuner" : "Dîner"}</td><td>${data.portions}</td><td>${data.montant?.toLocaleString("fr-FR")}</td></tr>`;
                      })
                      .join("")}
                    </tbody></table>
                    </body></html>`);
                  w.document.close();
                  w.print();
                }}
                style={btnExport}
              >
                <i className="fa-solid fa-print" /> Imprimer
              </button>
            </div>
          </div>

          {!synthese ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--text-sm)",
              }}
            >
              Chargement...
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid-kpi" style={{ gap: 12, marginBottom: 20 }}>
                {[
                  {
                    icon: "fa-clipboard-list",
                    label: "Commandes",
                    value: synthese.kpis.nb_commandes,
                    prev: synthese.kpis.nb_commandes_prec,
                    bg: "#EDE9FE",
                    color: "#5B21B6",
                  },
                  {
                    icon: "fa-utensils",
                    label: "Portions",
                    value:
                      synthese.kpis.total_portions?.toLocaleString("fr-FR"),
                    prev: synthese.kpis.total_portions_prec,
                    bg: "#DBEAFE",
                    color: "#1E40AF",
                  },
                  {
                    icon: "fa-coins",
                    label: "Coût total",
                    value: `${synthese.kpis.total_montant?.toLocaleString("fr-FR")} F`,
                    prev: synthese.kpis.total_montant_prec,
                    bg: "#D1FAE5",
                    color: "#065F46",
                    suffix: "F",
                  },
                  {
                    icon: "fa-calculator",
                    label: "Coût / portion",
                    value: `${synthese.kpis.cout_moyen_portion?.toLocaleString("fr-FR")} F`,
                    bg: "#FEF3C7",
                    color: "#92400E",
                  },
                  {
                    icon: "fa-ban",
                    label: "Taux de rejet",
                    value: `${synthese.kpis.taux_rejet}%`,
                    prev: synthese.kpis.taux_rejet_prec,
                    bg: "#FEE2E2",
                    color: "#991B1B",
                    suffix: "%",
                    invertTrend: true,
                  },
                  {
                    icon: "fa-truck",
                    label: "Livrées",
                    value: synthese.kpis.nb_livrees,
                    bg: "#D1FAE5",
                    color: "#065F46",
                  },
                ].map((k, i) => {
                  const diff =
                    k.prev !== undefined
                      ? typeof k.prev === "number" &&
                        typeof synthese.kpis[
                          Object.keys(synthese.kpis).find(
                            (key) => synthese.kpis[key] === k.prev,
                          ) || ""
                        ] === "number"
                        ? (() => {
                            const curr = parseFloat(
                              String(k.value).replace(/[^0-9.-]/g, ""),
                            );
                            const prev = k.prev as number;
                            if (prev === 0) return null;
                            return Math.round(((curr - prev) / prev) * 100);
                          })()
                        : null
                      : null;
                  return (
                    <div
                      key={i}
                      style={{
                        background: "#fff",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        padding: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          background: k.bg,
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
                        <div style={{ fontSize: 11, color: "var(--text-sm)" }}>
                          {k.label}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>
                          {k.value}
                        </div>
                        {diff !== null && (
                          <div
                            style={{
                              fontSize: 11,
                              color:
                                (k.invertTrend ? -diff : diff) >= 0
                                  ? "#059669"
                                  : "#DC2626",
                            }}
                          >
                            {diff > 0 ? "+" : ""}
                            {diff}% vs mois préc.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Par service */}
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                <i
                  className="fa-solid fa-building"
                  style={{ marginRight: 6 }}
                />
                Répartition par service
              </div>
              <div style={{ overflowX: "auto", marginBottom: 20 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      <th style={thStyle}>Service</th>
                      <th style={thStyle}>Commandes</th>
                      <th style={thStyle}>Portions</th>
                      <th style={thStyle}>Montant (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(synthese.par_service || []).map(
                      (
                        s: {
                          service: string;
                          count: number;
                          portions: number;
                          montant: number;
                        },
                        i: number,
                      ) => (
                        <tr key={i}>
                          <td style={tdStyle}>{s.service}</td>
                          <td style={tdStyle}>{s.count}</td>
                          <td style={tdStyle}>
                            {s.portions?.toLocaleString("fr-FR")}
                          </td>
                          <td style={tdStyle}>
                            {s.montant?.toLocaleString("fr-FR")}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* Par repas */}
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                <i className="fa-solid fa-clock" style={{ marginRight: 6 }} />
                Répartition par repas
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      <th style={thStyle}>Type de repas</th>
                      <th style={thStyle}>Portions</th>
                      <th style={thStyle}>Montant (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(synthese.par_repas || {}).map(
                      ([type, d]: [string, unknown], i: number) => {
                        const data = d as { portions: number; montant: number };
                        return (
                          <tr key={i}>
                            <td style={tdStyle}>
                              {type === "petit_dejeuner"
                                ? "Petit-déjeuner"
                                : type === "dejeuner"
                                  ? "Déjeuner"
                                  : "Dîner"}
                            </td>
                            <td style={tdStyle}>
                              {data.portions?.toLocaleString("fr-FR")}
                            </td>
                            <td style={tdStyle}>
                              {data.montant?.toLocaleString("fr-FR")}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>

              {/* Marchés résumé */}
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  background: "#F8FAFC",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                  <i
                    className="fa-solid fa-file-contract"
                    style={{ marginRight: 6 }}
                  />
                  Marchés publics
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 20,
                    fontSize: 13,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    <strong>{synthese.kpis.marches_actifs}</strong> marchés
                    actifs
                  </span>
                  <span>
                    Budget consommé :{" "}
                    <strong>
                      {synthese.kpis.marches_consomme?.toLocaleString("fr-FR")}
                    </strong>{" "}
                    / {synthese.kpis.marches_total?.toLocaleString("fr-FR")}{" "}
                    FCFA (
                    {synthese.kpis.marches_total > 0
                      ? Math.round(
                          (synthese.kpis.marches_consomme /
                            synthese.kpis.marches_total) *
                            100,
                        )
                      : 0}
                    %)
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
}

const card: React.CSSProperties = {
  background: "white",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  padding: 20,
  marginBottom: 16,
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
const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "11px 20px",
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
  fontFamily: "inherit",
};
const btnExport: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 12px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  border: "1.5px solid var(--border)",
  background: "white",
  color: "var(--text)",
  fontFamily: "inherit",
};
const btnNav: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "1.5px solid var(--border)",
  background: "white",
  cursor: "pointer",
  fontSize: 11,
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

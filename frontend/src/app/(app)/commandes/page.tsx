"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { downloadCsv, exportPdf } from "@/lib/export";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import { Commande, Service, Menu, RegimeSpecial } from "@/types";
import { isEmailValid, todayISO } from "@/lib/validation";
import { useAuth } from "@/lib/auth";

const STATUT_BADGE: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  en_attente: { bg: "#FEF3C7", color: "#92400E", label: "En attente" },
  validee: { bg: "#D1FAE5", color: "#065F46", label: "Validée" },
  en_cours: { bg: "#DBEAFE", color: "#1E40AF", label: "En cours" },
  livree: { bg: "#D1FAE5", color: "#065F46", label: "Livrée" },
  rejetee: { bg: "#FEE2E2", color: "#991B1B", label: "Rejetée" },
};

const PAIEMENT_BADGE: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  paye: { bg: "#D1FAE5", color: "#065F46", label: "Payé" },
  en_attente: { bg: "#FEF3C7", color: "#92400E", label: "En attente" },
  non_applicable: { bg: "#F1F5F9", color: "#475569", label: "N/A" },
};

const REPAS_LABELS: Record<string, string> = {
  petit_dejeuner: "Petit-déj.",
  dejeuner: "Déjeuner",
  diner: "Dîner",
};

type Tab = "malades" | "personnel" | "clients" | "valider";

export default function CommandesPage() {
  const { user } = useAuth();
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [aValider, setAValider] = useState<Commande[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [regimesSpeciaux, setRegimesSpeciaux] = useState<RegimeSpecial[]>([]);
  const [tab, setTab] = useState<Tab>("malades");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<Commande | null>(null);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [livraisonModal, setLivraisonModal] = useState<Commande | null>(null);
  const [paiementModal, setPaiementModal] = useState<Commande | null>(null);
  const { showToast } = useToast();
  const [rejectMotif, setRejectMotif] = useState("Informations incomplètes");
  const [filterDate, setFilterDate] = useState("");
  const [filterRepas, setFilterRepas] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    type: "malades",
    service_id: "",
    date_repas: "",
    repas: "dejeuner",
    nb_portions: 1,
    menu_id: "",
    observations: "",
  });

  const load = (p = page) => {
    const params = new URLSearchParams({ page: String(p) });
    if (filterDate) params.set("date_repas", filterDate);
    if (filterRepas) params.set("repas", filterRepas);
    if (filterStatut) params.set("statut", filterStatut);
    api
      .commandes(params.toString())
      .then((d) => {
        setCommandes(d.data || []);
        if (d.meta) {
          setLastPage(d.meta.last_page);
          setTotal(d.meta.total);
        }
      })
      .catch(() => {});
    if (
      user?.role === "csah" ||
      user?.role === "dsgl" ||
      user?.role === "super_admin"
    ) {
      api
        .commandesAValider()
        .then(setAValider)
        .catch(() => {});
    }
    if (user?.role !== "prestataire") {
      api
        .services()
        .then(setServices)
        .catch(() => {});
      api
        .menus()
        .then(setMenus)
        .catch(() => {});
    }
    if (user?.role === "prestataire") {
      api
        .regimesSpeciaux()
        .then(setRegimesSpeciaux)
        .catch(() => {});
    }
  };
  useEffect(() => {
    load(1);
    setPage(1);
  }, [filterDate, filterRepas, filterStatut]);
  useEffect(load, [page]);

  const filtered = commandes.filter((c) => {
    if (tab === "malades") return c.type === "malades";
    if (tab === "personnel") return c.type === "personnel";
    if (tab === "clients") return c.type === "client_externe";
    return false;
  });
  const displayList = tab === "valider" ? aValider : filtered;
  const maladesCount = commandes.filter((c) => c.type === "malades").length;
  const validerCount = aValider.length;

  const changePage = (p: number) => {
    setPage(p);
  };

  const handleValider = async (id: number) => {
    await api.validerCommande(id);
    load();
  };

  const handleRejeter = async () => {
    if (rejectModal === null) return;
    await api.rejeterCommande(rejectModal, rejectMotif);
    setRejectModal(null);
    load();
  };

  const handleCreate = async () => {
    if (!form.service_id) return alert("Veuillez sélectionner un service.");
    if (!form.date_repas) return alert("Veuillez saisir la date du repas.");
    if (form.date_repas < todayISO())
      return alert(
        "La date du repas ne peut pas être antérieure à aujourd'hui.",
      );
    if (Number(form.nb_portions) < 1)
      return alert("Le nombre de portions doit être au moins 1.");
    await api.createCommande({
      ...form,
      service_id: Number(form.service_id),
      nb_portions: Number(form.nb_portions),
      menu_id: form.menu_id ? Number(form.menu_id) : null,
    });
    setModalOpen(false);
    load();
  };

  const HEADERS_CMD = [
    "Référence",
    "Service",
    "Type",
    "Repas",
    "Date repas",
    "Portions",
    "Menu",
    "Statut",
    "Client",
    "Montant",
    "Paiement",
  ];
  const cmdRows = () =>
    displayList.map((c) => [
      c.reference,
      c.service?.nom ?? "",
      c.type,
      REPAS_LABELS[c.repas] ?? c.repas,
      c.date_repas,
      c.nb_portions,
      c.menu?.intitule ?? "",
      STATUT_BADGE[c.statut]?.label ?? c.statut,
      c.client_nom ?? "",
      c.montant ?? "",
      c.statut_paiement ?? "",
    ]);

  const exportCsv = () => {
    downloadCsv(
      [HEADERS_CMD, ...cmdRows()],
      `commandes_${tab}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const exportCommandesPdf = () => {
    exportPdf({
      title: `Commandes — ${tab}`,
      headers: HEADERS_CMD,
      rows: cmdRows(),
      filename: `commandes_${tab}_${new Date().toISOString().slice(0, 10)}.pdf`,
      orientation: "landscape",
    });
  };

  // ── Export agrégé « Bon de livraison » (prestataire) ─────────────────
  const REGIME_LABELS: Record<string, string> = {
    sans_sel: "Sans sel",
    diabetique: "Diabétique",
    hyposode: "Hyposodé",
    post_op_mixe: "Post-op mixé",
    hyper_proteine: "Hyper-protéiné",
    sans_gluten: "Sans gluten",
    enrichi: "Enrichi",
    autre: "Autre",
  };

  const exportBonLivraisonPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    const pw = doc.internal.pageSize.getWidth();
    const dateStr = new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pw, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Resto-H — BON DE LIVRAISON AGRÉGÉ", 14, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Généré le ${dateStr}`, 14, 24);
    doc.text("Document de conformité — Prestataire de restauration", 14, 31);

    // Section 1: Commandes à livrer
    const cmdALivrer = commandes.filter(
      (c) => c.statut === "validee" || c.statut === "en_cours",
    );
    const allCmd = commandes;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("1. COMMANDES À LIVRER", 14, 48);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${cmdALivrer.length} commande(s) validée(s) en attente de livraison — ${allCmd.length} commande(s) au total`,
      14,
      54,
    );

    const cmdHeaders = [
      "Réf.",
      "Service",
      "Type",
      "Repas",
      "Date",
      "Portions",
      "Menu",
      "Statut",
      "Observations",
    ];
    const cmdBody = allCmd.map((c) => [
      c.reference,
      c.service?.nom ?? "",
      c.type === "malades"
        ? "Malades"
        : c.type === "personnel"
          ? "Personnel"
          : "Client ext.",
      REPAS_LABELS[c.repas] ?? c.repas,
      c.date_repas,
      String(c.nb_portions),
      c.menu?.intitule ?? "—",
      STATUT_BADGE[c.statut]?.label ?? c.statut,
      c.observations ?? "",
    ]);
    const totalPortions = allCmd.reduce((s, c) => s + c.nb_portions, 0);
    cmdBody.push(["TOTAL", "", "", "", "", String(totalPortions), "", "", ""]);

    autoTable(doc, {
      startY: 58,
      head: [cmdHeaders],
      body: cmdBody,
      styles: { fontSize: 8, cellPadding: 3, font: "helvetica" },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (data.row.index === cmdBody.length - 1 && data.section === "body") {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [226, 232, 240];
        }
      },
    });

    // Section 2: Régimes spéciaux actifs
    const regimesActifs = regimesSpeciaux.filter(
      (r) => r.statut === "valide" || r.statut === "en_attente",
    );
    const lastTable = (doc as any).lastAutoTable;
    let y2 = (lastTable?.finalY ?? 120) + 14;
    if (y2 > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y2 = 20;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("2. RÉGIMES SPÉCIAUX (menus thérapeutiques)", 14, y2);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${regimesActifs.length} régime(s) actif(s) ou en attente`,
      14,
      y2 + 6,
    );

    const regHeaders = [
      "Patient",
      "Lit",
      "Service",
      "Type de régime",
      "Date début",
      "Durée (j)",
      "Prescripteur",
      "Instructions",
      "Statut",
    ];
    const regBody = regimesActifs.map((r) => [
      r.patient_nom,
      r.lit,
      r.service?.nom ?? "",
      REGIME_LABELS[r.type_regime] ?? r.type_regime,
      r.date_debut,
      String(r.duree_jours),
      r.medecin_prescripteur,
      r.instructions ?? "—",
      r.statut === "valide" ? "Actif" : "En attente",
    ]);

    autoTable(doc, {
      startY: y2 + 10,
      head: [regHeaders],
      body:
        regBody.length > 0
          ? regBody
          : [["Aucun régime spécial actif", "", "", "", "", "", "", "", ""]],
      styles: { fontSize: 8, cellPadding: 3, font: "helvetica" },
      headStyles: {
        fillColor: [254, 243, 199],
        textColor: [146, 64, 14],
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: [255, 251, 235] },
    });

    // Section 3: Résumé
    const lastTable2 = (doc as any).lastAutoTable;
    let y3 = (lastTable2?.finalY ?? 180) + 14;
    if (y3 > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y3 = 20;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("3. RÉSUMÉ", 14, y3);
    const summaryHeaders = ["Indicateur", "Valeur"];
    const summaryBody = [
      ["Total commandes", String(allCmd.length)],
      ["Commandes validées (à livrer)", String(cmdALivrer.length)],
      [
        "Commandes déjà livrées",
        String(commandes.filter((c) => c.statut === "livree").length),
      ],
      [
        "Total portions à livrer",
        String(cmdALivrer.reduce((s, c) => s + c.nb_portions, 0)),
      ],
      [
        "Régimes spéciaux actifs",
        String(regimesActifs.filter((r) => r.statut === "valide").length),
      ],
      [
        "Régimes en attente validation",
        String(regimesActifs.filter((r) => r.statut === "en_attente").length),
      ],
    ];
    autoTable(doc, {
      startY: y3 + 4,
      head: [summaryHeaders],
      body: summaryBody,
      styles: { fontSize: 9, cellPadding: 4, font: "helvetica" },
      headStyles: {
        fillColor: [209, 250, 229],
        textColor: [6, 95, 70],
        fontStyle: "bold",
      },
      columnStyles: { 0: { fontStyle: "bold" } },
      tableWidth: 200,
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const ph = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        "© AIT & ANABASE — Resto-H | Document de conformité prestataire",
        14,
        ph - 8,
      );
      doc.text(`Page ${i}/${pageCount}`, pw - 14, ph - 8, { align: "right" });
    }

    doc.save(
      `bon_livraison_agrege_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  };

  const exportBonLivraisonCsv = () => {
    const cmdALivrer = commandes.filter(
      (c) => c.statut === "validee" || c.statut === "en_cours",
    );
    const allCmd = commandes;
    const regimesActifs = regimesSpeciaux.filter(
      (r) => r.statut === "valide" || r.statut === "en_attente",
    );

    const rows: (string | number)[][] = [];
    rows.push(["=== COMMANDES (" + allCmd.length + ") ==="]);
    rows.push([
      "Réf.",
      "Service",
      "Type",
      "Repas",
      "Date",
      "Portions",
      "Menu",
      "Statut",
      "Observations",
    ]);
    allCmd.forEach((c) =>
      rows.push([
        c.reference,
        c.service?.nom ?? "",
        c.type,
        REPAS_LABELS[c.repas] ?? c.repas,
        c.date_repas,
        c.nb_portions,
        c.menu?.intitule ?? "",
        STATUT_BADGE[c.statut]?.label ?? c.statut,
        c.observations ?? "",
      ]),
    );
    rows.push([]);
    rows.push(["=== RÉGIMES SPÉCIAUX (" + regimesActifs.length + ") ==="]);
    rows.push([
      "Patient",
      "Lit",
      "Service",
      "Type",
      "Date début",
      "Durée (j)",
      "Prescripteur",
      "Instructions",
      "Statut",
    ]);
    regimesActifs.forEach((r) =>
      rows.push([
        r.patient_nom,
        r.lit,
        r.service?.nom ?? "",
        REGIME_LABELS[r.type_regime] ?? r.type_regime,
        r.date_debut,
        r.duree_jours,
        r.medecin_prescripteur,
        r.instructions ?? "",
        r.statut === "valide" ? "Actif" : "En attente",
      ]),
    );
    rows.push([]);
    rows.push(["=== RÉSUMÉ ==="]);
    rows.push(["Total commandes", allCmd.length]);
    rows.push(["À livrer", cmdALivrer.length]);
    rows.push([
      "Portions à livrer",
      cmdALivrer.reduce((s, c) => s + c.nb_portions, 0),
    ]);
    rows.push([
      "Régimes actifs",
      regimesActifs.filter((r) => r.statut === "valide").length,
    ]);

    downloadCsv(
      rows,
      `bon_livraison_agrege_${new Date().toISOString().slice(0, 10)}.csv`,
    );
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
            {user?.role === "prestataire"
              ? "Commandes & Livraisons"
              : "Gestion des Commandes"}
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}>
            {user?.role === "prestataire"
              ? "Vue agrégée de toutes les commandes et régimes spéciaux à livrer"
              : "Commandes des services, du personnel et des clients externes"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {user?.role === "prestataire" && (
            <>
              <button
                onClick={exportBonLivraisonPdf}
                style={{ ...btn, fontSize: 12, background: "var(--navy)" }}
              >
                <i className="fa-solid fa-file-pdf" /> Bon de livraison (PDF)
              </button>
              <button
                onClick={exportBonLivraisonCsv}
                style={{ ...btnSecondary, fontSize: 12 }}
              >
                <i className="fa-solid fa-file-csv" /> Bon de livraison (CSV)
              </button>
            </>
          )}
          <button
            onClick={exportCommandesPdf}
            style={{ ...btnSecondary, fontSize: 12 }}
          >
            <i className="fa-solid fa-file-pdf" /> PDF
          </button>
          <button onClick={exportCsv} style={{ ...btnSecondary, fontSize: 12 }}>
            <i className="fa-solid fa-file-csv" /> CSV
          </button>
          {user?.role !== "prestataire" && (
            <button onClick={() => setModalOpen(true)} style={btn}>
              <i className="fa-solid fa-plus" /> Nouvelle commande
            </button>
          )}
        </div>
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
            { key: "malades", label: "Malades", count: maladesCount },
            { key: "personnel", label: "Personnel" },
            { key: "clients", label: "Clients externes" },
            ...(user?.role === "csah" ||
            user?.role === "dsgl" ||
            user?.role === "super_admin"
              ? [
                  {
                    key: "valider" as Tab,
                    label: "À valider",
                    count: validerCount,
                  },
                ]
              : []),
          ] as { key: Tab; label: string; count?: number }[]
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
            {t.count !== undefined && t.count > 0 && (
              <span
                style={{
                  marginLeft: 4,
                  display: "inline-flex",
                  padding: "1px 8px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  background: t.key === "valider" ? "#FEF3C7" : "#DBEAFE",
                  color: t.key === "valider" ? "#92400E" : "#1E40AF",
                }}
              >
                {t.count}
              </span>
            )}
          </div>
        ))}
      </div>

      {tab === "valider" && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            fontSize: 13,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 16,
            background: "#FFFBEB",
            color: "#92400E",
            border: "1px solid #FDE68A",
          }}
        >
          <i className="fa-solid fa-triangle-exclamation" />
          Ces commandes ont été soumises par les SUS/SUT et nécessitent votre
          validation avant traitement.
        </div>
      )}

      {tab !== "valider" && (
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={filterInput}
            title="Filtrer par date"
          />
          <select
            value={filterRepas}
            onChange={(e) => setFilterRepas(e.target.value)}
            style={filterInput}
          >
            <option value="">Tous les repas</option>
            <option value="petit_dejeuner">Petit-déjeuner</option>
            <option value="dejeuner">Déjeuner</option>
            <option value="diner">Dîner</option>
          </select>
          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            style={filterInput}
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="validee">Validée</option>
            <option value="en_cours">En cours</option>
            <option value="livree">Livrée</option>
            <option value="rejetee">Rejetée</option>
          </select>
          {(filterDate || filterRepas || filterStatut) && (
            <button
              onClick={() => {
                setFilterDate("");
                setFilterRepas("");
                setFilterStatut("");
              }}
              style={{ ...btnSecondary, fontSize: 12 }}
            >
              <i className="fa-solid fa-xmark" /> Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: "white",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          padding: 20,
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th style={thStyle}>Réf.</th>
                <th style={thStyle}>Service</th>
                <th style={thStyle}>
                  {tab === "clients" ? "Client" : "Nb portions"}
                </th>
                <th style={thStyle}>Repas</th>
                <th style={thStyle}>Menu</th>
                {tab === "clients" && <th style={thStyle}>Montant</th>}
                {tab === "clients" && <th style={thStyle}>Paiement</th>}
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map((c) => {
                const sb = STATUT_BADGE[c.statut] || STATUT_BADGE.en_attente;
                return (
                  <tr key={c.id}>
                    <td style={tdStyle}>
                      <b>{c.reference}</b>
                    </td>
                    <td style={tdStyle}>{c.service?.nom}</td>
                    <td style={tdStyle}>
                      {tab === "clients"
                        ? c.client_nom || "Visiteur"
                        : c.nb_portions}
                    </td>
                    <td style={tdStyle}>{REPAS_LABELS[c.repas] || c.repas}</td>
                    <td style={tdStyle}>{c.menu?.intitule || "—"}</td>
                    {tab === "clients" && (
                      <td style={tdStyle}>
                        {c.montant?.toLocaleString("fr-FR")} FCFA
                      </td>
                    )}
                    {tab === "clients" && (
                      <td style={tdStyle}>
                        {(() => {
                          const p =
                            PAIEMENT_BADGE[c.statut_paiement] ||
                            PAIEMENT_BADGE.non_applicable;
                          return (
                            <span
                              style={{
                                display: "inline-flex",
                                padding: "3px 10px",
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 600,
                                background: p.bg,
                                color: p.color,
                              }}
                            >
                              {p.label}
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background: sb.bg,
                          color: sb.color,
                        }}
                      >
                        {sb.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {(c.statut === "en_attente" || tab === "valider") && (
                        <>
                          <button
                            onClick={() => handleValider(c.id)}
                            style={{
                              ...btnSmStyle,
                              background: "var(--success)",
                              color: "white",
                              marginRight: 4,
                            }}
                          >
                            <i className="fa-solid fa-check" />
                          </button>
                          <button
                            onClick={() => setRejectModal(c.id)}
                            style={{
                              ...btnSmStyle,
                              background: "var(--danger)",
                              color: "white",
                              marginRight: 4,
                            }}
                          >
                            <i className="fa-solid fa-times" />
                          </button>
                        </>
                      )}
                      {(c.statut === "validee" || c.statut === "en_cours") && (
                        <button
                          onClick={() => setLivraisonModal(c)}
                          style={{
                            ...btnSmStyle,
                            background: "var(--teal)",
                            color: "white",
                            marginRight: 4,
                          }}
                          title="Marquer livrée"
                        >
                          <i className="fa-solid fa-truck" />
                        </button>
                      )}
                      {c.type === "client_externe" &&
                        c.statut === "livree" &&
                        c.statut_paiement === "en_attente" && (
                          <button
                            onClick={() => setPaiementModal(c)}
                            style={{
                              ...btnSmStyle,
                              background: "var(--success)",
                              color: "white",
                              marginRight: 4,
                            }}
                            title="Enregistrer le paiement"
                          >
                            <i className="fa-solid fa-money-bill-wave" />
                          </button>
                        )}
                      <button
                        onClick={() => setDetailModal(c)}
                        style={{
                          ...btnSmStyle,
                          background: "transparent",
                          color: "var(--primary)",
                          border: "1.5px solid var(--primary)",
                        }}
                      >
                        <i className="fa-solid fa-eye" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {displayList.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      color: "var(--text-sm)",
                    }}
                  >
                    Aucune commande
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {tab !== "valider" && lastPage > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 16,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--text-sm)" }}>
              {total} commande{total !== 1 ? "s" : ""} — Page {page}/{lastPage}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => changePage(page - 1)}
                disabled={page === 1}
                style={{ ...btnSecondary, opacity: page === 1 ? 0.4 : 1 }}
              >
                <i className="fa-solid fa-chevron-left" /> Préc.
              </button>
              <button
                onClick={() => changePage(page + 1)}
                disabled={page === lastPage}
                style={{
                  ...btnSecondary,
                  opacity: page === lastPage ? 0.4 : 1,
                }}
              >
                Suiv. <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouvelle commande"
        icon="fa-cart-plus"
        maxWidth={600}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleCreate} style={btn}>
              <i className="fa-solid fa-paper-plane" /> Soumettre
            </button>
          </>
        }
      >
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Type de commande</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              style={inputStyle}
            >
              <option value="malades">Malades</option>
              <option value="personnel">Personnel</option>
              <option value="client_externe">Client externe</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Service</label>
            <select
              value={form.service_id}
              onChange={(e) => setForm({ ...form, service_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">Sélectionner</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Date du repas</label>
            <input
              type="date"
              value={form.date_repas}
              onChange={(e) => setForm({ ...form, date_repas: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Repas</label>
            <select
              value={form.repas}
              onChange={(e) => setForm({ ...form, repas: e.target.value })}
              style={inputStyle}
            >
              <option value="petit_dejeuner">Petit-déjeuner (07h00)</option>
              <option value="dejeuner">Déjeuner (12h00)</option>
              <option value="diner">Dîner (19h00)</option>
            </select>
          </div>
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nombre de portions</label>
            <input
              type="number"
              value={form.nb_portions}
              onChange={(e) =>
                setForm({ ...form, nb_portions: Number(e.target.value) })
              }
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Menu sélectionné</label>
            <select
              value={form.menu_id}
              onChange={(e) => setForm({ ...form, menu_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">Sélectionner</option>
              {menus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.intitule}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Observations</label>
          <textarea
            value={form.observations}
            onChange={(e) => setForm({ ...form, observations: e.target.value })}
            placeholder="Notes ou instructions particulières..."
            style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
          />
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal
        open={detailModal !== null}
        onClose={() => setDetailModal(null)}
        title={`Détail — Commande ${detailModal?.reference || ""}`}
        footer={
          <button onClick={() => setDetailModal(null)} style={btnSecondary}>
            Fermer
          </button>
        }
      >
        {detailModal && (
          <>
            <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-sm)" }}>
                  Service
                </div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>
                  {detailModal.service?.nom}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-sm)" }}>
                  Repas
                </div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>
                  {REPAS_LABELS[detailModal.repas]} — {detailModal.date_repas}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-sm)" }}>
                  Menu
                </div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>
                  {detailModal.menu?.intitule || "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-sm)" }}>
                  Nb. portions
                </div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>
                  {detailModal.nb_portions}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-sm)" }}>
                  Soumis par
                </div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>
                  {detailModal.soumis_par?.full_name || "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-sm)" }}>
                  Heure livraison
                </div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>
                  {detailModal.heure_livraison || "—"}
                </div>
              </div>
            </div>
            {detailModal.observations && (
              <div
                style={{
                  padding: 12,
                  background: "#F8FAFC",
                  borderRadius: 8,
                  fontSize: 13,
                  marginTop: 8,
                }}
              >
                <b>Observations :</b> {detailModal.observations}
              </div>
            )}
          </>
        )}
      </Modal>

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
            <button onClick={() => setRejectModal(null)} style={btnSecondary}>
              Annuler
            </button>
            <button
              onClick={handleRejeter}
              style={{ ...btn, background: "var(--danger)" }}
            >
              <i className="fa-solid fa-ban" /> Confirmer le rejet
            </button>
          </>
        }
      >
        <div>
          <label style={labelStyle}>Raison du rejet</label>
          <select
            value={rejectMotif}
            onChange={(e) => setRejectMotif(e.target.value)}
            style={inputStyle}
          >
            <option>Informations incomplètes</option>
            <option>Délai dépassé</option>
            <option>Non conforme au protocole</option>
            <option>Autre</option>
          </select>
        </div>
      </Modal>

      {/* Livraison confirmation modal */}
      <Modal
        open={livraisonModal !== null}
        onClose={() => setLivraisonModal(null)}
        title="Confirmer la livraison"
        icon="fa-truck"
        maxWidth={440}
        footer={
          <>
            <button
              onClick={() => setLivraisonModal(null)}
              style={btnSecondary}
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                if (!livraisonModal) return;
                await api.livrerCommande(livraisonModal.id);
                showToast(
                  `Commande ${livraisonModal.reference} livrée`,
                  "success",
                );
                setLivraisonModal(null);
                load();
              }}
              style={{ ...btn, background: "var(--teal)" }}
            >
              <i className="fa-solid fa-truck" /> Confirmer la livraison
            </button>
          </>
        }
      >
        {livraisonModal && (
          <div style={{ fontSize: 14, lineHeight: 1.8 }}>
            <p>Confirmez-vous la livraison de cette commande ?</p>
            <div
              style={{
                background: "#F0FDFA",
                borderRadius: 8,
                padding: 12,
                marginTop: 8,
              }}
            >
              <div>
                <b>Réf. :</b> {livraisonModal.reference}
              </div>
              <div>
                <b>Service :</b> {livraisonModal.service?.nom}
              </div>
              <div>
                <b>Repas :</b> {REPAS_LABELS[livraisonModal.repas]} —{" "}
                {livraisonModal.date_repas}
              </div>
              <div>
                <b>Portions :</b> {livraisonModal.nb_portions}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Paiement confirmation modal */}
      <Modal
        open={paiementModal !== null}
        onClose={() => setPaiementModal(null)}
        title="Enregistrer le paiement"
        icon="fa-money-bill-wave"
        maxWidth={440}
        footer={
          <>
            <button onClick={() => setPaiementModal(null)} style={btnSecondary}>
              Annuler
            </button>
            <button
              onClick={async () => {
                if (!paiementModal) return;
                await api.enregistrerPaiement(paiementModal.id);
                showToast(
                  `Paiement enregistré — ${paiementModal.reference}`,
                  "success",
                );
                setPaiementModal(null);
                load();
              }}
              style={{ ...btn, background: "var(--success)" }}
            >
              <i className="fa-solid fa-check-circle" /> Confirmer le paiement
            </button>
          </>
        }
      >
        {paiementModal && (
          <div style={{ fontSize: 14, lineHeight: 1.8 }}>
            <p>Confirmez-vous le paiement de cette commande client ?</p>
            <div
              style={{
                background: "#F0FDF4",
                borderRadius: 8,
                padding: 12,
                marginTop: 8,
              }}
            >
              <div>
                <b>Réf. :</b> {paiementModal.reference}
              </div>
              <div>
                <b>Client :</b> {paiementModal.client_nom || "—"}
              </div>
              <div>
                <b>Montant :</b>{" "}
                {(paiementModal.montant || 0).toLocaleString("fr-FR")} FCFA
              </div>
            </div>
          </div>
        )}
      </Modal>
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
const btnSmStyle: React.CSSProperties = { ...btn, padding: "7px 10px" };
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
const filterInput: React.CSSProperties = {
  padding: "8px 12px",
  border: "1.5px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "inherit",
  background: "white",
  cursor: "pointer",
};

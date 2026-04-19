"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import ConfirmDialog from "@/components/ConfirmDialog";
import type {
  Marche,
  MarcheKpis,
  AnneeBudgetaire,
  CoutsDesagreges,
} from "@/types";

export default function MarchesPage() {
  const { user } = useAuth();
  const [marches, setMarches] = useState<Marche[]>([]);
  const [kpis, setKpis] = useState<MarcheKpis | null>(null);
  const [annees, setAnnees] = useState<AnneeBudgetaire[]>([]);
  const [couts, setCouts] = useState<CoutsDesagreges | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"marches" | "budget" | "couts">("marches");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => void;
  }>({ open: false, message: "", onConfirm: () => {} });
  const [filterStatut, setFilterStatut] = useState("");
  const [filterAnnee, setFilterAnnee] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showAnneeModal, setShowAnneeModal] = useState(false);
  const [showDetail, setShowDetail] = useState<Marche | null>(null);
  const [formData, setFormData] = useState({
    reference: "",
    objet: "",
    fournisseur: "",
    montant_initial: "",
    seuil_alerte: "20",
    date_debut: "",
    date_fin: "",
    annee_budgetaire_id: "",
  });
  const [anneeForm, setAnneeForm] = useState({
    libelle: "",
    date_debut: "",
    date_fin: "",
    is_active: false,
  });

  const canCreate = user && ["dsgl", "daf", "super_admin"].includes(user.role);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatut) params.statut = filterStatut;
      if (filterAnnee) params.annee_budgetaire_id = filterAnnee;
      const [m, k, a] = await Promise.all([
        api.marches(params),
        api.marcheKpis(),
        api.anneesBudgetaires(),
      ]);
      setMarches(m);
      setKpis(k);
      setAnnees(a);
    } catch {
      /* handled by api */
    }
    setLoading(false);
  }, [filterStatut, filterAnnee]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadCouts = async () => {
    try {
      const c = await api.coutsDesagreges();
      setCouts(c);
    } catch {
      /* handled */
    }
  };

  useEffect(() => {
    if (tab === "couts" && !couts) loadCouts();
  }, [tab]);

  const handleCreateMarche = async () => {
    try {
      await api.createMarche({
        ...formData,
        montant_initial: parseFloat(formData.montant_initial),
        seuil_alerte: parseFloat(formData.seuil_alerte),
        annee_budgetaire_id: formData.annee_budgetaire_id
          ? parseInt(formData.annee_budgetaire_id)
          : null,
      });
      setShowModal(false);
      setFormData({
        reference: "",
        objet: "",
        fournisseur: "",
        montant_initial: "",
        seuil_alerte: "20",
        date_debut: "",
        date_fin: "",
        annee_budgetaire_id: "",
      });
      loadData();
    } catch {
      /* handled */
    }
  };

  const handleCreateAnnee = async () => {
    try {
      await api.createAnneeBudgetaire(anneeForm);
      setShowAnneeModal(false);
      setAnneeForm({
        libelle: "",
        date_debut: "",
        date_fin: "",
        is_active: false,
      });
      loadData();
    } catch {
      /* handled */
    }
  };

  const [editModal, setEditModal] = useState<Marche | null>(null);
  const [editForm, setEditForm] = useState({
    objet: "",
    fournisseur: "",
    seuil_alerte: "",
    date_fin: "",
    statut: "",
    annee_budgetaire_id: "",
  });

  const openEdit = (m: Marche) => {
    setEditForm({
      objet: m.objet,
      fournisseur: m.fournisseur,
      seuil_alerte: String(m.seuil_alerte),
      date_fin: m.date_fin?.slice(0, 10) || "",
      statut: m.statut,
      annee_budgetaire_id: m.annee_budgetaire_id
        ? String(m.annee_budgetaire_id)
        : "",
    });
    setEditModal(m);
  };

  const handleUpdateMarche = async () => {
    if (!editModal) return;
    try {
      await api.updateMarche(editModal.id, {
        objet: editForm.objet,
        fournisseur: editForm.fournisseur,
        seuil_alerte: parseFloat(editForm.seuil_alerte),
        date_fin: editForm.date_fin,
        statut: editForm.statut,
        annee_budgetaire_id: editForm.annee_budgetaire_id
          ? parseInt(editForm.annee_budgetaire_id)
          : null,
      });
      setEditModal(null);
      loadData();
    } catch {
      /* handled */
    }
  };

  const handleDeleteMarche = (m: Marche) => {
    setConfirmDialog({
      open: true,
      message: `Supprimer le marché ${m.reference} ?`,
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }));
        try {
          await api.deleteMarche(m.id);
          loadData();
        } catch {
          /* handled */
        }
      },
    });
  };

  const exportCsvMarches = () => {
    const header =
      "Référence;Objet;Fournisseur;Statut;Montant Initial;Consommé;Restant;Seuil Alerte;Date Début;Date Fin\n";
    const rows = marches
      .map(
        (m) =>
          `${m.reference};${m.objet};${m.fournisseur};${m.statut};${m.montant_initial};${m.montant_consomme};${m.montant_restant};${m.seuil_alerte}%;${m.date_debut?.slice(0, 10) || ""};${m.date_fin?.slice(0, 10) || ""}`,
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `marches_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const printMarches = () => {
    const rows = marches
      .map(
        (m) =>
          `<tr><td>${m.reference}</td><td>${m.objet}</td><td>${m.fournisseur}</td><td>${m.statut}</td><td style="text-align:right">${new Intl.NumberFormat("fr-FR").format(Math.round(m.montant_initial))}</td><td style="text-align:right">${new Intl.NumberFormat("fr-FR").format(Math.round(m.montant_consomme))}</td><td style="text-align:right">${new Intl.NumberFormat("fr-FR").format(Math.round(m.montant_restant))}</td></tr>`,
      )
      .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>Marchés</title><style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f0f0f0;font-weight:600}</style></head><body><h2>Liste des marchés — ${new Date().toLocaleDateString("fr-FR")}</h2><table><thead><tr><th>Réf.</th><th>Objet</th><th>Fournisseur</th><th>Statut</th><th>Montant Initial</th><th>Consommé</th><th>Restant</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
    );
    w.document.close();
    w.print();
  };

  const exportCsvCouts = () => {
    if (!couts) return;
    let csv = "\uFEFFType;Montant (FCFA)\n";
    csv += `Matières premières;${couts.matieres_premieres}\n`;
    csv += `Main d'oeuvre;${couts.main_oeuvre}\n`;
    csv += `Frais généraux;${couts.frais_generaux}\n`;
    csv += `Transport;${couts.transport}\n`;
    csv += `Autres;${couts.autres}\n`;
    csv += `Total;${couts.total}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `couts_desagreges_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR").format(Math.round(n));

  const statutBadge = (s: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      actif: { bg: "#dcfce7", text: "#166534", label: "Actif" },
      epuise: { bg: "#fee2e2", text: "#991b1b", label: "Épuisé" },
      cloture: { bg: "#e5e7eb", text: "#374151", label: "Clôturé" },
      suspendu: { bg: "#fef3c7", text: "#92400e", label: "Suspendu" },
    };
    const c = map[s] || map.actif;
    return (
      <span
        style={{
          padding: "2px 10px",
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600,
          background: c.bg,
          color: c.text,
        }}
      >
        {c.label}
      </span>
    );
  };

  const repasLabel = (r: string) => {
    const map: Record<string, string> = {
      petit_dejeuner: "Petit-déjeuner",
      dejeuner: "Déjeuner",
      diner: "Dîner",
    };
    return map[r] || r;
  };

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      malades: "Malades",
      personnel: "Personnel",
      client_externe: "Clients externes",
    };
    return map[t] || t;
  };

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Marchés & Budget</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={exportCsvMarches}
            style={{
              padding: "8px 14px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <i className="fa-solid fa-file-csv" style={{ marginRight: 4 }} />{" "}
            CSV
          </button>
          <button
            onClick={printMarches}
            style={{
              padding: "8px 14px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <i className="fa-solid fa-print" style={{ marginRight: 4 }} />{" "}
            Imprimer
          </button>
          {canCreate && (
            <>
              <button
                onClick={() => setShowAnneeModal(true)}
                style={{
                  padding: "8px 16px",
                  background: "#6b7280",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                + Année budgétaire
              </button>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  padding: "8px 16px",
                  background: "#7c3aed",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                + Nouveau marché
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "Marchés actifs",
              val: kpis.marches_actifs,
              color: "#7c3aed",
            },
            {
              label: "Budget total",
              val: fmt(kpis.montant_total) + " F",
              color: "#2563eb",
            },
            {
              label: "Consommé",
              val: fmt(kpis.montant_consomme) + " F",
              color: "#059669",
            },
            {
              label: "Restant",
              val: fmt(kpis.montant_restant) + " F",
              color: "#d97706",
            },
            {
              label: "Taux consommation",
              val: kpis.taux_consommation + "%",
              color: kpis.taux_consommation > 80 ? "#dc2626" : "#059669",
            },
            {
              label: "En alerte",
              val: kpis.marches_en_alerte,
              color: kpis.marches_en_alerte > 0 ? "#dc2626" : "#6b7280",
            },
          ].map((k, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,.08)",
              }}
            >
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                {k.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>
                {k.val}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alertes */}
      {kpis && kpis.alertes.length > 0 && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>
            ⚠ Alertes de fin de crédit
          </div>
          {kpis.alertes.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid #fecaca",
              }}
            >
              <span style={{ fontWeight: 600 }}>
                {a.reference} — {a.objet}
              </span>
              <span style={{ color: "#dc2626", fontWeight: 600 }}>
                Reste {fmt(a.montant_restant)} F ({a.pourcentage_restant}%)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Onglets */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {(["marches", "budget", "couts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 20px",
              border: "none",
              borderRadius: "8px 8px 0 0",
              cursor: "pointer",
              background: tab === t ? "#7c3aed" : "#f3f4f6",
              color: tab === t ? "#fff" : "#374151",
              fontWeight: tab === t ? 700 : 400,
              fontSize: 14,
            }}
          >
            {t === "marches"
              ? "Marchés"
              : t === "budget"
                ? "Suivi budgétaire"
                : "Coûts désagrégés"}
          </button>
        ))}
      </div>

      {/* TAB: Marchés */}
      {tab === "marches" && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            >
              <option value="">Tous les statuts</option>
              <option value="actif">Actif</option>
              <option value="epuise">Épuisé</option>
              <option value="suspendu">Suspendu</option>
              <option value="cloture">Clôturé</option>
            </select>
            <select
              value={filterAnnee}
              onChange={(e) => setFilterAnnee(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            >
              <option value="">Toutes les années</option>
              {annees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.libelle}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
              Chargement...
            </div>
          ) : marches.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
              Aucun marché enregistré
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "#fff",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,.08)",
                }}
              >
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {[
                      "Référence",
                      "Objet",
                      "Fournisseur",
                      "Montant initial",
                      "Consommé",
                      "Restant",
                      "%",
                      "Statut",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontSize: 12,
                          color: "#6b7280",
                          fontWeight: 600,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {marches.map((m) => (
                    <tr key={m.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {m.reference}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 13,
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.objet}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>
                        {m.fournisseur}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {fmt(m.montant_initial)} F
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>
                        {fmt(m.montant_consomme)} F
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontSize: 13,
                          color: m.en_alerte ? "#dc2626" : "#059669",
                          fontWeight: 600,
                        }}
                      >
                        {fmt(m.montant_restant)} F
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>
                        <div
                          style={{
                            background: "#e5e7eb",
                            borderRadius: 10,
                            height: 8,
                            width: 60,
                          }}
                        >
                          <div
                            style={{
                              background:
                                m.pourcentage_consomme > 80
                                  ? "#dc2626"
                                  : m.pourcentage_consomme > 50
                                    ? "#d97706"
                                    : "#059669",
                              borderRadius: 10,
                              height: 8,
                              width: `${Math.min(m.pourcentage_consomme, 100)}%`,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, color: "#6b7280" }}>
                          {m.pourcentage_consomme}%
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {statutBadge(m.statut)}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          onClick={() => setShowDetail(m)}
                          style={{
                            padding: "4px 10px",
                            background: "#ede9fe",
                            color: "#7c3aed",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 12,
                            marginRight: 4,
                          }}
                        >
                          Détail
                        </button>
                        {canCreate && (
                          <>
                            <button
                              onClick={() => openEdit(m)}
                              style={{
                                padding: "4px 10px",
                                background: "#DBEAFE",
                                color: "#1E40AF",
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontSize: 12,
                                marginRight: 4,
                              }}
                            >
                              <i className="fa-solid fa-pen" />
                            </button>
                            {m.montant_consomme === 0 && (
                              <button
                                onClick={() => handleDeleteMarche(m)}
                                style={{
                                  padding: "4px 10px",
                                  background: "#FEE2E2",
                                  color: "#991B1B",
                                  border: "none",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                <i className="fa-solid fa-trash" />
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* TAB: Suivi budgétaire */}
      {tab === "budget" && kpis && (
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,.08)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Évolution hebdomadaire des consommations
          </h3>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              height: 200,
            }}
          >
            {kpis.evolution_hebdo.map((e, i) => {
              const max = Math.max(
                ...kpis.evolution_hebdo.map((x) => x.montant),
                1,
              );
              const h = (e.montant / max) * 160;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}
                  >
                    {fmt(e.montant)}
                  </span>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 40,
                      height: h,
                      background: "#7c3aed",
                      borderRadius: "4px 4px 0 0",
                      minHeight: 4,
                    }}
                  />
                  <span
                    style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}
                  >
                    {e.semaine}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              Années budgétaires
            </h3>
            {annees.length === 0 ? (
              <p style={{ color: "#6b7280" }}>
                Aucune année budgétaire configurée
              </p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Libellé", "Début", "Fin", "Active"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 12px",
                          textAlign: "left",
                          fontSize: 12,
                          color: "#6b7280",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {annees.map((a) => (
                    <tr key={a.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                      <td
                        style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {a.libelle}
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: 13 }}>
                        {a.date_debut}
                      </td>
                      <td style={{ padding: "8px 12px", fontSize: 13 }}>
                        {a.date_fin}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {a.is_active ? (
                          <span style={{ color: "#059669", fontWeight: 600 }}>
                            Oui
                          </span>
                        ) : (
                          <span style={{ color: "#6b7280" }}>Non</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB: Coûts désagrégés */}
      {tab === "couts" && (
        <div style={{ display: "grid", gap: 16 }}>
          {couts ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 4,
                }}
              >
                <button
                  onClick={exportCsvCouts}
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
                  <i
                    className="fa-solid fa-file-csv"
                    style={{ marginRight: 4 }}
                  />{" "}
                  Export CSV
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    padding: 16,
                    borderRadius: 12,
                    boxShadow: "0 1px 3px rgba(0,0,0,.08)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Période</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {couts.periode.debut} → {couts.periode.fin}
                  </div>
                </div>
                <div
                  style={{
                    background: "#fff",
                    padding: 16,
                    borderRadius: 12,
                    boxShadow: "0 1px 3px rgba(0,0,0,.08)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Montant total
                  </div>
                  <div
                    style={{ fontSize: 20, fontWeight: 700, color: "#7c3aed" }}
                  >
                    {fmt(couts.total_montant)} F
                  </div>
                </div>
                <div
                  style={{
                    background: "#fff",
                    padding: 16,
                    borderRadius: 12,
                    boxShadow: "0 1px 3px rgba(0,0,0,.08)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Total portions
                  </div>
                  <div
                    style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}
                  >
                    {couts.total_portions}
                  </div>
                </div>
              </div>

              {/* Par service */}
              <div
                style={{
                  background: "#fff",
                  padding: 20,
                  borderRadius: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,.08)",
                }}
              >
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                  Par service
                </h3>
                {couts.par_service.length === 0 ? (
                  <p style={{ color: "#6b7280", fontSize: 13 }}>
                    Aucune donnée
                  </p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        {["Service", "Commandes", "Portions", "Montant"].map(
                          (h) => (
                            <th
                              key={h}
                              style={{
                                padding: "8px 12px",
                                textAlign: "left",
                                fontSize: 12,
                                color: "#6b7280",
                              }}
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {couts.par_service.map((s, i) => (
                        <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {s.service}
                          </td>
                          <td style={{ padding: "8px 12px", fontSize: 13 }}>
                            {s.nb_commandes}
                          </td>
                          <td style={{ padding: "8px 12px", fontSize: 13 }}>
                            {s.nb_portions}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {fmt(s.montant)} F
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Par repas + Par type */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    padding: 20,
                    borderRadius: 12,
                    boxShadow: "0 1px 3px rgba(0,0,0,.08)",
                  }}
                >
                  <h3
                    style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}
                  >
                    Par repas
                  </h3>
                  {couts.par_repas.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <span style={{ fontSize: 13 }}>
                        {repasLabel(r.repas)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {fmt(r.montant)} F ({r.nb_portions} portions)
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    background: "#fff",
                    padding: 20,
                    borderRadius: 12,
                    boxShadow: "0 1px 3px rgba(0,0,0,.08)",
                  }}
                >
                  <h3
                    style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}
                  >
                    Par type
                  </h3>
                  {couts.par_type.map((t, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{typeLabel(t.type)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {fmt(t.montant)} F ({t.nb_portions} portions)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
              Chargement des coûts...
            </div>
          )}
        </div>
      )}

      {/* Modal Nouveau Marché */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              width: 500,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Nouveau marché
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                {
                  key: "reference",
                  label: "Référence",
                  type: "text",
                  placeholder: "MR-2026-001",
                },
                {
                  key: "objet",
                  label: "Objet",
                  type: "text",
                  placeholder: "Fourniture denrées alimentaires",
                },
                {
                  key: "fournisseur",
                  label: "Fournisseur",
                  type: "text",
                  placeholder: "Nom du prestataire",
                },
                {
                  key: "montant_initial",
                  label: "Montant (FCFA)",
                  type: "number",
                  placeholder: "0",
                },
                {
                  key: "seuil_alerte",
                  label: "Seuil d'alerte (%)",
                  type: "number",
                  placeholder: "20",
                },
                {
                  key: "date_debut",
                  label: "Date début",
                  type: "date",
                  placeholder: "",
                },
                {
                  key: "date_fin",
                  label: "Date fin",
                  type: "date",
                  placeholder: "",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={(formData as Record<string, string>)[f.key]}
                    onChange={(e) =>
                      setFormData({ ...formData, [f.key]: e.target.value })
                    }
                    placeholder={f.placeholder}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  />
                </div>
              ))}
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Année budgétaire
                </label>
                <select
                  value={formData.annee_budgetaire_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      annee_budgetaire_id: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                >
                  <option value="">— Aucune —</option>
                  {annees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.libelle}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 20,
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: "#fff",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreateMarche}
                style={{
                  padding: "8px 16px",
                  background: "#7c3aed",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Année budgétaire */}
      {showAnneeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              width: 400,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Nouvelle année budgétaire
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Libellé
                </label>
                <input
                  type="text"
                  value={anneeForm.libelle}
                  onChange={(e) =>
                    setAnneeForm({ ...anneeForm, libelle: e.target.value })
                  }
                  placeholder="2026"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Début
                </label>
                <input
                  type="date"
                  value={anneeForm.date_debut}
                  onChange={(e) =>
                    setAnneeForm({ ...anneeForm, date_debut: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Fin
                </label>
                <input
                  type="date"
                  value={anneeForm.date_fin}
                  onChange={(e) =>
                    setAnneeForm({ ...anneeForm, date_fin: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                  }}
                />
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={anneeForm.is_active}
                  onChange={(e) =>
                    setAnneeForm({ ...anneeForm, is_active: e.target.checked })
                  }
                />
                Année active
              </label>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 20,
              }}
            >
              <button
                onClick={() => setShowAnneeModal(false)}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: "#fff",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreateAnnee}
                style={{
                  padding: "8px 16px",
                  background: "#6b7280",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail Marché */}
      {showDetail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              width: 560,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                Marché {showDetail.reference}
              </h2>
              {statutBadge(showDetail.statut)}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Objet</span>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {showDetail.objet}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  Fournisseur
                </span>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {showDetail.fournisseur}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  Montant initial
                </span>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {fmt(showDetail.montant_initial)} F
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Consommé</span>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {fmt(showDetail.montant_consomme)} F
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Restant</span>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: showDetail.en_alerte ? "#dc2626" : "#059669",
                  }}
                >
                  {fmt(showDetail.montant_restant)} F
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  Seuil alerte
                </span>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {showDetail.seuil_alerte}%
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Période</span>
                <div style={{ fontSize: 14 }}>
                  {showDetail.date_debut} → {showDetail.date_fin}
                </div>
              </div>
              {showDetail.annee_budgetaire && (
                <div>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Année</span>
                  <div style={{ fontSize: 14 }}>
                    {showDetail.annee_budgetaire.libelle}
                  </div>
                </div>
              )}
            </div>
            {/* Jauge */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#6b7280",
                  marginBottom: 4,
                }}
              >
                <span>Consommation</span>
                <span>{showDetail.pourcentage_consomme}%</span>
              </div>
              <div
                style={{ background: "#e5e7eb", borderRadius: 10, height: 12 }}
              >
                <div
                  style={{
                    background:
                      showDetail.pourcentage_consomme > 80
                        ? "#dc2626"
                        : showDetail.pourcentage_consomme > 50
                          ? "#d97706"
                          : "#059669",
                    borderRadius: 10,
                    height: 12,
                    width: `${Math.min(showDetail.pourcentage_consomme, 100)}%`,
                    transition: "width .3s",
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowDetail(null)}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: "#fff",
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier Marché */}
      {editModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              width: 480,
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Modifier le marché {editModal.reference}
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Objet
                </label>
                <input
                  value={editForm.objet}
                  onChange={(e) =>
                    setEditForm({ ...editForm, objet: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Fournisseur
                </label>
                <input
                  value={editForm.fournisseur}
                  onChange={(e) =>
                    setEditForm({ ...editForm, fournisseur: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Seuil d&apos;alerte (%)
                </label>
                <input
                  type="number"
                  value={editForm.seuil_alerte}
                  onChange={(e) =>
                    setEditForm({ ...editForm, seuil_alerte: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Date de fin
                </label>
                <input
                  type="date"
                  value={editForm.date_fin}
                  onChange={(e) =>
                    setEditForm({ ...editForm, date_fin: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Statut
                </label>
                <select
                  value={editForm.statut}
                  onChange={(e) =>
                    setEditForm({ ...editForm, statut: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                  }}
                >
                  <option value="actif">Actif</option>
                  <option value="suspendu">Suspendu</option>
                  <option value="cloture">Clôturé</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Année budgétaire
                </label>
                <select
                  value={editForm.annee_budgetaire_id}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      annee_budgetaire_id: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                  }}
                >
                  <option value="">Aucune</option>
                  {annees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.libelle}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 20,
              }}
            >
              <button
                onClick={() => setEditModal(null)}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: "#fff",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateMarche}
                style={{
                  padding: "8px 16px",
                  background: "#7c3aed",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((d) => ({ ...d, open: false }))}
      />
    </div>
  );
}

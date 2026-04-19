"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import { RegimeSpecial, Service } from "@/types";
import { useAuth } from "@/lib/auth";

const STATUT_BADGE: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  en_attente: { bg: "#FEF3C7", color: "#92400E", label: "En attente" },
  valide: { bg: "#D1FAE5", color: "#065F46", label: "Actif" },
  rejete: { bg: "#FEE2E2", color: "#991B1B", label: "Rejeté" },
  termine: { bg: "#F1F5F9", color: "#475569", label: "Terminé" },
};

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

const REGIME_COLORS: Record<string, { bg: string; color: string }> = {
  sans_sel: { bg: "#EDE9FE", color: "#5B21B6" },
  diabetique: { bg: "#DBEAFE", color: "#1E40AF" },
  hyposode: { bg: "#EDE9FE", color: "#5B21B6" },
  post_op_mixe: { bg: "#FEF3C7", color: "#92400E" },
  hyper_proteine: { bg: "#D1FAE5", color: "#065F46" },
  sans_gluten: { bg: "#FEE2E2", color: "#991B1B" },
  enrichi: { bg: "#DBEAFE", color: "#1E40AF" },
  autre: { bg: "#F1F5F9", color: "#475569" },
};

export default function MenusSpeciauxPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isPrestataire = user?.role === "prestataire";
  const [regimes, setRegimes] = useState<RegimeSpecial[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [tab, setTab] = useState<"demandes" | "valides" | "rejetes">(
    "demandes",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<RegimeSpecial | null>(null);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [rejectMotif, setRejectMotif] = useState("Article non disponible");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterType, setFilterType] = useState("");
  const [form, setForm] = useState({
    patient_nom: "",
    lit: "",
    service_id: "",
    type_regime: "sans_sel",
    date_debut: "",
    duree_jours: 7,
    medecin_prescripteur: "",
    instructions: "",
  });
  const [editForm, setEditForm] = useState({
    patient_nom: "",
    lit: "",
    service_id: "",
    type_regime: "sans_sel",
    date_debut: "",
    duree_jours: 7,
    medecin_prescripteur: "",
    instructions: "",
  });

  const load = () => {
    api
      .regimesSpeciaux()
      .then(setRegimes)
      .catch(() => {});
    api
      .myServices()
      .then(setServices)
      .catch(() => {});
  };

  useEffect(load, []);

  const filtered = regimes.filter((r) => {
    if (tab === "demandes") {
      if (r.statut !== "en_attente") return false;
    } else if (tab === "valides") {
      if (r.statut !== "valide" && r.statut !== "termine") return false;
    } else {
      if (r.statut !== "rejete") return false;
    }
    if (filterService && String(r.service_id) !== filterService) return false;
    if (filterType && r.type_regime !== filterType) return false;
    return true;
  });

  const pendingCount = regimes.filter((r) => r.statut === "en_attente").length;

  const handleValider = async (id: number) => {
    await api.validerRegime(id);
    load();
  };

  const handleRejeter = async () => {
    if (rejectModal === null) return;
    await api.rejeterRegime(rejectModal, rejectMotif);
    setRejectModal(null);
    load();
  };

  const handleCreate = async () => {
    if (!form.patient_nom.trim())
      return showToast("Veuillez saisir le nom du patient.", "error");
    if (!form.lit.trim())
      return showToast("Veuillez saisir le numéro de lit.", "error");
    if (!form.service_id)
      return showToast("Veuillez sélectionner un service.", "error");
    if (!form.date_debut)
      return showToast("Veuillez saisir la date de début.", "error");
    if (Number(form.duree_jours) < 1)
      return showToast("La durée doit être d'au moins 1 jour.", "error");
    if (!form.medecin_prescripteur.trim())
      return showToast(
        "Veuillez saisir le nom du médecin prescripteur.",
        "error",
      );
    await api.createRegime({
      ...form,
      service_id: Number(form.service_id),
      duree_jours: Number(form.duree_jours),
    });
    setModalOpen(false);
    load();
  };

  const openEdit = (r: RegimeSpecial) => {
    setEditForm({
      patient_nom: r.patient_nom,
      lit: r.lit,
      service_id: String(r.service_id),
      type_regime: r.type_regime,
      date_debut: r.date_debut,
      duree_jours: r.duree_jours,
      medecin_prescripteur: r.medecin_prescripteur,
      instructions: r.instructions || "",
    });
    setEditModal(r);
  };

  const handleEdit = async () => {
    if (!editModal) return;
    await api.updateRegime(editModal.id, {
      ...editForm,
      service_id: Number(editForm.service_id),
      duree_jours: Number(editForm.duree_jours),
    });
    setEditModal(null);
    load();
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
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Menus Spéciaux</h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}>
            Régimes thérapeutiques et demandes spécifiques des services
          </p>
        </div>
        {!isPrestataire && (
          <button onClick={() => setModalOpen(true)} style={btn}>
            <i className="fa-solid fa-plus" /> Nouvelle demande
          </button>
        )}
      </div>

      <div
        style={{
          padding: "12px 16px",
          borderRadius: 8,
          fontSize: 13,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 16,
          background: "#EFF6FF",
          color: "#1E40AF",
          border: "1px solid #BFDBFE",
        }}
      >
        <i className="fa-solid fa-circle-info" />
        Les régimes spéciaux doivent être validés 24h avant le service. Toute
        modification tardive requiert l&apos;accord du Prestataire.
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid var(--border)",
          marginBottom: 20,
        }}
      >
        {[
          {
            key: "demandes",
            label: "Demandes en attente",
            count: pendingCount,
          },
          { key: "valides", label: "Régimes validés" },
          { key: "rejetes", label: "Rejetés / Annulés" },
        ].map((t) => (
          <div
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
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
                  background: "#FEE2E2",
                  color: "#991B1B",
                }}
              >
                {t.count}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}
      >
        <select
          value={filterService}
          onChange={(e) => setFilterService(e.target.value)}
          style={{ ...filterInput }}
        >
          <option value="">Tous les services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ ...filterInput }}
        >
          <option value="">Tous les régimes</option>
          {Object.entries(REGIME_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {(filterService || filterType) && (
          <button
            onClick={() => {
              setFilterService("");
              setFilterType("");
            }}
            style={{ ...btnSecondary, fontSize: 12 }}
          >
            <i className="fa-solid fa-xmark" /> Réinitialiser
          </button>
        )}
      </div>

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
                <th style={thStyle}>Patient</th>
                <th style={thStyle}>Lit</th>
                <th style={thStyle}>Service</th>
                <th style={thStyle}>Type de régime</th>
                <th style={thStyle}>Durée</th>
                <th style={thStyle}>Prescrit par</th>
                <th style={thStyle}>Statut</th>
                {!isPrestataire &&
                  (tab === "demandes" || tab === "valides") && (
                    <th style={thStyle}>Actions</th>
                  )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sb = STATUT_BADGE[r.statut] || STATUT_BADGE.en_attente;
                const rc = REGIME_COLORS[r.type_regime] || {
                  bg: "#EDE9FE",
                  color: "#5B21B6",
                };
                return (
                  <tr key={r.id}>
                    <td style={tdStyle}>
                      <b>{r.patient_nom}</b>
                    </td>
                    <td style={tdStyle}>{r.lit}</td>
                    <td style={tdStyle}>{r.service?.nom}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background: rc.bg,
                          color: rc.color,
                        }}
                      >
                        {REGIME_LABELS[r.type_regime] || r.type_regime}
                      </span>
                    </td>
                    <td style={tdStyle}>{r.duree_jours} jours</td>
                    <td style={tdStyle}>{r.medecin_prescripteur}</td>
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
                    {!isPrestataire && tab === "demandes" && (
                      <td style={tdStyle}>
                        <button
                          onClick={() => openEdit(r)}
                          style={{
                            ...btnSm,
                            background: "transparent",
                            color: "var(--primary)",
                            border: "1.5px solid var(--primary)",
                            marginRight: 4,
                          }}
                          title="Modifier"
                        >
                          <i className="fa-solid fa-pencil" />
                        </button>
                        <button
                          onClick={() => handleValider(r.id)}
                          style={{
                            ...btnSm,
                            background: "var(--success)",
                            color: "white",
                            marginRight: 4,
                          }}
                        >
                          <i className="fa-solid fa-check" />
                        </button>
                        <button
                          onClick={() => setRejectModal(r.id)}
                          style={{
                            ...btnSm,
                            background: "var(--danger)",
                            color: "white",
                          }}
                        >
                          <i className="fa-solid fa-times" />
                        </button>
                      </td>
                    )}
                    {!isPrestataire &&
                      tab === "valides" &&
                      r.statut === "valide" && (
                        <td style={tdStyle}>
                          <button
                            onClick={async () => {
                              await api.terminerRegime(r.id);
                              load();
                            }}
                            style={{
                              ...btnSm,
                              background: "#475569",
                              color: "white",
                            }}
                            title="Terminer"
                          >
                            <i className="fa-solid fa-flag-checkered" />{" "}
                            Terminer
                          </button>
                        </td>
                      )}
                    {!isPrestataire &&
                      tab === "valides" &&
                      r.statut === "termine" && <td style={tdStyle} />}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      color: "var(--text-sm)",
                    }}
                  >
                    Aucun régime dans cette catégorie
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Demande de régime spécial"
        icon="fa-heart-pulse"
        iconColor="var(--danger)"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleCreate} style={btn}>
              <i className="fa-solid fa-check" /> Soumettre
            </button>
          </>
        }
      >
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nom du patient</label>
            <input
              value={form.patient_nom}
              onChange={(e) =>
                setForm({ ...form, patient_nom: e.target.value })
              }
              placeholder="Nom et prénom"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>N° de lit</label>
            <input
              value={form.lit}
              onChange={(e) => setForm({ ...form, lit: e.target.value })}
              placeholder="Ex: Pédiatrie-12"
              style={inputStyle}
            />
          </div>
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
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
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Type de régime</label>
            <select
              value={form.type_regime}
              onChange={(e) =>
                setForm({ ...form, type_regime: e.target.value })
              }
              style={inputStyle}
            >
              {[
                { value: "sans_sel", label: "Sans sel" },
                { value: "diabetique", label: "Diabétique" },
                { value: "hyposode", label: "Hyposodé" },
                { value: "post_op_mixe", label: "Post-op mixé" },
                { value: "hyper_proteine", label: "Hyper-protéiné" },
                { value: "sans_gluten", label: "Sans gluten" },
                { value: "enrichi", label: "Enrichi" },
                { value: "autre", label: "Autre" },
              ].map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Date de début</label>
            <input
              type="date"
              value={form.date_debut}
              onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Durée (jours)</label>
            <input
              type="number"
              value={form.duree_jours}
              onChange={(e) =>
                setForm({ ...form, duree_jours: Number(e.target.value) })
              }
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Médecin prescripteur</label>
          <input
            value={form.medecin_prescripteur}
            onChange={(e) =>
              setForm({ ...form, medecin_prescripteur: e.target.value })
            }
            placeholder="Nom du médecin"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Instructions spéciales</label>
          <textarea
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            placeholder="Détails de la prescription diététique..."
            style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
          />
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editModal !== null}
        onClose={() => setEditModal(null)}
        title="Modifier le régime spécial"
        icon="fa-pen"
        iconColor="var(--primary)"
        footer={
          <>
            <button onClick={() => setEditModal(null)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleEdit} style={btn}>
              <i className="fa-solid fa-check" /> Enregistrer
            </button>
          </>
        }
      >
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nom du patient</label>
            <input
              value={editForm.patient_nom}
              onChange={(e) =>
                setEditForm({ ...editForm, patient_nom: e.target.value })
              }
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>N° de lit</label>
            <input
              value={editForm.lit}
              onChange={(e) =>
                setEditForm({ ...editForm, lit: e.target.value })
              }
              style={inputStyle}
            />
          </div>
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Service</label>
            <select
              value={editForm.service_id}
              onChange={(e) =>
                setEditForm({ ...editForm, service_id: e.target.value })
              }
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
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Type de régime</label>
            <select
              value={editForm.type_regime}
              onChange={(e) =>
                setEditForm({ ...editForm, type_regime: e.target.value })
              }
              style={inputStyle}
            >
              {Object.entries(REGIME_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Date de début</label>
            <input
              type="date"
              value={editForm.date_debut}
              onChange={(e) =>
                setEditForm({ ...editForm, date_debut: e.target.value })
              }
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Durée (jours)</label>
            <input
              type="number"
              value={editForm.duree_jours}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  duree_jours: Number(e.target.value),
                })
              }
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Médecin prescripteur</label>
          <input
            value={editForm.medecin_prescripteur}
            onChange={(e) =>
              setEditForm({ ...editForm, medecin_prescripteur: e.target.value })
            }
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Instructions spéciales</label>
          <textarea
            value={editForm.instructions}
            onChange={(e) =>
              setEditForm({ ...editForm, instructions: e.target.value })
            }
            style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
          />
        </div>
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
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Raison du rejet</label>
          <select
            value={rejectMotif}
            onChange={(e) => setRejectMotif(e.target.value)}
            style={inputStyle}
          >
            <option>Article non disponible</option>
            <option>Délai dépassé</option>
            <option>Informations incomplètes</option>
            <option>Non conforme au protocole</option>
            <option>Autre</option>
          </select>
        </div>
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
const btnSm: React.CSSProperties = { ...btn, padding: "7px 10px" };
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

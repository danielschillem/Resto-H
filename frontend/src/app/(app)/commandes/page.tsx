"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { downloadCsv, exportPdf } from "@/lib/export";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import { Commande, Service, Menu } from "@/types";
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
            Gestion des Commandes
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}>
            Commandes des services, du personnel et des clients externes
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
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

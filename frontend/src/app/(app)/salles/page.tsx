"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  CategorieSalle,
  Salle,
  Lit,
  Service,
  HospitalisationStats,
} from "@/types";

export default function SallesPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<HospitalisationStats | null>(null);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [categories, setCategories] = useState<CategorieSalle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterService, setFilterService] = useState("");
  const [tab, setTab] = useState<"salles" | "categories">("salles");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => void;
  }>({ open: false, message: "", onConfirm: () => {} });

  // Create salle
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    numero: "",
    service_id: "",
    categorie_id: "",
    nb_lits: 0,
    notes: "",
  });

  // Edit salle
  const [editSalle, setEditSalle] = useState<Salle | null>(null);
  const [editForm, setEditForm] = useState({
    numero: "",
    service_id: "",
    categorie_id: "",
    nb_lits: 0,
    notes: "",
  });

  // Create categorie
  const [createCatModal, setCreateCatModal] = useState(false);
  const [createCatForm, setCreateCatForm] = useState({
    nom: "",
    nb_lits: 1,
    commodites: "",
  });

  // Edit categorie
  const [editCat, setEditCat] = useState<CategorieSalle | null>(null);
  const [editCatForm, setEditCatForm] = useState({
    nom: "",
    nb_lits: 1,
    commodites: "",
  });

  // Expand salle to see lits
  const [expandedSalle, setExpandedSalle] = useState<number | null>(null);

  // Add lit
  const [addLitModal, setAddLitModal] = useState<number | null>(null);
  const [addLitForm, setAddLitForm] = useState({ numero: "", notes: "" });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.hospiStats(),
      api.hospiSalles(),
      api.hospiCategories(),
      api.myServices(),
    ])
      .then(([s, sa, c, sv]) => {
        setStats(s);
        setSalles(sa);
        setCategories(c);
        setServices(sv);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = salles.filter((s) => {
    if (filterService && String(s.service_id) !== filterService) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.numero.toLowerCase().includes(q) ||
        (s.service?.nom || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handlers salles
  const handleCreateSalle = async () => {
    if (!createForm.numero.trim())
      return showToast("Veuillez saisir le numéro de la salle.", "error");
    if (!createForm.service_id)
      return showToast("Veuillez sélectionner un service.", "error");
    await api.hospiCreateSalle({
      ...createForm,
      service_id: Number(createForm.service_id),
      categorie_id: createForm.categorie_id
        ? Number(createForm.categorie_id)
        : null,
      nb_lits: Number(createForm.nb_lits),
    });
    setCreateModal(false);
    setCreateForm({
      numero: "",
      service_id: "",
      categorie_id: "",
      nb_lits: 0,
      notes: "",
    });
    load();
  };

  const openEditSalle = (s: Salle) => {
    setEditForm({
      numero: s.numero,
      service_id: String(s.service_id),
      categorie_id: s.categorie_id ? String(s.categorie_id) : "",
      nb_lits: s.nb_lits,
      notes: s.notes || "",
    });
    setEditSalle(s);
  };

  const handleEditSalle = async () => {
    if (!editSalle) return;
    await api.hospiUpdateSalle(editSalle.id, {
      ...editForm,
      service_id: Number(editForm.service_id),
      categorie_id: editForm.categorie_id
        ? Number(editForm.categorie_id)
        : null,
      nb_lits: Number(editForm.nb_lits),
    });
    setEditSalle(null);
    load();
  };

  const handleToggleSalle = async (s: Salle) => {
    await api.hospiUpdateSalle(s.id, { is_active: !s.is_active });
    load();
  };

  // Handlers categories
  const handleCreateCat = async () => {
    if (!createCatForm.nom.trim())
      return showToast("Veuillez saisir le nom de la catégorie.", "error");
    await api.hospiCreateCategorie({
      ...createCatForm,
      nb_lits: Number(createCatForm.nb_lits),
    });
    setCreateCatModal(false);
    setCreateCatForm({ nom: "", nb_lits: 1, commodites: "" });
    load();
  };

  const openEditCat = (c: CategorieSalle) => {
    setEditCatForm({
      nom: c.nom,
      nb_lits: c.nb_lits,
      commodites: c.commodites || "",
    });
    setEditCat(c);
  };

  const handleEditCat = async () => {
    if (!editCat) return;
    await api.hospiUpdateCategorie(editCat.id, {
      ...editCatForm,
      nb_lits: Number(editCatForm.nb_lits),
    });
    setEditCat(null);
    load();
  };

  const handleDeleteCat = (c: CategorieSalle) => {
    setConfirmDialog({
      open: true,
      message: `Supprimer la catégorie "${c.nom}" ?`,
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }));
        await api.hospiDeleteCategorie(c.id);
        load();
      },
    });
  };

  // Handlers lits
  const handleAddLit = async () => {
    if (!addLitModal || !addLitForm.numero.trim())
      return showToast("Veuillez saisir le numéro du lit.", "error");
    await api.hospiCreateLit({ ...addLitForm, salle_id: addLitModal });
    setAddLitModal(null);
    setAddLitForm({ numero: "", notes: "" });
    load();
  };

  const handleToggleLit = async (lit: Lit) => {
    await api.hospiUpdateLit(lit.id, { is_occupe: !lit.is_occupe });
    load();
  };

  const handleDeleteLit = (lit: Lit) => {
    setConfirmDialog({
      open: true,
      message: `Supprimer le lit N°${lit.numero} ?`,
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }));
        await api.hospiDeleteLit(lit.id);
        load();
      },
    });
  };

  return (
    <>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>
            <i
              className="fa-solid fa-door-open"
              style={{ marginRight: 8, color: "var(--primary)" }}
            />
            Salles & Lits
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}>
            Gestion des salles, catégories et lits par service
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tab === "categories" ? (
            <button onClick={() => setCreateCatModal(true)} style={btn}>
              <i className="fa-solid fa-plus" /> Nouvelle catégorie
            </button>
          ) : (
            <button onClick={() => setCreateModal(true)} style={btn}>
              <i className="fa-solid fa-plus" /> Nouvelle salle
            </button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid-4" style={{ gap: 16, marginBottom: 20 }}>
          <div style={statCard}>
            <div style={statIcon}>
              <i
                className="fa-solid fa-door-open"
                style={{ color: "var(--primary)" }}
              />
            </div>
            <div>
              <div style={statLabel}>Salles actives</div>
              <div style={statVal}>{stats.total_salles}</div>
            </div>
          </div>
          <div style={statCard}>
            <div style={{ ...statIcon, background: "#FEF3C7" }}>
              <i className="fa-solid fa-bed" style={{ color: "#92400E" }} />
            </div>
            <div>
              <div style={statLabel}>Total lits</div>
              <div style={statVal}>{stats.total_lits}</div>
            </div>
          </div>
          <div style={statCard}>
            <div style={{ ...statIcon, background: "#FEE2E2" }}>
              <i
                className="fa-solid fa-bed-pulse"
                style={{ color: "#991B1B" }}
              />
            </div>
            <div>
              <div style={statLabel}>Lits occupés</div>
              <div style={statVal}>{stats.lits_occupes}</div>
            </div>
          </div>
          <div style={statCard}>
            <div style={{ ...statIcon, background: "#D1FAE5" }}>
              <i
                className="fa-solid fa-check-circle"
                style={{ color: "#065F46" }}
              />
            </div>
            <div>
              <div style={statLabel}>Lits libres</div>
              <div style={statVal}>{stats.lits_libres}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        <button
          onClick={() => setTab("salles")}
          style={{ ...tabBtn, ...(tab === "salles" ? tabActive : {}) }}
        >
          <i className="fa-solid fa-door-open" style={{ marginRight: 6 }} />
          Salles & Lits
        </button>
        <button
          onClick={() => setTab("categories")}
          style={{ ...tabBtn, ...(tab === "categories" ? tabActive : {}) }}
        >
          <i className="fa-solid fa-tags" style={{ marginRight: 6 }} />
          Catégories
        </button>
      </div>

      {tab === "salles" ? (
        <div style={card}>
          {/* Filters */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <i
                className="fa-solid fa-search"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-sm)",
                  fontSize: 13,
                }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une salle..."
                style={{ ...inputStyle, paddingLeft: 36 }}
              />
            </div>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              style={{ ...inputStyle, width: "auto", minWidth: 160 }}
            >
              <option value="">Tous les services</option>
              {services.map((sv) => (
                <option key={sv.id} value={sv.id}>
                  {sv.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--text-sm)",
              }}
            >
              <i
                className="fa-solid fa-spinner fa-spin"
                style={{ marginRight: 8 }}
              />{" "}
              Chargement...
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--text-sm)",
              }}
            >
              <i
                className="fa-solid fa-door-open"
                style={{
                  fontSize: 28,
                  marginBottom: 8,
                  display: "block",
                  opacity: 0.3,
                }}
              />
              Aucune salle enregistrée
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={thStyle}>Salle</th>
                    <th style={thStyle}>Service</th>
                    <th style={thStyle}>Catégorie</th>
                    <th style={thStyle}>Lits</th>
                    <th style={thStyle}>Occupation</th>
                    <th style={thStyle}>Statut</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const litsOccupes =
                      s.lits?.filter((l) => l.is_occupe).length || 0;
                    const totalLits = s.lits?.length || 0;
                    const pct =
                      totalLits > 0
                        ? Math.round((litsOccupes / totalLits) * 100)
                        : 0;
                    const isExpanded = expandedSalle === s.id;
                    return (
                      <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.6 }}>
                        <td style={tdStyle} colSpan={isExpanded ? 7 : 1}>
                          {isExpanded ? (
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  marginBottom: 12,
                                  cursor: "pointer",
                                }}
                                onClick={() => setExpandedSalle(null)}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                >
                                  <i
                                    className="fa-solid fa-chevron-down"
                                    style={{
                                      color: "var(--primary)",
                                      fontSize: 11,
                                    }}
                                  />
                                  <b>{s.numero}</b>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: "var(--text-sm)",
                                    }}
                                  >
                                    - {s.service?.nom}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAddLitModal(s.id);
                                  }}
                                  style={{
                                    ...btnSm,
                                    background: "var(--primary)",
                                    color: "white",
                                  }}
                                >
                                  <i className="fa-solid fa-plus" /> Ajouter un
                                  lit
                                </button>
                              </div>
                              {s.lits && s.lits.length > 0 ? (
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fill, minmax(120px, 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  {s.lits.map((lit) => (
                                    <div
                                      key={lit.id}
                                      style={{
                                        padding: "10px 12px",
                                        borderRadius: 8,
                                        border: `1.5px solid ${lit.is_occupe ? "#FCA5A5" : "#BBF7D0"}`,
                                        background: lit.is_occupe
                                          ? "#FEF2F2"
                                          : "#F0FDF4",
                                        textAlign: "center",
                                        fontSize: 12,
                                      }}
                                    >
                                      <i
                                        className={`fa-solid fa-bed`}
                                        style={{
                                          fontSize: 16,
                                          color: lit.is_occupe
                                            ? "#DC2626"
                                            : "#16A34A",
                                          display: "block",
                                          marginBottom: 4,
                                        }}
                                      />
                                      <b>Lit N°{lit.numero}</b>
                                      <div
                                        style={{
                                          color: "var(--text-sm)",
                                          fontSize: 11,
                                          marginTop: 2,
                                        }}
                                      >
                                        {lit.is_occupe ? "Occupé" : "Libre"}
                                      </div>
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: 4,
                                          justifyContent: "center",
                                          marginTop: 6,
                                        }}
                                      >
                                        <button
                                          onClick={() => handleToggleLit(lit)}
                                          title={
                                            lit.is_occupe
                                              ? "Libérer"
                                              : "Occuper"
                                          }
                                          style={{
                                            ...btnXs,
                                            color: lit.is_occupe
                                              ? "#16A34A"
                                              : "#DC2626",
                                          }}
                                        >
                                          <i
                                            className={`fa-solid ${lit.is_occupe ? "fa-lock-open" : "fa-lock"}`}
                                          />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteLit(lit)}
                                          title="Supprimer"
                                          style={{ ...btnXs, color: "#DC2626" }}
                                        >
                                          <i className="fa-solid fa-trash" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div
                                  style={{
                                    textAlign: "center",
                                    padding: 16,
                                    color: "var(--text-sm)",
                                    fontSize: 12,
                                  }}
                                >
                                  Aucun lit dans cette salle
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                cursor: "pointer",
                              }}
                              onClick={() => setExpandedSalle(s.id)}
                            >
                              <i
                                className="fa-solid fa-chevron-right"
                                style={{
                                  color: "var(--text-sm)",
                                  fontSize: 10,
                                }}
                              />
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 8,
                                  background: s.is_active
                                    ? "#DBEAFE"
                                    : "#F1F5F9",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <i
                                  className="fa-solid fa-door-open"
                                  style={{
                                    fontSize: 14,
                                    color: s.is_active
                                      ? "var(--primary)"
                                      : "#94A3B8",
                                  }}
                                />
                              </div>
                              <b style={{ fontSize: 13 }}>{s.numero}</b>
                            </div>
                          )}
                        </td>
                        {!isExpanded && (
                          <>
                            <td style={tdStyle}>{s.service?.nom || "-"}</td>
                            <td style={tdStyle}>
                              {s.categorie ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    padding: "2px 8px",
                                    borderRadius: 12,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: "#EDE9FE",
                                    color: "#5B21B6",
                                  }}
                                >
                                  {s.categorie.nom}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td style={tdStyle}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <i
                                  className="fa-solid fa-bed"
                                  style={{
                                    color: "var(--text-sm)",
                                    fontSize: 12,
                                  }}
                                />
                                {totalLits}
                              </span>
                            </td>
                            <td style={tdStyle}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <div
                                  style={{
                                    flex: 1,
                                    height: 6,
                                    borderRadius: 3,
                                    background: "#E2E8F0",
                                    minWidth: 60,
                                  }}
                                >
                                  <div
                                    style={{
                                      height: 6,
                                      borderRadius: 3,
                                      background:
                                        pct > 80
                                          ? "#EF4444"
                                          : pct > 50
                                            ? "#F59E0B"
                                            : "#22C55E",
                                      width: `${pct}%`,
                                      transition: "width .3s",
                                    }}
                                  />
                                </div>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--text-sm)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {litsOccupes}/{totalLits}
                                </span>
                              </div>
                            </td>
                            <td style={tdStyle}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  padding: "3px 10px",
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: s.is_active
                                    ? "#D1FAE5"
                                    : "#F1F5F9",
                                  color: s.is_active ? "#065F46" : "#475569",
                                }}
                              >
                                {s.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: "flex", gap: 4 }}>
                                <button
                                  onClick={() => openEditSalle(s)}
                                  title="Modifier"
                                  style={{
                                    ...btnSm,
                                    background: "transparent",
                                    color: "var(--primary)",
                                    border: "1.5px solid var(--primary)",
                                  }}
                                >
                                  <i className="fa-solid fa-pencil" />
                                </button>
                                <button
                                  onClick={() => handleToggleSalle(s)}
                                  title={s.is_active ? "Désactiver" : "Activer"}
                                  style={{
                                    ...btnSm,
                                    background: "transparent",
                                    color: s.is_active
                                      ? "var(--danger)"
                                      : "var(--success)",
                                    border: `1.5px solid ${s.is_active ? "var(--danger)" : "var(--success)"}`,
                                  }}
                                >
                                  <i
                                    className={`fa-solid ${s.is_active ? "fa-toggle-off" : "fa-toggle-on"}`}
                                  />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filtered.length > 0 && (
            <div
              style={{ marginTop: 12, fontSize: 12, color: "var(--text-sm)" }}
            >
              {filtered.length} salle{filtered.length > 1 ? "s" : ""} affichée
              {filtered.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      ) : (
        /* Categories tab */
        <div style={card}>
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--text-sm)",
              }}
            >
              <i
                className="fa-solid fa-spinner fa-spin"
                style={{ marginRight: 8 }}
              />{" "}
              Chargement...
            </div>
          ) : categories.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--text-sm)",
              }}
            >
              <i
                className="fa-solid fa-tags"
                style={{
                  fontSize: 28,
                  marginBottom: 8,
                  display: "block",
                  opacity: 0.3,
                }}
              />
              Aucune catégorie définie
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              {categories.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "#FAFBFF",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {c.nom}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-sm)",
                          marginTop: 2,
                        }}
                      >
                        {c.nb_lits} lit{c.nb_lits > 1 ? "s" : ""} par salle
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => openEditCat(c)}
                        style={{ ...btnXs, color: "var(--primary)" }}
                      >
                        <i className="fa-solid fa-pencil" />
                      </button>
                      <button
                        onClick={() => handleDeleteCat(c)}
                        style={{ ...btnXs, color: "var(--danger)" }}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </div>
                  {c.commodites && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-sm)",
                        background: "#F1F5F9",
                        padding: "6px 10px",
                        borderRadius: 6,
                      }}
                    >
                      <i
                        className="fa-solid fa-star"
                        style={{ marginRight: 4, fontSize: 10 }}
                      />
                      {c.commodites}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create salle modal */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Nouvelle salle"
        icon="fa-door-open"
        maxWidth={480}
        footer={
          <>
            <button onClick={() => setCreateModal(false)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleCreateSalle} style={btn}>
              <i className="fa-solid fa-check" /> Créer
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Numéro / Nom de la salle</label>
          <input
            value={createForm.numero}
            onChange={(e) =>
              setCreateForm({ ...createForm, numero: e.target.value })
            }
            placeholder="Ex: Salle 1"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Service</label>
          <select
            value={createForm.service_id}
            onChange={(e) =>
              setCreateForm({ ...createForm, service_id: e.target.value })
            }
            style={inputStyle}
          >
            <option value="">-- Sélectionner --</option>
            {services.map((sv) => (
              <option key={sv.id} value={sv.id}>
                {sv.nom}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Catégorie</label>
          <select
            value={createForm.categorie_id}
            onChange={(e) =>
              setCreateForm({ ...createForm, categorie_id: e.target.value })
            }
            style={inputStyle}
          >
            <option value="">-- Aucune --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nombre de lits à créer</label>
          <input
            type="number"
            min={0}
            value={createForm.nb_lits}
            onChange={(e) =>
              setCreateForm({ ...createForm, nb_lits: Number(e.target.value) })
            }
            style={inputStyle}
          />
          <div style={{ fontSize: 11, color: "var(--text-sm)", marginTop: 4 }}>
            Les lits seront numérotés automatiquement de 1 à N
          </div>
        </div>
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={createForm.notes}
            onChange={(e) =>
              setCreateForm({ ...createForm, notes: e.target.value })
            }
            placeholder="Notes optionnelles..."
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      </Modal>

      {/* Edit salle modal */}
      <Modal
        open={editSalle !== null}
        onClose={() => setEditSalle(null)}
        title="Modifier la salle"
        icon="fa-door-open"
        maxWidth={480}
        footer={
          <>
            <button onClick={() => setEditSalle(null)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleEditSalle} style={btn}>
              <i className="fa-solid fa-check" /> Enregistrer
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Numéro / Nom de la salle</label>
          <input
            value={editForm.numero}
            onChange={(e) =>
              setEditForm({ ...editForm, numero: e.target.value })
            }
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Service</label>
          <select
            value={editForm.service_id}
            onChange={(e) =>
              setEditForm({ ...editForm, service_id: e.target.value })
            }
            style={inputStyle}
          >
            {services.map((sv) => (
              <option key={sv.id} value={sv.id}>
                {sv.nom}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Catégorie</label>
          <select
            value={editForm.categorie_id}
            onChange={(e) =>
              setEditForm({ ...editForm, categorie_id: e.target.value })
            }
            style={inputStyle}
          >
            <option value="">-- Aucune --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={editForm.notes}
            onChange={(e) =>
              setEditForm({ ...editForm, notes: e.target.value })
            }
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      </Modal>

      {/* Create categorie modal */}
      <Modal
        open={createCatModal}
        onClose={() => setCreateCatModal(false)}
        title="Nouvelle catégorie de salle"
        icon="fa-tags"
        maxWidth={420}
        footer={
          <>
            <button
              onClick={() => setCreateCatModal(false)}
              style={btnSecondary}
            >
              Annuler
            </button>
            <button onClick={handleCreateCat} style={btn}>
              <i className="fa-solid fa-check" /> Créer
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nom de la catégorie</label>
          <input
            value={createCatForm.nom}
            onChange={(e) =>
              setCreateCatForm({ ...createCatForm, nom: e.target.value })
            }
            placeholder="Ex: 1 lit VIP, 2 lits standard"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nombre de lits standard</label>
          <input
            type="number"
            min={1}
            value={createCatForm.nb_lits}
            onChange={(e) =>
              setCreateCatForm({
                ...createCatForm,
                nb_lits: Number(e.target.value),
              })
            }
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Commodités</label>
          <textarea
            value={createCatForm.commodites}
            onChange={(e) =>
              setCreateCatForm({ ...createCatForm, commodites: e.target.value })
            }
            placeholder="Ex: Climatisation, TV, salle de bain privée..."
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      </Modal>

      {/* Edit categorie modal */}
      <Modal
        open={editCat !== null}
        onClose={() => setEditCat(null)}
        title="Modifier la catégorie"
        icon="fa-tags"
        maxWidth={420}
        footer={
          <>
            <button onClick={() => setEditCat(null)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleEditCat} style={btn}>
              <i className="fa-solid fa-check" /> Enregistrer
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nom de la catégorie</label>
          <input
            value={editCatForm.nom}
            onChange={(e) =>
              setEditCatForm({ ...editCatForm, nom: e.target.value })
            }
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nombre de lits standard</label>
          <input
            type="number"
            min={1}
            value={editCatForm.nb_lits}
            onChange={(e) =>
              setEditCatForm({
                ...editCatForm,
                nb_lits: Number(e.target.value),
              })
            }
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Commodités</label>
          <textarea
            value={editCatForm.commodites}
            onChange={(e) =>
              setEditCatForm({ ...editCatForm, commodites: e.target.value })
            }
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      </Modal>

      {/* Add lit modal */}
      <Modal
        open={addLitModal !== null}
        onClose={() => setAddLitModal(null)}
        title="Ajouter un lit"
        icon="fa-bed"
        maxWidth={360}
        footer={
          <>
            <button onClick={() => setAddLitModal(null)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleAddLit} style={btn}>
              <i className="fa-solid fa-check" /> Ajouter
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Numéro du lit</label>
          <input
            value={addLitForm.numero}
            onChange={(e) =>
              setAddLitForm({ ...addLitForm, numero: e.target.value })
            }
            placeholder="Ex: 11"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Notes</label>
          <input
            value={addLitForm.notes}
            onChange={(e) =>
              setAddLitForm({ ...addLitForm, notes: e.target.value })
            }
            placeholder="Optionnel"
            style={inputStyle}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDialog.open}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((d) => ({ ...d, open: false }))}
      />
    </>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "white",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  padding: 20,
};
const statCard: React.CSSProperties = {
  ...(card as object),
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "18px 20px",
};
const statIcon: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 10,
  background: "#DBEAFE",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontSize: 18,
};
const statLabel: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-sm)",
  textTransform: "uppercase",
  letterSpacing: ".5px",
};
const statVal: React.CSSProperties = { fontSize: 26, fontWeight: 700 };
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
};
const btnSm: React.CSSProperties = {
  ...btn,
  padding: "6px 10px",
  fontSize: 11,
};
const btnXs: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: 12,
  padding: "4px 6px",
};
const btnSecondary: React.CSSProperties = {
  ...btn,
  background: "var(--border)",
  color: "var(--text)",
};
const tabBtn: React.CSSProperties = {
  ...btn,
  background: "transparent",
  color: "var(--text-sm)",
  border: "1px solid var(--border)",
};
const tabActive: React.CSSProperties = {
  background: "var(--primary)",
  color: "white",
  border: "1px solid var(--primary)",
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

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Modal from "@/components/Modal";
import { Service } from "@/types";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Create
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    nom: "",
    lits_actifs: 0,
    responsable: "",
  });

  // Edit
  const [editService, setEditService] = useState<Service | null>(null);
  const [editForm, setEditForm] = useState({
    nom: "",
    lits_actifs: 0,
    responsable: "",
  });

  const load = () => {
    setLoading(true);
    api
      .services()
      .then(setServices)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // Filtered list
  const filtered = services.filter((s) => {
    if (filterActive === "active" && !s.is_active) return false;
    if (filterActive === "inactive" && s.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.nom.toLowerCase().includes(q) ||
        (s.responsable || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalLits = filtered.reduce((sum, s) => sum + (s.lits_actifs || 0), 0);

  // Handlers
  const handleCreate = async () => {
    if (!createForm.nom.trim())
      return alert("Veuillez saisir le nom du service.");
    if (Number(createForm.lits_actifs) < 0)
      return alert("Le nombre de lits ne peut pas être négatif.");
    await api.createService({
      ...createForm,
      lits_actifs: Number(createForm.lits_actifs),
    });
    setCreateModal(false);
    setCreateForm({ nom: "", lits_actifs: 0, responsable: "" });
    load();
  };

  const openEdit = (s: Service) => {
    setEditForm({
      nom: s.nom,
      lits_actifs: s.lits_actifs || 0,
      responsable: s.responsable || "",
    });
    setEditService(s);
  };

  const handleEdit = async () => {
    if (!editService) return;
    await api.updateService(editService.id, {
      ...editForm,
      lits_actifs: Number(editForm.lits_actifs),
    });
    setEditService(null);
    load();
  };

  const handleToggleActive = async (s: Service) => {
    await api.updateService(s.id, { is_active: !s.is_active });
    load();
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
            Services hospitaliers
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}>
            Gestion des services, lits actifs et responsables
          </p>
        </div>
        <button onClick={() => setCreateModal(true)} style={btn}>
          <i className="fa-solid fa-plus" /> Nouveau service
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid-3" style={{ gap: 16, marginBottom: 20 }}>
        <div style={statCard}>
          <div style={statIcon}>
            <i
              className="fa-solid fa-hospital"
              style={{ color: "var(--primary)" }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-sm)",
                textTransform: "uppercase",
                letterSpacing: ".5px",
              }}
            >
              Total services
            </div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {services.length}
            </div>
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
            <div
              style={{
                fontSize: 11,
                color: "var(--text-sm)",
                textTransform: "uppercase",
                letterSpacing: ".5px",
              }}
            >
              Services actifs
            </div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {services.filter((s) => s.is_active).length}
            </div>
          </div>
        </div>
        <div style={statCard}>
          <div style={{ ...statIcon, background: "#FEF3C7" }}>
            <i className="fa-solid fa-bed" style={{ color: "#92400E" }} />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-sm)",
                textTransform: "uppercase",
                letterSpacing: ".5px",
              }}
            >
              Lits actifs
            </div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{totalLits}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={card}>
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
              placeholder="Rechercher un service ou responsable..."
              style={{ ...inputStyle, paddingLeft: 36 }}
            />
          </div>
          <select
            value={filterActive}
            onChange={(e) =>
              setFilterActive(e.target.value as "all" | "active" | "inactive")
            }
            style={{ ...inputStyle, width: "auto", minWidth: 140 }}
          >
            <option value="all">Tous</option>
            <option value="active">Actifs uniquement</option>
            <option value="inactive">Inactifs uniquement</option>
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
              className="fa-solid fa-hospital"
              style={{
                fontSize: 28,
                marginBottom: 8,
                display: "block",
                opacity: 0.3,
              }}
            />
            {search || filterActive !== "all"
              ? "Aucun service ne correspond aux critères"
              : "Aucun service enregistré"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={thStyle}>Service</th>
                  <th style={thStyle}>Lits actifs</th>
                  <th style={thStyle}>Responsable</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.6 }}>
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: s.is_active ? "#DBEAFE" : "#F1F5F9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <i
                            className="fa-solid fa-hospital"
                            style={{
                              fontSize: 14,
                              color: s.is_active ? "var(--primary)" : "#94A3B8",
                            }}
                          />
                        </div>
                        <b style={{ fontSize: 13 }}>{s.nom}</b>
                      </div>
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
                          style={{ color: "var(--text-sm)", fontSize: 12 }}
                        />
                        {s.lits_actifs}
                      </span>
                    </td>
                    <td style={tdStyle}>{s.responsable || "—"}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background: s.is_active ? "#D1FAE5" : "#F1F5F9",
                          color: s.is_active ? "#065F46" : "#475569",
                        }}
                      >
                        {s.is_active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => openEdit(s)}
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
                          onClick={() => handleToggleActive(s)}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-sm)" }}>
            {filtered.length} service{filtered.length > 1 ? "s" : ""} affiché
            {filtered.length > 1 ? "s" : ""}
            {(search || filterActive !== "all") && ` sur ${services.length}`}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Nouveau service hospitalier"
        icon="fa-hospital"
        maxWidth={440}
        footer={
          <>
            <button onClick={() => setCreateModal(false)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleCreate} style={btn}>
              <i className="fa-solid fa-check" /> Créer
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nom du service</label>
          <input
            value={createForm.nom}
            onChange={(e) =>
              setCreateForm({ ...createForm, nom: e.target.value })
            }
            placeholder="Ex: Pédiatrie"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nombre de lits actifs</label>
          <input
            type="number"
            min={0}
            value={createForm.lits_actifs}
            onChange={(e) =>
              setCreateForm({
                ...createForm,
                lits_actifs: Number(e.target.value),
              })
            }
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Responsable</label>
          <input
            value={createForm.responsable}
            onChange={(e) =>
              setCreateForm({ ...createForm, responsable: e.target.value })
            }
            placeholder="Nom du responsable"
            style={inputStyle}
          />
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editService !== null}
        onClose={() => setEditService(null)}
        title="Modifier le service"
        icon="fa-hospital"
        maxWidth={440}
        footer={
          <>
            <button onClick={() => setEditService(null)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleEdit} style={btn}>
              <i className="fa-solid fa-check" /> Enregistrer
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nom du service</label>
          <input
            value={editForm.nom}
            onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
            placeholder="Ex: Pédiatrie"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nombre de lits actifs</label>
          <input
            type="number"
            min={0}
            value={editForm.lits_actifs}
            onChange={(e) =>
              setEditForm({ ...editForm, lits_actifs: Number(e.target.value) })
            }
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Responsable</label>
          <input
            value={editForm.responsable}
            onChange={(e) =>
              setEditForm({ ...editForm, responsable: e.target.value })
            }
            placeholder="Nom du responsable"
            style={inputStyle}
          />
        </div>
      </Modal>
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

const btnSecondary: React.CSSProperties = {
  ...btn,
  background: "var(--border)",
  color: "var(--text)",
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

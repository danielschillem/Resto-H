"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import {
  Patient,
  Admission,
  Service,
  Salle,
  Lit,
  HospitalisationStats,
} from "@/types";

export default function PatientsPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState<HospitalisationStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterStatut, setFilterStatut] = useState("hospitalise");
  const [tab, setTab] = useState<"patients" | "admissions">("patients");

  // Create patient + admission
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    nom: "",
    prenom: "",
    sexe: "",
    age: "",
    service_id: "",
    salle_id: "",
    lit_id: "",
    motif: "",
    medecin_referent: "",
    observations: "",
  });

  // Sortie patient
  const [sortieModal, setSortieModal] = useState<Patient | null>(null);
  const [sortieObs, setSortieObs] = useState("");

  // Detail patient
  const [detailPatient, setDetailPatient] = useState<Patient | null>(null);

  // Lits disponibles (filtrés par salle sélectionnée)
  const litsDisponibles = createForm.salle_id
    ? (
        salles.find((s) => String(s.id) === createForm.salle_id)?.lits || []
      ).filter((l) => !l.is_occupe)
    : [];

  // Salles filtrées par service sélectionné
  const sallesFiltered = createForm.service_id
    ? salles.filter(
        (s) => String(s.service_id) === createForm.service_id && s.is_active,
      )
    : [];

  const load = () => {
    setLoading(true);
    Promise.all([
      api.hospiStats(),
      api.hospiPatients(),
      api.hospiAdmissions(),
      api.myServices(),
      api.hospiSalles(),
    ])
      .then(([st, p, a, sv, sa]) => {
        setStats(st);
        setPatients(p);
        setAdmissions(a);
        setServices(sv);
        setSalles(sa);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filteredPatients = patients.filter((p) => {
    if (filterStatut && p.statut !== filterStatut) return false;
    if (filterService && String(p.service_id) !== filterService) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.nom.toLowerCase().includes(q) ||
        (p.prenom || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handlers
  const handleCreate = async () => {
    if (!createForm.nom.trim())
      return showToast("Veuillez saisir le nom du patient.", "error");
    if (!createForm.service_id)
      return showToast("Veuillez sélectionner un service.", "error");

    // Créer le patient
    const patient = await api.hospiCreatePatient({
      nom: createForm.nom,
      prenom: createForm.prenom || null,
      sexe: createForm.sexe || null,
      age: createForm.age ? Number(createForm.age) : null,
      service_id: Number(createForm.service_id),
      lit_id: createForm.lit_id ? Number(createForm.lit_id) : null,
      observations: createForm.observations || null,
    });

    // Créer l'admission
    await api.hospiCreateAdmission({
      patient_id: patient.id,
      service_id: Number(createForm.service_id),
      lit_id: createForm.lit_id ? Number(createForm.lit_id) : null,
      date_admission: new Date().toISOString().split("T")[0],
      motif: createForm.motif || null,
      medecin_referent: createForm.medecin_referent || null,
      observations: createForm.observations || null,
    });

    setCreateModal(false);
    setCreateForm({
      nom: "",
      prenom: "",
      sexe: "",
      age: "",
      service_id: "",
      salle_id: "",
      lit_id: "",
      motif: "",
      medecin_referent: "",
      observations: "",
    });
    load();
  };

  const handleSortie = async () => {
    if (!sortieModal) return;
    await api.hospiUpdatePatient(sortieModal.id, {
      statut: "sorti",
      observations: sortieObs || null,
    });
    setSortieModal(null);
    setSortieObs("");
    load();
  };

  const handleShowDetail = async (p: Patient) => {
    const detail = await api.hospiShowPatient(p.id);
    setDetailPatient(detail);
  };

  const statutBadge = (s: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      hospitalise: { bg: "#DBEAFE", color: "#1E40AF", label: "Hospitalisé" },
      sorti: { bg: "#D1FAE5", color: "#065F46", label: "Sorti" },
      transfere: { bg: "#FEF3C7", color: "#92400E", label: "Transféré" },
    };
    const v = map[s] || map.hospitalise;
    return (
      <span
        style={{
          display: "inline-flex",
          padding: "3px 10px",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
          background: v.bg,
          color: v.color,
        }}
      >
        {v.label}
      </span>
    );
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
              className="fa-solid fa-hospital-user"
              style={{ marginRight: 8, color: "var(--primary)" }}
            />
            Patients & Admissions
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}>
            Gestion nominative des patients et suivi des admissions
          </p>
        </div>
        <button onClick={() => setCreateModal(true)} style={btn}>
          <i className="fa-solid fa-plus" /> Nouvelle admission
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid-4" style={{ gap: 16, marginBottom: 20 }}>
          <div style={statCard}>
            <div style={statIcon}>
              <i
                className="fa-solid fa-hospital-user"
                style={{ color: "var(--primary)" }}
              />
            </div>
            <div>
              <div style={statLabel}>Patients hospitalisés</div>
              <div style={statVal}>{stats.patients_hospitalises}</div>
            </div>
          </div>
          <div style={statCard}>
            <div style={{ ...statIcon, background: "#FEF3C7" }}>
              <i className="fa-solid fa-bed" style={{ color: "#92400E" }} />
            </div>
            <div>
              <div style={statLabel}>Lits occupés</div>
              <div style={statVal}>{stats.lits_occupes}</div>
            </div>
          </div>
          <div style={statCard}>
            <div style={{ ...statIcon, background: "#D1FAE5" }}>
              <i className="fa-solid fa-bed" style={{ color: "#065F46" }} />
            </div>
            <div>
              <div style={statLabel}>Lits libres</div>
              <div style={statVal}>{stats.lits_libres}</div>
            </div>
          </div>
          <div style={statCard}>
            <div style={{ ...statIcon, background: "#EDE9FE" }}>
              <i className="fa-solid fa-users" style={{ color: "#5B21B6" }} />
            </div>
            <div>
              <div style={statLabel}>Total patients</div>
              <div style={statVal}>{patients.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        <button
          onClick={() => setTab("patients")}
          style={{ ...tabBtn, ...(tab === "patients" ? tabActive : {}) }}
        >
          <i className="fa-solid fa-hospital-user" style={{ marginRight: 6 }} />
          Patients
        </button>
        <button
          onClick={() => setTab("admissions")}
          style={{ ...tabBtn, ...(tab === "admissions" ? tabActive : {}) }}
        >
          <i
            className="fa-solid fa-clipboard-list"
            style={{ marginRight: 6 }}
          />
          Historique admissions
        </button>
      </div>

      {tab === "patients" ? (
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
                placeholder="Rechercher un patient..."
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
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              style={{ ...inputStyle, width: "auto", minWidth: 140 }}
            >
              <option value="">Tous statuts</option>
              <option value="hospitalise">Hospitalisés</option>
              <option value="sorti">Sortis</option>
              <option value="transfere">Transférés</option>
            </select>
          </div>

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
          ) : filteredPatients.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--text-sm)",
              }}
            >
              <i
                className="fa-solid fa-hospital-user"
                style={{
                  fontSize: 28,
                  marginBottom: 8,
                  display: "block",
                  opacity: 0.3,
                }}
              />
              Aucun patient trouvé
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={thStyle}>Patient</th>
                    <th style={thStyle}>Sexe</th>
                    <th style={thStyle}>Âge</th>
                    <th style={thStyle}>Service</th>
                    <th style={thStyle}>Salle / Lit</th>
                    <th style={thStyle}>Statut</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p) => (
                    <tr key={p.id}>
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
                              borderRadius: "50%",
                              background:
                                p.sexe === "F" ? "#FCE7F3" : "#DBEAFE",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              fontSize: 14,
                              color: p.sexe === "F" ? "#BE185D" : "#1E40AF",
                            }}
                          >
                            <i
                              className={`fa-solid ${p.sexe === "F" ? "fa-venus" : "fa-mars"}`}
                            />
                          </div>
                          <div>
                            <b style={{ fontSize: 13 }}>{p.nom}</b>
                            {p.prenom && (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-sm)",
                                  marginLeft: 4,
                                }}
                              >
                                {p.prenom}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}>{p.sexe || "-"}</td>
                      <td style={tdStyle}>
                        {p.age != null ? `${p.age} ans` : "-"}
                      </td>
                      <td style={tdStyle}>{p.service?.nom || "-"}</td>
                      <td style={tdStyle}>
                        {p.lit ? (
                          <span style={{ fontSize: 12 }}>
                            <i
                              className="fa-solid fa-door-open"
                              style={{
                                marginRight: 4,
                                color: "var(--text-sm)",
                                fontSize: 10,
                              }}
                            />
                            {p.lit.salle?.numero || "?"} / Lit N°{p.lit.numero}
                          </span>
                        ) : (
                          <span
                            style={{ color: "var(--text-sm)", fontSize: 12 }}
                          >
                            Non assigné
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>{statutBadge(p.statut)}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => handleShowDetail(p)}
                            title="Détail"
                            style={{
                              ...btnSm,
                              background: "transparent",
                              color: "var(--primary)",
                              border: "1.5px solid var(--primary)",
                            }}
                          >
                            <i className="fa-solid fa-eye" />
                          </button>
                          {p.statut === "hospitalise" && (
                            <button
                              onClick={() => setSortieModal(p)}
                              title="Sortie"
                              style={{
                                ...btnSm,
                                background: "transparent",
                                color: "var(--danger)",
                                border: "1.5px solid var(--danger)",
                              }}
                            >
                              <i className="fa-solid fa-right-from-bracket" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filteredPatients.length > 0 && (
            <div
              style={{ marginTop: 12, fontSize: 12, color: "var(--text-sm)" }}
            >
              {filteredPatients.length} patient
              {filteredPatients.length > 1 ? "s" : ""} affiché
              {filteredPatients.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      ) : (
        /* Admissions tab */
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
          ) : admissions.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--text-sm)",
              }}
            >
              Aucune admission enregistrée
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={thStyle}>Patient</th>
                    <th style={thStyle}>Service</th>
                    <th style={thStyle}>Lit</th>
                    <th style={thStyle}>Date admission</th>
                    <th style={thStyle}>Date sortie</th>
                    <th style={thStyle}>Motif</th>
                    <th style={thStyle}>Médecin</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map((a) => (
                    <tr key={a.id}>
                      <td style={tdStyle}>
                        <b>{a.patient?.nom}</b> {a.patient?.prenom || ""}
                      </td>
                      <td style={tdStyle}>{a.service?.nom || "-"}</td>
                      <td style={tdStyle}>
                        {a.lit
                          ? `${a.lit.salle?.numero || "?"} / Lit ${a.lit.numero}`
                          : "-"}
                      </td>
                      <td style={tdStyle}>
                        {new Date(a.date_admission).toLocaleDateString("fr-FR")}
                      </td>
                      <td style={tdStyle}>
                        {a.date_sortie ? (
                          new Date(a.date_sortie).toLocaleDateString("fr-FR")
                        ) : (
                          <span
                            style={{
                              color: "#16A34A",
                              fontWeight: 600,
                              fontSize: 11,
                            }}
                          >
                            En cours
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>{a.motif || "-"}</td>
                      <td style={tdStyle}>{a.medecin_referent || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create patient + admission modal */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Nouvelle admission"
        icon="fa-hospital-user"
        maxWidth={540}
        footer={
          <>
            <button onClick={() => setCreateModal(false)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleCreate} style={btn}>
              <i className="fa-solid fa-check" /> Admettre
            </button>
          </>
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <label style={labelStyle}>Nom *</label>
            <input
              value={createForm.nom}
              onChange={(e) =>
                setCreateForm({ ...createForm, nom: e.target.value })
              }
              placeholder="Nom du patient"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Prénom</label>
            <input
              value={createForm.prenom}
              onChange={(e) =>
                setCreateForm({ ...createForm, prenom: e.target.value })
              }
              placeholder="Prénom"
              style={inputStyle}
            />
          </div>
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
            <label style={labelStyle}>Sexe</label>
            <select
              value={createForm.sexe}
              onChange={(e) =>
                setCreateForm({ ...createForm, sexe: e.target.value })
              }
              style={inputStyle}
            >
              <option value="">--</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Âge</label>
            <input
              type="number"
              min={0}
              max={200}
              value={createForm.age}
              onChange={(e) =>
                setCreateForm({ ...createForm, age: e.target.value })
              }
              placeholder="Âge"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Service *</label>
          <select
            value={createForm.service_id}
            onChange={(e) =>
              setCreateForm({
                ...createForm,
                service_id: e.target.value,
                salle_id: "",
                lit_id: "",
              })
            }
            style={inputStyle}
          >
            <option value="">-- Sélectionner un service --</option>
            {services.map((sv) => (
              <option key={sv.id} value={sv.id}>
                {sv.nom}
              </option>
            ))}
          </select>
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
            <label style={labelStyle}>Salle</label>
            <select
              value={createForm.salle_id}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  salle_id: e.target.value,
                  lit_id: "",
                })
              }
              style={inputStyle}
              disabled={!createForm.service_id}
            >
              <option value="">-- Sélectionner --</option>
              {sallesFiltered.map((sa) => (
                <option key={sa.id} value={sa.id}>
                  {sa.numero}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Lit</label>
            <select
              value={createForm.lit_id}
              onChange={(e) =>
                setCreateForm({ ...createForm, lit_id: e.target.value })
              }
              style={inputStyle}
              disabled={!createForm.salle_id}
            >
              <option value="">-- Sélectionner --</option>
              {litsDisponibles.map((l) => (
                <option key={l.id} value={l.id}>
                  Lit N°{l.numero}
                </option>
              ))}
            </select>
            {createForm.salle_id && litsDisponibles.length === 0 && (
              <div
                style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}
              >
                Aucun lit libre dans cette salle
              </div>
            )}
          </div>
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
            <label style={labelStyle}>Motif d&apos;admission</label>
            <input
              value={createForm.motif}
              onChange={(e) =>
                setCreateForm({ ...createForm, motif: e.target.value })
              }
              placeholder="Motif"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Médecin référent</label>
            <input
              value={createForm.medecin_referent}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  medecin_referent: e.target.value,
                })
              }
              placeholder="Dr..."
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Observations</label>
          <textarea
            value={createForm.observations}
            onChange={(e) =>
              setCreateForm({ ...createForm, observations: e.target.value })
            }
            placeholder="Observations cliniques..."
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      </Modal>

      {/* Sortie modal */}
      <Modal
        open={sortieModal !== null}
        onClose={() => setSortieModal(null)}
        title={`Sortie de ${sortieModal?.nom || ""}`}
        icon="fa-right-from-bracket"
        maxWidth={420}
        footer={
          <>
            <button onClick={() => setSortieModal(null)} style={btnSecondary}>
              Annuler
            </button>
            <button
              onClick={handleSortie}
              style={{ ...btn, background: "var(--danger)" }}
            >
              <i className="fa-solid fa-right-from-bracket" /> Confirmer la
              sortie
            </button>
          </>
        }
      >
        <p style={{ fontSize: 13, marginBottom: 12, color: "var(--text-sm)" }}>
          Le lit sera automatiquement libéré et le patient marqué comme sorti.
        </p>
        <label style={labelStyle}>Observations de sortie</label>
        <textarea
          value={sortieObs}
          onChange={(e) => setSortieObs(e.target.value)}
          placeholder="Observations optionnelles..."
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Modal>

      {/* Detail modal */}
      <Modal
        open={detailPatient !== null}
        onClose={() => setDetailPatient(null)}
        title={`${detailPatient?.nom || ""} ${detailPatient?.prenom || ""}`}
        icon="fa-hospital-user"
        maxWidth={500}
        footer={
          <button onClick={() => setDetailPatient(null)} style={btn}>
            Fermer
          </button>
        }
      >
        {detailPatient && (
          <div style={{ fontSize: 13 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ color: "var(--text-sm)" }}>Sexe :</span>{" "}
                <b>{detailPatient.sexe || "-"}</b>
              </div>
              <div>
                <span style={{ color: "var(--text-sm)" }}>Âge :</span>{" "}
                <b>
                  {detailPatient.age != null ? `${detailPatient.age} ans` : "-"}
                </b>
              </div>
              <div>
                <span style={{ color: "var(--text-sm)" }}>Service :</span>{" "}
                <b>{detailPatient.service?.nom || "-"}</b>
              </div>
              <div>
                <span style={{ color: "var(--text-sm)" }}>Statut :</span>{" "}
                {statutBadge(detailPatient.statut)}
              </div>
              <div>
                <span style={{ color: "var(--text-sm)" }}>Salle :</span>{" "}
                <b>{detailPatient.lit?.salle?.numero || "-"}</b>
              </div>
              <div>
                <span style={{ color: "var(--text-sm)" }}>Lit :</span>{" "}
                <b>
                  {detailPatient.lit ? `N°${detailPatient.lit.numero}` : "-"}
                </b>
              </div>
            </div>
            {detailPatient.observations && (
              <div
                style={{
                  background: "#F8FAFC",
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  Observations
                </div>
                <div style={{ color: "var(--text-sm)" }}>
                  {detailPatient.observations}
                </div>
              </div>
            )}
          </div>
        )}
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

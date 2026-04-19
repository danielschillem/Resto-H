"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  ListeNominativeItem,
  ListeNominativeResponse,
  Service,
} from "@/types";

export default function ListeNominativePage() {
  const { user } = useAuth();
  const [data, setData] = useState<ListeNominativeResponse | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [filterRepas, setFilterRepas] = useState("");
  const [filterService, setFilterService] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    repas: "dejeuner",
    service_id: "",
    regime: "Normal",
    observations: "",
  });

  const canCreate = user && ["csah", "sus", "super_admin"].includes(user.role);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterDate) params.date = filterDate;
      if (filterRepas) params.repas = filterRepas;
      if (filterService) params.service_id = filterService;
      const d = await api.listeNominative(params);
      setData(d);
    } catch {
      /* handled */
    }
    setLoading(false);
  }, [filterDate, filterRepas, filterService]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    api
      .myServices()
      .then(setServices)
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!formData.service_id) return;
    try {
      await api.createListeNominative({
        date: formData.date,
        repas: formData.repas,
        service_id: parseInt(formData.service_id),
        regime: formData.regime || null,
        observations: formData.observations || null,
      });
      setShowModal(false);
      loadData();
    } catch {
      /* handled */
    }
  };

  const handleToggleServi = async (item: ListeNominativeItem) => {
    try {
      await api.updateListeNominative(item.id, { servi: !item.servi });
      loadData();
    } catch {
      /* handled */
    }
  };

  const handleMarquerTous = async () => {
    if (!filterDate) return;
    try {
      await api.marquerTousServis({
        date: filterDate,
        repas: filterRepas || "dejeuner",
        service_id: filterService ? parseInt(filterService) : undefined,
      });
      loadData();
    } catch {
      /* handled */
    }
  };

  const repasLabel = (r: string) => {
    const map: Record<string, string> = {
      petit_dejeuner: "Petit-déjeuner",
      dejeuner: "Déjeuner",
      diner: "Dîner",
    };
    return map[r] || r;
  };

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

  const exportCsv = () => {
    if (!data || !data.items.length) return;
    const header = "Patient,Sexe,Âge,Service,Salle/Lit,Repas,Régime,Servi";
    const rows = data.items.map((i) => {
      const nom = i.patient
        ? `${i.patient.nom} ${i.patient.prenom || ""}`
        : `#${i.patient_id}`;
      const lit = i.lit
        ? `${i.lit.salle?.numero || "?"}/Lit ${i.lit.numero}`
        : "";
      return `"${nom}","${i.patient?.sexe || ""}","${i.patient?.age ?? ""}","${i.service?.nom || ""}","${lit}","${repasLabel(i.repas)}","${i.regime || "Normal"}","${i.servi ? "Oui" : "Non"}"`;
    });
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liste_nominative_${filterDate || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!data || !data.items.length) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = data.items
      .map((i) => {
        const nom = i.patient
          ? `${i.patient.nom} ${i.patient.prenom || ""}`
          : `#${i.patient_id}`;
        const lit = i.lit
          ? `${i.lit.salle?.numero || "?"} / Lit ${i.lit.numero}`
          : "—";
        return `<tr><td>${nom}</td><td>${i.patient?.sexe || "—"}</td><td>${i.patient?.age != null ? i.patient.age + " ans" : "—"}</td><td>${i.service?.nom || "—"}</td><td>${lit}</td><td>${repasLabel(i.repas)}</td><td>${i.regime || "Normal"}</td><td>${i.servi ? "✓" : "✗"}</td></tr>`;
      })
      .join("");
    w.document.write(
      `<!DOCTYPE html><html><head><title>Liste Nominative ${filterDate}</title><style>body{font-family:Arial,sans-serif;margin:20px}h1{text-align:center;font-size:18px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #333;padding:6px 8px;font-size:12px;text-align:left}th{background:#f3f4f6;font-weight:700}p{font-size:12px;color:#666;margin:4px 0}.stats{display:flex;gap:20px;margin-bottom:8px}</style></head><body><h1>LISTE NOMINATIVE DES MALADES</h1><p>Date : ${filterDate} ${filterRepas ? "— Repas : " + repasLabel(filterRepas) : ""}</p><div class="stats"><p>Total patients : <b>${data.stats.total_patients}</b></p><p>Servis : <b>${data.stats.servis}</b></p><p>Non servis : <b>${data.stats.non_servis}</b></p></div><table><thead><tr><th>Patient</th><th>Sexe</th><th>Âge</th><th>Service</th><th>Salle/Lit</th><th>Repas</th><th>Régime</th><th>Servi</th></tr></thead><tbody>${rows}</tbody></table><p style="margin-top:12px;font-style:italic">Imprimé le ${new Date().toLocaleString("fr-FR")}</p></body></html>`,
    );
    w.document.close();
    w.print();
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
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Liste Nominative</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={exportCsv}
            style={{
              padding: "8px 16px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <i className="fa-solid fa-file-csv" /> CSV
          </button>
          <button
            onClick={exportPdf}
            style={{
              padding: "8px 16px",
              background: "#1e40af",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <i className="fa-solid fa-print" /> Imprimer
          </button>
          {canCreate && (
            <>
              <button
                onClick={handleMarquerTous}
                style={{
                  padding: "8px 16px",
                  background: "#059669",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Tout marquer servi
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
                + Générer la liste
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,.08)",
            }}
          >
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              Patients inscrits
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed" }}>
              {data.stats.total_patients}
            </div>
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,.08)",
            }}
          >
            <div style={{ fontSize: 13, color: "#6b7280" }}>Servis</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#059669" }}>
              {data.stats.servis}
            </div>
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,.08)",
            }}
          >
            <div style={{ fontSize: 13, color: "#6b7280" }}>Non servis</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#dc2626" }}>
              {data.stats.non_servis}
            </div>
          </div>
          {data.stats.par_regime.map((r, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,.08)",
              }}
            >
              <div style={{ fontSize: 13, color: "#6b7280" }}>{r.regime}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#2563eb" }}>
                {r.count}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div
        style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}
      >
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
          }}
        />
        <select
          value={filterRepas}
          onChange={(e) => setFilterRepas(e.target.value)}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
          }}
        >
          <option value="">Tous les repas</option>
          <option value="petit_dejeuner">Petit-déjeuner</option>
          <option value="dejeuner">Déjeuner</option>
          <option value="diner">Dîner</option>
        </select>
        <select
          value={filterService}
          onChange={(e) => setFilterService(e.target.value)}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
          }}
        >
          <option value="">Tous les services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          Chargement...
        </div>
      ) : !data || data.items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          Aucun patient inscrit pour cette date.
          {canCreate && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              Cliquez sur &quot;Générer la liste&quot; pour inscrire
              automatiquement les patients hospitalisés.
            </div>
          )}
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
                  "Patient",
                  "Sexe",
                  "Âge",
                  "Service",
                  "Salle / Lit",
                  "Repas",
                  "Régime",
                  "Servi",
                  "Observations",
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
              {data.items.map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {item.patient
                      ? `${item.patient.nom} ${item.patient.prenom || ""}`
                      : `Patient #${item.patient_id}`}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>
                    {item.patient?.sexe || "—"}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>
                    {item.patient?.age != null
                      ? `${item.patient.age} ans`
                      : "—"}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>
                    {item.service?.nom || "—"}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>
                    {item.lit
                      ? `${item.lit.salle?.numero || "?"} / Lit ${item.lit.numero}`
                      : "—"}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>
                    {repasLabel(item.repas)}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background:
                          item.regime === "Normal" || !item.regime
                            ? "#f3f4f6"
                            : "#fef3c7",
                        color:
                          item.regime === "Normal" || !item.regime
                            ? "#374151"
                            : "#92400e",
                      }}
                    >
                      {item.regime || "Normal"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {item.servi ? (
                      <span
                        style={{
                          color: "#059669",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        ✓ Oui
                      </span>
                    ) : (
                      <span style={{ color: "#dc2626", fontSize: 13 }}>
                        ✗ Non
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      fontSize: 12,
                      color: "#6b7280",
                      maxWidth: 150,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.observations || "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {canCreate && (
                      <button
                        onClick={() => handleToggleServi(item)}
                        style={{
                          padding: "4px 10px",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 12,
                          background: item.servi ? "#fee2e2" : "#dcfce7",
                          color: item.servi ? "#991b1b" : "#166534",
                        }}
                      >
                        {item.servi ? "Annuler" : "Servi"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Footer stats */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "#f9fafb",
              borderRadius: "0 0 12px 12px",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            <span>Total: {data.stats.total_patients} patient(s)</span>
            <span>
              Servis: {data.stats.servis} / Non servis: {data.stats.non_servis}
            </span>
          </div>
        </div>
      )}

      {/* Modal Générer */}
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
              width: 440,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Générer la liste nominative
            </h2>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              Inscrit automatiquement tous les patients hospitalisés du service
              sélectionné.
            </p>
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
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
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
                  Repas
                </label>
                <select
                  value={formData.repas}
                  onChange={(e) =>
                    setFormData({ ...formData, repas: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
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
                    fontSize: 13,
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Service
                </label>
                <select
                  value={formData.service_id}
                  onChange={(e) =>
                    setFormData({ ...formData, service_id: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                  }}
                >
                  <option value="">— Choisir un service —</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
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
                  Régime par défaut
                </label>
                <input
                  type="text"
                  value={formData.regime}
                  onChange={(e) =>
                    setFormData({ ...formData, regime: e.target.value })
                  }
                  placeholder="Normal"
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
                  Observations
                </label>
                <textarea
                  value={formData.observations}
                  onChange={(e) =>
                    setFormData({ ...formData, observations: e.target.value })
                  }
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    resize: "vertical",
                  }}
                />
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
                onClick={handleGenerate}
                disabled={!formData.service_id}
                style={{
                  padding: "8px 16px",
                  background: formData.service_id ? "#7c3aed" : "#d1d5db",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: formData.service_id ? "pointer" : "not-allowed",
                }}
              >
                Générer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

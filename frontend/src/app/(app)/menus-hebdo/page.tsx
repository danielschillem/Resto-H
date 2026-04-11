"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Modal from "@/components/Modal";
import { useAuth } from "@/lib/auth";
import { MenuHebdomadaire, Menu } from "@/types";

const JOURS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];
const MEAL_LABELS: Record<string, string> = {
  petit_dejeuner: "Petit-déj.",
  dejeuner: "Déjeuner",
  diner: "Dîner",
};

const STATUT_BADGE: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  brouillon: { bg: "#F1F5F9", color: "#475569", label: "Brouillon" },
  soumis: {
    bg: "#FEF3C7",
    color: "#92400E",
    label: "En attente de validation",
  },
  valide: { bg: "#D1FAE5", color: "#065F46", label: "Validé" },
  rejete: { bg: "#FEE2E2", color: "#991B1B", label: "Rejeté" },
};

export default function MenusHebdoPage() {
  const [menusHebdo, setMenusHebdo] = useState<MenuHebdomadaire[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [current, setCurrent] = useState<MenuHebdomadaire | null>(null);
  const [weekIdx, setWeekIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [createWeekOpen, setCreateWeekOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectCommentaire, setRejectCommentaire] = useState("");
  const [weekForm, setWeekForm] = useState({
    semaine_debut: "",
    semaine_fin: "",
    cout_matieres: 0,
    cout_main_oeuvre: 0,
  });
  const [form, setForm] = useState({
    jour: 0,
    type_repas: "dejeuner",
    intitule: "",
    portions: 180,
    cout: 650,
  });
  const { user } = useAuth();

  const reload = () => {
    api
      .menusHebdo()
      .then((data) => {
        setMenusHebdo(data);
        if (data.length > 0) setCurrent(data[weekIdx] || data[0]);
      })
      .catch(() => {});
    api
      .menus()
      .then(setMenus)
      .catch(() => {});
  };

  useEffect(() => {
    reload();
  }, []);

  const handleSoumettre = async () => {
    if (!current) return;
    try {
      await api.soumettreMenuHebdo(current.id);
      setCurrent((prev) => (prev ? { ...prev, statut: "soumis" } : null));
    } catch {
      /* */
    }
  };

  const handleValider = async () => {
    if (!current) return;
    try {
      await api.validerMenuHebdo(current.id);
      setCurrent((prev) => (prev ? { ...prev, statut: "valide" } : null));
    } catch {
      /* */
    }
  };

  const handleRejeter = async () => {
    if (!current) return;
    try {
      await api.rejeterMenuHebdo(current.id, rejectCommentaire);
      setRejectOpen(false);
      setRejectCommentaire("");
      reload();
    } catch {
      /* */
    }
  };

  const handleCreateWeek = async () => {
    if (!weekForm.semaine_debut || !weekForm.semaine_fin)
      return alert("Veuillez saisir les dates de début et de fin de semaine.");
    if (weekForm.semaine_fin <= weekForm.semaine_debut)
      return alert("La date de fin doit être postérieure à la date de début.");
    if (
      Number(weekForm.cout_matieres) < 0 ||
      Number(weekForm.cout_main_oeuvre) < 0
    )
      return alert("Les coûts ne peuvent pas être négatifs.");
    await api.createMenuHebdo({
      semaine_debut: weekForm.semaine_debut,
      semaine_fin: weekForm.semaine_fin,
      cout_matieres: Number(weekForm.cout_matieres),
      cout_main_oeuvre: Number(weekForm.cout_main_oeuvre),
    });
    setCreateWeekOpen(false);
    api
      .menusHebdo()
      .then((data) => {
        setMenusHebdo(data);
        if (data.length > 0) {
          const newIdx = data.length - 1;
          setWeekIdx(newIdx);
          setCurrent(data[newIdx]);
        }
      })
      .catch(() => {});
  };

  const goWeek = (dir: number) => {
    const newIdx = weekIdx + dir;
    if (newIdx >= 0 && newIdx < menusHebdo.length) {
      setWeekIdx(newIdx);
      setCurrent(menusHebdo[newIdx]);
    }
  };

  const getMenuForSlot = (jour: number, type: string) => {
    if (!current?.items) return null;
    const item = current.items.find(
      (it) => it.jour_semaine === jour && it.menu?.type_repas === type,
    );
    return item?.menu || null;
  };

  const sb = current
    ? STATUT_BADGE[current.statut] || STATUT_BADGE.brouillon
    : null;

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
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Menus Hebdomadaires</h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}>
            Planification et validation des menus de la semaine
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {current?.statut === "brouillon" && (
            <button onClick={handleSoumettre} style={btnOutline}>
              <i className="fa-solid fa-check-circle" /> Soumettre pour
              validation
            </button>
          )}
          {current?.statut === "soumis" &&
            (user?.role === "gerant" || user?.role === "dsgl") && (
              <>
                <button
                  onClick={() => setRejectOpen(true)}
                  style={{
                    ...btnOutline,
                    color: "var(--danger)",
                    borderColor: "var(--danger)",
                  }}
                >
                  <i className="fa-solid fa-times-circle" /> Rejeter
                </button>
                <button
                  onClick={handleValider}
                  style={{
                    ...btn,
                    background: "var(--success)",
                    color: "white",
                  }}
                >
                  <i className="fa-solid fa-check-circle" /> Valider
                </button>
              </>
            )}
          <button onClick={() => setCreateWeekOpen(true)} style={btnSecondary}>
            <i className="fa-solid fa-calendar-plus" /> Nouvelle semaine
          </button>
          <button onClick={() => setModalOpen(true)} style={btn}>
            <i className="fa-solid fa-plus" /> Ajouter un repas
          </button>
        </div>
      </div>

      {/* Week info */}
      <div
        style={{
          background: "white",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <button
            onClick={() => goWeek(-1)}
            disabled={weekIdx === 0}
            style={{
              ...btnSecondary,
              opacity: weekIdx === 0 ? 0.4 : 1,
              padding: "7px 12px",
            }}
          >
            <i className="fa-solid fa-chevron-left" />
          </button>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              flex: 1,
              textAlign: "center",
            }}
          >
            {current
              ? `Semaine du ${fmtDate(current.semaine_debut)} au ${fmtDate(current.semaine_fin)}`
              : "Aucun menu hebdomadaire"}
            {menusHebdo.length > 0 && (
              <span
                style={{ fontSize: 12, color: "var(--text-sm)", marginLeft: 8 }}
              >
                ({weekIdx + 1}/{menusHebdo.length})
              </span>
            )}
          </div>
          <button
            onClick={() => goWeek(1)}
            disabled={weekIdx >= menusHebdo.length - 1}
            style={{
              ...btnSecondary,
              opacity: weekIdx >= menusHebdo.length - 1 ? 0.4 : 1,
              padding: "7px 12px",
            }}
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
          {sb && (
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
          )}
        </div>

        {/* Week grid */}
        <div className="table-wrap">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 10,
              minWidth: 700,
            }}
          >
            {JOURS.map((jour, idx) => {
              const today = new Date().getDay();
              const isToday = (idx + 1) % 7 === today;
              return (
                <div
                  key={idx}
                  style={{
                    background: "white",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: isToday ? "var(--primary)" : "var(--navy)",
                      color: "white",
                      padding: 10,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: ".8px",
                        opacity: 0.7,
                      }}
                    >
                      {jour}
                    </div>
                  </div>
                  {["petit_dejeuner", "dejeuner", "diner"].map((type) => {
                    const menu = getMenuForSlot(idx, type);
                    return (
                      <div
                        key={type}
                        style={{
                          padding: 10,
                          borderBottom: "1px solid #F1F5F9",
                          minHeight: 70,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: ".8px",
                            color: "var(--text-sm)",
                            marginBottom: 4,
                          }}
                        >
                          {MEAL_LABELS[type]}
                        </div>
                        {menu ? (
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              lineHeight: 1.3,
                            }}
                          >
                            {menu.intitule}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#CBD5E1",
                              fontStyle: "italic",
                            }}
                          >
                            Non défini
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        {/* /table-wrap */}
      </div>

      {/* Nutritional + Cost cards */}
      <div className="grid-2" style={{ gap: 16 }}>
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            padding: 20,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Valeurs nutritionnelles estimées
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 120,
              gap: 8,
            }}
          >
            <i
              className="fa-solid fa-flask"
              style={{ fontSize: 28, color: "#CBD5E1" }}
            />
            <p
              style={{
                fontSize: 13,
                color: "var(--text-sm)",
                textAlign: "center",
              }}
            >
              Données nutritionnelles non disponibles.
              <br />
              Un module d&apos;analyse nutritionnelle pourra être intégré
              ultérieurement.
            </p>
          </div>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            padding: 20,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Coût estimatif hebdomadaire
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: 10,
                background: "#F8FAFC",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 12, color: "var(--text-sm)" }}>
                Coût matières premières
              </span>
              <span style={{ fontWeight: 700 }}>
                {current?.cout_matieres != null
                  ? current.cout_matieres.toLocaleString("fr-FR") + " FCFA"
                  : "—"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: 10,
                background: "#F8FAFC",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 12, color: "var(--text-sm)" }}>
                Main-d&apos;œuvre estimée
              </span>
              <span style={{ fontWeight: 700 }}>
                {current?.cout_main_oeuvre != null
                  ? current.cout_main_oeuvre.toLocaleString("fr-FR") + " FCFA"
                  : "—"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: 12,
                background: "var(--navy)",
                borderRadius: 8,
                color: "white",
              }}
            >
              <span style={{ fontWeight: 500 }}>Total estimé</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>
                {current
                  ? (
                      (current.cout_matieres || 0) +
                      (current.cout_main_oeuvre || 0)
                    ).toLocaleString("fr-FR") + " FCFA"
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add meal modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajouter un repas au menu"
        icon="fa-utensils"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} style={btnSecondary}>
              Annuler
            </button>
            <button
              onClick={async () => {
                try {
                  const newMenu = await api.createMenu({
                    intitule: form.intitule,
                    type_repas: form.type_repas,
                    portions_prevues: form.portions,
                    cout_unitaire: form.cout,
                  });
                  if (current) {
                    await api.addMenuHebdoItem(
                      current.id,
                      newMenu.id,
                      form.jour,
                    );
                  }
                  setModalOpen(false);
                  api
                    .menusHebdo()
                    .then((data) => {
                      setMenusHebdo(data);
                      if (data.length > 0) {
                        setCurrent(
                          (prev) =>
                            data.find((m) => m.id === prev?.id) || data[0],
                        );
                      }
                    })
                    .catch(() => {});
                  api
                    .menus()
                    .then(setMenus)
                    .catch(() => {});
                } catch {
                  /* */
                }
              }}
              style={btn}
            >
              <i className="fa-solid fa-check" /> Enregistrer
            </button>
          </>
        }
      >
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Jour</label>
            <select
              value={form.jour}
              onChange={(e) =>
                setForm({ ...form, jour: Number(e.target.value) })
              }
              style={inputStyle}
            >
              {JOURS.map((j, i) => (
                <option key={i} value={i}>
                  {j}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Type de repas</label>
            <select
              value={form.type_repas}
              onChange={(e) => setForm({ ...form, type_repas: e.target.value })}
              style={inputStyle}
            >
              <option value="petit_dejeuner">Petit-déjeuner</option>
              <option value="dejeuner">Déjeuner</option>
              <option value="diner">Dîner</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Intitulé du menu</label>
          <input
            value={form.intitule}
            onChange={(e) => setForm({ ...form, intitule: e.target.value })}
            placeholder="Ex: Riz gras au poulet"
            style={inputStyle}
          />
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
          <div>
            <label style={labelStyle}>Nb. portions prévues</label>
            <input
              type="number"
              value={form.portions}
              onChange={(e) =>
                setForm({ ...form, portions: Number(e.target.value) })
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Coût unitaire (FCFA)</label>
            <input
              type="number"
              value={form.cout}
              onChange={(e) =>
                setForm({ ...form, cout: Number(e.target.value) })
              }
              style={inputStyle}
            />
          </div>
        </div>
      </Modal>

      {/* Create week modal */}
      <Modal
        open={createWeekOpen}
        onClose={() => setCreateWeekOpen(false)}
        title="Planifier une nouvelle semaine"
        icon="fa-calendar-plus"
        maxWidth={480}
        footer={
          <>
            <button
              onClick={() => setCreateWeekOpen(false)}
              style={btnSecondary}
            >
              Annuler
            </button>
            <button onClick={handleCreateWeek} style={btn}>
              <i className="fa-solid fa-check" /> Créer
            </button>
          </>
        }
      >
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Début de semaine</label>
            <input
              type="date"
              value={weekForm.semaine_debut}
              onChange={(e) =>
                setWeekForm({ ...weekForm, semaine_debut: e.target.value })
              }
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Fin de semaine</label>
            <input
              type="date"
              value={weekForm.semaine_fin}
              onChange={(e) =>
                setWeekForm({ ...weekForm, semaine_fin: e.target.value })
              }
              style={inputStyle}
            />
          </div>
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
          <div>
            <label style={labelStyle}>Coût matières (FCFA)</label>
            <input
              type="number"
              value={weekForm.cout_matieres}
              onChange={(e) =>
                setWeekForm({
                  ...weekForm,
                  cout_matieres: Number(e.target.value),
                })
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Main-d&apos;œuvre (FCFA)</label>
            <input
              type="number"
              value={weekForm.cout_main_oeuvre}
              onChange={(e) =>
                setWeekForm({
                  ...weekForm,
                  cout_main_oeuvre: Number(e.target.value),
                })
              }
              style={inputStyle}
            />
          </div>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Rejeter le menu"
        icon="fa-times-circle"
        iconColor="var(--danger)"
        maxWidth={440}
        footer={
          <>
            <button onClick={() => setRejectOpen(false)} style={btnSecondary}>
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
          <label style={labelStyle}>Commentaire de rejet</label>
          <textarea
            value={rejectCommentaire}
            onChange={(e) => setRejectCommentaire(e.target.value)}
            placeholder="Préciser la raison du rejet..."
            style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
          />
        </div>
      </Modal>
    </>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
}

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
const btnOutline: React.CSSProperties = {
  ...btn,
  background: "transparent",
  color: "var(--primary)",
  border: "1.5px solid var(--primary)",
};
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

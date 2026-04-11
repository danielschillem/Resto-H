"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Modal from "@/components/Modal";
import { User, Service, Parametre } from "@/types";
import { isEmailValid } from "@/lib/validation";

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  gerant: { bg: "#DBEAFE", color: "#1E40AF" },
  dsgl: { bg: "#EDE9FE", color: "#5B21B6" },
  csah: { bg: "#D1FAE5", color: "#065F46" },
  sus: { bg: "#FEF3C7", color: "#92400E" },
  sut: { bg: "#FEF3C7", color: "#92400E" },
};

const PERM_LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  menus: "Menus",
  "menus.valider": "Valider menus",
  commandes: "Commandes",
  "commandes.valider": "Valider commandes",
  consommations: "Consommations",
  etats: "États & Rapports",
  "etats.valider": "Valider états",
  regimes: "Régimes spéciaux",
  "regimes.valider": "Valider régimes",
  admin: "Administration",
  licence: "Licence",
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [permAll, setPermAll] = useState<string[]>([]);
  const [permGrouped, setPermGrouped] = useState<Record<string, string[]>>({});
  const [userModal, setUserModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    role: "sus",
    service: "",
  });
  const [userForm, setUserForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    role: "gerant",
    service: "",
    password: "",
  });
  const [serviceModal, setServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    nom: "",
    lits_actifs: 0,
    responsable: "",
  });
  const [editService, setEditService] = useState<Service | null>(null);
  const [editServiceForm, setEditServiceForm] = useState({
    nom: "",
    lits_actifs: 0,
    responsable: "",
  });
  const [editParam, setEditParam] = useState<{
    id: number;
    cle: string;
    valeur: string;
  } | null>(null);

  const load = () => {
    api
      .users()
      .then(setUsers)
      .catch(() => {});
    api
      .services()
      .then(setServices)
      .catch(() => {});
    api
      .parametres()
      .then(setParametres)
      .catch(() => {});
    api
      .adminPermissions()
      .then((d) => {
        setPermAll(d.all);
        setPermGrouped(d.grouped);
      })
      .catch(() => {});
  };
  useEffect(load, []);

  const handleCreateUser = async () => {
    if (!userForm.nom.trim()) return alert("Veuillez saisir le nom.");
    if (!userForm.prenom.trim()) return alert("Veuillez saisir le prénom.");
    if (!userForm.email.trim() || !isEmailValid(userForm.email))
      return alert("Veuillez saisir un email valide.");
    if (!userForm.password || userForm.password.length < 4)
      return alert("Le mot de passe doit contenir au moins 4 caractères.");
    await api.createUser(userForm);
    setUserModal(false);
    load();
  };

  const openEditUser = (u: User) => {
    setEditUserForm({ role: u.role, service: u.service || "" });
    setEditUser(u);
  };

  const handleEditUser = async () => {
    if (!editUser) return;
    await api.updateUser(editUser.id, editUserForm);
    setEditUser(null);
    load();
  };

  const handleToggleActive = async (u: User) => {
    await api.updateUser(u.id, { is_active: !u.is_active });
    load();
  };

  const handleCreateService = async () => {
    if (!serviceForm.nom.trim())
      return alert("Veuillez saisir le nom du service.");
    if (Number(serviceForm.lits_actifs) < 0)
      return alert("Le nombre de lits ne peut pas être négatif.");
    await api.createService({
      ...serviceForm,
      lits_actifs: Number(serviceForm.lits_actifs),
    });
    setServiceModal(false);
    setServiceForm({ nom: "", lits_actifs: 0, responsable: "" });
    load();
  };

  const openEditService = (s: Service) => {
    setEditServiceForm({
      nom: s.nom,
      lits_actifs: s.lits_actifs || 0,
      responsable: s.responsable || "",
    });
    setEditService(s);
  };

  const handleEditService = async () => {
    if (!editService) return;
    await api.updateService(editService.id, {
      ...editServiceForm,
      lits_actifs: Number(editServiceForm.lits_actifs),
    });
    setEditService(null);
    load();
  };

  const handleUpdateParam = async (id: number, valeur: string) => {
    await api.updateParametre(id, valeur);
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
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Administration</h3>
          <p style={{ fontSize: 13, color: "var(--text-sm)", marginTop: 2 }}>
            Gestion des utilisateurs, services et paramètres
          </p>
        </div>
        <button onClick={() => setUserModal(true)} style={btn}>
          <i className="fa-solid fa-plus" /> Nouvel utilisateur
        </button>
      </div>

      {/* Users & Services */}
      <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            Utilisateurs du système
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={thStyle}>Nom</th>
                  <th style={thStyle}>Profil</th>
                  <th style={thStyle}>Service</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const rb = ROLE_BADGE[u.role] || ROLE_BADGE.sus;
                  return (
                    <tr key={u.id}>
                      <td style={tdStyle}>
                        <b>{u.full_name || `${u.prenom} ${u.nom}`}</b>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            background: rb.bg,
                            color: rb.color,
                          }}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={tdStyle}>{u.service || "—"}</td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            background:
                              u.is_active !== false ? "#D1FAE5" : "#F1F5F9",
                            color:
                              u.is_active !== false ? "#065F46" : "#475569",
                          }}
                        >
                          {u.is_active !== false ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => openEditUser(u)}
                          title="Modifier"
                          style={{
                            ...btnSm,
                            background: "transparent",
                            color: "var(--primary)",
                            border: "1.5px solid var(--primary)",
                            marginRight: 4,
                          }}
                        >
                          <i className="fa-solid fa-pencil" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          title={
                            u.is_active !== false ? "Désactiver" : "Activer"
                          }
                          style={{
                            ...btnSm,
                            background: "transparent",
                            color:
                              u.is_active !== false
                                ? "var(--danger)"
                                : "var(--success)",
                            border: `1.5px solid ${u.is_active !== false ? "var(--danger)" : "var(--success)"}`,
                          }}
                        >
                          <i
                            className={`fa-solid ${u.is_active !== false ? "fa-user-slash" : "fa-user-check"}`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
              Services hospitaliers
            </div>
            <button
              onClick={() => setServiceModal(true)}
              style={{ ...btn, padding: "5px 12px", fontSize: 11 }}
            >
              <i className="fa-solid fa-plus" /> Nouveau service
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={thStyle}>Service</th>
                  <th style={thStyle}>Lits actifs</th>
                  <th style={thStyle}>Responsable</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td style={tdStyle}>{s.nom}</td>
                    <td style={tdStyle}>{s.lits_actifs}</td>
                    <td style={tdStyle}>{s.responsable || "—"}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => openEditService(s)}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
          Paramètres tarifaires
        </div>
        <div className="grid-3" style={{ gap: 16 }}>
          {parametres.map((p) => (
            <div
              key={p.id}
              style={{ background: "#F8FAFC", borderRadius: 8, padding: 14 }}
            >
              <div style={{ fontSize: 12, color: "var(--text-sm)" }}>
                {p.description || p.cle}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                {Number(p.valeur).toLocaleString("fr-FR")}{" "}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-sm)",
                  }}
                >
                  FCFA
                </span>
              </div>
              <button
                onClick={() =>
                  setEditParam({ id: p.id, cle: p.cle, valeur: p.valeur })
                }
                style={{
                  ...btn,
                  background: "transparent",
                  color: "var(--primary)",
                  border: "1.5px solid var(--primary)",
                  marginTop: 8,
                  padding: "5px 10px",
                  fontSize: 11,
                }}
              >
                Modifier
              </button>
            </div>
          ))}
          {parametres.length === 0 && (
            <p style={{ color: "var(--text-sm)" }}>Aucun paramètre</p>
          )}
        </div>
      </div>

      {/* Permissions matrix (read-only) */}
      {permAll.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
            Matrice des permissions
          </div>
          <p
            style={{ fontSize: 12, color: "var(--text-sm)", marginBottom: 16 }}
          >
            Vue des accès par rôle (modifiable par le super-administrateur)
          </p>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 600,
              }}
            >
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={{ ...thStyle, width: 180 }}>Permission</th>
                  {["gerant", "dsgl", "csah", "sus", "sut"].map((r) => (
                    <th
                      key={r}
                      style={{
                        ...thStyle,
                        textAlign: "center",
                        color: ROLE_BADGE[r]?.color,
                      }}
                    >
                      {r.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permAll.map((perm) => (
                  <tr key={perm}>
                    <td style={tdStyle}>{PERM_LABELS[perm] || perm}</td>
                    {["gerant", "dsgl", "csah", "sus", "sut"].map((r) => (
                      <td key={r} style={{ ...tdStyle, textAlign: "center" }}>
                        {(permGrouped[r] || []).includes(perm) ? (
                          <i
                            className="fa-solid fa-circle-check"
                            style={{ color: "var(--success)" }}
                          />
                        ) : (
                          <i
                            className="fa-solid fa-circle-xmark"
                            style={{ color: "#CBD5E1" }}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      <Modal
        open={editUser !== null}
        onClose={() => setEditUser(null)}
        title="Modifier l'utilisateur"
        icon="fa-user-pen"
        maxWidth={440}
        footer={
          <>
            <button onClick={() => setEditUser(null)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleEditUser} style={btn}>
              <i className="fa-solid fa-check" /> Enregistrer
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            {editUser?.full_name || `${editUser?.prenom} ${editUser?.nom}`}
          </div>
          <label style={labelStyle}>Profil</label>
          <select
            value={editUserForm.role}
            onChange={(e) =>
              setEditUserForm({ ...editUserForm, role: e.target.value })
            }
            style={inputStyle}
          >
            <option value="gerant">Gérant</option>
            <option value="dsgl">DSGL</option>
            <option value="csah">CSAH</option>
            <option value="sus">SUS</option>
            <option value="sut">SUT</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Service</label>
          <input
            value={editUserForm.service}
            onChange={(e) =>
              setEditUserForm({ ...editUserForm, service: e.target.value })
            }
            placeholder="Ex: Restauration"
            style={inputStyle}
          />
        </div>
      </Modal>

      {/* Edit parameter modal */}
      <Modal
        open={editParam !== null}
        onClose={() => setEditParam(null)}
        title="Modifier le paramètre"
        icon="fa-sliders"
        maxWidth={400}
        footer={
          <>
            <button onClick={() => setEditParam(null)} style={btnSecondary}>
              Annuler
            </button>
            <button
              onClick={async () => {
                if (!editParam) return;
                await handleUpdateParam(editParam.id, editParam.valeur);
                setEditParam(null);
              }}
              style={btn}
            >
              <i className="fa-solid fa-check" /> Enregistrer
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>{editParam?.cle}</label>
          <input
            type="number"
            value={editParam?.valeur ?? ""}
            onChange={(e) =>
              setEditParam((prev) =>
                prev ? { ...prev, valeur: e.target.value } : null,
              )
            }
            style={inputStyle}
          />
        </div>
      </Modal>

      {/* Create user modal */}
      <Modal
        open={userModal}
        onClose={() => setUserModal(false)}
        title="Nouvel utilisateur"
        footer={
          <>
            <button onClick={() => setUserModal(false)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleCreateUser} style={btn}>
              <i className="fa-solid fa-check" /> Créer
            </button>
          </>
        }
      >
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nom</label>
            <input
              value={userForm.nom}
              onChange={(e) =>
                setUserForm({ ...userForm, nom: e.target.value })
              }
              placeholder="Nom de famille"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Prénom</label>
            <input
              value={userForm.prenom}
              onChange={(e) =>
                setUserForm({ ...userForm, prenom: e.target.value })
              }
              placeholder="Prénom"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={userForm.email}
            onChange={(e) =>
              setUserForm({ ...userForm, email: e.target.value })
            }
            placeholder="email@chr-tenkodogo.bf"
            style={inputStyle}
          />
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Profil</label>
            <select
              value={userForm.role}
              onChange={(e) =>
                setUserForm({ ...userForm, role: e.target.value })
              }
              style={inputStyle}
            >
              <option value="gerant">Gérant</option>
              <option value="dsgl">DSGL</option>
              <option value="csah">CSAH</option>
              <option value="sus">SUS</option>
              <option value="sut">SUT</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Service</label>
            <input
              value={userForm.service}
              onChange={(e) =>
                setUserForm({ ...userForm, service: e.target.value })
              }
              placeholder="Ex: Restauration"
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Code d&apos;accès</label>
          <input
            type="password"
            value={userForm.password}
            onChange={(e) =>
              setUserForm({ ...userForm, password: e.target.value })
            }
            placeholder="Définir un code"
            style={inputStyle}
          />
        </div>
      </Modal>

      {/* Edit service modal */}
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
            <button onClick={handleEditService} style={btn}>
              <i className="fa-solid fa-check" /> Enregistrer
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nom du service</label>
          <input
            value={editServiceForm.nom}
            onChange={(e) =>
              setEditServiceForm({ ...editServiceForm, nom: e.target.value })
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
            value={editServiceForm.lits_actifs}
            onChange={(e) =>
              setEditServiceForm({
                ...editServiceForm,
                lits_actifs: Number(e.target.value),
              })
            }
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Responsable</label>
          <input
            value={editServiceForm.responsable}
            onChange={(e) =>
              setEditServiceForm({
                ...editServiceForm,
                responsable: e.target.value,
              })
            }
            placeholder="Nom du responsable"
            style={inputStyle}
          />
        </div>
      </Modal>

      {/* Create service modal */}
      <Modal
        open={serviceModal}
        onClose={() => setServiceModal(false)}
        title="Nouveau service hospitalier"
        icon="fa-hospital"
        maxWidth={440}
        footer={
          <>
            <button onClick={() => setServiceModal(false)} style={btnSecondary}>
              Annuler
            </button>
            <button onClick={handleCreateService} style={btn}>
              <i className="fa-solid fa-check" /> Créer
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Nom du service</label>
          <input
            value={serviceForm.nom}
            onChange={(e) =>
              setServiceForm({ ...serviceForm, nom: e.target.value })
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
            value={serviceForm.lits_actifs}
            onChange={(e) =>
              setServiceForm({
                ...serviceForm,
                lits_actifs: Number(e.target.value),
              })
            }
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Responsable</label>
          <input
            value={serviceForm.responsable}
            onChange={(e) =>
              setServiceForm({ ...serviceForm, responsable: e.target.value })
            }
            placeholder="Nom du responsable"
            style={inputStyle}
          />
        </div>
      </Modal>
    </>
  );
}

const card: React.CSSProperties = {
  background: "white",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  padding: 20,
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

import { useState } from "react";
import { api, fileToDataUrl } from "../../api";
import { ROLE_LABELS } from "../../format";
import { Empty, Field, Loader, Modal, PageHeader, useAction, useApi } from "../../components/ui";


function UserForm({ user, groups, onClose, onSaved }) {
    const [form, setForm] = useState(() => ({
        name: user?.name || "",
        email: user?.email || "",
        password: "",
        role: user?.role || "student",
        status: user?.status || "active",
        student_number: user?.Student?.student_number || "",
        group_id: user?.Student?.group_id || "",
        speciality: user?.Teacher?.speciality || "",
        department: user?.Teacher?.department || ""
    }));
    const [run, busy] = useAction();

    const set = key => event => setForm({ ...form, [key]: event.target.value });

    const submit = async event => {
        event.preventDefault();
        const body = { ...form, group_id: form.group_id || null };
        if (user && !body.password) delete body.password;

        if (user) {
            delete body.role;
            await run(() => api(`/admin/users/${user.id}`, { method: "PUT", body }));
        } else {
            await run(() => api("/admin/users", { method: "POST", body }));
        }
        onSaved();
    };

    return (
        <Modal title={user ? `Modifier ${user.name}` : "Nouvel utilisateur"} onClose={onClose}>
            <form className="form" onSubmit={e => submit(e).catch(() => {})}>
                {!user && (
                    <Field label="Rôle">
                        <select value={form.role} onChange={set("role")}>
                            <option value="student">Étudiant</option>
                            <option value="teacher">Enseignant</option>
                            <option value="admin">Administrateur</option>
                        </select>
                    </Field>
                )}

                <Field label="Nom complet">
                    <input value={form.name} onChange={set("name")} required />
                </Field>
                <Field label="Email">
                    <input type="email" value={form.email} onChange={set("email")} required />
                </Field>
                <Field label={user ? "Nouveau mot de passe" : "Mot de passe"} hint={user ? "Laissez vide pour ne pas le changer" : "6 caractères minimum"}>
                    <input type="password" value={form.password} onChange={set("password")} required={!user} minLength={6} autoComplete="new-password" />
                </Field>

                {form.role === "student" && (
                    <div className="form-row">
                        <Field label="N° d'inscription">
                            <input value={form.student_number} onChange={set("student_number")} required />
                        </Field>
                        <Field label="Groupe">
                            <select value={form.group_id} onChange={set("group_id")}>
                                <option value="">Aucun</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </Field>
                    </div>
                )}

                {form.role === "teacher" && (
                    <div className="form-row">
                        <Field label="Spécialité">
                            <input value={form.speciality} onChange={set("speciality")} />
                        </Field>
                        <Field label="Département">
                            <input value={form.department} onChange={set("department")} />
                        </Field>
                    </div>
                )}

                <Field label="Statut du compte">
                    <select value={form.status} onChange={set("status")}>
                        <option value="active">Actif (peut se connecter)</option>
                        <option value="pending">En attente</option>
                    </select>
                </Field>

                <div className="form-actions">
                    <span className="spacer" />
                    <button type="button" className="btn btn-quiet" onClick={onClose}>Annuler</button>
                    <button className="btn btn-primary" disabled={busy}>{user ? "Enregistrer" : "Créer le compte"}</button>
                </div>
            </form>
        </Modal>
    );
}


function FaceDialog({ user, photos, onClose, onSaved }) {
    const [preview, setPreview] = useState(null);
    const [image, setImage] = useState(null);
    const [run, busy] = useAction();

    const pick = async event => {
        const file = event.target.files[0];
        if (!file) return;
        const data = await fileToDataUrl(file);
        setImage(data);
        setPreview(data);
    };

    const upload = async () => {
        await run(() => api(`/admin/users/${user.id}/face`, { method: "POST", body: { image } })).catch(() => {});
        setImage(null);
        setPreview(null);
        onSaved();
    };

    const reset = async () => {
        if (!confirm(`Supprimer toutes les photos de ${user.name} ?`)) return;
        await run(() => api(`/admin/users/${user.id}/face`, { method: "DELETE" })).catch(() => {});
        onSaved();
    };

    return (
        <Modal title={`Reconnaissance faciale — ${user.name}`} onClose={onClose}>
            <div className="form">
                <p>
                    {photos ? `${photos} photo${photos > 1 ? "s" : ""} enregistrée${photos > 1 ? "s" : ""}.` : "Aucune photo enregistrée : la caméra ne peut pas encore reconnaître cette personne."}
                </p>
                <p className="muted small">
                    Ajoutez 2 ou 3 photos de face, bien éclairées, avec une seule personne. Seule une signature numérique du visage est conservée, pas la photo.
                </p>

                <Field label="Photo du visage">
                    <input type="file" accept="image/jpeg,image/png" capture="user" onChange={pick} />
                </Field>

                {preview && <img src={preview} alt="Aperçu" className="face-preview" />}

                <div className="form-actions">
                    {photos > 0 && <button className="btn btn-danger-quiet" onClick={reset} disabled={busy}>Supprimer les photos</button>}
                    <span className="spacer" />
                    <button className="btn btn-quiet" onClick={onClose}>Fermer</button>
                    <button className="btn btn-primary" onClick={upload} disabled={!image || busy}>{busy ? "Analyse…" : "Enregistrer la photo"}</button>
                </div>
            </div>
        </Modal>
    );
}


export default function AdminUsers() {
    const [role, setRole] = useState("");
    const [search, setSearch] = useState("");
    const users = useApi(`/admin/users${role ? `?role=${role}` : ""}`);
    const groups = useApi("/admin/groups");
    const faces = useApi("/admin/faces");
    const [editing, setEditing] = useState(null);
    const [faceUser, setFaceUser] = useState(null);
    const [run] = useAction();

    const reload = () => {
        users.reload();
        faces.reload();
    };

    const activate = user => run(() => api(`/admin/users/${user.id}`, { method: "PUT", body: { status: "active" } }), "Compte activé")
        .then(reload).catch(() => {});

    const remove = user => {
        if (!confirm(`Supprimer ${user.name} ? Son historique de présence sera aussi supprimé.`)) return;
        run(() => api(`/admin/users/${user.id}`, { method: "DELETE" })).then(reload).catch(() => {});
    };

    const faceCounts = faces.data || {};

    return (
        <>
            <PageHeader title="Utilisateurs" subtitle="Étudiants, enseignants et administrateurs.">
                <button className="btn btn-primary" onClick={() => setEditing({})}>Ajouter un utilisateur</button>
            </PageHeader>

            <div className="toolbar">
                <div className="day-filter" role="group" aria-label="Filtrer par rôle">
                    {[["", "Tous"], ["student", "Étudiants"], ["teacher", "Enseignants"], ["admin", "Administrateurs"]].map(([value, label]) => (
                        <button key={value} className={`chip ${role === value ? "chip-on" : ""}`} onClick={() => setRole(value)}>{label}</button>
                    ))}
                </div>
                <input className="search" type="search" placeholder="Rechercher un nom ou un email" value={search}
                    onChange={e => setSearch(e.target.value)} aria-label="Rechercher" />
            </div>

            {faces.error && (
                <p className="alert alert-warning">
                    Service de reconnaissance faciale injoignable : lancez <code>python app.py</code> dans le dossier ai-service pour gérer les photos.
                </p>
            )}

            <Loader state={users}>
                {list => {
                    const term = search.trim().toLowerCase();
                    const shown = term ? list.filter(u => u.name.toLowerCase().includes(term) || u.email.includes(term)) : list;

                    return shown.length === 0 ? <Empty>Aucun utilisateur.</Empty> : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr><th>Nom</th><th>Rôle</th><th>Détails</th><th>Visage</th><th>Statut</th><th><span className="sr-only">Actions</span></th></tr>
                                </thead>
                                <tbody>
                                    {shown.map(u => (
                                        <tr key={u.id}>
                                            <td><strong>{u.name}</strong><br /><small className="muted">{u.email}</small></td>
                                            <td>{ROLE_LABELS[u.role]}</td>
                                            <td className="small">
                                                {u.Student && <>{u.Student.student_number} — {u.Student.Group?.name || "sans groupe"}</>}
                                                {u.Teacher && <>{u.Teacher.speciality || "—"}</>}
                                            </td>
                                            <td>
                                                {u.role !== "admin" && (
                                                    <button className="btn btn-small btn-quiet" onClick={() => setFaceUser(u)} disabled={!!faces.error}>
                                                        {faceCounts[u.id] ? `${faceCounts[u.id]} photo${faceCounts[u.id] > 1 ? "s" : ""}` : "Ajouter"}
                                                    </button>
                                                )}
                                            </td>
                                            <td>
                                                {u.status === "active"
                                                    ? <span className="pill pill-present">Actif</span>
                                                    : <button className="btn btn-small btn-primary" onClick={() => activate(u)}>Activer</button>}
                                            </td>
                                            <td className="row-actions">
                                                <button className="btn btn-small btn-quiet" onClick={() => setEditing(u)}>Modifier</button>
                                                <button className="btn btn-small btn-danger-quiet" onClick={() => remove(u)}>Supprimer</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }}
            </Loader>

            {editing && (
                <UserForm
                    user={editing.id ? editing : null}
                    groups={groups.data || []}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); reload(); }}
                />
            )}

            {faceUser && (
                <FaceDialog
                    user={faceUser}
                    photos={faceCounts[faceUser.id] || 0}
                    onClose={() => setFaceUser(null)}
                    onSaved={faces.reload}
                />
            )}
        </>
    );
}

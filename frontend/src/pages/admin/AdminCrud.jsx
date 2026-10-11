// Generic list + add / edit / delete page for groups, courses, classrooms and camera boxes
import { useState } from "react";
import { api } from "../../api";
import { dateTime } from "../../format";
import { Empty, Field, Loader, Modal, PageHeader, useAction, useApi, useToast } from "../../components/ui";


export const CRUD_PAGES = {
    groupes: {
        title: "Groupes",
        subtitle: "Les classes d'étudiants. Un emploi du temps est attribué à chaque groupe.",
        endpoint: "/admin/groups",
        addLabel: "Ajouter un groupe",
        empty: "Aucun groupe.",
        fields: [
            { key: "name", label: "Nom", required: true, placeholder: "3CS-A" },
            { key: "year", label: "Année", required: true, placeholder: "3ème année" },
            { key: "department", label: "Département", required: true, placeholder: "Informatique" }
        ]
    },
    matieres: {
        title: "Matières",
        subtitle: "Les matières enseignées.",
        endpoint: "/admin/courses",
        addLabel: "Ajouter une matière",
        empty: "Aucune matière.",
        fields: [
            { key: "name", label: "Nom", required: true, placeholder: "Bases de données" },
            { key: "description", label: "Description", type: "textarea" }
        ]
    },
    salles: {
        title: "Salles",
        subtitle: "Les salles de cours. Chaque salle peut avoir un boîtier caméra à la porte.",
        endpoint: "/admin/classrooms",
        addLabel: "Ajouter une salle",
        empty: "Aucune salle.",
        fields: [
            { key: "name", label: "Nom / numéro", required: true, placeholder: "B6" },
            { key: "capacity", label: "Capacité", required: true, type: "number" },
            { key: "building", label: "Bâtiment", placeholder: "Bâtiment principal" }
        ]
    },
    boitiers: {
        title: "Boîtiers caméra",
        subtitle: "Les caméras installées à la porte des salles. Chaque boîtier utilise sa clé pour enregistrer les présences.",
        endpoint: "/admin/devices",
        addLabel: "Ajouter un boîtier",
        empty: "Aucun boîtier installé.",
        fields: [
            { key: "name", label: "Nom", required: true, placeholder: "Caméra porte B6" },
            { key: "classroom_id", label: "Salle", required: true, type: "classroom" },
            { key: "active", label: "Actif", type: "checkbox" }
        ],
        columns: [
            ["Salle", d => d.Classroom?.name],
            ["Clé du boîtier", d => <code className="key">{d.api_key}</code>],
            ["Dernier contact", d => (d.last_seen_at ? dateTime(d.last_seen_at) : "Jamais")],
            ["État", d => (d.active ? <span className="pill pill-present">Actif</span> : <span className="pill pill-absent">Désactivé</span>)]
        ]
    }
};


function ItemForm({ config, item, onClose, onSaved }) {
    const classrooms = useApi(config.fields.some(f => f.type === "classroom") ? "/admin/classrooms" : null);
    const [form, setForm] = useState(() => {
        const initial = {};
        for (const f of config.fields) {
            initial[f.key] = item?.[f.key] ?? (f.type === "checkbox" ? true : "");
        }
        return initial;
    });
    const [run, busy] = useAction();

    const submit = async event => {
        event.preventDefault();
        await run(() => item
            ? api(`${config.endpoint}/${item.id}`, { method: "PUT", body: form })
            : api(config.endpoint, { method: "POST", body: form }));
        onSaved();
    };

    return (
        <Modal title={item ? `Modifier ${item.name}` : config.addLabel} onClose={onClose}>
            <form className="form" onSubmit={e => submit(e).catch(() => {})}>
                {config.fields.map(f => {
                    const value = form[f.key];
                    const onChange = e => setForm({ ...form, [f.key]: f.type === "checkbox" ? e.target.checked : e.target.value });

                    if (f.type === "checkbox") {
                        return (
                            <label key={f.key} className="check">
                                <input type="checkbox" checked={!!value} onChange={onChange} /> {f.label}
                            </label>
                        );
                    }

                    return (
                        <Field key={f.key} label={f.label + (f.required ? "" : " (facultatif)")}>
                            {f.type === "textarea" ? (
                                <textarea value={value || ""} onChange={onChange} rows={3} />
                            ) : f.type === "classroom" ? (
                                <select value={value || ""} onChange={onChange} required={f.required}>
                                    <option value="">Choisir…</option>
                                    {(classrooms.data || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            ) : (
                                <input type={f.type || "text"} value={value ?? ""} onChange={onChange}
                                    required={f.required} placeholder={f.placeholder} min={f.type === "number" ? 1 : undefined} />
                            )}
                        </Field>
                    );
                })}

                <div className="form-actions">
                    <span className="spacer" />
                    <button type="button" className="btn btn-quiet" onClick={onClose}>Annuler</button>
                    <button className="btn btn-primary" disabled={busy}>Enregistrer</button>
                </div>
            </form>
        </Modal>
    );
}


export default function AdminCrud({ page }) {
    const config = CRUD_PAGES[page];
    const state = useApi(config.endpoint);
    const [editing, setEditing] = useState(null);
    const [run] = useAction();
    const toast = useToast();

    const textFields = config.fields.filter(f => !["checkbox", "classroom"].includes(f.type) && f.key !== "name");

    const remove = item => {
        if (!confirm(`Supprimer « ${item.name} » ?`)) return;
        run(() => api(`${config.endpoint}/${item.id}`, { method: "DELETE" })).then(state.reload).catch(() => {});
    };

    const regenerate = item => {
        if (!confirm("Générer une nouvelle clé ? L'ancienne ne fonctionnera plus sur le boîtier.")) return;
        run(() => api(`${config.endpoint}/${item.id}/regenerate-key`, { method: "POST" })).then(state.reload).catch(() => {});
    };

    const copy = text => navigator.clipboard?.writeText(text).then(() => toast("Clé copiée"));

    return (
        <>
            <PageHeader title={config.title} subtitle={config.subtitle}>
                <button className="btn btn-primary" onClick={() => setEditing({})}>{config.addLabel}</button>
            </PageHeader>

            <Loader state={state}>
                {items => items.length === 0 ? <Empty>{config.empty}</Empty> : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nom</th>
                                    {config.columns
                                        ? config.columns.map(([label]) => <th key={label}>{label}</th>)
                                        : textFields.map(f => <th key={f.key}>{f.label}</th>)}
                                    <th><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id}>
                                        <td><strong>{item.name}</strong></td>
                                        {config.columns
                                            ? config.columns.map(([label, render]) => <td key={label}>{render(item)}</td>)
                                            : textFields.map(f => <td key={f.key}>{item[f.key] ?? "—"}</td>)}
                                        <td className="row-actions">
                                            {page === "boitiers" && (
                                                <>
                                                    <button className="btn btn-small btn-quiet" onClick={() => copy(item.api_key)}>Copier la clé</button>
                                                    <button className="btn btn-small btn-quiet" onClick={() => regenerate(item)}>Nouvelle clé</button>
                                                </>
                                            )}
                                            <button className="btn btn-small btn-quiet" onClick={() => setEditing(item)}>Modifier</button>
                                            <button className="btn btn-small btn-danger-quiet" onClick={() => remove(item)}>Supprimer</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Loader>

            {page === "boitiers" && (
                <section className="panel help">
                    <h2>Lancer un boîtier</h2>
                    <p>Sur l'ordinateur du boîtier (ou votre PC avec webcam pour la démo), dans le dossier <code>ai-service</code> :</p>
                    <pre><code>python door_box.py --key CLÉ_DU_BOÎTIER</code></pre>
                    <p className="muted small">Le boîtier reconnaît les personnes attendues au cours qui a lieu dans sa salle à ce moment-là.</p>
                </section>
            )}

            {editing && (
                <ItemForm
                    config={config}
                    item={editing.id ? editing : null}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); state.reload(); }}
                />
            )}
        </>
    );
}

import { useState } from "react";
import { api, downloadNoteFile, fileToDataUrl } from "../api";
import { dateTime, deadlineInfo, toLocalInput } from "../format";
import { Field, Modal, useAction, useToast } from "./ui";


export function DeadlineBadge({ deadline }) {
    const info = deadlineInfo(deadline);
    if (!info) return null;

    return (
        <span className={`deadline deadline-${info.tone}`} title={`Date limite : ${dateTime(deadline)}`}>
            {info.label}
        </span>
    );
}


export function NoteItem({ note, onEdit, showContext = false }) {
    const toast = useToast();

    const download = () => downloadNoteFile(note).catch(error => toast(error.message, "error"));

    return (
        <article className="note">
            <div className="note-head">
                <h4>{note.title}</h4>
                <DeadlineBadge deadline={note.deadline} />
            </div>

            {showContext && (
                <p className="note-context">
                    {note.Course?.name} · {note.Group?.name}
                </p>
            )}

            {note.message && <p className="note-message">{note.message}</p>}

            <div className="note-foot">
                {note.deadline && <span className="muted">À rendre avant le {dateTime(note.deadline)}</span>}

                {note.file_name && (
                    <button className="file-link" onClick={download}>
                        <span aria-hidden="true">📎</span> {note.file_name}
                    </button>
                )}

                {onEdit && (
                    <button className="btn btn-small btn-quiet" onClick={() => onEdit(note)}>Modifier</button>
                )}
            </div>
        </article>
    );
}


// Create (needs course_id + group_id) or edit (needs note) a note
export function NoteForm({ note, course, group, onClose, onSaved }) {
    const [title, setTitle] = useState(note?.title || "");
    const [message, setMessage] = useState(note?.message || "");
    const [deadline, setDeadline] = useState(toLocalInput(note?.deadline));
    const [file, setFile] = useState(null);
    const [removeFile, setRemoveFile] = useState(false);
    const [run, busy] = useAction();

    const submit = async event => {
        event.preventDefault();

        const body = {
            title,
            message,
            deadline: deadline ? new Date(deadline).toISOString() : null
        };

        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                alert("Fichier trop volumineux (10 Mo maximum)");
                return;
            }
            body.file = { name: file.name, data: await fileToDataUrl(file) };
        } else if (removeFile) {
            body.remove_file = true;
        }

        if (note) {
            await run(() => api(`/notes/${note.id}`, { method: "PUT", body }));
        } else {
            body.course_id = course.id;
            body.group_id = group.id;
            await run(() => api("/notes", { method: "POST", body }));
        }

        onSaved();
    };

    const remove = async () => {
        if (!confirm("Supprimer cette note ?")) return;
        await run(() => api(`/notes/${note.id}`, { method: "DELETE" }));
        onSaved();
    };

    const subject = `${(note?.Course || course)?.name || ""} · ${(note?.Group || group)?.name || ""}`;

    return (
        <Modal title={note ? "Modifier la note" : "Nouvelle note"} onClose={onClose}>
            <form onSubmit={submit} className="form">
                <p className="muted">{subject}</p>

                <Field label="Titre">
                    <input value={title} onChange={e => setTitle(e.target.value)} required maxLength={200}
                        placeholder="Ex. : Rendu du rapport de TP" />
                </Field>

                <Field label="Message">
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
                        placeholder="Consignes, rappel, information pour les étudiants" />
                </Field>

                <Field label="Date limite" hint="Facultatif. Les étudiants verront le compte à rebours.">
                    <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </Field>

                <Field label="Document joint" hint="PDF, Word, PowerPoint, Excel, ZIP ou image — 10 Mo maximum">
                    <input type="file" onChange={e => setFile(e.target.files[0] || null)}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.png,.jpg,.jpeg" />
                </Field>

                {note?.file_name && !file && (
                    <label className="check">
                        <input type="checkbox" checked={removeFile} onChange={e => setRemoveFile(e.target.checked)} />
                        Retirer le document actuel ({note.file_name})
                    </label>
                )}

                <div className="form-actions">
                    {note && <button type="button" className="btn btn-danger-quiet" onClick={remove} disabled={busy}>Supprimer</button>}
                    <span className="spacer" />
                    <button type="button" className="btn btn-quiet" onClick={onClose}>Annuler</button>
                    <button className="btn btn-primary" disabled={busy}>{busy ? "Enregistrement…" : note ? "Enregistrer" : "Publier la note"}</button>
                </div>
            </form>
        </Modal>
    );
}

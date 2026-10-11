import { useEffect, useState } from "react";
import { api } from "../../api";
import { DAY_LABELS, DAYS, hhmm, todayName } from "../../format";
import { Empty, Field, Loader, Modal, PageHeader, useAction, useApi } from "../../components/ui";


function ScheduleForm({ entry, groupId, options, onClose, onSaved }) {
    const [form, setForm] = useState(() => ({
        group_id: entry?.group_id || groupId || "",
        course_id: entry?.course_id || "",
        teacher_id: entry?.teacher_id || "",
        classroom_id: entry?.classroom_id || "",
        day: entry?.day || "Monday",
        start_time: hhmm(entry?.start_time) || "08:30",
        end_time: hhmm(entry?.end_time) || "10:00"
    }));
    const [run, busy] = useAction();

    const set = key => event => setForm({ ...form, [key]: event.target.value });

    const submit = async event => {
        event.preventDefault();
        await run(() => entry
            ? api(`/schedules/${entry.id}`, { method: "PUT", body: form })
            : api("/schedules", { method: "POST", body: form })
        ).catch(() => { throw null; });
        onSaved();
    };

    const remove = async () => {
        if (!confirm("Supprimer ce cours de l'emploi du temps ? Son historique de présence sera aussi supprimé.")) return;
        await run(() => api(`/schedules/${entry.id}`, { method: "DELETE" })).catch(() => {});
        onSaved();
    };

    return (
        <Modal title={entry ? "Modifier le cours" : "Ajouter un cours"} onClose={onClose}>
            <form className="form" onSubmit={e => submit(e).catch(() => {})}>
                <div className="form-row">
                    <Field label="Groupe">
                        <select value={form.group_id} onChange={set("group_id")} required>
                            <option value="">Choisir…</option>
                            {options.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Matière">
                        <select value={form.course_id} onChange={set("course_id")} required>
                            <option value="">Choisir…</option>
                            {options.courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </Field>
                </div>

                <div className="form-row">
                    <Field label="Enseignant">
                        <select value={form.teacher_id} onChange={set("teacher_id")} required>
                            <option value="">Choisir…</option>
                            {options.teachers.map(t => <option key={t.Teacher.id} value={t.Teacher.id}>{t.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Salle">
                        <select value={form.classroom_id} onChange={set("classroom_id")} required>
                            <option value="">Choisir…</option>
                            {options.classrooms.map(c => <option key={c.id} value={c.id}>{c.name} ({c.capacity} places)</option>)}
                        </select>
                    </Field>
                </div>

                <div className="form-row three">
                    <Field label="Jour">
                        <select value={form.day} onChange={set("day")}>
                            {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                        </select>
                    </Field>
                    <Field label="Début">
                        <input type="time" value={form.start_time} onChange={set("start_time")} required />
                    </Field>
                    <Field label="Fin">
                        <input type="time" value={form.end_time} onChange={set("end_time")} required />
                    </Field>
                </div>

                <p className="muted small">Les conflits (groupe, enseignant ou salle déjà occupés) sont vérifiés automatiquement.</p>

                <div className="form-actions">
                    {entry && <button type="button" className="btn btn-danger-quiet" onClick={remove} disabled={busy}>Supprimer</button>}
                    <span className="spacer" />
                    <button type="button" className="btn btn-quiet" onClick={onClose}>Annuler</button>
                    <button className="btn btn-primary" disabled={busy}>{entry ? "Enregistrer" : "Ajouter le cours"}</button>
                </div>
            </form>
        </Modal>
    );
}


// Minutes since midnight, updated every 30 s (to light up classes happening now)
function useNow() {
    const read = () => new Date().getHours() * 60 + new Date().getMinutes();
    const [now, setNow] = useState(read);

    useEffect(() => {
        const timer = setInterval(() => setNow(read()), 30000);
        return () => clearInterval(timer);
    }, []);

    return now;
}

const toMinutes = time => Number(hhmm(time).slice(0, 2)) * 60 + Number(hhmm(time).slice(3, 5));


export default function AdminSchedules() {
    const now = useNow();
    const today = todayName();
    const isLive = e => e.day === today && toMinutes(e.start_time) <= now && now <= toMinutes(e.end_time);
    const groups = useApi("/admin/groups");
    const courses = useApi("/admin/courses");
    const classrooms = useApi("/admin/classrooms");
    const teachers = useApi("/admin/users?role=teacher");
    const [groupId, setGroupId] = useState("");
    const [editing, setEditing] = useState(null);

    useEffect(() => {
        if (!groupId && groups.data?.length) setGroupId(String(groups.data[0].id));
    }, [groups.data, groupId]);

    const schedules = useApi(groupId ? `/schedules?group_id=${groupId}` : null);

    const options = {
        groups: groups.data || [],
        courses: courses.data || [],
        classrooms: classrooms.data || [],
        teachers: (teachers.data || []).filter(t => t.Teacher)
    };

    const ready = groups.data && courses.data && classrooms.data && teachers.data;

    return (
        <>
            <PageHeader title="Emploi du temps" subtitle="Les cours sont attribués à un groupe : chaque étudiant du groupe les voit.">
                <button className="btn btn-primary" onClick={() => setEditing({})} disabled={!ready}>Ajouter un cours</button>
            </PageHeader>

            <Loader state={groups}>
                {list => list.length === 0 ? (
                    <Empty>Créez d'abord un groupe dans la page Groupes.</Empty>
                ) : (
                    <>
                        <div className="day-filter" role="group" aria-label="Groupe">
                            {list.map(g => (
                                <button key={g.id} className={`chip ${groupId === String(g.id) ? "chip-on" : ""}`} onClick={() => setGroupId(String(g.id))}>
                                    {g.name}
                                </button>
                            ))}
                        </div>

                        {groupId && (
                            <Loader state={schedules}>
                                {entries => entries.length === 0 ? (
                                    <Empty>Aucun cours pour ce groupe. Utilisez « Ajouter un cours ».</Empty>
                                ) : (
                                    <div className="admin-week">
                                        {DAYS.filter(d => entries.some(e => e.day === d)).map(d => (
                                            <section key={d} className="admin-day">
                                                <h2 className="day-title">
                                                    {DAY_LABELS[d]}
                                                    {d === today && <span className="today-tag">Aujourd'hui</span>}
                                                </h2>
                                                {entries.filter(e => e.day === d).map(e => (
                                                    <button key={e.id} className={`slot ${isLive(e) ? "slot-live" : ""}`} onClick={() => setEditing(e)}>
                                                        <span className="slot-time">
                                                            {hhmm(e.start_time)}–{hhmm(e.end_time)}
                                                            {isLive(e) && <span className="live-badge">En cours</span>}
                                                        </span>
                                                        <strong>{e.Course?.name}</strong>
                                                        <span>{e.Teacher?.User?.name}</span>
                                                        <span className="muted">Salle {e.Classroom?.name}</span>
                                                    </button>
                                                ))}
                                            </section>
                                        ))}
                                    </div>
                                )}
                            </Loader>
                        )}
                    </>
                )}
            </Loader>

            {editing && ready && (
                <ScheduleForm
                    entry={editing.id ? editing : null}
                    groupId={groupId}
                    options={options}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); schedules.reload(); }}
                />
            )}
        </>
    );
}

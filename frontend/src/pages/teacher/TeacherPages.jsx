import { useState } from "react";
import { Link } from "../../router";
import { DAY_LABELS, hhmm, longDate, percent } from "../../format";
import { Empty, Loader, PageHeader, PresenceSummary, useApi } from "../../components/ui";
import { NoteForm, NoteItem } from "../../components/Notes";
import SessionAttendance from "../../components/SessionAttendance";


export function TeacherHome() {
    const state = useApi("/dashboard/teacher");

    return (
        <Loader state={state}>
            {data => (
                <>
                    <PageHeader
                        title={`Bonjour ${data.teacher.name.split(" ")[0]}`}
                        subtitle={`${data.speciality || "Enseignant"} — ${longDate(new Date())}`}
                    />

                    <div className="figures">
                        <p><strong>{data.statistics.totalClasses}</strong> cours par semaine</p>
                        <p><strong>{data.statistics.groups}</strong> groupe{data.statistics.groups > 1 ? "s" : ""}</p>
                        <p><strong>{data.statistics.notes}</strong> note{data.statistics.notes > 1 ? "s" : ""} publiée{data.statistics.notes > 1 ? "s" : ""}</p>
                        <p><strong>{percent(data.statistics.own_attendance.rate)}</strong> de présence personnelle</p>
                    </div>

                    <div className="grid-2">
                        <section className="panel">
                            <div className="panel-head">
                                <h2>Mes cours aujourd'hui</h2>
                                <Link to="/presences" className="text-link">Feuille de présence</Link>
                            </div>
                            {data.today.length === 0 ? (
                                <Empty>Pas de cours aujourd'hui.</Empty>
                            ) : (
                                <ul className="today-list">
                                    {data.today.map(c => (
                                        <li key={c.id}>
                                            <span className="today-time">{hhmm(c.start_time)}–{hhmm(c.end_time)}</span>
                                            <span>
                                                <strong>{c.Course?.name}</strong>
                                                <small>Groupe {c.Group?.name} — salle {c.Classroom?.name}</small>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <PresenceSummary title="Assiduité de mes étudiants" stats={data.statistics.students_attendance} />
                    </div>

                    <section className="panel">
                        <h2>Ma semaine</h2>
                        {data.schedules.length === 0 ? (
                            <Empty>Aucun cours attribué pour le moment.</Empty>
                        ) : (
                            <div className="table-wrap">
                                <table className="table compact">
                                    <thead><tr><th>Jour</th><th>Horaire</th><th>Matière</th><th>Groupe</th><th>Salle</th></tr></thead>
                                    <tbody>
                                        {data.schedules
                                            .slice()
                                            .sort((a, b) => ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(a.day) -
                                                ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(b.day) ||
                                                a.start_time.localeCompare(b.start_time))
                                            .map(s => (
                                                <tr key={s.id}>
                                                    <td>{DAY_LABELS[s.day]}</td>
                                                    <td className="num">{hhmm(s.start_time)}–{hhmm(s.end_time)}</td>
                                                    <td>{s.Course?.name}</td>
                                                    <td>{s.Group?.name}</td>
                                                    <td>{s.Classroom?.name}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </Loader>
    );
}


export function TeacherAttendance() {
    const state = useApi("/schedules/my");

    return (
        <>
            <PageHeader title="Présences" subtitle="Qui est venu à vos cours. Corrigez si la caméra a manqué quelqu'un." />
            <Loader state={state}>
                {schedules => <SessionAttendance schedules={schedules} />}
            </Loader>
        </>
    );
}


export function TeacherNotes() {
    const notes = useApi("/notes");
    const schedules = useApi("/schedules/my");
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(null);

    // Unique (course, group) pairs the teacher teaches
    const pairs = [];
    for (const s of schedules.data || []) {
        if (!pairs.some(p => p.course.id === s.course_id && p.group.id === s.group_id)) {
            pairs.push({ course: s.Course, group: s.Group });
        }
    }

    const saved = () => {
        setEditing(null);
        setCreating(null);
        notes.reload();
    };

    return (
        <>
            <PageHeader title="Mes notes" subtitle="Annonces, consignes et échéances que vous avez publiées.">
                {pairs.length > 0 && (
                    <select className="select-action" value="" onChange={e => e.target.value !== "" && setCreating(pairs[Number(e.target.value)])}
                        aria-label="Nouvelle note pour">
                        <option value="">+ Nouvelle note pour…</option>
                        {pairs.map((p, i) => <option key={i} value={i}>{p.course?.name} — {p.group?.name}</option>)}
                    </select>
                )}
            </PageHeader>

            <Loader state={notes}>
                {list => list.length === 0 ? (
                    <Empty>Vous n'avez publié aucune note. Choisissez une matière ci-dessus pour en écrire une.</Empty>
                ) : (
                    <div className="notes-grid">
                        {list.map(note => <NoteItem key={note.id} note={note} onEdit={setEditing} showContext />)}
                    </div>
                )}
            </Loader>

            {editing && <NoteForm note={editing} onClose={() => setEditing(null)} onSaved={saved} />}
            {creating && <NoteForm course={creating.course} group={creating.group} onClose={() => setCreating(null)} onSaved={saved} />}
        </>
    );
}

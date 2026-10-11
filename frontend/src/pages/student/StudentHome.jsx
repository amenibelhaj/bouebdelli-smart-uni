import { Link } from "../../router";
import { hhmm, longDate } from "../../format";
import { Empty, Loader, PageHeader, PresenceSummary, useApi } from "../../components/ui";
import { DeadlineBadge } from "../../components/Notes";


export default function StudentHome() {
    const state = useApi("/dashboard/student");

    return (
        <Loader state={state}>
            {data => (
                <>
                    <PageHeader
                        title={`Bonjour ${data.student.name.split(" ")[0]}`}
                        subtitle={`${data.group ? `Groupe ${data.group.name} — ` : ""}N° ${data.student_number} — ${longDate(new Date())}`}
                    />

                    <div className="grid-2">
                        <section className="panel">
                            <div className="panel-head">
                                <h2>Mes cours aujourd'hui</h2>
                                <Link to="/emploi-du-temps" className="text-link">Toute la semaine</Link>
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
                                                <small>{c.Teacher?.User?.name} — salle {c.Classroom?.name}</small>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <PresenceSummary title="Mon assiduité" stats={data.attendance} />
                    </div>

                    <div className="grid-2">
                        <section className="panel">
                            <h2>Échéances à venir</h2>
                            {data.upcoming_deadlines.length === 0 ? (
                                <Empty>Aucune échéance pour le moment.</Empty>
                            ) : (
                                <ul className="deadline-list">
                                    {data.upcoming_deadlines.map(note => (
                                        <li key={note.id}>
                                            <span>
                                                <strong>{note.title}</strong>
                                                <small>{note.Course?.name}</small>
                                            </span>
                                            <DeadlineBadge deadline={note.deadline} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="panel">
                            <div className="panel-head">
                                <h2>Absences par matière</h2>
                                <Link to="/absences" className="text-link">Détail</Link>
                            </div>
                            {data.per_course.length === 0 ? (
                                <Empty>Aucune séance enregistrée pour le moment.</Empty>
                            ) : (
                                <table className="table compact">
                                    <thead>
                                        <tr><th>Matière</th><th className="num">Présences</th><th className="num">Absences</th></tr>
                                    </thead>
                                    <tbody>
                                        {data.per_course.map(row => (
                                            <tr key={row.course}>
                                                <td>{row.course}</td>
                                                <td className="num">{row.present}</td>
                                                <td className={`num ${row.absent > 0 ? "text-absent" : ""}`}>{row.absent}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </section>
                    </div>
                </>
            )}
        </Loader>
    );
}

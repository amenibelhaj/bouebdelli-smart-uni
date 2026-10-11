import { Link } from "../../router";
import { longDate, percent } from "../../format";
import { Empty, Loader, PageHeader, PresenceSummary, useApi } from "../../components/ui";


function WeekChart({ days }) {
    const max = Math.max(1, ...days.map(d => d.present + d.absent));

    return (
        <div className="week-chart" role="img"
            aria-label={days.map(d => `${longDate(d.date)} : ${d.present} présents, ${d.absent} absents`).join(". ")}>
            {days.map(d => {
                const total = d.present + d.absent;
                return (
                    <div key={d.date} className="week-col">
                        <div className="week-bar" style={{ height: `${(total / max) * 100}%` }}>
                            {total > 0 && <span className="week-absent" style={{ height: `${(d.absent / total) * 100}%` }} />}
                        </div>
                        <span className="week-label">
                            {new Date(d.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short" })}
                        </span>
                        <span className="week-value">{total ? `${d.absent} abs.` : "—"}</span>
                    </div>
                );
            })}
        </div>
    );
}


export default function AdminHome() {
    const state = useApi("/dashboard/admin");

    return (
        <Loader state={state}>
            {data => {
                const s = data.statistics;
                const a = data.attendance;

                return (
                    <>
                        <PageHeader title="Tableau de bord" subtitle={`Université — ${longDate(new Date())}`} />

                        {s.pendingUsers > 0 && (
                            <p className="alert alert-info">
                                {s.pendingUsers} compte{s.pendingUsers > 1 ? "s" : ""} en attente d'activation.{" "}
                                <Link to="/utilisateurs" className="text-link">Voir les utilisateurs</Link>
                            </p>
                        )}

                        <div className="figures">
                            <p><strong>{s.students}</strong> étudiants</p>
                            <p><strong>{s.teachers}</strong> enseignants</p>
                            <p><strong>{s.groups}</strong> groupes</p>
                            <p><strong>{s.courses}</strong> matières</p>
                            <p><strong>{s.classrooms}</strong> salles</p>
                            <p><strong>{s.devices}</strong> boîtiers caméra</p>
                        </div>

                        <div className="grid-2">
                            <PresenceSummary title="Présence des étudiants" stats={a.students} />
                            <PresenceSummary title="Présence des enseignants" stats={a.teachers} />
                        </div>

                        <div className="grid-2">
                            <section className="panel">
                                <h2>Aujourd'hui</h2>
                                <table className="table compact">
                                    <thead><tr><th></th><th className="num">Présents</th><th className="num">Absents</th><th className="num">Taux</th></tr></thead>
                                    <tbody>
                                        <tr>
                                            <td>Étudiants</td>
                                            <td className="num">{a.today.students.present}</td>
                                            <td className="num">{a.today.students.absent}</td>
                                            <td className="num">{percent(a.today.students.rate)}</td>
                                        </tr>
                                        <tr>
                                            <td>Enseignants</td>
                                            <td className="num">{a.today.teachers.present}</td>
                                            <td className="num">{a.today.teachers.absent}</td>
                                            <td className="num">{percent(a.today.teachers.rate)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <h3 className="sub-title">Étudiants, 7 derniers jours</h3>
                                <WeekChart days={data.last_7_days} />
                                <p className="presence-legend">
                                    <span className="dot dot-present" /> présences <span className="dot dot-absent" /> absences
                                </p>
                            </section>

                            <section className="panel">
                                <div className="panel-head">
                                    <h2>Étudiants les plus absents</h2>
                                    <Link to="/presences" className="text-link">Toutes les présences</Link>
                                </div>
                                {data.top_absent_students.length === 0 ? (
                                    <Empty>Aucune absence enregistrée.</Empty>
                                ) : (
                                    <ol className="rank-list">
                                        {data.top_absent_students.map(st => (
                                            <li key={st.user_id}>
                                                <span>{st.name}</span>
                                                <strong>{st.absences} absence{st.absences > 1 ? "s" : ""}</strong>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </section>
                        </div>
                    </>
                );
            }}
        </Loader>
    );
}

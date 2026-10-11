import { useState } from "react";
import { hhmm, longDate } from "../../format";
import { Empty, Loader, PageHeader, StatusPill, useApi } from "../../components/ui";


export default function StudentAbsences() {
    const state = useApi("/attendance/my");
    const [filter, setFilter] = useState("absent");

    return (
        <>
            <PageHeader title="Mes absences" subtitle="Votre présence est enregistrée par la caméra à l'entrée de la salle." />

            <Loader state={state}>
                {records => {
                    const absences = records.filter(r => r.status === "absent").length;
                    const shown = filter === "all" ? records : records.filter(r => r.status === filter);

                    return (
                        <>
                            <div className="counter-row">
                                <p className="counter"><strong>{absences}</strong> absence{absences > 1 ? "s" : ""}</p>
                                <p className="counter"><strong>{records.length - absences}</strong> présence{records.length - absences > 1 ? "s" : ""}</p>
                            </div>

                            <div className="day-filter" role="group" aria-label="Filtrer">
                                <button className={`chip ${filter === "absent" ? "chip-on" : ""}`} onClick={() => setFilter("absent")}>Absences</button>
                                <button className={`chip ${filter === "present" ? "chip-on" : ""}`} onClick={() => setFilter("present")}>Présences</button>
                                <button className={`chip ${filter === "all" ? "chip-on" : ""}`} onClick={() => setFilter("all")}>Tout</button>
                            </div>

                            {shown.length === 0 ? (
                                <Empty>{filter === "absent" ? "Aucune absence. Continuez ainsi !" : "Aucune séance enregistrée."}</Empty>
                            ) : (
                                <div className="table-wrap">
                                    <table className="table">
                                        <thead>
                                            <tr><th>Date</th><th>Matière</th><th>Horaire</th><th>Salle</th><th>Statut</th></tr>
                                        </thead>
                                        <tbody>
                                            {shown.map(r => (
                                                <tr key={r.id}>
                                                    <td>{longDate(r.date)}</td>
                                                    <td>{r.Schedule?.Course?.name}</td>
                                                    <td className="num">{hhmm(r.Schedule?.start_time)}–{hhmm(r.Schedule?.end_time)}</td>
                                                    <td>{r.Schedule?.Classroom?.name}</td>
                                                    <td><StatusPill status={r.status} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    );
                }}
            </Loader>
        </>
    );
}

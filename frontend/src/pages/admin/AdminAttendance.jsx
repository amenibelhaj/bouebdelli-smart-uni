import { useState } from "react";
import { api } from "../../api";
import { hhmm, isoDate, longDate, ROLE_LABELS } from "../../format";
import { Empty, Loader, PageHeader, StatusPill, useAction, useApi } from "../../components/ui";
import SessionAttendance from "../../components/SessionAttendance";


function Journal() {
    const groups = useApi("/admin/groups");
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [filters, setFilters] = useState({ role: "", status: "", group_id: "", from: isoDate(weekAgo), to: isoDate() });

    const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    const state = useApi(`/attendance?${query}`);

    const set = key => e => setFilters({ ...filters, [key]: e.target.value });

    return (
        <>
            <div className="toolbar wrap">
                <label className="field inline">
                    <span className="field-label">Personnes</span>
                    <select value={filters.role} onChange={set("role")}>
                        <option value="">Tous</option>
                        <option value="student">Étudiants</option>
                        <option value="teacher">Enseignants</option>
                    </select>
                </label>
                <label className="field inline">
                    <span className="field-label">Statut</span>
                    <select value={filters.status} onChange={set("status")}>
                        <option value="">Tous</option>
                        <option value="present">Présents</option>
                        <option value="absent">Absents</option>
                    </select>
                </label>
                <label className="field inline">
                    <span className="field-label">Groupe</span>
                    <select value={filters.group_id} onChange={set("group_id")}>
                        <option value="">Tous</option>
                        {(groups.data || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                </label>
                <label className="field inline">
                    <span className="field-label">Du</span>
                    <input type="date" value={filters.from} onChange={set("from")} />
                </label>
                <label className="field inline">
                    <span className="field-label">Au</span>
                    <input type="date" value={filters.to} onChange={set("to")} />
                </label>
            </div>

            <Loader state={state}>
                {records => {
                    const absent = records.filter(r => r.status === "absent").length;

                    return records.length === 0 ? <Empty>Aucun enregistrement pour ces filtres.</Empty> : (
                        <>
                            <p className="muted">{records.length} enregistrements — {records.length - absent} présences, {absent} absences</p>
                            <div className="table-wrap">
                                <table className="table">
                                    <thead>
                                        <tr><th>Date</th><th>Nom</th><th>Rôle</th><th>Cours</th><th>Groupe</th><th>Statut</th><th className="num">Reconnaissance</th></tr>
                                    </thead>
                                    <tbody>
                                        {records.map(r => (
                                            <tr key={r.id}>
                                                <td>{longDate(r.date)}</td>
                                                <td>{r.User?.name}</td>
                                                <td>{ROLE_LABELS[r.User?.role]}</td>
                                                <td>{r.Schedule?.Course?.name} <small className="muted">{hhmm(r.Schedule?.start_time)}</small></td>
                                                <td>{r.Schedule?.Group?.name}</td>
                                                <td><StatusPill status={r.status} /></td>
                                                <td className="num">{r.confidence ? `${Math.round(r.confidence * 100)} %` : "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    );
                }}
            </Loader>
        </>
    );
}


export default function AdminAttendance() {
    const [tab, setTab] = useState("session");
    const schedules = useApi("/schedules");
    const [run, busy] = useAction();

    const finalize = () => run(() => api("/attendance/finalize", { method: "POST", body: {} })).catch(() => {});

    return (
        <>
            <PageHeader title="Présences" subtitle="Présences et absences des étudiants et des enseignants.">
                <button className="btn btn-quiet" onClick={finalize} disabled={busy}
                    title="Les absences sont enregistrées automatiquement à la fin de chaque cours. Ce bouton le fait immédiatement.">
                    Enregistrer les absences du jour
                </button>
            </PageHeader>

            <div className="tabs" role="tablist">
                <button role="tab" aria-selected={tab === "session"} className={`tab ${tab === "session" ? "tab-on" : ""}`} onClick={() => setTab("session")}>Feuille de présence</button>
                <button role="tab" aria-selected={tab === "journal"} className={`tab ${tab === "journal" ? "tab-on" : ""}`} onClick={() => setTab("journal")}>Historique</button>
            </div>

            {tab === "session" ? (
                <Loader state={schedules}>
                    {list => <SessionAttendance schedules={list} isAdmin />}
                </Loader>
            ) : (
                <Journal />
            )}
        </>
    );
}

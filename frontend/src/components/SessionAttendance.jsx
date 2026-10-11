// Attendance of one class on one date: who came (camera or manual), who did not.
// Used by teachers (their classes) and the admin (any class).
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { DAY_LABELS, DAYS, hhmm, isoDate, longDate, todayName } from "../format";
import { Empty, Loader, StatusPill, useAction, useApi } from "./ui";


// Most recent date (today or before) that falls on the class's weekday
function lastDateFor(day) {
    const date = new Date();
    for (let i = 0; i < 7; i++) {
        if (DAYS[(date.getDay() + 6) % 7] === day) return isoDate(date);
        date.setDate(date.getDate() - 1);
    }
    return isoDate();
}


function scheduleLabel(s, showTeacher) {
    return `${DAY_LABELS[s.day]} ${hhmm(s.start_time)}–${hhmm(s.end_time)} — ${s.Course?.name} — ${s.Group?.name}` +
        (showTeacher && s.Teacher?.User ? ` — ${s.Teacher.User.name}` : "");
}


function SessionTable({ scheduleId, date, isAdmin }) {
    const state = useApi(`/attendance/session?schedule_id=${scheduleId}&date=${date}`);
    const [run, busy] = useAction();

    // Live refresh while the class is going on, to see camera check-ins arrive
    const live = state.data && !state.data.ended && date === isoDate();

    useEffect(() => {
        if (!live) return;
        const timer = setInterval(state.reload, 10000);
        return () => clearInterval(timer);
    }, [live, state.reload]);

    const mark = async (userId, status) => {
        await run(() => api("/attendance/session/mark", {
            method: "PUT",
            body: { schedule_id: scheduleId, date, user_id: userId, status }
        }), status === "present" ? "Marqué présent" : "Marqué absent").catch(() => {});
        state.reload();
    };

    const canEdit = date <= isoDate();

    const row = (person, isTeacher = false) => (
        <tr key={person.user_id}>
            <td>
                <strong>{person.name}</strong>
                {isTeacher ? <small className="muted"> — enseignant</small> : person.student_number && <small className="muted"> — {person.student_number}</small>}
            </td>
            <td><StatusPill status={person.status} /></td>
            <td className="num">{person.confidence ? `${Math.round(person.confidence * 100)} %` : "—"}</td>
            <td className="row-actions">
                {canEdit && (!isTeacher || isAdmin) && (
                    <>
                        <button className="btn btn-small btn-quiet" disabled={busy || person.status === "present"} onClick={() => mark(person.user_id, "present")}>Présent</button>
                        <button className="btn btn-small btn-quiet" disabled={busy || person.status === "absent"} onClick={() => mark(person.user_id, "absent")}>Absent</button>
                    </>
                )}
            </td>
        </tr>
    );

    return (
        <Loader state={state}>
            {data => (
                <section className="panel">
                    <div className="panel-head">
                        <div>
                            <h2>{data.schedule.Course?.name} — {data.schedule.Group?.name}</h2>
                            <p className="muted">
                                {longDate(date)}, {hhmm(data.schedule.start_time)}–{hhmm(data.schedule.end_time)}, salle {data.schedule.Classroom?.name}
                                {live && <span className="live-tag">En cours — mise à jour automatique</span>}
                            </p>
                        </div>
                        <p className="session-counts">
                            <span><strong>{data.summary.present}</strong> présent{data.summary.present > 1 ? "s" : ""}</span>
                            <span><strong>{data.summary.absent}</strong> absent{data.summary.absent > 1 ? "s" : ""}</span>
                            {data.summary.pending > 0 && <span><strong>{data.summary.pending}</strong> en attente</span>}
                        </p>
                    </div>

                    {!data.day_matches && (
                        <p className="alert alert-warning">Ce cours n'a pas lieu le {longDate(date)} ({DAY_LABELS[data.schedule.day]} uniquement).</p>
                    )}

                    {data.students.length === 0 ? (
                        <Empty>Aucun étudiant dans ce groupe.</Empty>
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr><th>Nom</th><th>Statut</th><th className="num">Reconnaissance</th><th><span className="sr-only">Actions</span></th></tr>
                                </thead>
                                <tbody>
                                    {data.teacher && row(data.teacher, true)}
                                    {data.students.map(s => row(s))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <p className="muted small">
                        « En attente » : le cours n'est pas terminé. À la fin du cours, les personnes non détectées par la caméra passent automatiquement en absent.
                    </p>
                </section>
            )}
        </Loader>
    );
}


export default function SessionAttendance({ schedules, isAdmin = false }) {
    const today = todayName();

    // Default: the class happening today closest to now, otherwise the first one
    const defaultId = useMemo(() => {
        const now = new Date().getHours() * 60 + new Date().getMinutes();
        const minutes = t => Number(hhmm(t).slice(0, 2)) * 60 + Number(hhmm(t).slice(3));
        const todays = schedules.filter(s => s.day === today);
        const current = todays.find(s => minutes(s.start_time) - 15 <= now && now <= minutes(s.end_time));
        return (current || todays[0] || schedules[0])?.id;
    }, [schedules, today]);

    const [scheduleId, setScheduleId] = useState(defaultId);
    const schedule = schedules.find(s => s.id === Number(scheduleId));
    const [date, setDate] = useState(() => (schedule ? lastDateFor(schedule.day) : isoDate()));

    if (schedules.length === 0) {
        return <Empty>Aucun cours dans l'emploi du temps.</Empty>;
    }

    const changeSchedule = id => {
        setScheduleId(Number(id));
        const next = schedules.find(s => s.id === Number(id));
        if (next) setDate(lastDateFor(next.day));
    };

    return (
        <>
            <div className="toolbar">
                <label className="field inline">
                    <span className="field-label">Cours</span>
                    <select value={scheduleId} onChange={e => changeSchedule(e.target.value)}>
                        {schedules.map(s => <option key={s.id} value={s.id}>{scheduleLabel(s, isAdmin)}</option>)}
                    </select>
                </label>
                <label className="field inline">
                    <span className="field-label">Date</span>
                    <input type="date" value={date} max={isoDate()} onChange={e => e.target.value && setDate(e.target.value)} />
                </label>
            </div>

            {schedule && <SessionTable key={`${scheduleId}-${date}`} scheduleId={schedule.id} date={date} isAdmin={isAdmin} />}
        </>
    );
}

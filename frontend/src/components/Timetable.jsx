// Weekly timetable: each class shows subject, time, teacher (or group), room and the
// teacher's notes for that subject. Teachers can add / edit notes from here.
import { useState } from "react";
import { DAY_LABELS, DAYS, hhmm, todayName } from "../format";
import { Empty } from "./ui";
import { NoteForm, NoteItem } from "./Notes";


function ClassCard({ entry, mode, onAddNote, onEditNote }) {
    const teacherName = entry.Teacher?.User?.name;

    return (
        <article className="class-card">
            <div className="class-top">
                <p className="class-time">
                    {hhmm(entry.start_time)}<span aria-hidden="true">–</span><span className="sr-only"> à </span>{hhmm(entry.end_time)}
                </p>
                <span className="door-plate" title="Salle">
                    <small>Salle</small>
                    {entry.Classroom?.name}
                </span>
            </div>

            <h3 className="class-subject">{entry.Course?.name}</h3>

            <p className="class-meta">
                {mode === "teacher"
                    ? <>Groupe {entry.Group?.name}</>
                    : <>{teacherName}</>}
                {entry.Classroom?.building && <span className="muted"> — {entry.Classroom.building}</span>}
            </p>

            {(entry.notes?.length > 0 || mode === "teacher") && (
                <div className="class-notes">
                    {entry.notes?.map(note => (
                        <NoteItem key={note.id} note={note} onEdit={mode === "teacher" ? n => onEditNote(n, entry) : null} />
                    ))}

                    {mode === "teacher" && (
                        <button className="btn btn-small btn-outline add-note" onClick={() => onAddNote(entry)}>
                            + Ajouter une note
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}


export default function Timetable({ schedules, mode = "student", onChanged }) {
    const today = todayName();
    const [day, setDay] = useState("all");
    const [creating, setCreating] = useState(null);
    const [editing, setEditing] = useState(null);

    const usedDays = DAYS.filter(d => schedules.some(s => s.day === d));
    const shownDays = day === "all" ? usedDays : [day];

    if (schedules.length === 0) {
        return (
            <Empty>
                {mode === "teacher"
                    ? "Aucun cours ne vous est encore attribué. L'administration publiera votre emploi du temps."
                    : "Votre emploi du temps n'est pas encore publié par l'administration."}
            </Empty>
        );
    }

    const saved = () => {
        setCreating(null);
        setEditing(null);
        onChanged?.();
    };

    return (
        <div className="timetable">
            <div className="day-filter" role="group" aria-label="Choisir un jour">
                <button className={`chip ${day === "all" ? "chip-on" : ""}`} onClick={() => setDay("all")}>Toute la semaine</button>
                {usedDays.map(d => (
                    <button key={d} className={`chip ${day === d ? "chip-on" : ""}`} onClick={() => setDay(d)}>
                        {DAY_LABELS[d]}{d === today ? " (aujourd'hui)" : ""}
                    </button>
                ))}
            </div>

            {shownDays.map(d => (
                <section key={d} className={`day ${d === today ? "day-today" : ""}`}>
                    <h2 className="day-title">
                        {DAY_LABELS[d]}
                        {d === today && <span className="today-tag">Aujourd'hui</span>}
                    </h2>

                    <div className="day-classes">
                        {schedules.filter(s => s.day === d).map(entry => (
                            <ClassCard
                                key={entry.id}
                                entry={entry}
                                mode={mode}
                                onAddNote={setCreating}
                                onEditNote={(note, entry) => setEditing({ note, entry })}
                            />
                        ))}
                    </div>
                </section>
            ))}

            {creating && (
                <NoteForm course={creating.Course} group={creating.Group} onClose={() => setCreating(null)} onSaved={saved} />
            )}

            {editing && (
                <NoteForm note={editing.note} course={editing.entry.Course} group={editing.entry.Group}
                    onClose={() => setEditing(null)} onSaved={saved} />
            )}
        </div>
    );
}

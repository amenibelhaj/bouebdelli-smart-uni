// French labels and date/time formatting

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const DAY_LABELS = {
    Monday: "Lundi",
    Tuesday: "Mardi",
    Wednesday: "Mercredi",
    Thursday: "Jeudi",
    Friday: "Vendredi",
    Saturday: "Samedi",
    Sunday: "Dimanche"
};

export const ROLE_LABELS = {
    student: "Étudiant",
    teacher: "Enseignant",
    admin: "Administrateur"
};

const ENGLISH_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];


export function todayName() {
    return ENGLISH_DAYS[new Date().getDay()];
}

// "08:30:00" -> "08:30"
export function hhmm(time) {
    return String(time || "").slice(0, 5);
}

// Local "YYYY-MM-DD"
export function isoDate(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// "2026-10-12" -> "lundi 12 octobre 2026"
export function longDate(value) {
    if (!value) return "";
    const date = typeof value === "string" && value.length === 10 ? new Date(value + "T00:00:00") : new Date(value);
    return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// "12 oct. 2026"
export function shortDate(value) {
    if (!value) return "";
    const date = typeof value === "string" && value.length === 10 ? new Date(value + "T00:00:00") : new Date(value);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// "12 oct., 23:59"
export function dateTime(value) {
    if (!value) return "";
    return new Date(value).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Deadline badge: { label: "J-3", tone: "soon" }
export function deadlineInfo(deadline) {
    if (!deadline) return null;

    const end = new Date(deadline);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const days = Math.round((startOfEnd - startOfToday) / 86400000);

    if (end < now) return { label: "Délai dépassé", tone: "past" };
    if (days === 0) return { label: "Aujourd'hui", tone: "urgent" };
    if (days === 1) return { label: "Demain", tone: "urgent" };
    if (days <= 3) return { label: `J-${days}`, tone: "soon" };
    return { label: `J-${days}`, tone: "later" };
}

// For <input type="datetime-local"> values
export function toLocalInput(value) {
    if (!value) return "";
    const d = new Date(value);
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function percent(rate) {
    return rate === null || rate === undefined ? "—" : `${rate} %`;
}

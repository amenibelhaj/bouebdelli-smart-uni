// Date/time helpers. All values use the server's local timezone (set TZ in .env).

const DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];

// "2026-10-12" for the given date, in local time (not UTC)
function toDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// "Monday" for the given date
function dayName(date = new Date()) {
    return DAYS[date.getDay()];
}

// Day name of a "YYYY-MM-DD" string
function dayNameOf(dateString) {
    const [y, m, d] = dateString.split("-").map(Number);
    return DAYS[new Date(y, m - 1, d).getDay()];
}

// "08:30" or "08:30:00" -> 510
function timeToMinutes(time) {
    const [h, m] = String(time).split(":").map(Number);
    return h * 60 + m;
}

function minutesNow(date = new Date()) {
    return date.getHours() * 60 + date.getMinutes();
}

function isValidDateString(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

module.exports = {
    DAYS,
    toDateString,
    dayName,
    dayNameOf,
    timeToMinutes,
    minutesNow,
    isValidDateString
};

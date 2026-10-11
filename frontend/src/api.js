// Small wrapper around fetch for the backend API.

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

const TOKEN_KEY = "smartuni_token";
const USER_KEY = "smartuni_user";


export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function savedUser() {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
        return null;
    }
}


// Called when the token is rejected (expired session) — set by the auth provider
let onUnauthorized = () => {};

export function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}


export async function api(path, { method = "GET", body, raw = false } = {}) {

    const headers = {};
    const token = getToken();

    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let response;

    try {
        response = await fetch(API_URL + path, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
    } catch {
        throw new Error("Impossible de joindre le serveur. Vérifiez que le backend est lancé.");
    }

    if (response.status === 401 && token && !path.startsWith("/auth/login")) {
        onUnauthorized();
    }

    if (raw && response.ok) {
        return response;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || `Erreur ${response.status}`);
    }

    return data;
}


// Reads a File from an <input type="file"> as a data URL (base64) for the API
export function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
        reader.readAsDataURL(file);
    });
}


// Downloads a note's attached file (needs the token, so a plain link won't do)
export async function downloadNoteFile(note) {
    const response = await api(`/notes/${note.id}/file`, { raw: true });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = note.file_name || "fichier";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

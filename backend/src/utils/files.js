// File uploads are sent from the frontend as base64 data URLs inside JSON:
//   { file: { name: "devoir.pdf", data: "data:application/pdf;base64,JVBERi0..." } }
// This keeps the API simple (no multipart parsing library needed).

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const HttpError = require("./httpError");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/zip": ".zip",
    "text/plain": ".txt",
    "image/png": ".png",
    "image/jpeg": ".jpg"
};

// Returns { mime, buffer } from "data:<mime>;base64,<data>"
function decodeDataUrl(dataUrl) {
    const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(String(dataUrl || ""));

    if (!match || !match[2]) {
        throw new HttpError(400, "Fichier invalide");
    }

    return {
        mime: match[1] || "application/octet-stream",
        buffer: Buffer.from(match[3], "base64")
    };
}

// Saves an uploaded note attachment and returns its metadata
function saveAttachment(file) {
    if (!file || !file.data) {
        throw new HttpError(400, "Fichier manquant");
    }

    const { mime, buffer } = decodeDataUrl(file.data);
    const extension = ALLOWED_TYPES[mime];

    if (!extension) {
        throw new HttpError(400, "Type de fichier non autorisé (PDF, Word, PowerPoint, Excel, ZIP, image)");
    }

    if (buffer.length > MAX_FILE_BYTES) {
        throw new HttpError(400, "Fichier trop volumineux (10 Mo maximum)");
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const storedName = crypto.randomUUID() + extension;
    fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buffer);

    const originalName = path.basename(String(file.name || "fichier" + extension)).slice(0, 200);

    return {
        file_path: storedName,
        file_name: originalName,
        file_type: mime
    };
}

function deleteAttachment(storedName) {
    if (!storedName) return;

    const fullPath = path.join(UPLOAD_DIR, path.basename(storedName));

    fs.rm(fullPath, { force: true }, () => {});
}

function attachmentPath(storedName) {
    return path.join(UPLOAD_DIR, path.basename(storedName));
}

module.exports = {
    decodeDataUrl,
    saveAttachment,
    deleteAttachment,
    attachmentPath
};

// Face registration and recognition.
// Signatures (128 numbers per photo) are stored in the face_signatures table.
// Two photos of the same person give signatures pointing in nearly the same
// direction, so they are compared with cosine similarity (1 = identical).

const { Op, fn, col } = require("sequelize");
const { FaceSignature } = require("../models");
const aiClient = require("./aiClient");

const MAX_PHOTOS_PER_PERSON = 5;


function threshold() {
    return Number(process.env.FACE_MATCH_THRESHOLD || 0.40);
}

function cosine(a, b) {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dot / (Math.sqrt(normA * normB) || 1);
}


// Registers one photo of a person. Returns { photos } (how many they have now).
async function enrollFace(userId, image) {

    const { signature } = await aiClient.embed(image, "enroll");

    await FaceSignature.create({ user_id: userId, signature });

    // Keep only the most recent photos
    const all = await FaceSignature.findAll({
        where: { user_id: userId },
        order: [["createdAt", "DESC"], ["id", "DESC"]],
        attributes: ["id"]
    });

    const extra = all.slice(MAX_PHOTOS_PER_PERSON).map(row => row.id);

    if (extra.length > 0) {
        await FaceSignature.destroy({ where: { id: { [Op.in]: extra } } });
    }

    return { photos: Math.min(all.length, MAX_PHOTOS_PER_PERSON) };
}


async function deleteFaces(userId) {
    await FaceSignature.destroy({ where: { user_id: userId } });
}


// { "3": 2, "5": 1 } = user id -> number of photos
async function listFaces() {

    const rows = await FaceSignature.findAll({
        attributes: ["user_id", [fn("COUNT", col("id")), "photos"]],
        group: ["user_id"],
        raw: true
    });

    const result = {};

    for (const row of rows) {
        result[String(row.user_id)] = Number(row.photos);
    }

    return result;
}


// Who is in the photo? Only compares with candidateUserIds when given
// (e.g. the students and teacher of the class happening now).
// Returns { match, user_id, confidence, faces_detected }
async function identify(image, candidateUserIds) {

    const { signature, faces_detected } = await aiClient.embed(image, "detect");

    const result = { match: false, user_id: null, confidence: null, faces_detected };

    if (!signature) {
        return result;
    }

    const where = candidateUserIds ? { user_id: { [Op.in]: candidateUserIds } } : {};
    const known = await FaceSignature.findAll({ where, attributes: ["user_id", "signature"], raw: true });

    let bestUser = null;
    let bestScore = -1;

    for (const row of known) {
        const stored = typeof row.signature === "string" ? JSON.parse(row.signature) : row.signature;
        const score = cosine(signature, stored);

        if (score > bestScore) {
            bestScore = score;
            bestUser = row.user_id;
        }
    }

    if (bestUser === null) {
        return result;
    }

    result.confidence = Math.round(bestScore * 1000) / 1000;

    if (bestScore >= threshold()) {
        result.match = true;
        result.user_id = bestUser;
    }

    return result;
}


module.exports = {
    enrollFace,
    deleteFaces,
    listFaces,
    identify
};

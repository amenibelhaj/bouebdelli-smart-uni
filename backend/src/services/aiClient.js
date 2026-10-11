// Talks to the Python face recognition service (ai-service/app.py)

const HttpError = require("../utils/httpError");


function baseUrl() {
    return (process.env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");
}


async function call(path, options = {}) {

    let response;

    try {

        response = await fetch(baseUrl() + path, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.AI_SERVICE_KEY || "",
                ...(options.headers || {})
            },
            signal: AbortSignal.timeout(20000)
        });

    } catch (error) {

        throw new HttpError(503, "Le service de reconnaissance faciale est injoignable");

    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new HttpError(
            response.status === 401 ? 502 : response.status,
            data.message || "Erreur du service de reconnaissance faciale"
        );
    }

    return data;
}


// image: data URL or raw base64 of a JPEG/PNG photo
function enrollFace(userId, image) {
    return call(`/faces/${userId}`, {
        method: "POST",
        body: JSON.stringify({ image })
    });
}

function deleteFaces(userId) {
    return call(`/faces/${userId}`, {
        method: "DELETE"
    });
}

// Returns { user_id: number_of_photos, ... }
async function listFaces() {
    const data = await call("/faces");
    return data.faces || {};
}

// Returns { match, user_id, confidence, faces_detected }
function identify(image, candidateUserIds) {
    return call("/identify", {
        method: "POST",
        body: JSON.stringify({
            image,
            candidates: candidateUserIds
        })
    });
}


module.exports = {
    enrollFace,
    deleteFaces,
    listFaces,
    identify
};

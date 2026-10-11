// Talks to the Python face service (ai-service/app.py).
// The service only turns a photo into a face signature; storing and comparing
// signatures is done here, in the database (see services/faces.js).

const HttpError = require("../utils/httpError");


function baseUrl() {
    let url = (process.env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");
    if (!/^https?:\/\//.test(url)) url = "https://" + url;
    return url;
}


// mode "enroll": the photo must contain exactly one clear face (error otherwise)
// mode "detect": uses the biggest face, or returns signature null if there is none
// Returns { signature: number[] | null, faces_detected }
async function embed(image, mode) {

    let response;

    try {

        response = await fetch(baseUrl() + "/embed", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.AI_SERVICE_KEY || ""
            },
            body: JSON.stringify({ image, mode }),
            // generous: a free hosting instance may need time to wake up
            signal: AbortSignal.timeout(60000)
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


module.exports = { embed };

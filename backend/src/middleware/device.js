const { Device, Classroom } = require("../models");


// Authenticates a door camera box with its "x-device-key" header.
// Puts the device (with its classroom) in req.device.
const deviceMiddleware = async (req, res, next) => {

    const key = req.headers["x-device-key"];

    if (!key) {
        return res.status(401).json({
            message: "Clé du boîtier manquante"
        });
    }

    const device = await Device.findOne({
        where: { api_key: key },
        include: [Classroom]
    });

    if (!device || !device.active) {
        return res.status(401).json({
            message: "Boîtier inconnu ou désactivé"
        });
    }

    device.last_seen_at = new Date();
    await device.save();

    req.device = device;

    next();
};


module.exports = deviceMiddleware;

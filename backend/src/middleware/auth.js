const jwt = require("jsonwebtoken");


// Checks the "Authorization: Bearer <token>" header and puts { id, role } in req.user
const authMiddleware = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Veuillez vous connecter"
        });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            message: "Format du jeton invalide"
        });
    }

    try {

        req.user = jwt.verify(token, process.env.JWT_SECRET);

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Session expirée, veuillez vous reconnecter"
        });

    }

};


module.exports = authMiddleware;

// Only lets through users whose role is in allowedRoles
const roleMiddleware = (...allowedRoles) => {

    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                message: "Veuillez vous connecter"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Accès refusé"
            });
        }

        next();
    };

};


module.exports = roleMiddleware;

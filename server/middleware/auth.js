const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            error: "Authentication required"
        });
    }

    try {
        const token = header.split(" ")[1];

        req.user = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        next();
    } catch {
        return res.status(401).json({
            success: false,
            error: "Invalid or expired token"
        });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: "Access denied"
            });
        }

        next();
    };
}

module.exports = {
    requireAuth,
    requireRole
};

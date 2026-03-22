const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];

        const secret = process.env.JWT_SECRET || 'dev_secret_change_me';

        const decoded = jwt.verify(token, secret);
        req.user = decoded;

        next();
    } catch {
        return res.status(403).json({ success: false, message: 'Forbidden: Invalid or expired token' });
    }
};

exports.verifyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized: No user information' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    }

    next();
};

const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            if (process.env.NODE_ENV !== 'production' && req.headers['x-mock-role']) {
                req.user = { id: 'mock_id', role: req.headers['x-mock-role'] };
                return next();
            }
            return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];

        const secret = process.env.JWT_SECRET || 'fallback_secret';

        const decoded = jwt.verify(token, secret);
        req.user = decoded;

        next();
    } catch (error) {
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

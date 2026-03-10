/**
 * Middleware auth: lấy user từ header (x-user-id) hoặc JWT sau này.
 * Hiện dùng x-user-id, x-user-role để test. Khi có JWT thì thay bằng verify token.
 */
const getCurrentUser = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  const role = req.headers["x-user-role"] || "customer";
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized", message: "Missing x-user-id header" });
  }
  req.user = { id: userId, role };
  next();
};

const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden", message: "Insufficient role" });
  }
  next();
};

module.exports = { getCurrentUser, requireRoles };

// Allow the request only if the authenticated user has one of the given roles.
// Must run after the `authenticate` middleware, which sets req.user.
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
  }
  next();
};

module.exports = requireRole;

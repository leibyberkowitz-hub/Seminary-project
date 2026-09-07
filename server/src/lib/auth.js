import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function signToken(user, portal) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, staff_id: user.staff_id, portal },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    if (!req.user.portal) {
      return res.status(401).json({ error: 'Session predates the per-site login update — please sign in again.' });
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

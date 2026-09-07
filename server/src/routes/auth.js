import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, requireAuth, requireAdmin } from '../lib/auth.js';
import { PORTALS, PORTAL_NAMES } from '../lib/portals.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password, portal } = req.body || {};
    if (!PORTALS.includes(portal)) {
      return res.status(400).json({ error: 'portal is required (attendance, fees, or finance)' });
    }
    const user = await db('users').whereRaw('LOWER(email) = LOWER(?)', [email || '']).first();
    if (!user || !user.active || !(await bcrypt.compare(password || '', user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!(user.portals || []).includes(portal)) {
      return res.status(403).json({ error: `This account has no access to ${PORTAL_NAMES[portal]}.` });
    }
    res.json({
      token: signToken(user, portal),
      user: { id: user.id, email: user.email, name: user.name, role: user.role, portal },
    });
  } catch (e) { next(e); }
});

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

// admin user management
authRouter.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.json(await db('users').select('id', 'email', 'name', 'role', 'staff_id', 'active', 'portals').orderBy('id'));
  } catch (e) { next(e); }
});

authRouter.post('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { email, password, name, role, staff_id, portals } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const granted = Array.isArray(portals)
      ? portals.filter((p) => PORTALS.includes(p))
      : PORTALS;
    if (!granted.length) return res.status(400).json({ error: 'portals must include at least one of attendance, fees, finance' });
    const [user] = await db('users')
      .insert({
        email,
        password_hash: await bcrypt.hash(password, 10),
        name: name || '',
        role: role === 'admin' ? 'admin' : 'staff',
        staff_id: staff_id || null,
        portals: granted,
      })
      .returning(['id', 'email', 'name', 'role', 'portals']);
    res.status(201).json(user);
  } catch (e) { next(e); }
});

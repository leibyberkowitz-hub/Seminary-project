import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, requireAuth, requireAdmin } from '../lib/auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const user = await db('users').whereRaw('LOWER(email) = LOWER(?)', [email || '']).first();
    if (!user || !user.active || !(await bcrypt.compare(password || '', user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({
      token: signToken(user),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e) { next(e); }
});

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

// admin user management
authRouter.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.json(await db('users').select('id', 'email', 'name', 'role', 'staff_id', 'active').orderBy('id'));
  } catch (e) { next(e); }
});

authRouter.post('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { email, password, name, role, staff_id } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const [user] = await db('users')
      .insert({
        email,
        password_hash: await bcrypt.hash(password, 10),
        name: name || '',
        role: role === 'admin' ? 'admin' : 'staff',
        staff_id: staff_id || null,
      })
      .returning(['id', 'email', 'name', 'role']);
    res.status(201).json(user);
  } catch (e) { next(e); }
});

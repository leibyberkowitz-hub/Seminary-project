import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from './lib/migrate.js';
import { requireAuth } from './lib/auth.js';
import { requirePortal, PORTALS } from './lib/portals.js';
import { buildCrudRouter } from './lib/crud.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { attendanceRouter } from './routes/attendance.js';
import { calendarRouter } from './routes/calendar.js';
import { exportRouter } from './routes/export.js';
import { importRouter } from './routes/import.js';
import { scanRouter } from './routes/scan.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' })); // scanned application photos arrive as base64 JSON

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/dashboard', requireAuth, requirePortal('finance'), dashboardRouter);
app.use('/api/attendance-tools', requireAuth, requirePortal('attendance'), attendanceRouter);
app.use('/api/calendar', requireAuth, requirePortal('attendance'), calendarRouter);
app.use('/api/export', requireAuth, exportRouter);
app.use('/api/import/quickbooks', requireAuth, requirePortal('finance'));
app.use('/api/import', requireAuth, importRouter);
app.use('/api/import/application-scan', requireAuth, requirePortal('attendance'));
app.use('/api/import', requireAuth, scanRouter);
app.use('/api', requireAuth, buildCrudRouter());

// serve the built frontends in production
const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

// Three separate websites on one server:
//   PORTAL_DOMAINS="attendance.school.org=attendance,fees.school.org=fees,finance.school.org=finance"
// maps each domain to its own site. PORTAL=fees serves a single site at the
// root for every host (for running three separate instances instead).
const portalHosts = {};
for (const pair of (process.env.PORTAL_DOMAINS || '').split(',')) {
  const [host, portal] = pair.split('=').map((s) => s?.trim().toLowerCase());
  if (host && PORTALS.includes(portal)) portalHosts[host] = portal;
}
if (PORTALS.includes(process.env.PORTAL)) portalHosts['*'] = process.env.PORTAL;
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/assets')) return next();
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  const portal = portalHosts[host] || portalHosts['*'];
  if (portal && !req.path.startsWith(`/${portal}/`)) {
    req.url = `/${portal}/`;
  }
  next();
});

app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res, next) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => err && next());
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.detail || err.message || 'Server error' });
});

const port = process.env.PORT || 3001;
migrate().then(() => {
  app.listen(port, () => console.log(`API listening on :${port}`));
}).catch((e) => { console.error('Migration failed:', e); process.exit(1); });

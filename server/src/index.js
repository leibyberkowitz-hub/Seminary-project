import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from './lib/migrate.js';
import { requireAuth } from './lib/auth.js';
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
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/attendance-tools', requireAuth, attendanceRouter);
app.use('/api/calendar', requireAuth, calendarRouter);
app.use('/api/export', requireAuth, exportRouter);
app.use('/api/import', requireAuth, importRouter);
app.use('/api/import', requireAuth, scanRouter);
app.use('/api', requireAuth, buildCrudRouter());

// serve the built frontend in production
const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
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

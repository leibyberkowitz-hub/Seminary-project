import { Router } from 'express';
import { db } from '../db.js';

export const attendanceRouter = Router();

// GET /api/attendance-tools/rollcall?date=YYYY-MM-DD&class_id=&course_id=
// Active pupils (optionally one class / course enrolment) with their status for that date.
attendanceRouter.get('/rollcall', async (req, res, next) => {
  try {
    const { date, class_id, course_id } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required' });

    const pupils = db({ p: 'pupils' })
      .select('p.id', 'p.first_name', 'p.surname', 'p.yiddish_name', 'p.class_id')
      .select(db.raw(`(SELECT TRIM(name || ' ' || parallel) FROM classes c WHERE c.id = p.class_id) AS class_label`))
      .where('p.active', true)
      .orderBy(['p.surname', 'p.first_name']);
    if (class_id) pupils.where('p.class_id', class_id);
    if (course_id) {
      pupils.whereIn('p.id', db('enrollments').select('pupil_id').where({ course_id }));
    }
    const rows = await pupils;

    const marks = await db('attendance')
      .where({ date })
      .modify((q) => {
        if (course_id) q.where({ course_id });
        else q.whereNull('course_id');
      });
    const byPupil = new Map(marks.map((m) => [m.pupil_id, m]));

    res.json(rows.map((p) => ({
      ...p,
      status: byPupil.get(p.id)?.status || 'pending',
      notes: byPupil.get(p.id)?.notes || '',
    })));
  } catch (e) { next(e); }
});

// POST /api/attendance-tools/rollcall  { date, course_id?, marks: [{pupil_id, status, notes?}] }
attendanceRouter.post('/rollcall', async (req, res, next) => {
  try {
    const { date, course_id, marks } = req.body || {};
    if (!date || !Array.isArray(marks)) {
      return res.status(400).json({ error: 'date and marks[] are required' });
    }
    await db.transaction(async (trx) => {
      for (const m of marks) {
        await trx.raw(
          `INSERT INTO attendance (pupil_id, course_id, date, status, notes)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (pupil_id, date, COALESCE(course_id, 0))
           DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes`,
          [m.pupil_id, course_id || null, date, m.status || 'pending', m.notes || '']
        );
      }
    });
    res.json({ saved: marks.length });
  } catch (e) { next(e); }
});

// GET /api/attendance-tools/log?from=&to=  -> late-or-missed log, newest first
attendanceRouter.get('/log', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const q = db({ a: 'attendance' })
      .select('a.*')
      .select(db.raw(`(SELECT TRIM(first_name || ' ' || surname) FROM pupils p WHERE p.id = a.pupil_id) AS pupil_label`))
      .select(db.raw(`(SELECT name FROM courses c WHERE c.id = a.course_id) AS course_label`))
      .whereIn('a.status', ['late', 'missed'])
      .orderBy([{ column: 'a.date', order: 'desc' }, { column: 'a.id', order: 'desc' }])
      .limit(500);
    if (from) q.where('a.date', '>=', from);
    if (to) q.where('a.date', '<=', to);
    res.json(await q);
  } catch (e) { next(e); }
});

// GET /api/attendance-tools/daily-counts?from=&to=  -> aggregated per-day counts
attendanceRouter.get('/daily-counts', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const q = db('attendance')
      .select('date')
      .select(db.raw(`
        COUNT(*) FILTER (WHERE status = 'attended')::int AS attended,
        COUNT(*) FILTER (WHERE status = 'late')::int     AS late,
        COUNT(*) FILTER (WHERE status = 'missed')::int   AS missed,
        COUNT(*) FILTER (WHERE status = 'pending')::int  AS pending`))
      .groupBy('date')
      .orderBy('date', 'desc')
      .limit(120);
    if (from) q.where('date', '>=', from);
    if (to) q.where('date', '<=', to);
    res.json(await q);
  } catch (e) { next(e); }
});

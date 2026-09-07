import { Router } from 'express';
import { db } from '../db.js';

export const dashboardRouter = Router();

// GET /api/dashboard/report?from=YYYY-MM-DD&to=YYYY-MM-DD&category=...&type=...
// Returns totals, a monthly income/expense trend, category breakdown, and the
// filtered transaction feed for the date range.
dashboardRouter.get('/report', async (req, res, next) => {
  try {
    const { from, to, category, type } = req.query;
    const base = db('transactions');
    if (from) base.where('date', '>=', from);
    if (to) base.where('date', '<=', to);
    if (category) base.where({ category });
    if (type) base.where({ type });

    const totals = await base.clone()
      .select(db.raw(`
        COALESCE(SUM(amount_in), 0)  AS income,
        COALESCE(SUM(amount_out), 0) AS expense,
        COALESCE(SUM(amount_in) - SUM(amount_out), 0) AS net,
        COUNT(*)::int AS count`))
      .first();

    const monthly = await base.clone()
      .select(db.raw(`
        TO_CHAR(date, 'YYYY-MM') AS month,
        COALESCE(SUM(amount_in), 0)  AS income,
        COALESCE(SUM(amount_out), 0) AS expense`))
      .groupByRaw(`TO_CHAR(date, 'YYYY-MM')`)
      .orderBy('month');

    const byCategory = await base.clone()
      .select('category', 'type')
      .select(db.raw('COALESCE(SUM(amount_in) - SUM(amount_out), 0) AS net, COUNT(*)::int AS count'))
      .groupBy('category', 'type')
      .orderByRaw('ABS(SUM(amount_in) - SUM(amount_out)) DESC');

    const feed = await base.clone()
      .select('transactions.*')
      .select(db.raw(`(SELECT name FROM staff s WHERE s.id = transactions.staff_id) AS staff_id_label`))
      .select(db.raw(`(SELECT name FROM suppliers su WHERE su.id = transactions.supplier_id) AS supplier_id_label`))
      .orderBy([{ column: 'date', order: 'desc' }, { column: 'id', order: 'desc' }])
      .limit(200);

    res.json({ totals, monthly, byCategory, feed });
  } catch (e) { next(e); }
});

// headline numbers for the landing dashboard
dashboardRouter.get('/summary', async (req, res, next) => {
  try {
    const [pupils, staff, courses, openTasks, todayAttendance] = await Promise.all([
      db('pupils').where({ active: true }).count({ n: '*' }).first(),
      db('staff').where({ status: 'Active' }).count({ n: '*' }).first(),
      db('courses').count({ n: '*' }).first(),
      db('tasks').whereNot({ status: 'Done' }).count({ n: '*' }).first(),
      db('attendance')
        .where({ date: new Date().toISOString().slice(0, 10) })
        .select('status')
        .count({ n: '*' })
        .groupBy('status'),
    ]);
    res.json({
      activePupils: Number(pupils.n),
      activeStaff: Number(staff.n),
      courses: Number(courses.n),
      openTasks: Number(openTasks.n),
      todayAttendance: Object.fromEntries(todayAttendance.map((r) => [r.status, Number(r.n)])),
    });
  } catch (e) { next(e); }
});

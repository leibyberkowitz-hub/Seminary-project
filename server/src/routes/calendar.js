import { Router } from 'express';
import { HebrewCalendar, HDate, Location } from '@hebcal/core';
import { db } from '../db.js';

export const calendarRouter = Router();

// GET /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
// Diary events merged with Jewish holidays/parsha and per-day Hebrew dates.
calendarRouter.get('/', async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date();
    const to = req.query.to ? new Date(req.query.to) : new Date(from.getTime() + 31 * 864e5);

    const events = await db('diary_events')
      .where('date', '<=', to.toISOString().slice(0, 10))
      .andWhere(function () {
        this.where('date', '>=', from.toISOString().slice(0, 10))
          .orWhere('end_date', '>=', from.toISOString().slice(0, 10));
      })
      .orderBy(['date', 'start_time']);

    const holidays = HebrewCalendar.calendar({
      start: from,
      end: to,
      sedrot: true,
      omer: false,
      candlelighting: false,
      location: Location.lookup('Jerusalem'),
      il: false,
    }).map((ev) => ({
      date: ev.getDate().greg().toISOString().slice(0, 10),
      title: ev.render('en'),
      hebrew: ev.render('he'),
      category: ev.getCategories()[0] || 'holiday',
    }));

    // Hebrew date string for every day in range
    const hebrewDates = {};
    for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 864e5)) {
      const iso = d.toISOString().slice(0, 10);
      const hd = new HDate(d);
      hebrewDates[iso] = { en: hd.render('en'), he: hd.renderGematriya() };
    }

    res.json({ events, holidays, hebrewDates });
  } catch (e) { next(e); }
});

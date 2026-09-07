import { Router } from 'express';
import { db } from '../db.js';
import { entities } from '../lib/entities.js';
import { portalAllows } from '../lib/portals.js';

export const exportRouter = Router();

const EXPORTABLE = ['pupils', 'staff', 'attendance', 'transactions', 'contacts', 'courses'];

function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]).filter((c) => c !== '_children');
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
}

// GET /api/export/:entity.csv  (supports the same ?column=value filters as list views)
exportRouter.get('/:entity.csv', async (req, res, next) => {
  try {
    const name = req.params.entity;
    const def = entities[name];
    if (!def || !EXPORTABLE.includes(name)) {
      return res.status(404).json({ error: `No CSV export for '${name}'` });
    }
    if (def.adminOnly && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (!portalAllows(req.user.portal, name)) {
      return res.status(403).json({ error: `'${name}' export is not available on this site.` });
    }
    const query = db(def.table).select('*').limit(20000);
    for (const [col, val] of Object.entries(req.query)) {
      if (val !== '' && !['sort', 'dir', 'q'].includes(col)) {
        try { query.where(col, val); } catch { /* unknown column -> ignore */ }
      }
    }
    const rows = await query;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('﻿' + toCsv(rows)); // BOM so Excel opens Hebrew/Yiddish text correctly
  } catch (e) { next(e); }
});

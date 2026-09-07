// Generic CRUD router factory. For each registered entity it exposes:
//   GET    /api/:entity          list (q, sort, dir, limit, offset, plus ?column=value filters)
//   GET    /api/:entity/options  [{id,label}] for reference dropdowns
//   GET    /api/:entity/:id      single record + labelled refs + child collections
//   POST   /api/:entity          create
//   PUT    /api/:entity/:id      update
//   DELETE /api/:entity/:id      delete
// Write access on adminOnly entities requires the admin role; deletes are admin-only everywhere.
import { Router } from 'express';
import { db } from '../db.js';
import { entities } from './entities.js';
import { requireAdmin } from './auth.js';

const columnCache = new Map();
async function columnsOf(table) {
  if (!columnCache.has(table)) {
    columnCache.set(table, Object.keys(await db(table).columnInfo()));
  }
  return columnCache.get(table);
}

function idCol(def) {
  return def.idColumn || 'id';
}

// keep only known, writable columns; empty strings on date/time columns become null
async function sanitize(def, body) {
  const cols = await columnsOf(def.table);
  const readonly = new Set([idCol(def), ...(def.readonly || [])]);
  const out = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (!cols.includes(k) || readonly.has(k)) continue;
    out[k] = v === '' && /(_date|date_|^date$|_on$|_time)/.test(k) ? null : v;
  }
  return out;
}

function refLabelSelects(def, query) {
  for (const [fk, ref] of Object.entries(def.refs || {})) {
    query.select(
      db.raw(`(SELECT ${ref.label} FROM ${ref.table} r WHERE r.id = t.${fk}) AS ??`, [
        `${fk}_label`,
      ])
    );
  }
}

export function buildCrudRouter() {
  const router = Router();

  // capability map so the client can render nav/permissions without hardcoding
  router.get('/meta', async (req, res) => {
    const meta = {};
    for (const [name, def] of Object.entries(entities)) {
      meta[name] = {
        adminOnly: !!def.adminOnly,
        columns: await columnsOf(def.table),
        refs: Object.fromEntries(Object.entries(def.refs || {}).map(([k, r]) => [k, r.table])),
        children: (def.children || []).map((c) => c.key),
        idColumn: idCol(def),
      };
    }
    res.json(meta);
  });

  router.use('/:entity', (req, res, next) => {
    const def = entities[req.params.entity];
    if (!def) return res.status(404).json({ error: `Unknown entity '${req.params.entity}'` });
    req.entityDef = def;
    const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (isWrite && def.adminOnly && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (req.method === 'DELETE' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete records' });
    }
    next();
  });

  router.get('/:entity', async (req, res, next) => {
    try {
      const def = req.entityDef;
      const cols = await columnsOf(def.table);
      const { q, sort, dir, limit, offset, ...filters } = req.query;

      const query = db({ t: def.table }).select('t.*');
      refLabelSelects(def, query);

      if (q && def.search?.length) {
        query.where(function () {
          for (const col of def.search) {
            this.orWhereRaw(`t.?? ILIKE ?`, [col, `%${q}%`]);
          }
        });
      }
      for (const [col, val] of Object.entries(filters)) {
        if (!cols.includes(col) || val === undefined || val === '') continue;
        query.where(`t.${col}`, val === 'true' ? true : val === 'false' ? false : val);
      }

      const countQuery = query.clone().clearSelect().clearOrder().count({ n: '*' }).first();

      const sortCol = cols.includes(sort) ? sort : idCol(def);
      query.orderBy(`t.${sortCol}`, dir === 'desc' ? 'desc' : 'asc');
      query.limit(Math.min(Number(limit) || 500, 2000)).offset(Number(offset) || 0);

      const [rows, count] = await Promise.all([query, countQuery]);
      res.json({ rows, total: Number(count.n) });
    } catch (e) { next(e); }
  });

  router.get('/:entity/options', async (req, res, next) => {
    try {
      const def = req.entityDef;
      const label = def.label || `(${idCol(def)})::text`;
      const rows = await db(def.table)
        .select(db.raw(`?? AS id, ${label} AS label`, [idCol(def)]))
        .orderByRaw(label);
      res.json(rows);
    } catch (e) { next(e); }
  });

  router.get('/:entity/:id', async (req, res, next) => {
    try {
      const def = req.entityDef;
      const query = db({ t: def.table }).select('t.*').where(`t.${idCol(def)}`, req.params.id).first();
      refLabelSelects(def, query);
      const row = await query;
      if (!row) return res.status(404).json({ error: 'Not found' });

      const children = {};
      for (const child of def.children || []) {
        const childDefName = Object.keys(entities).find((k) => entities[k].table === child.table);
        const childDef = entities[childDefName] || { table: child.table };
        const cq = db({ t: child.table }).select('t.*').where(`t.${child.fk}`, req.params.id).limit(500);
        refLabelSelects(childDef, cq);
        children[child.key] = await cq;
      }
      res.json({ ...row, _children: children });
    } catch (e) { next(e); }
  });

  router.post('/:entity', async (req, res, next) => {
    try {
      const def = req.entityDef;
      const data = await sanitize(def, req.body);
      const [row] = await db(def.table).insert(data).returning('*');
      res.status(201).json(row);
    } catch (e) { next(e); }
  });

  router.put('/:entity/:id', async (req, res, next) => {
    try {
      const def = req.entityDef;
      const data = await sanitize(def, req.body);
      const [row] = await db(def.table)
        .where(idCol(def), req.params.id)
        .update(data)
        .returning('*');
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (e) { next(e); }
  });

  router.delete('/:entity/:id', requireAdmin, async (req, res, next) => {
    try {
      const def = req.entityDef;
      const n = await db(def.table).where(idCol(def), req.params.id).del();
      if (!n) return res.status(404).json({ error: 'Not found' });
      res.json({ deleted: true });
    } catch (e) { next(e); }
  });

  return router;
}

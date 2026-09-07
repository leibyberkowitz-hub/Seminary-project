// QuickBooks report import (admin only).
// The client uploads raw CSV text of a QuickBooks transaction report
// (e.g. "Transaction List by Date" export). We auto-detect the header row
// and common QuickBooks column names, then upsert into transactions with
// source='quickbooks' and a stable external_ref so re-imports are idempotent.
import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { requireAdmin } from '../lib/auth.js';

export const importRouter = Router();

export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

const HEADER_ALIASES = {
  date: ['date', 'txn date', 'transaction date'],
  type: ['transaction type', 'type'],
  num: ['num', 'no.', 'number', 'ref no.', 'doc num'],
  name: ['name', 'customer', 'vendor', 'payee', 'customer/vendor'],
  memo: ['memo/description', 'memo', 'description'],
  account: ['account', 'account name', 'split'],
  amount: ['amount', 'total', 'amount (gbp)', 'amount (usd)', 'net amount'],
  debit: ['debit', 'money out', 'spent', 'payment'],
  credit: ['credit', 'money in', 'received', 'deposit'],
};

function detectHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const lower = rows[i].map((c) => c.trim().toLowerCase());
    const cols = {};
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      const idx = lower.findIndex((c) => aliases.includes(c));
      if (idx >= 0) cols[key] = idx;
    }
    if (cols.date !== undefined && (cols.amount !== undefined || (cols.debit !== undefined && cols.credit !== undefined))) {
      return { headerIndex: i, cols };
    }
  }
  return null;
}

function parseAmount(s) {
  if (!s) return NaN;
  const neg = /^\(.*\)$/.test(s.trim());
  const n = parseFloat(s.replace(/[()£$€,\s]/g, ''));
  return neg ? -Math.abs(n) : n;
}

function parseDate(s) {
  const t = (s || '').trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);                    // ISO
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})$/);         // DD/MM/YYYY (UK QuickBooks)
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const d = new Date(t);                                          // "12 Jan 2026" etc.
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

export function mapQuickBooksRows(csvText, { dateFormat } = {}) {
  const rows = parseCsv(csvText);
  const detected = detectHeader(rows);
  if (!detected) {
    return { error: 'Could not find a header row with Date and Amount (or Debit/Credit) columns.' };
  }
  const { headerIndex, cols } = detected;
  const out = [], skipped = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (k) => (cols[k] !== undefined ? (r[cols[k]] || '').trim() : '');
    const date = parseDate(cols.date !== undefined && dateFormat === 'MM/DD/YYYY'
      ? get('date').replace(/^(\d{1,2})\/(\d{1,2})\//, '$2/$1/')
      : get('date'));
    let amount;
    if (cols.amount !== undefined) amount = parseAmount(get('amount'));
    else {
      const debit = parseAmount(get('debit')), credit = parseAmount(get('credit'));
      amount = (isNaN(credit) ? 0 : credit) - (isNaN(debit) ? 0 : debit);
    }
    if (!date || isNaN(amount)) { skipped.push({ line: i + 1, raw: r.join(',').slice(0, 120) }); continue; }
    const qbType = get('type');
    const isExpense = amount < 0 ||
      /bill|expense|cheque|check|purchase|payroll/i.test(qbType);
    out.push({
      date,
      type: isExpense ? 'expense' : 'income',
      category: get('account') || qbType || 'QuickBooks',
      description: get('memo') || qbType,
      full_description: [qbType, get('num'), get('memo')].filter(Boolean).join(' · '),
      name: get('name'),
      amount_in: isExpense ? 0 : Math.abs(amount),
      amount_out: isExpense ? Math.abs(amount) : 0,
      source: 'quickbooks',
      external_ref: 'qb:' + crypto.createHash('sha1')
        .update([date, qbType, get('num'), get('name'), get('memo'), amount.toFixed(2)].join('|'))
        .digest('hex'),
    });
  }
  return { transactions: out, skipped, headerIndex, columns: cols };
}

// POST /api/import/quickbooks/preview  { csv, dateFormat? }
importRouter.post('/quickbooks/preview', requireAdmin, (req, res) => {
  const result = mapQuickBooksRows(req.body?.csv || '', req.body || {});
  if (result.error) return res.status(400).json(result);
  res.json({
    count: result.transactions.length,
    skipped: result.skipped,
    sample: result.transactions.slice(0, 20),
    totals: {
      income: result.transactions.reduce((s, t) => s + t.amount_in, 0),
      expense: result.transactions.reduce((s, t) => s + t.amount_out, 0),
    },
  });
});

// POST /api/import/quickbooks  { csv, dateFormat? }
importRouter.post('/quickbooks', requireAdmin, async (req, res, next) => {
  try {
    const result = mapQuickBooksRows(req.body?.csv || '', req.body || {});
    if (result.error) return res.status(400).json(result);
    let inserted = 0, duplicates = 0;
    await db.transaction(async (trx) => {
      for (const t of result.transactions) {
        const done = await trx('transactions')
          .insert(t)
          .onConflict(trx.raw('(external_ref) WHERE external_ref <> \'\''))
          .ignore();
        done.rowCount ? inserted++ : duplicates++;
      }
    });
    res.json({ inserted, duplicates, skipped: result.skipped.length });
  } catch (e) { next(e); }
});

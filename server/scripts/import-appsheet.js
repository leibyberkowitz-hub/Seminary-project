// Import the AppSheet/Google Sheets workbook into PostgreSQL.
//
//   Export each sheet tab as CSV (File → Download → .csv) into one folder,
//   named after the tab (e.g. "Pupils.csv", "Old Transactions.csv"), then:
//
//     node scripts/import-appsheet.js /path/to/exports          # dry run
//     node scripts/import-appsheet.js /path/to/exports --commit # write
//
// Design notes, informed by review of the real workbook:
//   * DRY RUN by default — everything runs inside a transaction that is
//     rolled back unless --commit is passed; the report is produced either way.
//   * Idempotent — every row keeps its AppSheet row key in appsheet_id and is
//     upserted on it, so re-running an export never duplicates rows.
//   * Row counts are reported per file so a hidden spreadsheet filter (the
//     Transactions tab was showing 134 of 8,207 rows) is caught by comparing
//     the report's "rows read" with what the sheet claims.
//   * The Old Transactions bank-reference column is known to contain payer
//     names/addresses; it is imported as free text and flagged, never used
//     as an identifier.
//   * Cross-sheet ref columns are resolved in a second pass via appsheet_id.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '../src/db.js';
import { parseCsv } from '../src/routes/import.js';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function realDate(iso) {                                          // reject e.g. 2012-02-31
  const d = new Date(iso + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === iso ? iso : undefined;
}
function parseDateVal(s) {
  const t = String(s || '').trim();
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return realDate(`${m[1]}-${m[2]}-${m[3]}`);
  m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);       // UK day-first
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    const [d, mo] = [m[1].padStart(2, '0'), m[2].padStart(2, '0')];
    if (Number(mo) <= 12) return realDate(`${y}-${mo}-${d}`);
  }
  const d = new Date(t);
  return isNaN(d) ? undefined : d.toISOString().slice(0, 10);      // undefined = unparseable
}
function parseMoneyVal(s) {
  const t = String(s || '').trim();
  if (!t) return 0;
  const neg = /^\(.*\)$/.test(t) || t.startsWith('-');
  const n = parseFloat(t.replace(/[()£$€,\s-]/g, ''));
  return isNaN(n) ? undefined : (neg ? -n : n);
}
const parseBoolVal = (s) => /^(y|yes|true|1|✓|x|paid|active)$/i.test(String(s || '').trim());
function parseTimeVal(s) {
  const m = String(s || '').trim().match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
}

// Column spec: 'target_col' | {col, type: date|money|bool|time|text}
//            | {ref: 'table', col} (resolved in pass 2)
//            | {lookup: 'table', col} (get-or-create by name)
const S = (aliases, table, cols, opts = {}) => ({ aliases: aliases.map(norm), table, cols, ...opts });

const SHEETS = [
  // ---- lookups & parents first (import order matters for refs) ----
  S(['contacts', 'accounts'], 'contacts', {
    title: 'title', firstname: 'first_name', surname: 'surname', lastname: 'surname',
    englishname: 'english_name', yiddishname: 'yiddish_name', name: 'english_name',
    homenumber: 'home_number', homephone: 'home_number',
    fatherphone: 'father_phone', motherphone: 'mother_phone',
    email: 'email', address: 'address', oldid: 'old_id',
    sclbalance: { col: 'scl_balance', type: 'money' },
    donorbalance: { col: 'donor_balance', type: 'money' },
    donor: { col: 'is_donor', type: 'bool' }, notes: 'notes',
  }),
  S(['schools'], 'schools', {
    name: 'name', school: 'name', headmistress: 'headmistress',
    contactnumber: 'contact_number', notes: 'notes',
  }),
  S(['subjects'], 'subjects', { name: 'name', subject: 'name' }),
  S(['expensecategories'], 'expense_categories', { name: 'name', category: 'name' }),
  S(['suppliers'], 'suppliers', {
    name: 'name', category: 'category', phone: 'phone', email: 'email',
    address: 'address', notes: 'notes',
  }),
  S(['bankaccounts'], 'bank_accounts', {
    name: 'name', accountname: 'name', bank: 'bank',
    accountnumber: 'account_number', sortcode: 'sort_code', notes: 'notes',
  }),
  S(['staff'], 'staff', {
    name: 'name', department: 'department', class: 'class', subject: 'subject',
    type: 'type', term: 'term', paymentmethod: 'payment_method', status: 'status',
    babysitting: { col: 'babysitting', type: 'bool' },
    balance: { col: 'balance', type: 'money' },
    lessonsrate: { col: 'lessons_rate', type: 'money' },
    windowrate: { col: 'window_rate', type: 'money' },
    otherrate: { col: 'other_rate', type: 'money' },
    phone: 'phone', email: 'email', notes: 'notes',
  }),
  S(['schoolyear', 'schoolyears'], 'school_years', {
    name: 'name', year: 'name',
    startdate: { col: 'start_date', type: 'date' }, enddate: { col: 'end_date', type: 'date' },
  }),
  S(['terms'], 'terms', {
    name: 'name', term: 'name',
    schoolyear: { ref: 'school_years', col: 'school_year_id' },
    startdate: { col: 'start_date', type: 'date' }, enddate: { col: 'end_date', type: 'date' },
  }),

  // ---- core people/academics ----
  S(['pupils'], 'pupils', {
    firstname: 'first_name', surname: 'surname', lastname: 'surname',
    hebrewname: 'hebrew_name', yiddishname: 'yiddish_name',
    pupilid: 'pupil_code', oldid: 'old_id',
    dateofbirth: { col: 'date_of_birth', type: 'date' }, dob: { col: 'date_of_birth', type: 'date' },
    hebrewbirthday: 'hebrew_birthday', address: 'address',
    fatherphone: 'father_phone', motherphone: 'mother_phone', homephone: 'home_phone',
    parent: { ref: 'contacts', col: 'contact_id' }, contact: { ref: 'contacts', col: 'contact_id' },
    group: { lookup: 'groups', col: 'group_id' },
    schoolyear: { lookup: 'school_years', col: 'school_year_id' },
    class: { lookup: 'classes', col: 'class_id' }, parallel: { classParallel: true },
    previousschool: 'previous_school',
    active: { col: 'active', type: 'bool' }, graduate: { col: 'graduate', type: 'bool' },
    fulltuition: { col: 'full_tuition', type: 'money' },
    discount: { col: 'discount', type: 'money' }, notes: 'notes',
  }),
  S(['lessonscourses', 'courses', 'lessons'], 'courses', {
    name: 'name', coursename: 'name', course: 'name', category: 'category', subject: 'subject',
    starttime: { col: 'start_time', type: 'time' }, endtime: { col: 'end_time', type: 'time' },
    assignedto: { ref: 'staff', col: 'staff_id' }, teacher: { ref: 'staff', col: 'staff_id' },
    class: { lookup: 'classes', col: 'class_id' }, semester: 'semester',
    semestercontribution: { col: 'semester_contribution', type: 'money' },
    feeperattendee: { col: 'fee_per_attendee', type: 'money' },
    projectedexpenses: { col: 'projected_expenses', type: 'money' }, notes: 'notes',
  }),
  S(['pupilcourses'], 'enrollments', {
    pupil: { ref: 'pupils', col: 'pupil_id' },
    course: { ref: 'courses', col: 'course_id' }, lessonscourse: { ref: 'courses', col: 'course_id' },
    price: { col: 'price', type: 'money' }, billingstatus: 'billing_status',
  }),
  S(['attendance'], 'attendance', {
    pupil: { ref: 'pupils', col: 'pupil_id' }, course: { ref: 'courses', col: 'course_id' },
    date: { col: 'date', type: 'date' }, status: { col: 'status', type: 'status' }, notes: 'notes',
  }),
  S(['examgroups'], 'exam_groups', {
    name: 'name', subject: { ref: 'subjects', col: 'subject_id' },
    teacher: { ref: 'staff', col: 'staff_id' }, class: { lookup: 'classes', col: 'class_id' },
    questions: 'questions', bonusquestions: 'bonus_questions', notes: 'notes',
  }),
  S(['exams'], 'exams', {
    name: 'name', exam: 'name', subject: 'subject',
    examgroup: { ref: 'exam_groups', col: 'exam_group_id' },
    course: { ref: 'courses', col: 'course_id' },
    date: { col: 'exam_date', type: 'date' }, examdate: { col: 'exam_date', type: 'date' },
    week: 'week', notes: 'notes',
  }),
  S(['examresults'], 'exam_results', {
    exam: { ref: 'exams', col: 'exam_id' }, pupil: { ref: 'pupils', col: 'pupil_id' },
    score: { col: 'score', type: 'money' }, answers: { col: 'answers', type: 'money' },
    bonusanswers: { col: 'bonus_answers', type: 'money' },
    percent: { col: 'percent', type: 'money' }, grade: 'grade', notes: 'notes',
  }),
  S(['pupillevels'], 'exam_levels', {
    pupil: { ref: 'pupils', col: 'pupil_id' },
    subject: { ref: 'subjects', col: 'subject_id' }, level: 'level', notes: 'notes',
  }),
  S(['applications'], 'applications', {
    firstname: 'first_name', surname: 'surname', yiddishname: 'yiddish_name',
    hebrewname: 'hebrew_name',
    dateofbirth: { col: 'date_of_birth', type: 'date' },
    contactphone: 'contact_phone', fatherphone: 'father_phone', motherphone: 'mother_phone',
    address: 'address', previousschool: 'previous_school',
    school: { ref: 'schools', col: 'school_id' },
    parent: { ref: 'contacts', col: 'contact_id' },
    schoolyear: { ref: 'school_years', col: 'school_year_id' },
    appliedon: { col: 'applied_on', type: 'date' },
    registrationfeepaid: { col: 'registration_fee_paid', type: 'bool' },
    paymentmethod: 'payment_method', acceptance: 'status', status: 'status', notes: 'notes',
  }),
  S(['interviews'], 'interviews', {
    applicant: { ref: 'applications', col: 'application_id' },
    application: { ref: 'applications', col: 'application_id' },
    date: { col: 'date', type: 'date' }, yiddishdate: 'yiddish_date',
    starttime: { col: 'start_time', type: 'time' }, endtime: { col: 'end_time', type: 'time' },
    category: 'category', notes: 'notes',
  }),

  // ---- finance ----
  S(['transactions'], 'transactions', {
    date: { col: 'date', type: 'date' }, type: { col: 'type', type: 'txtype' },
    category: 'category', description: 'description',
    fulldescription: 'full_description', name: 'name',
    staff: { ref: 'staff', col: 'staff_id' }, supplier: { ref: 'suppliers', col: 'supplier_id' },
    contact: { ref: 'contacts', col: 'contact_id' },
    bankaccount: { ref: 'bank_accounts', col: 'bank_account_id' },
    amountout: { col: 'amount_out', type: 'money' }, amountin: { col: 'amount_in', type: 'money' },
  }, { extra: { source: 'appsheet' } }),
  S(['oldtransactions'], 'transactions', {
    date: { col: 'date', type: 'date' }, type: { col: 'type', type: 'txtype' },
    category: 'category', description: 'description', name: 'name',
    // known-polluted bank reference column: kept as text, flagged in report
    reference: { col: 'full_description', type: 'text', junkCheck: true },
    bankreference: { col: 'full_description', type: 'text', junkCheck: true },
    amountout: { col: 'amount_out', type: 'money' }, amountin: { col: 'amount_in', type: 'money' },
  }, { extra: { source: 'appsheet-old' } }),
  S(['bills'], 'bills', {
    supplier: { ref: 'suppliers', col: 'supplier_id' },
    date: { col: 'date', type: 'date' }, duedate: { col: 'due_date', type: 'date' },
    category: { ref: 'expense_categories', col: 'category_id' },
    description: 'description', amount: { col: 'amount', type: 'money' },
    paymentstatus: 'payment_status', notes: 'notes',
  }),
  S(['expenseallocation', 'expenseallocations'], 'expense_allocations', {
    bill: { ref: 'bills', col: 'bill_id' }, course: { ref: 'courses', col: 'course_id' },
    department: 'department', amount: { col: 'amount', type: 'money' }, notes: 'notes',
  }),
  S(['pupilfees'], 'pupil_fees', {
    pupil: { ref: 'pupils', col: 'pupil_id' },
    date: { col: 'date', type: 'date' }, category: 'category', description: 'description',
    due: { col: 'amount', type: 'money' }, amount: { col: 'amount', type: 'money' },
    paid: { col: 'paid_amount', type: 'money' }, notes: 'notes',
  }),
  S(['donorpledges', 'pledges'], 'pledges', {
    donor: { ref: 'contacts', col: 'contact_id' }, contact: { ref: 'contacts', col: 'contact_id' },
    date: { col: 'date', type: 'date' }, purpose: 'purpose',
    due: { col: 'amount', type: 'money' }, amount: { col: 'amount', type: 'money' },
    paid: { col: 'fulfilled', type: 'money' }, status: 'status', notes: 'notes',
  }),
  S(['loans'], 'loans', {
    lender: { ref: 'contacts', col: 'contact_id' }, contact: { ref: 'contacts', col: 'contact_id' },
    staff: { ref: 'staff', col: 'staff_id' },
    date: { col: 'date', type: 'date' },
    received: { col: 'amount', type: 'money' }, amount: { col: 'amount', type: 'money' },
    paid: { col: 'repaid', type: 'money' }, status: 'status', notes: 'notes',
  }),
  S(['bankaccounttransfers'], 'bank_account_transfers', {
    date: { col: 'date', type: 'date' },
    from: { ref: 'bank_accounts', col: 'from_account_id' },
    fromaccount: { ref: 'bank_accounts', col: 'from_account_id' },
    to: { ref: 'bank_accounts', col: 'to_account_id' },
    toaccount: { ref: 'bank_accounts', col: 'to_account_id' },
    amount: { col: 'amount', type: 'money' }, notes: 'notes',
  }),
  S(['allocatepayments'], 'allocate_payments', {
    transaction: { ref: 'transactions', col: 'transaction_id' },
    fee: { ref: 'pupil_fees', col: 'pupil_fee_id' }, pupilfee: { ref: 'pupil_fees', col: 'pupil_fee_id' },
    pledge: { ref: 'pledges', col: 'pledge_id' },
    lessonentry: { ref: 'lesson_entries', col: 'lesson_entry_id' },
    bill: { ref: 'bills', col: 'bill_id' },
    amount: { col: 'amount', type: 'money' }, notes: 'notes',
  }),
  S(['receipts', 'charityreceipts'], 'charity_receipts', {
    contact: { ref: 'contacts', col: 'contact_id' }, donor: { ref: 'contacts', col: 'contact_id' },
    transaction: { ref: 'transactions', col: 'transaction_id' },
    date: { col: 'date', type: 'date' }, amount: { col: 'amount', type: 'money' },
    method: 'method', receiptnumber: 'receipt_number', reference: 'reference',
    trigger: 'trigger_action', notes: 'notes',
  }),
  S(['lessonentry', 'lessonentries'], 'lesson_entries', {
    staff: { ref: 'staff', col: 'staff_id' }, teacher: { ref: 'staff', col: 'staff_id' },
    month: { col: 'month', type: 'date' }, date: { col: 'month', type: 'date' },
    lessons: { col: 'lessons_qty', type: 'money' }, window: { col: 'window_qty', type: 'money' },
    other: { col: 'other_qty', type: 'money' },
    lessonsrate: { col: 'lessons_rate', type: 'money' },
    windowrate: { col: 'window_rate', type: 'money' },
    otherrate: { col: 'other_rate', type: 'money' },
    extras: { col: 'extras', type: 'money' },
    babysitting: { col: 'babysitting', type: 'bool' }, notes: 'notes',
  }),
  S(['courseexpenses'], 'course_expenses', {
    course: { ref: 'courses', col: 'course_id' }, date: { col: 'date', type: 'date' },
    description: 'description', amount: { col: 'amount', type: 'money' },
  }),
  S(['events'], 'events', {
    name: 'name', event: 'name', date: { col: 'date', type: 'date' },
    category: 'category', notes: 'notes',
  }),
  S(['eventexpenses'], 'event_expenses', {
    event: { ref: 'events', col: 'event_id' }, date: { col: 'date', type: 'date' },
    description: 'description', amount: { col: 'amount', type: 'money' },
  }),

  // ---- scheduling & admin ----
  S(['lessondiary', 'diary'], 'diary_events', {
    title: 'title', name: 'title', date: { col: 'date', type: 'date' },
    enddate: { col: 'end_date', type: 'date' },
    starttime: { col: 'start_time', type: 'time' }, endtime: { col: 'end_time', type: 'time' },
    category: 'event_type', subcategory: 'subcategory',
    assignedto: { ref: 'staff', col: 'staff_id' }, status: 'status', description: 'description',
  }),
  S(['daysoff', 'holidays'], 'days_off', {
    date: { col: 'date', type: 'date' }, enddate: { col: 'end_date', type: 'date' },
    type: 'type', reason: 'reason', description: 'reason',
  }),
  S(['tasks'], 'tasks', {
    task: 'title', title: 'title', taskid: 'task_code', category: 'category',
    description: 'description', assignedto: { ref: 'staff', col: 'staff_id' },
    status: 'status', createddate: { col: 'created_date', type: 'date' },
    duedate: { col: 'due_date', type: 'date' },
    completeddate: { col: 'completed_date', type: 'date' },
    recurring: { col: 'recurring', type: 'bool' }, notes: 'notes',
  }),
  S(['tasknotes'], 'task_notes', {
    task: { ref: 'tasks', col: 'task_id' }, note: 'note', notes: 'note',
    user: 'created_by', file: 'file',
  }),
  S(['contactnotes'], 'contact_notes', {
    contact: { ref: 'contacts', col: 'contact_id' }, note: 'note', notes: 'note',
    user: 'created_by', file: 'file',
  }),
];

const KEY_ALIASES = ['rowid', 'key', 'id', 'uniqueid', 'row'];
const STATUS_MAP = { attended: 'attended', late: 'late', missed: 'missed', pending: 'pending', present: 'attended', absent: 'missed' };

async function main() {
  const [dir, ...flags] = process.argv.slice(2);
  const commit = flags.includes('--commit');
  if (!dir || !fs.existsSync(dir)) {
    console.error('Usage: node scripts/import-appsheet.js <folder-of-csvs> [--commit]');
    process.exit(1);
  }
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.csv'));
  const report = { mode: commit ? 'COMMIT' : 'DRY RUN', files: {}, unmatchedFiles: [], unresolvedRefs: {}, warnings: [] };

  // match files to sheet configs (longest alias wins, each config used once)
  const jobs = [];
  for (const file of files) {
    const n = norm(path.basename(file, path.extname(file)));
    const cfg = SHEETS
      .filter((s) => s.aliases.includes(n))
      .sort((a, b) => SHEETS.indexOf(a) - SHEETS.indexOf(b))[0];
    if (cfg) jobs.push({ file, cfg });
    else report.unmatchedFiles.push(file);
  }
  jobs.sort((a, b) => SHEETS.indexOf(a.cfg) - SHEETS.indexOf(b.cfg)); // dependency order

  const pendingRefs = []; // {table, appsheet_id, col, refTable, raw}
  const lookupCache = new Map();

  await db.transaction(async (trx) => {
    const getOrCreate = async (table, name) => {
      const key = `${table}:${name}`;
      if (lookupCache.has(key)) return lookupCache.get(key);
      let row = table === 'classes'
        ? await trx(table).whereRaw("TRIM(name || ' ' || parallel) = ?", [name]).first()
        : await trx(table).where({ name }).first();
      if (!row) {
        if (table === 'classes') {
          const m = name.match(/^(.*?)[\s-]*([A-Za-z0-9])?$/);
          [row] = await trx(table).insert({ name: name.trim(), parallel: '' }).returning('*');
          void m;
        } else {
          [row] = await trx(table).insert({ name }).returning('*');
        }
      }
      lookupCache.set(key, row.id);
      return row.id;
    };

    for (const { file, cfg } of jobs) {
      const stats = {
        table: cfg.table, rowsRead: 0, imported: 0, skippedEmpty: 0,
        badDates: 0, badAmounts: 0, duplicateKeysInFile: 0,
        unmappedColumns: [], junkReferenceValues: 0,
      };
      report.files[file] = stats;
      const rows = parseCsv(fs.readFileSync(path.join(dir, file), 'utf8'));
      if (!rows.length) continue;
      const headers = rows[0].map(norm);
      const keyIdx = KEY_ALIASES.map((k) => headers.indexOf(k)).find((i) => i >= 0);
      stats.unmappedColumns = rows[0].filter((h, i) => {
        const hn = norm(h);
        return hn && !cfg.cols[hn] && !KEY_ALIASES.includes(hn);
      });
      const seenKeys = new Set();

      for (let r = 1; r < rows.length; r++) {
        const rowArr = rows[r];
        stats.rowsRead++;
        if (rowArr.every((c) => !String(c).trim())) { stats.skippedEmpty++; continue; }

        const rawKey = keyIdx !== undefined ? String(rowArr[keyIdx] || '').trim() : '';
        const appsheetId = rawKey ||
          'h:' + crypto.createHash('sha1').update(file + '|' + rowArr.join('|')).digest('hex').slice(0, 20);
        if (seenKeys.has(appsheetId)) { stats.duplicateKeysInFile++; continue; }
        seenKeys.add(appsheetId);

        const out = { appsheet_id: appsheetId, ...(cfg.extra || {}) };
        const refs = [];
        for (let c = 0; c < headers.length; c++) {
          const spec = cfg.cols[headers[c]];
          if (!spec) continue;
          const raw = String(rowArr[c] ?? '').trim();
          if (typeof spec === 'string') { if (raw) out[spec] = raw; continue; }
          if (spec.ref) { if (raw) refs.push({ col: spec.col, refTable: spec.ref, raw }); continue; }
          if (spec.lookup) { if (raw) out[spec.col] = await getOrCreate(spec.lookup, raw); continue; }
          if (spec.classParallel) { out.__parallel = raw; continue; }
          if (!raw) continue;
          if (spec.junkCheck) {
            const letters = raw.replace(/[^A-Za-z֐-׿ ]/g, '').length;
            if (letters / raw.length > 0.6) stats.junkReferenceValues++;
          }
          let v = raw;
          if (spec.type === 'date') { v = parseDateVal(raw); if (v === undefined) { stats.badDates++; v = null; } }
          else if (spec.type === 'money') { v = parseMoneyVal(raw); if (v === undefined) { stats.badAmounts++; v = 0; } }
          else if (spec.type === 'bool') v = parseBoolVal(raw);
          else if (spec.type === 'time') v = parseTimeVal(raw);
          else if (spec.type === 'status') v = STATUS_MAP[norm(raw)] || 'pending';
          else if (spec.type === 'txtype') v = /out|expense|debit/i.test(raw) ? 'expense' : 'income';
          if (v !== null || spec.type === 'date') out[spec.col] = v;
        }
        // pupils sheet: Class + Parallel combine into one classes row
        if (out.__parallel !== undefined) {
          const p = out.__parallel; delete out.__parallel;
          if (out.class_id && p) {
            const cls = await trx('classes').where({ id: out.class_id }).first();
            if (cls && !cls.parallel) {
              const combined = await trx('classes').where({ name: cls.name, parallel: p }).first();
              out.class_id = combined ? combined.id
                : (await trx('classes').insert({ name: cls.name, parallel: p }).returning('*'))[0].id;
            }
          }
        }
        // transactions derive type from amounts when no type column
        if (cfg.table === 'transactions' && !out.type) {
          out.type = Number(out.amount_out || 0) > 0 ? 'expense' : 'income';
        }
        if (cfg.table === 'lesson_entries' && out.month) out.month = out.month.slice(0, 8) + '01';

        await trx(cfg.table).insert(out)
          .onConflict(trx.raw("(appsheet_id) WHERE appsheet_id <> ''")).merge();
        stats.imported++;
        for (const ref of refs) pendingRefs.push({ table: cfg.table, appsheetId, ...ref });
      }
    }

    // ---- pass 2: resolve cross-sheet refs by appsheet_id ----
    const idCache = new Map();
    for (const ref of pendingRefs) {
      const ck = `${ref.refTable}:${ref.raw}`;
      let targetId = idCache.get(ck);
      if (targetId === undefined) {
        const hit = await trx(ref.refTable).where({ appsheet_id: ref.raw }).first();
        targetId = hit ? hit.id : null;
        idCache.set(ck, targetId);
      }
      if (targetId) {
        await trx(ref.table).where({ appsheet_id: ref.appsheetId }).update({ [ref.col]: targetId });
      } else {
        const k = `${ref.table}.${ref.col} -> ${ref.refTable}`;
        report.unresolvedRefs[k] = (report.unresolvedRefs[k] || 0) + 1;
      }
    }

    // ---- quality checks ----
    const dupCodes = await trx('pupils').select('pupil_code').count({ n: '*' })
      .whereNot('pupil_code', '').groupBy('pupil_code').havingRaw('COUNT(*) > 1');
    if (dupCodes.length) report.warnings.push(`Duplicate pupil IDs after import: ${dupCodes.map((d) => d.pupil_code).join(', ')}`);
    for (const [file, s] of Object.entries(report.files)) {
      if (s.junkReferenceValues) report.warnings.push(`${file}: ${s.junkReferenceValues} bank-reference values look like names/addresses — imported as description text, not references.`);
      if (s.badDates) report.warnings.push(`${file}: ${s.badDates} unparseable dates set to blank.`);
    }

    if (!commit) throw { rollback: true };
  }).catch((e) => { if (!e?.rollback) throw e; });

  fs.writeFileSync(path.join(dir, 'import-report.json'), JSON.stringify(report, null, 2));
  console.log(`\n=== AppSheet import — ${report.mode} ===`);
  for (const [file, s] of Object.entries(report.files)) {
    console.log(`${file} -> ${s.table}: read ${s.rowsRead}, imported ${s.imported}` +
      (s.skippedEmpty ? `, ${s.skippedEmpty} empty` : '') +
      (s.duplicateKeysInFile ? `, ${s.duplicateKeysInFile} duplicate keys skipped` : ''));
    if (s.unmappedColumns.length) console.log(`   columns not imported: ${s.unmappedColumns.join(', ')}`);
  }
  if (report.unmatchedFiles.length) console.log(`\nFiles with no table mapping: ${report.unmatchedFiles.join(', ')}`);
  for (const [k, n] of Object.entries(report.unresolvedRefs)) console.log(`Unresolved refs: ${k} — ${n}`);
  for (const w of report.warnings) console.log(`⚠ ${w}`);
  console.log(`\nFull report: ${path.join(dir, 'import-report.json')}`);
  if (!commit) console.log('DRY RUN — nothing was written. Re-run with --commit to import.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

-- Align the schema with the real AppSheet Data-editor export (~60 tables).
-- Mapping notes:
--   AppSheet "Lessons Courses"  -> courses (extended below with cost tables)
--   AppSheet "Pupil Courses"    -> enrollments (+ price, billing_status)
--   AppSheet "Lesson Diary"     -> diary_events (+ category/assignee/status)
--   AppSheet "Lesson Entry"     -> lesson_entries (monthly payroll ledger);
--                                  the per-date lessons table stays as its feed
--   AppSheet "Hebrew Dates"     -> computed live via @hebcal, no lookup table
--   AppSheet "Menu"             -> navigation lives in code, not data
--   AppSheet "Shomer Shabbos"   -> deliberately NOT migrated (unrelated
--                                  personal directory; confirm before importing)

-- ------------------------------------------------- admissions pipeline

CREATE TABLE schools (                        -- previous-school lookup
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,
  headmistress   TEXT NOT NULL DEFAULT '',
  contact_number TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT ''
);

ALTER TABLE applications
  ADD COLUMN hebrew_name           TEXT NOT NULL DEFAULT '',
  ADD COLUMN address               TEXT NOT NULL DEFAULT '',
  ADD COLUMN father_phone          TEXT NOT NULL DEFAULT '',
  ADD COLUMN mother_phone          TEXT NOT NULL DEFAULT '',
  ADD COLUMN contact_id            INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  ADD COLUMN school_id             INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  ADD COLUMN application_form_file TEXT NOT NULL DEFAULT '',
  ADD COLUMN registration_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN payment_method        TEXT NOT NULL DEFAULT '',
  ADD COLUMN payment_contract_file TEXT NOT NULL DEFAULT '',   -- "SL Payment Contract"
  ADD COLUMN mishmeres_certificate TEXT NOT NULL DEFAULT '',
  ADD COLUMN signed_takunes        TEXT NOT NULL DEFAULT '';

CREATE TABLE interviews (
  id             SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  date           DATE,
  yiddish_date   TEXT NOT NULL DEFAULT '',
  start_time     TIME,
  end_time       TIME,
  category       TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT ''
);

CREATE TABLE application_status_log (         -- audit trail of status changes
  id             SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  update         TEXT NOT NULL DEFAULT '',
  changed_by     TEXT NOT NULL DEFAULT '',
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------- academics

CREATE TABLE subjects (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE grades (                         -- percent range -> letter grade
  id          SERIAL PRIMARY KEY,
  min_percent NUMERIC(5,2) NOT NULL,
  max_percent NUMERIC(5,2) NOT NULL,
  grade       TEXT NOT NULL
);

CREATE TABLE exam_groups (                    -- exam template per subject/teacher/class
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL DEFAULT '',
  subject_id      INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  staff_id        INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  class_id        INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  questions       INTEGER NOT NULL DEFAULT 0,
  bonus_questions INTEGER NOT NULL DEFAULT 0,
  mahalach_1      NUMERIC(8,2) NOT NULL DEFAULT 0,  -- מהלך score stages
  mahalach_2      NUMERIC(8,2) NOT NULL DEFAULT 0,
  mahalach_3      NUMERIC(8,2) NOT NULL DEFAULT 0,
  notes           TEXT NOT NULL DEFAULT ''
);

ALTER TABLE exams
  ADD COLUMN exam_group_id INTEGER REFERENCES exam_groups(id) ON DELETE SET NULL,
  ADD COLUMN week          TEXT NOT NULL DEFAULT '';

ALTER TABLE exam_results
  ADD COLUMN answers       NUMERIC(8,2),
  ADD COLUMN bonus_answers NUMERIC(8,2),
  ADD COLUMN percent       NUMERIC(5,2);      -- grade letter derives from grades lookup

ALTER TABLE exam_levels
  ADD COLUMN subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE courses
  ADD COLUMN subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL;

-- ------------------------------------------------- finance

CREATE TABLE expense_categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE bills (                          -- supplier invoices
  id             SERIAL PRIMARY KEY,
  supplier_id    INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE,
  category_id    INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
  description    TEXT NOT NULL DEFAULT '',
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Unpaid'
                 CHECK (payment_status IN ('Unpaid','Partially Paid','Paid')),
  invoice_file   TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT ''
);

ALTER TABLE expense_allocations
  ADD COLUMN bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE;

CREATE TABLE bank_account_transfers (
  id              SERIAL PRIMARY KEY,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  from_account_id INTEGER NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  to_account_id   INTEGER NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT NOT NULL DEFAULT ''
);

-- AppSheet computes bank balances as a rollup, not a stored number:
CREATE VIEW bank_account_balances AS
SELECT b.id, b.name,
  COALESCE((SELECT SUM(t.amount_in - t.amount_out) FROM transactions t
            WHERE t.bank_account_id = b.id), 0)
  + COALESCE((SELECT SUM(x.amount) FROM bank_account_transfers x
              WHERE x.to_account_id = b.id), 0)
  - COALESCE((SELECT SUM(x.amount) FROM bank_account_transfers x
              WHERE x.from_account_id = b.id), 0) AS computed_balance
FROM bank_accounts b;

ALTER TABLE pupil_fees
  ADD COLUMN paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN outstanding NUMERIC(12,2) GENERATED ALWAYS AS (amount - paid_amount) STORED;

ALTER TABLE pledges
  ADD COLUMN outstanding NUMERIC(12,2) GENERATED ALWAYS AS (amount - fulfilled) STORED;

ALTER TABLE loans
  ADD COLUMN outstanding NUMERIC(12,2) GENERATED ALWAYS AS (amount - repaid) STORED;

CREATE TABLE allocate_payments (              -- reconciles a transaction to what it pays
  id              SERIAL PRIMARY KEY,
  transaction_id  INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  pupil_fee_id    INTEGER REFERENCES pupil_fees(id) ON DELETE SET NULL,
  pledge_id       INTEGER REFERENCES pledges(id) ON DELETE SET NULL,
  lesson_entry_id INTEGER,                    -- FK added after lesson_entries below
  bill_id         INTEGER REFERENCES bills(id) ON DELETE SET NULL,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes           TEXT NOT NULL DEFAULT ''
);

ALTER TABLE charity_receipts
  ADD COLUMN transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  ADD COLUMN reference      TEXT NOT NULL DEFAULT '',
  ADD COLUMN trigger_action TEXT NOT NULL DEFAULT '';   -- AppSheet "Trigger"

-- ------------------------------------------------- staff payroll

CREATE TABLE lesson_entries (                 -- the monthly payroll ledger
  id           SERIAL PRIMARY KEY,
  staff_id     INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  month        DATE NOT NULL,                 -- first of month
  lessons_qty  NUMERIC(8,2) NOT NULL DEFAULT 0,
  window_qty   NUMERIC(8,2) NOT NULL DEFAULT 0,
  other_qty    NUMERIC(8,2) NOT NULL DEFAULT 0,
  lessons_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  window_rate  NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_rate   NUMERIC(12,2) NOT NULL DEFAULT 0,
  extras       NUMERIC(12,2) NOT NULL DEFAULT 0,
  babysitting  BOOLEAN NOT NULL DEFAULT FALSE,
  amount       NUMERIC(12,2) GENERATED ALWAYS AS
               (lessons_qty * lessons_rate + window_qty * window_rate
                + other_qty * other_rate + extras) STORED,
  notes        TEXT NOT NULL DEFAULT '',
  UNIQUE (staff_id, month)
);
-- "Balance Until This Month" is computed per request (running sum of amount
-- minus allocated payments), not stored.

ALTER TABLE allocate_payments
  ADD CONSTRAINT allocate_payments_lesson_entry_fk
  FOREIGN KEY (lesson_entry_id) REFERENCES lesson_entries(id) ON DELETE SET NULL;

CREATE TABLE audit_logs (                     -- Lesson/Payment Entry Logs et al.
  id         SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id  TEXT NOT NULL DEFAULT '',
  action     TEXT NOT NULL DEFAULT '',
  changes    JSONB,
  changed_by TEXT NOT NULL DEFAULT '',
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------- scheduling

ALTER TABLE diary_events
  ADD COLUMN subcategory  TEXT NOT NULL DEFAULT '',
  ADD COLUMN staff_id     INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  ADD COLUMN status       TEXT NOT NULL DEFAULT '',
  ADD COLUMN recurring_id INTEGER;            -- links repeats of one series

CREATE TABLE recurring_courses (              -- repeat pattern for course lessons
  id        SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  weekday   INTEGER NOT NULL DEFAULT 0,       -- 0=Sunday
  frequency TEXT NOT NULL DEFAULT 'Weekly',
  notes     TEXT NOT NULL DEFAULT ''
);

CREATE TABLE days_off (                       -- closures & school holidays
  id       SERIAL PRIMARY KEY,
  date     DATE NOT NULL,
  end_date DATE,
  type     TEXT NOT NULL DEFAULT 'Day Off' CHECK (type IN ('Day Off','Holiday')),
  reason   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE terms (                          -- academic periods within a year
  id             SERIAL PRIMARY KEY,
  school_year_id INTEGER REFERENCES school_years(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  start_date     DATE,
  end_date       DATE
);

CREATE TABLE saved_filters (                  -- Diary Filters / Filter Table
  id      SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  view    TEXT NOT NULL DEFAULT '',
  name    TEXT NOT NULL DEFAULT '',
  filters JSONB
);

-- ------------------------------------------------- courses & events costing

ALTER TABLE enrollments
  ADD COLUMN price          NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN billing_status TEXT NOT NULL DEFAULT 'Unbilled'
             CHECK (billing_status IN ('Unbilled','Billed','Paid','Waived'));

CREATE TABLE course_expenses (                -- line-item costs per course
  id          SERIAL PRIMARY KEY,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL DEFAULT '',
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE VIEW course_costs AS                   -- Total Costs / Cost Per Pupil / vs Projected
SELECT c.id, c.name, c.projected_expenses,
  COALESCE((SELECT SUM(e.amount) FROM course_expenses e WHERE e.course_id = c.id), 0) AS total_costs,
  (SELECT COUNT(*) FROM enrollments en WHERE en.course_id = c.id) AS enrolled,
  CASE WHEN (SELECT COUNT(*) FROM enrollments en WHERE en.course_id = c.id) > 0
    THEN ROUND(COALESCE((SELECT SUM(e.amount) FROM course_expenses e WHERE e.course_id = c.id), 0)
               / (SELECT COUNT(*) FROM enrollments en WHERE en.course_id = c.id), 2)
    ELSE 0 END AS cost_per_pupil
FROM courses c;

CREATE TABLE events (                         -- one-off events, parallel to courses
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  date     DATE,
  category TEXT NOT NULL DEFAULT '',
  notes    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE event_expenses (
  id          SERIAL PRIMARY KEY,
  event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL DEFAULT '',
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ------------------------------------------------- admin

ALTER TABLE users ADD COLUMN notify_tasks BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE task_notes (
  id         SERIAL PRIMARY KEY,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  note       TEXT NOT NULL DEFAULT '',
  file       TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contact_notes (
  id         SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  note       TEXT NOT NULL DEFAULT '',
  file       TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

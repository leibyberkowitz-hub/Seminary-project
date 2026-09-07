-- Seminary Management System — initial schema
-- Conventions:
--   * money columns are NUMERIC(12,2)
--   * bilingual entities carry separate english / hebrew / yiddish text columns;
--     the frontend renders hebrew/yiddish columns right-to-left
--   * soft "active" flags rather than deletes for people records

-- ---------------------------------------------------------------- reference

CREATE TABLE school_years (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,          -- e.g. "2025-2026" / "תשפ\"ו"
  start_date  DATE,
  end_date    DATE,
  is_current  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE groups (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE classes (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,                   -- e.g. "Grade 9"
  parallel  TEXT NOT NULL DEFAULT '',        -- e.g. "A" / "B"
  UNIQUE (name, parallel)
);

CREATE TABLE settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL DEFAULT '',
  label  TEXT NOT NULL DEFAULT ''
);

-- ---------------------------------------------------------------- people

CREATE TABLE contacts (                       -- parents / donors
  id             SERIAL PRIMARY KEY,
  title          TEXT NOT NULL DEFAULT '',   -- Rabbi / Mr / Mrs ...
  first_name     TEXT NOT NULL DEFAULT '',
  surname        TEXT NOT NULL DEFAULT '',
  english_name   TEXT NOT NULL DEFAULT '',
  yiddish_name   TEXT NOT NULL DEFAULT '',
  home_number    TEXT NOT NULL DEFAULT '',
  father_phone   TEXT NOT NULL DEFAULT '',
  mother_phone   TEXT NOT NULL DEFAULT '',
  email          TEXT NOT NULL DEFAULT '',
  address        TEXT NOT NULL DEFAULT '',
  old_id         TEXT NOT NULL DEFAULT '',
  is_donor       BOOLEAN NOT NULL DEFAULT FALSE,
  scl_balance    NUMERIC(12,2) NOT NULL DEFAULT 0,  -- tuition balance
  donor_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes          TEXT NOT NULL DEFAULT ''
);

CREATE TABLE staff (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  department      TEXT NOT NULL DEFAULT '',
  class           TEXT NOT NULL DEFAULT '',
  subject         TEXT NOT NULL DEFAULT '',
  type            TEXT NOT NULL DEFAULT 'Monthly'
                  CHECK (type IN ('Monthly','Supply','Hourly','Contract')),
  term            TEXT NOT NULL DEFAULT '',
  payment_method  TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'Active'
                  CHECK (status IN ('Active','Inactive')),
  babysitting     BOOLEAN NOT NULL DEFAULT FALSE,
  balance         NUMERIC(12,2) NOT NULL DEFAULT 0,  -- running balance owed
  lessons_rate    NUMERIC(12,2) NOT NULL DEFAULT 0,
  window_rate     NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_rate      NUMERIC(12,2) NOT NULL DEFAULT 0,
  phone           TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT ''
);

CREATE TABLE users (                          -- application logins
  id             SERIAL PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  name           TEXT NOT NULL DEFAULT '',
  role           TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  staff_id       INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  active         BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------- academic

CREATE TABLE pupils (
  id               SERIAL PRIMARY KEY,
  pupil_code       TEXT NOT NULL DEFAULT '',   -- "Pupil ID" shown to users
  old_id           TEXT NOT NULL DEFAULT '',
  first_name       TEXT NOT NULL DEFAULT '',
  surname          TEXT NOT NULL DEFAULT '',
  hebrew_name      TEXT NOT NULL DEFAULT '',
  yiddish_name     TEXT NOT NULL DEFAULT '',
  date_of_birth    DATE,
  hebrew_birthday  TEXT NOT NULL DEFAULT '',   -- e.g. "ג' ניסן"
  address          TEXT NOT NULL DEFAULT '',
  father_phone     TEXT NOT NULL DEFAULT '',
  mother_phone     TEXT NOT NULL DEFAULT '',
  home_phone       TEXT NOT NULL DEFAULT '',
  contact_id       INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  group_id         INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  school_year_id   INTEGER REFERENCES school_years(id) ON DELETE SET NULL,
  class_id         INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  previous_school  TEXT NOT NULL DEFAULT '',
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  graduate         BOOLEAN NOT NULL DEFAULT FALSE,
  full_tuition     NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_tuition      NUMERIC(12,2) GENERATED ALWAYS AS (full_tuition - discount) STORED,
  notes            TEXT NOT NULL DEFAULT ''
);
CREATE INDEX pupils_class_idx ON pupils(class_id);
CREATE INDEX pupils_contact_idx ON pupils(contact_id);

CREATE TABLE courses (
  id                    SERIAL PRIMARY KEY,
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL DEFAULT '',
  subject               TEXT NOT NULL DEFAULT '',
  start_time            TIME,
  end_time              TIME,
  staff_id              INTEGER REFERENCES staff(id) ON DELETE SET NULL,  -- Assigned To
  class_id              INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  semester              TEXT NOT NULL DEFAULT '',
  semester_contribution NUMERIC(12,2) NOT NULL DEFAULT 0,
  fee_per_attendee      NUMERIC(12,2) NOT NULL DEFAULT 0,
  projected_expenses    NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes                 TEXT NOT NULL DEFAULT ''
);
CREATE INDEX courses_staff_idx ON courses(staff_id);

CREATE TABLE enrollments (                    -- pupil <-> course many-to-many
  id          SERIAL PRIMARY KEY,
  pupil_id    INTEGER NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_on DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (pupil_id, course_id)
);

CREATE TABLE lessons (                        -- log of lessons actually given ("Lesson Entry")
  id        SERIAL PRIMARY KEY,
  date      DATE NOT NULL DEFAULT CURRENT_DATE,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  staff_id  INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  type      TEXT NOT NULL DEFAULT 'Lesson' CHECK (type IN ('Lesson','Window','Other')),
  quantity  NUMERIC(8,2) NOT NULL DEFAULT 1,
  rate      NUMERIC(12,2) NOT NULL DEFAULT 0,  -- snapshot of the staff rate at entry time
  amount    NUMERIC(12,2) GENERATED ALWAYS AS (quantity * rate) STORED,
  notes     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX lessons_staff_idx ON lessons(staff_id);
CREATE INDEX lessons_date_idx ON lessons(date);

CREATE TABLE exams (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  subject    TEXT NOT NULL DEFAULT '',
  course_id  INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  exam_date  DATE,
  max_score  NUMERIC(8,2) NOT NULL DEFAULT 100,
  notes      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE exam_results (
  id        SERIAL PRIMARY KEY,
  exam_id   INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  pupil_id  INTEGER NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  score     NUMERIC(8,2),
  grade     TEXT NOT NULL DEFAULT '',
  notes     TEXT NOT NULL DEFAULT '',
  UNIQUE (exam_id, pupil_id)
);

CREATE TABLE exam_levels (                    -- per-subject level assessment
  id          SERIAL PRIMARY KEY,
  pupil_id    INTEGER NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL DEFAULT '',
  level       TEXT NOT NULL DEFAULT '',
  assessed_on DATE,
  notes       TEXT NOT NULL DEFAULT ''
);

CREATE TABLE attendance (
  id         SERIAL PRIMARY KEY,
  pupil_id   INTEGER NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  course_id  INTEGER REFERENCES courses(id) ON DELETE SET NULL, -- NULL = whole-day roll call
  date       DATE NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN ('attended','late','missed','pending')),
  notes      TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX attendance_unique_idx
  ON attendance (pupil_id, date, COALESCE(course_id, 0));
CREATE INDEX attendance_date_idx ON attendance(date);

CREATE TABLE applications (                   -- prospective pupils
  id              SERIAL PRIMARY KEY,
  first_name      TEXT NOT NULL DEFAULT '',
  surname         TEXT NOT NULL DEFAULT '',
  yiddish_name    TEXT NOT NULL DEFAULT '',
  date_of_birth   DATE,
  contact_phone   TEXT NOT NULL DEFAULT '',
  previous_school TEXT NOT NULL DEFAULT '',
  school_year_id  INTEGER REFERENCES school_years(id) ON DELETE SET NULL,
  applied_on      DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'Pending'
                  CHECK (status IN ('Pending','Accepted','Rejected','Withdrawn')),
  notes           TEXT NOT NULL DEFAULT ''
);

-- ---------------------------------------------------------------- finance

CREATE TABLE suppliers (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  phone    TEXT NOT NULL DEFAULT '',
  email    TEXT NOT NULL DEFAULT '',
  address  TEXT NOT NULL DEFAULT '',
  notes    TEXT NOT NULL DEFAULT ''
);

CREATE TABLE bank_accounts (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  bank           TEXT NOT NULL DEFAULT '',
  account_number TEXT NOT NULL DEFAULT '',
  sort_code      TEXT NOT NULL DEFAULT '',
  balance        NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes          TEXT NOT NULL DEFAULT ''
);

CREATE TABLE transactions (
  id               SERIAL PRIMARY KEY,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  type             TEXT NOT NULL CHECK (type IN ('income','expense')),
  category         TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',
  full_description TEXT NOT NULL DEFAULT '',
  name             TEXT NOT NULL DEFAULT '',  -- payer / payee free text
  staff_id         INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  supplier_id      INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  contact_id       INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  bank_account_id  INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL,
  amount_out       NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_in        NUMERIC(12,2) NOT NULL DEFAULT 0
);
CREATE INDEX transactions_date_idx ON transactions(date);
CREATE INDEX transactions_type_idx ON transactions(type);

CREATE TABLE expenses (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT '',
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'Pending'
              CHECK (status IN ('Pending','Approved','Paid')),
  notes       TEXT NOT NULL DEFAULT ''
);

CREATE TABLE expense_allocations (            -- split an expense across courses/departments
  id         SERIAL PRIMARY KEY,
  expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  course_id  INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  department TEXT NOT NULL DEFAULT '',
  amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE pupil_fees (                     -- charges raised against a pupil
  id          SERIAL PRIMARY KEY,
  pupil_id    INTEGER NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  category    TEXT NOT NULL DEFAULT 'Tuition',
  description TEXT NOT NULL DEFAULT '',
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid        BOOLEAN NOT NULL DEFAULT FALSE,
  notes       TEXT NOT NULL DEFAULT ''
);

CREATE TABLE charity_receipts (
  id             SERIAL PRIMARY KEY,
  contact_id     INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  method         TEXT NOT NULL DEFAULT '',
  receipt_number TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT ''
);

CREATE TABLE pledges (
  id         SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  purpose    TEXT NOT NULL DEFAULT '',
  amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  fulfilled  NUMERIC(12,2) NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'Open'
             CHECK (status IN ('Open','Partially Fulfilled','Fulfilled','Cancelled')),
  notes      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE loans (
  id         SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  staff_id   INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  repaid     NUMERIC(12,2) NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Repaid','Written Off')),
  notes      TEXT NOT NULL DEFAULT ''
);

-- ---------------------------------------------------------------- scheduling

CREATE TABLE diary_events (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  date        DATE NOT NULL,
  end_date    DATE,                            -- multi-day events
  start_time  TIME,
  end_time    TIME,
  all_day     BOOLEAN NOT NULL DEFAULT TRUE,
  event_type  TEXT NOT NULL DEFAULT 'General', -- General/Exam/Trip/Meeting/Holiday/Deadline
  color       TEXT NOT NULL DEFAULT '',        -- optional override, else derived from type
  description TEXT NOT NULL DEFAULT ''
);
CREATE INDEX diary_events_date_idx ON diary_events(date);

CREATE TABLE tasks (
  id             SERIAL PRIMARY KEY,
  task_code      TEXT NOT NULL DEFAULT '',     -- "Task ID" shown to users
  title          TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT '',
  description    TEXT NOT NULL DEFAULT '',
  staff_id       INTEGER REFERENCES staff(id) ON DELETE SET NULL, -- Assigned To
  status         TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Overdue','Done')),
  created_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date       DATE,
  completed_date DATE,
  recurring      BOOLEAN NOT NULL DEFAULT FALSE,
  recur_days     INTEGER NOT NULL DEFAULT 0,   -- when done, next copy due N days later
  notes          TEXT NOT NULL DEFAULT ''
);

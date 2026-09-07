-- Invoices (receivable = parents/donors, payable = suppliers) and
-- QuickBooks import support on transactions.

CREATE TABLE invoices (
  id           SERIAL PRIMARY KEY,
  number       TEXT NOT NULL DEFAULT '',
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date     DATE,
  direction    TEXT NOT NULL DEFAULT 'receivable'
               CHECK (direction IN ('receivable','payable')),
  contact_id   INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  supplier_id  INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  pupil_id     INTEGER REFERENCES pupils(id) ON DELETE SET NULL,
  description  TEXT NOT NULL DEFAULT '',
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'Draft'
               CHECK (status IN ('Draft','Sent','Partially Paid','Paid','Overdue','Cancelled')),
  notes        TEXT NOT NULL DEFAULT ''
);
CREATE INDEX invoices_date_idx ON invoices(date);

-- imported rows carry a source + stable external ref so re-importing the same
-- QuickBooks report never duplicates transactions
ALTER TABLE transactions
  ADD COLUMN source TEXT NOT NULL DEFAULT '',
  ADD COLUMN external_ref TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX transactions_external_ref_idx
  ON transactions(external_ref) WHERE external_ref <> '';

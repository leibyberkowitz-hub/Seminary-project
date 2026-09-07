-- Every row imported from the AppSheet/Google Sheets workbook keeps its
-- original row key in appsheet_id. This makes imports idempotent (re-running
-- an export never duplicates rows) and lets ref columns between sheets be
-- resolved after all tables are loaded.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'pupils','contacts','staff','transactions','applications','courses',
    'enrollments','attendance','pupil_fees','pledges','loans','suppliers',
    'bank_accounts','bank_account_transfers','bills','lesson_entries',
    'subjects','schools','exams','exam_results','exam_groups','exam_levels',
    'diary_events','tasks','events','charity_receipts','expense_categories',
    'interviews','terms','allocate_payments','course_expenses','event_expenses',
    'task_notes','contact_notes','lessons','expenses','expense_allocations',
    'invoices','days_off','school_years','groups','classes'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN appsheet_id TEXT NOT NULL DEFAULT %L', t, '');
    EXECUTE format(
      'CREATE UNIQUE INDEX %I ON %I (appsheet_id) WHERE appsheet_id <> %L',
      t || '_appsheet_idx', t, '');
  END LOOP;
END $$;

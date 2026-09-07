// Registry of entities exposed through the generic CRUD API.
//   search:   columns matched by the ?q= full-text-ish filter
//   refs:     fk column -> { table, label } used to attach display labels
//   children: related lists shown on a record's detail view
//   readonly: server-computed columns that are never writable
//   adminOnly:true => staff role gets read access only

const pupilLabel = "TRIM(first_name || ' ' || surname)";

export const entities = {
  pupils: {
    table: 'pupils',
    label: pupilLabel,
    search: ['first_name', 'surname', 'hebrew_name', 'yiddish_name', 'pupil_code', 'old_id', 'address'],
    refs: {
      contact_id: { table: 'contacts', label: "TRIM(title || ' ' || first_name || ' ' || surname)" },
      group_id: { table: 'groups', label: 'name' },
      school_year_id: { table: 'school_years', label: 'name' },
      class_id: { table: 'classes', label: "TRIM(name || ' ' || parallel)" },
    },
    readonly: ['net_tuition'],
    children: [
      { key: 'courses', table: 'enrollments', fk: 'pupil_id' },
      { key: 'attendance', table: 'attendance', fk: 'pupil_id' },
      { key: 'exam_results', table: 'exam_results', fk: 'pupil_id' },
      { key: 'exam_levels', table: 'exam_levels', fk: 'pupil_id' },
      { key: 'fees', table: 'pupil_fees', fk: 'pupil_id' },
    ],
  },
  courses: {
    table: 'courses',
    label: 'name',
    search: ['name', 'category', 'subject', 'semester'],
    refs: {
      staff_id: { table: 'staff', label: 'name' },
      class_id: { table: 'classes', label: "TRIM(name || ' ' || parallel)" },
      subject_id: { table: 'subjects', label: 'name' },
    },
    children: [
      { key: 'pupils', table: 'enrollments', fk: 'course_id' },
      { key: 'course_expenses', table: 'course_expenses', fk: 'course_id' },
      { key: 'lessons', table: 'lessons', fk: 'course_id' },
      { key: 'exams', table: 'exams', fk: 'course_id' },
      { key: 'expense_allocations', table: 'expense_allocations', fk: 'course_id' },
    ],
  },
  enrollments: {
    table: 'enrollments',
    search: [],
    refs: {
      pupil_id: { table: 'pupils', label: pupilLabel },
      course_id: { table: 'courses', label: 'name' },
    },
  },
  staff: {
    table: 'staff',
    label: 'name',
    search: ['name', 'department', 'subject', 'class'],
    adminOnly: true,
    children: [
      { key: 'courses', table: 'courses', fk: 'staff_id' },
      { key: 'lessons', table: 'lessons', fk: 'staff_id' },
      { key: 'tasks', table: 'tasks', fk: 'staff_id' },
      { key: 'transactions', table: 'transactions', fk: 'staff_id' },
      { key: 'lesson_entries', table: 'lesson_entries', fk: 'staff_id' },
    ],
  },
  contacts: {
    table: 'contacts',
    label: "TRIM(title || ' ' || first_name || ' ' || surname)",
    search: ['first_name', 'surname', 'english_name', 'yiddish_name', 'home_number', 'old_id'],
    children: [
      { key: 'pupils', table: 'pupils', fk: 'contact_id' },
      { key: 'pledges', table: 'pledges', fk: 'contact_id' },
      { key: 'charity_receipts', table: 'charity_receipts', fk: 'contact_id' },
      { key: 'transactions', table: 'transactions', fk: 'contact_id' },
      { key: 'notes_thread', table: 'contact_notes', fk: 'contact_id' },
    ],
  },
  lessons: {
    table: 'lessons',
    search: ['type', 'notes'],
    refs: {
      course_id: { table: 'courses', label: 'name' },
      staff_id: { table: 'staff', label: 'name' },
    },
    readonly: ['amount'],
  },
  attendance: {
    table: 'attendance',
    search: ['status', 'notes'],
    refs: {
      pupil_id: { table: 'pupils', label: pupilLabel },
      course_id: { table: 'courses', label: 'name' },
    },
  },
  exams: {
    table: 'exams',
    label: 'name',
    search: ['name', 'subject'],
    refs: {
      course_id: { table: 'courses', label: 'name' },
      exam_group_id: { table: 'exam_groups', label: 'name' },
    },
    children: [{ key: 'results', table: 'exam_results', fk: 'exam_id' }],
  },
  exam_results: {
    table: 'exam_results',
    search: ['grade'],
    refs: {
      exam_id: { table: 'exams', label: 'name' },
      pupil_id: { table: 'pupils', label: pupilLabel },
    },
  },
  exam_levels: {
    table: 'exam_levels',
    search: ['subject', 'level'],
    refs: {
      pupil_id: { table: 'pupils', label: pupilLabel },
      subject_id: { table: 'subjects', label: 'name' },
    },
  },
  applications: {
    table: 'applications',
    label: "TRIM(first_name || ' ' || surname)",
    search: ['first_name', 'surname', 'yiddish_name', 'status', 'previous_school'],
    refs: {
      school_year_id: { table: 'school_years', label: 'name' },
      contact_id: { table: 'contacts', label: "TRIM(title || ' ' || first_name || ' ' || surname)" },
      school_id: { table: 'schools', label: 'name' },
    },
    children: [
      { key: 'interviews', table: 'interviews', fk: 'application_id' },
      { key: 'status_log', table: 'application_status_log', fk: 'application_id' },
    ],
  },
  schools: {
    table: 'schools',
    label: 'name',
    search: ['name', 'headmistress'],
    children: [{ key: 'applications', table: 'applications', fk: 'school_id' }],
  },
  interviews: {
    table: 'interviews',
    search: ['category', 'yiddish_date'],
    refs: { application_id: { table: 'applications', label: "TRIM(first_name || ' ' || surname)" } },
  },
  application_status_log: {
    table: 'application_status_log',
    search: ['update', 'changed_by'],
    refs: { application_id: { table: 'applications', label: "TRIM(first_name || ' ' || surname)" } },
  },
  subjects: { table: 'subjects', label: 'name', search: ['name'] },
  grades: { table: 'grades', label: 'grade', search: ['grade'] },
  exam_groups: {
    table: 'exam_groups',
    label: 'name',
    search: ['name'],
    refs: {
      subject_id: { table: 'subjects', label: 'name' },
      staff_id: { table: 'staff', label: 'name' },
      class_id: { table: 'classes', label: "TRIM(name || ' ' || parallel)" },
    },
    children: [{ key: 'exams', table: 'exams', fk: 'exam_group_id' }],
  },
  transactions: {
    table: 'transactions',
    adminOnly: true,
    search: ['description', 'full_description', 'name', 'category'],
    refs: {
      staff_id: { table: 'staff', label: 'name' },
      supplier_id: { table: 'suppliers', label: 'name' },
      contact_id: { table: 'contacts', label: "TRIM(title || ' ' || first_name || ' ' || surname)" },
      bank_account_id: { table: 'bank_accounts', label: 'name' },
    },
  },
  invoices: {
    table: 'invoices',
    adminOnly: true,
    label: "TRIM(number || ' ' || description)",
    search: ['number', 'description', 'status'],
    refs: {
      contact_id: { table: 'contacts', label: "TRIM(title || ' ' || first_name || ' ' || surname)" },
      supplier_id: { table: 'suppliers', label: 'name' },
      pupil_id: { table: 'pupils', label: pupilLabel },
    },
  },
  expenses: {
    table: 'expenses',
    adminOnly: true,
    search: ['description', 'category', 'status'],
    refs: { supplier_id: { table: 'suppliers', label: 'name' } },
    children: [{ key: 'allocations', table: 'expense_allocations', fk: 'expense_id' }],
  },
  expense_allocations: {
    table: 'expense_allocations',
    adminOnly: true,
    search: ['department'],
    refs: {
      expense_id: { table: 'expenses', label: 'description' },
      bill_id: { table: 'bills', label: 'description' },
      course_id: { table: 'courses', label: 'name' },
    },
  },
  pupil_fees: {
    table: 'pupil_fees',
    adminOnly: true,
    search: ['category', 'description'],
    refs: { pupil_id: { table: 'pupils', label: pupilLabel } },
    readonly: ['outstanding'],
    children: [{ key: 'payments', table: 'allocate_payments', fk: 'pupil_fee_id' }],
  },
  charity_receipts: {
    table: 'charity_receipts',
    adminOnly: true,
    search: ['method', 'receipt_number', 'reference'],
    refs: {
      contact_id: { table: 'contacts', label: "TRIM(title || ' ' || first_name || ' ' || surname)" },
      transaction_id: { table: 'transactions', label: 'description' },
    },
  },
  pledges: {
    table: 'pledges',
    adminOnly: true,
    search: ['purpose', 'status'],
    refs: { contact_id: { table: 'contacts', label: "TRIM(title || ' ' || first_name || ' ' || surname)" } },
    readonly: ['outstanding'],
    children: [{ key: 'payments', table: 'allocate_payments', fk: 'pledge_id' }],
  },
  loans: {
    table: 'loans',
    adminOnly: true,
    search: ['status', 'notes'],
    readonly: ['outstanding'],
    refs: {
      contact_id: { table: 'contacts', label: "TRIM(title || ' ' || first_name || ' ' || surname)" },
      staff_id: { table: 'staff', label: 'name' },
    },
  },
  suppliers: {
    table: 'suppliers',
    label: 'name',
    search: ['name', 'category'],
    children: [
      { key: 'transactions', table: 'transactions', fk: 'supplier_id' },
      { key: 'expenses', table: 'expenses', fk: 'supplier_id' },
      { key: 'bills', table: 'bills', fk: 'supplier_id' },
    ],
  },
  bills: {
    table: 'bills',
    adminOnly: true,
    label: "TRIM(description)",
    search: ['description', 'payment_status'],
    refs: {
      supplier_id: { table: 'suppliers', label: 'name' },
      category_id: { table: 'expense_categories', label: 'name' },
    },
    children: [
      { key: 'allocations', table: 'expense_allocations', fk: 'bill_id' },
      { key: 'payments', table: 'allocate_payments', fk: 'bill_id' },
    ],
  },
  expense_categories: { table: 'expense_categories', label: 'name', adminOnly: true, search: ['name'] },
  bank_account_transfers: {
    table: 'bank_account_transfers',
    adminOnly: true,
    search: ['notes'],
    refs: {
      from_account_id: { table: 'bank_accounts', label: 'name' },
      to_account_id: { table: 'bank_accounts', label: 'name' },
    },
  },
  allocate_payments: {
    table: 'allocate_payments',
    adminOnly: true,
    search: ['notes'],
    refs: {
      transaction_id: { table: 'transactions', label: 'description' },
      pupil_fee_id: { table: 'pupil_fees', label: 'description' },
      pledge_id: { table: 'pledges', label: 'purpose' },
      lesson_entry_id: { table: 'lesson_entries', label: "TO_CHAR(month, 'YYYY-MM')" },
      bill_id: { table: 'bills', label: 'description' },
    },
  },
  lesson_entries: {
    table: 'lesson_entries',
    adminOnly: true,
    search: ['notes'],
    refs: { staff_id: { table: 'staff', label: 'name' } },
    readonly: ['amount'],
    children: [{ key: 'payments', table: 'allocate_payments', fk: 'lesson_entry_id' }],
  },
  course_expenses: {
    table: 'course_expenses',
    adminOnly: true,
    search: ['description'],
    refs: { course_id: { table: 'courses', label: 'name' } },
  },
  events: {
    table: 'events',
    label: 'name',
    search: ['name', 'category'],
    children: [{ key: 'expenses', table: 'event_expenses', fk: 'event_id' }],
  },
  event_expenses: {
    table: 'event_expenses',
    adminOnly: true,
    search: ['description'],
    refs: { event_id: { table: 'events', label: 'name' } },
  },
  recurring_courses: {
    table: 'recurring_courses',
    search: ['frequency'],
    refs: { course_id: { table: 'courses', label: 'name' } },
  },
  days_off: { table: 'days_off', search: ['reason', 'type'] },
  terms: {
    table: 'terms',
    label: 'name',
    search: ['name'],
    refs: { school_year_id: { table: 'school_years', label: 'name' } },
  },
  task_notes: {
    table: 'task_notes',
    search: ['note', 'created_by'],
    refs: { task_id: { table: 'tasks', label: 'title' } },
  },
  contact_notes: {
    table: 'contact_notes',
    search: ['note', 'created_by'],
    refs: { contact_id: { table: 'contacts', label: "TRIM(title || ' ' || first_name || ' ' || surname)" } },
  },
  bank_accounts: {
    table: 'bank_accounts',
    label: 'name',
    adminOnly: true,
    search: ['name', 'bank', 'account_number'],
    children: [
      { key: 'transactions', table: 'transactions', fk: 'bank_account_id' },
      { key: 'transfers_out', table: 'bank_account_transfers', fk: 'from_account_id' },
      { key: 'transfers_in', table: 'bank_account_transfers', fk: 'to_account_id' },
    ],
  },
  diary_events: {
    table: 'diary_events',
    label: 'title',
    search: ['title', 'event_type', 'description'],
  },
  tasks: {
    table: 'tasks',
    label: 'title',
    search: ['title', 'task_code', 'category', 'description'],
    refs: { staff_id: { table: 'staff', label: 'name' } },
    children: [{ key: 'notes_thread', table: 'task_notes', fk: 'task_id' }],
  },
  school_years: {
    table: 'school_years', label: 'name', search: ['name'],
    children: [{ key: 'terms', table: 'terms', fk: 'school_year_id' }],
  },
  groups: { table: 'groups', label: 'name', search: ['name'] },
  classes: { table: 'classes', label: 'name', search: ['name', 'parallel'] },
  settings: { table: 'settings', idColumn: 'key', adminOnly: true, search: ['key', 'label', 'value'] },
};

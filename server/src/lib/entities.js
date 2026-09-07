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
    },
    children: [
      { key: 'pupils', table: 'enrollments', fk: 'course_id' },
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
    refs: { course_id: { table: 'courses', label: 'name' } },
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
    refs: { pupil_id: { table: 'pupils', label: pupilLabel } },
  },
  applications: {
    table: 'applications',
    search: ['first_name', 'surname', 'yiddish_name', 'status', 'previous_school'],
    refs: { school_year_id: { table: 'school_years', label: 'name' } },
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
      course_id: { table: 'courses', label: 'name' },
    },
  },
  pupil_fees: {
    table: 'pupil_fees',
    adminOnly: true,
    search: ['category', 'description'],
    refs: { pupil_id: { table: 'pupils', label: pupilLabel } },
  },
  charity_receipts: {
    table: 'charity_receipts',
    adminOnly: true,
    search: ['method', 'receipt_number'],
    refs: { contact_id: { table: 'contacts', label: "TRIM(title || ' ' || first_name || ' ' || surname)" } },
  },
  pledges: {
    table: 'pledges',
    adminOnly: true,
    search: ['purpose', 'status'],
    refs: { contact_id: { table: 'contacts', label: "TRIM(title || ' ' || first_name || ' ' || surname)" } },
  },
  loans: {
    table: 'loans',
    adminOnly: true,
    search: ['status', 'notes'],
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
    ],
  },
  bank_accounts: {
    table: 'bank_accounts',
    label: 'name',
    adminOnly: true,
    search: ['name', 'bank', 'account_number'],
    children: [{ key: 'transactions', table: 'transactions', fk: 'bank_account_id' }],
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
  },
  school_years: { table: 'school_years', label: 'name', search: ['name'] },
  groups: { table: 'groups', label: 'name', search: ['name'] },
  classes: { table: 'classes', label: 'name', search: ['name', 'parallel'] },
  settings: { table: 'settings', idColumn: 'key', adminOnly: true, search: ['key', 'label', 'value'] },
};

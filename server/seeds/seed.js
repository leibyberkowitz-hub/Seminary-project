// Idempotent-ish demo seed: run once on a fresh database.
//   admin login:  admin@seminary.local / admin123
//   staff login:  staff@seminary.local / staff123
import bcrypt from 'bcryptjs';
import { db } from '../src/db.js';
import { migrate } from '../src/lib/migrate.js';

async function seed() {
  await migrate();
  if (await db('users').first()) {
    console.log('Database already seeded — skipping.');
    return;
  }

  const [year] = await db('school_years')
    .insert({ name: '2025-2026 · תשפ"ו', start_date: '2025-09-01', end_date: '2026-07-15', is_current: true })
    .returning('*');
  const groupIds = await db('groups').insert([{ name: 'Seminary' }, { name: 'High School' }]).returning('id');
  const classRows = await db('classes').insert([
    { name: 'Grade 9', parallel: 'A' }, { name: 'Grade 9', parallel: 'B' },
    { name: 'Grade 10', parallel: 'A' }, { name: 'Grade 11', parallel: 'A' },
  ]).returning('id');

  const staffRows = await db('staff').insert([
    { name: 'Mrs R. Weiss', department: 'Limudei Kodesh', subject: 'Chumash', type: 'Monthly', lessons_rate: 45, window_rate: 20, status: 'Active', payment_method: 'Bank Transfer' },
    { name: 'Mrs C. Gross', department: 'Secular', subject: 'Mathematics', type: 'Monthly', lessons_rate: 40, window_rate: 18, status: 'Active', payment_method: 'Cheque' },
    { name: 'Miss S. Berger', department: 'Secular', subject: 'English', type: 'Supply', lessons_rate: 35, other_rate: 15, status: 'Active', babysitting: true, payment_method: 'Cash' },
    { name: 'Mrs L. Katz', department: 'Limudei Kodesh', subject: 'Halacha', type: 'Monthly', lessons_rate: 45, status: 'Inactive', payment_method: 'Bank Transfer' },
  ]).returning('id');

  const contactRows = await db('contacts').insert([
    { title: 'Rabbi', first_name: 'Y.', surname: 'Friedman', yiddish_name: 'פֿרידמאַן', home_number: '020 8800 1234', father_phone: '07700 111222', mother_phone: '07700 111223', is_donor: true, scl_balance: -350, donor_balance: 500 },
    { title: 'Mr', first_name: 'D.', surname: 'Schwartz', yiddish_name: 'שוואַרץ', home_number: '020 8800 5678', father_phone: '07700 333444', mother_phone: '07700 333445', scl_balance: 0 },
    { title: 'Mrs', first_name: 'B.', surname: 'Halpern', yiddish_name: 'האַלפּערן', home_number: '020 8800 9012', mother_phone: '07700 555666', scl_balance: -120 },
  ]).returning('id');

  const pupilData = [
    ['Rivka', 'Friedman', 'רבקה', "י\"ד אדר", '2010-03-01', 0, 0, 0, 3500, 500],
    ['Miriam', 'Friedman', 'מרים', "ג' ניסן", '2011-04-10', 0, 0, 1, 3500, 500],
    ['Chaya', 'Schwartz', 'חיה', "כ\"ב תשרי", '2010-10-05', 1, 1, 0, 3500, 0],
    ['Esther', 'Schwartz', 'אסתר', "ח' שבט", '2012-01-20', 1, 1, 1, 3500, 350],
    ['Leah', 'Halpern', 'לאה', "ט\"ו אב", '2010-08-15', 2, 0, 2, 3500, 1000],
    ['Sara', 'Halpern', 'שרה', "א' אלול", '2009-08-30', 2, 0, 3, 3500, 0],
  ];
  const pupilRows = await db('pupils').insert(pupilData.map(([first, sur, heb, hbd, dob, ci, gi, cli, fee, disc], i) => ({
    pupil_code: `P${1001 + i}`, old_id: `OLD-${200 + i}`,
    first_name: first, surname: sur, hebrew_name: heb, yiddish_name: heb,
    hebrew_birthday: hbd, date_of_birth: dob,
    address: `${10 + i} Cazenove Road, London`,
    father_phone: '07700 111222', mother_phone: '07700 111223', home_phone: '020 8800 1234',
    contact_id: contactRows[ci].id, group_id: groupIds[gi].id,
    school_year_id: year.id, class_id: classRows[cli].id,
    previous_school: i % 2 ? 'Beis Yaakov Primary' : '',
    full_tuition: fee, discount: disc, active: true,
  }))).returning('id');

  const courseRows = await db('courses').insert([
    { name: 'Chumash Shiur', category: 'Kodesh', subject: 'Chumash', start_time: '09:00', end_time: '10:30', staff_id: staffRows[0].id, class_id: classRows[0].id, semester: 'Winter', semester_contribution: 150, fee_per_attendee: 25 },
    { name: 'Mathematics GCSE', category: 'Secular', subject: 'Mathematics', start_time: '11:00', end_time: '12:00', staff_id: staffRows[1].id, class_id: classRows[0].id, semester: 'Winter', fee_per_attendee: 30, projected_expenses: 400 },
    { name: 'English Literature', category: 'Secular', subject: 'English', start_time: '13:30', end_time: '14:30', staff_id: staffRows[2].id, class_id: classRows[2].id, semester: 'Winter', fee_per_attendee: 30 },
    { name: 'Halacha', category: 'Kodesh', subject: 'Halacha', start_time: '10:45', end_time: '11:45', staff_id: staffRows[0].id, class_id: classRows[3].id, semester: 'Summer', semester_contribution: 100 },
  ]).returning('id');

  const enrollments = [];
  pupilRows.forEach((p, i) => {
    enrollments.push({ pupil_id: p.id, course_id: courseRows[i % 2].id });
    enrollments.push({ pupil_id: p.id, course_id: courseRows[2 + (i % 2)].id });
  });
  await db('enrollments').insert(enrollments);

  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const days = [...Array(10)].map((_, i) => iso(new Date(today.getTime() - i * 864e5)))
    .filter((d) => ![0, 6].includes(new Date(d).getDay()));
  const statuses = ['attended', 'attended', 'attended', 'late', 'attended', 'missed'];
  await db('attendance').insert(days.flatMap((date, di) =>
    pupilRows.map((p, pi) => ({ pupil_id: p.id, date, status: statuses[(di + pi) % statuses.length] }))
  ));

  const examRows = await db('exams').insert([
    { name: 'Chumash Winter Exam', subject: 'Chumash', course_id: courseRows[0].id, exam_date: iso(new Date(today.getTime() - 14 * 864e5)) },
    { name: 'Maths Mock GCSE', subject: 'Mathematics', course_id: courseRows[1].id, exam_date: iso(new Date(today.getTime() - 7 * 864e5)) },
  ]).returning('id');
  await db('exam_results').insert(pupilRows.slice(0, 4).flatMap((p, i) => [
    { exam_id: examRows[0].id, pupil_id: p.id, score: 72 + i * 5, grade: ['B', 'B+', 'A-', 'A'][i] },
    { exam_id: examRows[1].id, pupil_id: p.id, score: 60 + i * 8, grade: ['C', 'B-', 'B+', 'A'][i] },
  ]));
  await db('exam_levels').insert(pupilRows.slice(0, 3).map((p, i) => ({
    pupil_id: p.id, subject: 'Chumash', level: ['Level 2', 'Level 3', 'Level 3'][i], assessed_on: iso(today),
  })));

  await db('lessons').insert(days.slice(0, 5).flatMap((date) => [
    { date, course_id: courseRows[0].id, staff_id: staffRows[0].id, type: 'Lesson', quantity: 2, rate: 45 },
    { date, course_id: courseRows[1].id, staff_id: staffRows[1].id, type: 'Lesson', quantity: 1, rate: 40 },
    { date, staff_id: staffRows[2].id, type: 'Window', quantity: 1, rate: 15 },
  ]));

  const supplierRows = await db('suppliers').insert([
    { name: 'Kosher Catering Co', category: 'Food' },
    { name: 'Office Depot', category: 'Stationery' },
    { name: 'Hackney Coaches', category: 'Transport' },
  ]).returning('id');
  const bankRows = await db('bank_accounts').insert([
    { name: 'Main Current Account', bank: 'Barclays', account_number: '12345678', sort_code: '20-00-00', balance: 15000 },
    { name: 'Charity Account', bank: 'HSBC', account_number: '87654321', sort_code: '40-00-00', balance: 8200 },
  ]).returning('id');

  const months = [...Array(6)].map((_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 12);
    return iso(d);
  });
  const txs = [];
  months.forEach((date, i) => {
    txs.push({ date, type: 'income', category: 'Tuition', description: 'Monthly tuition collection', full_description: `Tuition receipts ${date}`, name: 'Various parents', amount_in: 4200 + i * 150, bank_account_id: bankRows[0].id });
    txs.push({ date, type: 'income', category: 'Donations', description: 'Donation', full_description: `Donation received ${date}`, name: 'Rabbi Y. Friedman', contact_id: contactRows[0].id, amount_in: 500, bank_account_id: bankRows[1].id });
    txs.push({ date, type: 'expense', category: 'Salaries', description: 'Staff salaries', full_description: `Salaries ${date}`, name: 'Payroll', staff_id: staffRows[0].id, amount_out: 3100 + i * 60, bank_account_id: bankRows[0].id });
    txs.push({ date, type: 'expense', category: 'Food', description: 'Catering', full_description: `Lunch program ${date}`, name: 'Kosher Catering Co', supplier_id: supplierRows[0].id, amount_out: 650, bank_account_id: bankRows[0].id });
  });
  await db('transactions').insert(txs);

  const expenseRows = await db('expenses').insert([
    { date: iso(today), description: 'Textbooks order', category: 'Books', supplier_id: supplierRows[1].id, amount: 320, status: 'Approved' },
    { date: iso(today), description: 'Chanukah trip coaches', category: 'Transport', supplier_id: supplierRows[2].id, amount: 480, status: 'Pending' },
  ]).returning('id');
  await db('expense_allocations').insert([
    { expense_id: expenseRows[0].id, course_id: courseRows[1].id, amount: 200, department: 'Secular' },
    { expense_id: expenseRows[0].id, course_id: courseRows[2].id, amount: 120, department: 'Secular' },
  ]);

  await db('pupil_fees').insert(pupilRows.slice(0, 4).map((p, i) => ({
    pupil_id: p.id, category: 'Tuition', description: 'Term 1 tuition', amount: 1166.67, paid: i < 2,
  })));
  await db('charity_receipts').insert([
    { contact_id: contactRows[0].id, date: iso(today), amount: 500, method: 'Bank Transfer', receipt_number: 'CR-0001' },
  ]);
  await db('pledges').insert([
    { contact_id: contactRows[0].id, purpose: 'Building fund', amount: 5000, fulfilled: 1500, status: 'Partially Fulfilled' },
    { contact_id: contactRows[1].id, purpose: 'Scholarship fund', amount: 1000, fulfilled: 0, status: 'Open' },
  ]);
  await db('loans').insert([
    { staff_id: staffRows[2].id, amount: 600, repaid: 200, status: 'Open', notes: 'Advance on salary' },
  ]);
  await db('applications').insert([
    { first_name: 'Gitty', surname: 'Rosen', yiddish_name: 'גיטי', date_of_birth: '2012-06-01', contact_phone: '07700 777888', previous_school: 'Beis Ruchel', school_year_id: year.id, status: 'Pending' },
  ]);

  await db('diary_events').insert([
    { title: 'Staff meeting', date: iso(new Date(today.getTime() + 2 * 864e5)), start_time: '16:00', end_time: '17:00', all_day: false, event_type: 'Meeting' },
    { title: 'Chumash exam — Grade 9', date: iso(new Date(today.getTime() + 5 * 864e5)), event_type: 'Exam' },
    { title: 'School trip', date: iso(new Date(today.getTime() + 9 * 864e5)), event_type: 'Trip' },
    { title: 'Tuition invoices due', date: iso(new Date(today.getTime() + 12 * 864e5)), event_type: 'Deadline' },
  ]);
  await db('tasks').insert([
    { task_code: 'T-001', title: 'Order winter textbooks', category: 'Admin', staff_id: staffRows[1].id, status: 'Open', due_date: iso(new Date(today.getTime() + 7 * 864e5)) },
    { task_code: 'T-002', title: 'Chase outstanding tuition', category: 'Finance', status: 'Overdue', due_date: iso(new Date(today.getTime() - 3 * 864e5)) },
    { task_code: 'T-003', title: 'Weekly fire-alarm check', category: 'Facilities', status: 'Open', recurring: true, recur_days: 7, due_date: iso(new Date(today.getTime() + 1 * 864e5)) },
    { task_code: 'T-004', title: 'Submit census return', category: 'Admin', status: 'Done', completed_date: iso(new Date(today.getTime() - 5 * 864e5)) },
  ]);
  await db('settings').insert([
    { key: 'school_name', value: 'Beis Yaakov Seminary', label: 'School name' },
    { key: 'currency', value: '£', label: 'Currency symbol' },
    { key: 'default_full_tuition', value: '3500', label: 'Default full tuition' },
  ]);

  await db('users').insert([
    { email: 'admin@seminary.local', password_hash: await bcrypt.hash('admin123', 10), name: 'Administrator', role: 'admin', portals: ['attendance', 'fees', 'finance'] },
    { email: 'staff@seminary.local', password_hash: await bcrypt.hash('staff123', 10), name: 'Mrs R. Weiss', role: 'staff', staff_id: staffRows[0].id, portals: ['attendance'] },
    { email: 'attendance@seminary.local', password_hash: await bcrypt.hash('attend123', 10), name: 'Attendance Secretary', role: 'staff', portals: ['attendance'] },
    { email: 'fees@seminary.local', password_hash: await bcrypt.hash('fees123', 10), name: 'Fees Office', role: 'admin', portals: ['fees'] },
    { email: 'finance@seminary.local', password_hash: await bcrypt.hash('finance123', 10), name: 'Treasurer', role: 'admin', portals: ['finance'] },
  ]);

  console.log('Seed complete. Logins (per site): admin@seminary.local/admin123 (all three), attendance@seminary.local/attend123, fees@seminary.local/fees123, finance@seminary.local/finance123');
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

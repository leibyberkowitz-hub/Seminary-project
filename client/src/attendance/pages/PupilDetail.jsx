import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, fmtMoney, fmtDate } from '../../shared/api.js';
import { PageHead, FieldView, ChildTable, RecordForm, DeleteButton } from '../../shared/ui.jsx';
import { pupilFields } from './Pupils.jsx';

export default function PupilDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(0);

  useEffect(() => { api(`/pupils/${id}`).then(setP).catch(() => {}); }, [id, v]);
  if (!p) return <div className="muted">Loading…</div>;
  const c = p._children || {};

  return (
    <div>
      <PageHead title={`${p.first_name} ${p.surname}`}>
        <button className="btn secondary" onClick={() => setEditing(true)}>Edit</button>
        <DeleteButton entity="pupils" id={p.id} onDeleted={() => nav('/pupils')} />
      </PageHead>
      <div className="panel detail-grid">
        <FieldView label="Pupil ID">{p.pupil_code}</FieldView>
        <FieldView label="Old ID">{p.old_id}</FieldView>
        <FieldView label="Hebrew Name"><bdi dir="rtl">{p.hebrew_name}</bdi></FieldView>
        <FieldView label="Yiddish Name"><bdi dir="rtl">{p.yiddish_name}</bdi></FieldView>
        <FieldView label="Date of Birth">{fmtDate(p.date_of_birth)}</FieldView>
        <FieldView label="Hebrew Birthday"><bdi dir="rtl">{p.hebrew_birthday}</bdi></FieldView>
        <FieldView label="Address">{p.address}</FieldView>
        <FieldView label="Father Phone">{p.father_phone && <a href={`tel:${p.father_phone}`}>{p.father_phone}</a>}</FieldView>
        <FieldView label="Mother Phone">{p.mother_phone && <a href={`tel:${p.mother_phone}`}>{p.mother_phone}</a>}</FieldView>
        <FieldView label="Home Phone">{p.home_phone && <a href={`tel:${p.home_phone}`}>{p.home_phone}</a>}</FieldView>
        <FieldView label="Parent Contact">{p.contact_id_label}</FieldView>
        <FieldView label="Group">{p.group_id_label}</FieldView>
        <FieldView label="School Year">{p.school_year_id_label}</FieldView>
        <FieldView label="Class">{p.class_id_label}</FieldView>
        <FieldView label="Previous School">{p.previous_school}</FieldView>
        <FieldView label="Status">
          <span className={`badge ${p.active ? 'active' : 'bad'}`}>{p.active ? 'Active' : 'Inactive'}</span>
          {p.graduate && <span className="badge" style={{ marginLeft: 6 }}>Graduate</span>}
        </FieldView>
        <FieldView label="Full Tuition">{fmtMoney(p.full_tuition)}</FieldView>
        <FieldView label="Discount">{fmtMoney(p.discount)}</FieldView>
        <FieldView label="Net Tuition"><b>{fmtMoney(p.net_tuition)}</b></FieldView>
        {p.notes && <FieldView label="Notes">{p.notes}</FieldView>}
      </div>

      <ChildTable title="Courses" rows={c.courses} columns={[
        { key: 'course_id', label: 'Course', ref: true },
        { key: 'enrolled_on', label: 'Enrolled', type: 'date' },
      ]} onRowClick={(r) => nav(`/courses/${r.course_id}`)} />

      <ChildTable title="Attendance" rows={c.attendance?.slice().sort((a, b) => b.date < a.date ? -1 : 1)} columns={[
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'course_id', label: 'Course', ref: true },
        { key: 'status', label: 'Status', type: 'badge' },
        { key: 'notes', label: 'Notes' },
      ]} />

      <ChildTable title="Exam Results" rows={c.exam_results} columns={[
        { key: 'exam_id', label: 'Exam', ref: true },
        { key: 'score', label: 'Score' },
        { key: 'grade', label: 'Grade' },
      ]} />

      <ChildTable title="Exam Levels" rows={c.exam_levels} columns={[
        { key: 'subject', label: 'Subject' },
        { key: 'level', label: 'Level' },
        { key: 'assessed_on', label: 'Assessed', type: 'date' },
      ]} />

      <ChildTable title="Fees" rows={c.fees} columns={[
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount', type: 'money' },
        { key: 'paid', label: 'Paid', type: 'bool' },
      ]} />
      <p className="muted">Fees are managed in the <a href="/fees/">Fees portal</a>.</p>

      {editing && (
        <RecordForm entity="pupils" title="Pupil" fields={pupilFields} record={p}
          onClose={() => setEditing(false)} onSaved={() => setV((x) => x + 1)} />
      )}
    </div>
  );
}

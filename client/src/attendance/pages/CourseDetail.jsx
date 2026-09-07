import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, fmtMoney } from '../../shared/api.js';
import { PageHead, FieldView, ChildTable, RecordForm, DeleteButton } from '../../shared/ui.jsx';
import { courseFields } from './Courses.jsx';

export default function CourseDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState(null);
  const [pupilOptions, setPupilOptions] = useState([]);
  const [addPupil, setAddPupil] = useState('');
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(0);

  useEffect(() => { api(`/courses/${id}`).then(setCourse).catch(() => {}); }, [id, v]);
  useEffect(() => { api('/pupils/options').then(setPupilOptions); }, []);
  if (!course) return <div className="muted">Loading…</div>;
  const c = course._children || {};
  const enrolledIds = new Set((c.pupils || []).map((e) => e.pupil_id));

  const enroll = async () => {
    if (!addPupil) return;
    await api('/enrollments', { method: 'POST', body: { pupil_id: addPupil, course_id: id } });
    setAddPupil(''); setV((x) => x + 1);
  };
  const unenroll = async (enrollmentId) => {
    await api(`/enrollments/${enrollmentId}`, { method: 'DELETE' }).catch((e) => alert(e.message));
    setV((x) => x + 1);
  };

  return (
    <div>
      <PageHead title={course.name}>
        <button className="btn secondary" onClick={() => setEditing(true)}>Edit</button>
        <DeleteButton entity="courses" id={course.id} onDeleted={() => nav('/courses')} />
      </PageHead>
      <div className="panel detail-grid">
        <FieldView label="Category">{course.category}</FieldView>
        <FieldView label="Subject">{course.subject}</FieldView>
        <FieldView label="Time">{course.start_time?.slice(0, 5)} – {course.end_time?.slice(0, 5)}</FieldView>
        <FieldView label="Assigned To">{course.staff_id_label}</FieldView>
        <FieldView label="Class">{course.class_id_label}</FieldView>
        <FieldView label="Semester">{course.semester}</FieldView>
        <FieldView label="Semester Contribution">{fmtMoney(course.semester_contribution)}</FieldView>
        <FieldView label="Fee Per Attendee">{fmtMoney(course.fee_per_attendee)}</FieldView>
        <FieldView label="Projected Expenses">{fmtMoney(course.projected_expenses)}</FieldView>
        <FieldView label="Projected Fee Income">
          {fmtMoney((c.pupils?.length || 0) * Number(course.fee_per_attendee || 0))}
          <span className="muted"> ({c.pupils?.length || 0} enrolled)</span>
        </FieldView>
      </div>

      <div className="panel">
        <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Enrolled Pupils ({c.pupils?.length || 0})</h3>
        <div className="toolbar">
          <select value={addPupil} onChange={(e) => setAddPupil(e.target.value)}>
            <option value="">Add a pupil…</option>
            {pupilOptions.filter((p) => !enrolledIds.has(p.id)).map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <button className="btn small" onClick={enroll} disabled={!addPupil}>Enroll</button>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th className="nosort">Pupil</th><th className="nosort">Enrolled</th><th className="nosort"></th></tr></thead>
            <tbody>
              {(c.pupils || []).map((e) => (
                <tr key={e.id}>
                  <td className="clickable" onClick={() => nav(`/pupils/${e.pupil_id}`)}>
                    <a>{e.pupil_id_label}</a>
                  </td>
                  <td>{e.enrolled_on?.slice(0, 10)}</td>
                  <td><button className="btn secondary small" onClick={() => unenroll(e.id)}>Remove</button></td>
                </tr>
              ))}
              {!c.pupils?.length && <tr><td colSpan={3} className="muted">No pupils enrolled.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <ChildTable title="Lessons Given" rows={c.lessons} columns={[
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'staff_id', label: 'Staff', ref: true },
        { key: 'type', label: 'Type' },
        { key: 'quantity', label: 'Qty' },
        { key: 'amount', label: 'Amount', type: 'money' },
      ]} />

      <ChildTable title="Exams" rows={c.exams} columns={[
        { key: 'name', label: 'Exam' },
        { key: 'exam_date', label: 'Date', type: 'date' },
        { key: 'max_score', label: 'Max Score' },
      ]} />

      {editing && (
        <RecordForm entity="courses" title="Course" fields={courseFields} record={course}
          onClose={() => setEditing(false)} onSaved={() => setV((x) => x + 1)} />
      )}
    </div>
  );
}

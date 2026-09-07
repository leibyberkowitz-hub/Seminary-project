import React, { useEffect, useState } from 'react';
import { api, qs, todayIso } from '../../shared/api.js';
import { PageHead } from '../../shared/ui.jsx';

const STATUSES = ['attended', 'late', 'missed', 'pending'];

export default function RollCall() {
  const [date, setDate] = useState(todayIso());
  const [classId, setClassId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/classes/options').then(setClasses);
    api('/courses/options').then(setCourses);
  }, []);

  useEffect(() => {
    setRows(null);
    api(`/attendance-tools/rollcall${qs({ date, class_id: classId, course_id: courseId })}`)
      .then(setRows).catch((e) => setMsg(e.message));
  }, [date, classId, courseId]);

  const setStatus = (pupilId, status) =>
    setRows(rows.map((r) => (r.id === pupilId ? { ...r, status } : r)));
  const markAll = (status) => setRows(rows.map((r) => ({ ...r, status })));

  const save = async () => {
    setBusy(true); setMsg('');
    try {
      await api('/attendance-tools/rollcall', {
        method: 'POST',
        body: { date, course_id: courseId || null, marks: rows.map((r) => ({ pupil_id: r.id, status: r.status, notes: r.notes })) },
      });
      setMsg(`Saved ${rows.length} marks for ${date}.`);
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHead title="Daily Roll Call">
        <button className="btn" onClick={save} disabled={busy || !rows?.length}>
          {busy ? 'Saving…' : 'Save Roll Call'}
        </button>
      </PageHead>
      <div className="toolbar">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Whole day (no course)</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <span style={{ marginLeft: 'auto' }} />
        <button className="btn secondary small" onClick={() => markAll('attended')}>All attended</button>
        <button className="btn secondary small" onClick={() => markAll('pending')}>Reset</button>
      </div>
      {msg && <div className="panel">{msg}</div>}
      <div className="table-wrap">
        <table className="grid">
          <thead><tr><th className="nosort">Pupil</th><th className="nosort">Class</th><th className="nosort">Status</th><th className="nosort">Notes</th></tr></thead>
          <tbody>
            {rows === null && <tr><td colSpan={4} className="muted">Loading…</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={4} className="muted">No pupils match this selection.</td></tr>}
            {rows?.map((r) => (
              <tr key={r.id}>
                <td>{r.surname}, {r.first_name} <bdi dir="rtl" className="muted">{r.yiddish_name}</bdi></td>
                <td>{r.class_label}</td>
                <td>
                  {STATUSES.map((s) => (
                    <button key={s}
                      className={`btn small ${r.status === s ? '' : 'secondary'}`}
                      style={{ marginRight: 4, ...(r.status === s ? { background: { attended: '#059669', late: '#d97706', missed: '#dc2626', pending: '#64748b' }[s] } : {}) }}
                      onClick={() => setStatus(r.id, s)}>
                      {s}
                    </button>
                  ))}
                </td>
                <td>
                  <input style={{ width: 160 }} value={r.notes || ''} placeholder="note"
                    onChange={(e) => setRows(rows.map((x) => x.id === r.id ? { ...x, notes: e.target.value } : x))} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

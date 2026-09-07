import React, { useEffect, useState } from 'react';
import { api, qs, fmtDate, downloadCsv } from '../../shared/api.js';
import { PageHead } from '../../shared/ui.jsx';

export default function AttendanceLog() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api(`/attendance-tools/log${qs({ from, to })}`).then(setRows).catch(() => setRows([]));
  }, [from, to]);

  return (
    <div>
      <PageHead title="Late / Missed Log">
        <button className="btn secondary" onClick={() => downloadCsv('attendance')}>Export all attendance CSV</button>
      </PageHead>
      <div className="toolbar">
        <label className="muted">From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="muted">To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <span className="muted" style={{ marginLeft: 'auto' }}>{rows?.length ?? '…'} entries</span>
      </div>
      <div className="table-wrap">
        <table className="grid">
          <thead><tr><th className="nosort">Date</th><th className="nosort">Pupil</th><th className="nosort">Course</th><th className="nosort">Status</th><th className="nosort">Notes</th></tr></thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.date)}</td>
                <td>{r.pupil_label}</td>
                <td>{r.course_label || <span className="muted">whole day</span>}</td>
                <td><span className={`badge ${r.status}`}>{r.status}</span></td>
                <td>{r.notes}</td>
              </tr>
            ))}
            {rows?.length === 0 && <tr><td colSpan={5} className="muted">Nothing late or missed in this range 🎉</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

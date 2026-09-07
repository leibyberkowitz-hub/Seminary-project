import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate } from '../../shared/api.js';

export default function Home() {
  const [summary, setSummary] = useState(null);
  const [counts, setCounts] = useState([]);
  useEffect(() => {
    api('/dashboard/summary').then(setSummary).catch(() => {});
    api('/attendance-tools/daily-counts').then(setCounts).catch(() => {});
  }, []);

  const t = summary?.todayAttendance || {};
  return (
    <div>
      <div className="page-head"><h1>Attendance Overview</h1>
        <div className="actions"><Link to="/rollcall"><button className="btn">Take Roll Call</button></Link></div>
      </div>
      <div className="cards">
        <div className="stat"><div className="label">Active pupils</div><div className="value">{summary?.activePupils ?? '…'}</div></div>
        <div className="stat"><div className="label">Today attended</div><div className="value ok">{t.attended || 0}</div></div>
        <div className="stat"><div className="label">Today late</div><div className="value" style={{ color: '#d97706' }}>{t.late || 0}</div></div>
        <div className="stat"><div className="label">Today missed</div><div className="value bad">{t.missed || 0}</div></div>
        <div className="stat"><div className="label">Open tasks</div><div className="value">{summary?.openTasks ?? '…'}</div></div>
      </div>
      <div className="panel">
        <h3 style={{ margin: '0 0 10px' }}>Daily counts</h3>
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th className="nosort">Date</th><th className="nosort num">Attended</th><th className="nosort num">Late</th><th className="nosort num">Missed</th><th className="nosort num">Pending</th></tr></thead>
            <tbody>
              {counts.map((c) => (
                <tr key={c.date}>
                  <td>{fmtDate(c.date)}</td>
                  <td className="num">{c.attended}</td>
                  <td className="num">{c.late}</td>
                  <td className="num">{c.missed}</td>
                  <td className="num">{c.pending}</td>
                </tr>
              ))}
              {!counts.length && <tr><td colSpan={5} className="muted">No attendance recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { api, qs, todayIso, fmtDate } from '../../shared/api.js';
import { PageHead, RecordForm } from '../../shared/ui.jsx';

export const EVENT_COLORS = {
  General: '#0e7c66', Exam: '#c02638', Trip: '#14804a', Meeting: '#3a4db3',
  Holiday: '#8a5a12', Deadline: '#b3730a',
};
const eventFields = [
  { key: 'title', label: 'Title', full: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'end_date', label: 'End Date (multi-day)', type: 'date' },
  { key: 'all_day', label: 'All Day', type: 'checkbox' },
  { key: 'start_time', label: 'Start Time', type: 'time' },
  { key: 'end_time', label: 'End Time', type: 'time' },
  { key: 'event_type', label: 'Type', type: 'select', options: Object.keys(EVENT_COLORS) },
  { key: 'description', label: 'Description', type: 'textarea' },
];

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);

export default function Diary() {
  const [view, setView] = useState('month'); // day | week | month
  const [anchor, setAnchor] = useState(new Date());
  const [data, setData] = useState({ events: [], holidays: [], hebrewDates: {} });
  const [editing, setEditing] = useState(null);
  const [v, setV] = useState(0);

  const range = useMemo(() => {
    const a = new Date(anchor);
    if (view === 'day') return { from: a, to: a };
    if (view === 'week') {
      const start = addDays(a, -((a.getDay() + 7) % 7)); // week starts Sunday
      return { from: start, to: addDays(start, 6) };
    }
    const first = new Date(a.getFullYear(), a.getMonth(), 1);
    const start = addDays(first, -first.getDay());
    const last = new Date(a.getFullYear(), a.getMonth() + 1, 0);
    const end = addDays(last, 6 - last.getDay());
    return { from: start, to: end };
  }, [anchor, view]);

  useEffect(() => {
    api(`/calendar${qs({ from: iso(range.from), to: iso(range.to) })}`).then(setData).catch(() => {});
  }, [iso(range.from), iso(range.to), v]);

  const byDay = useMemo(() => {
    const m = {};
    for (const e of data.events) {
      const start = String(e.date).slice(0, 10);
      const end = e.end_date ? String(e.end_date).slice(0, 10) : start;
      for (let d = new Date(start); iso(d) <= end; d = addDays(d, 1)) {
        (m[iso(d)] = m[iso(d)] || []).push({ ...e, kind: 'event' });
      }
    }
    for (const h of data.holidays) {
      (m[h.date] = m[h.date] || []).push({ ...h, kind: 'holiday' });
    }
    return m;
  }, [data]);

  const days = useMemo(() => {
    const out = [];
    for (let d = new Date(range.from); d <= range.to; d = addDays(d, 1)) out.push(new Date(d));
    return out;
  }, [range]);

  const step = (n) => {
    if (view === 'day') setAnchor(addDays(anchor, n));
    else if (view === 'week') setAnchor(addDays(anchor, 7 * n));
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + n, 1));
  };

  const title = view === 'month'
    ? anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : view === 'week'
      ? `${fmtDate(range.from)} – ${fmtDate(range.to)}`
      : fmtDate(anchor);

  const renderCell = (d, big) => {
    const key = iso(d);
    const items = byDay[key] || [];
    const hd = data.hebrewDates[key];
    return (
      <div key={key}
        className={'cal-cell' + (view === 'month' && d.getMonth() !== anchor.getMonth() ? ' other' : '') + (key === todayIso() ? ' today' : '')}
        style={big ? { minHeight: 180 } : undefined}>
        <div className="dnum"><span>{d.getDate()}</span><span className="hdate"><bdi dir="rtl">{hd?.he}</bdi></span></div>
        {items.map((it, i) =>
          it.kind === 'holiday' ? (
            <div key={i} className="cal-ev holiday" title={it.hebrew}>🕎 {it.title}</div>
          ) : (
            <div key={i} className="cal-ev"
              style={{ background: it.color || EVENT_COLORS[it.event_type] || EVENT_COLORS.General }}
              title={it.description}
              onClick={() => setEditing(it)}>
              {!it.all_day && it.start_time ? it.start_time.slice(0, 5) + ' ' : ''}{it.title}
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHead title="Diary">
        <button className="btn" onClick={() => setEditing({})}>+ New Event</button>
      </PageHead>
      <div className="cal-head">
        <button className="btn secondary small" onClick={() => step(-1)}>‹</button>
        <button className="btn secondary small" onClick={() => setAnchor(new Date())}>Today</button>
        <button className="btn secondary small" onClick={() => step(1)}>›</button>
        <b style={{ fontSize: 16 }}>{title}</b>
        <span style={{ marginLeft: 'auto' }} />
        {['day', 'week', 'month'].map((m) => (
          <button key={m} className={`btn small ${view === m ? '' : 'secondary'}`} onClick={() => setView(m)}>{m}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10, fontSize: 12 }}>
        {Object.entries(EVENT_COLORS).map(([t, c]) => (
          <span key={t}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: c, marginRight: 4 }} />{t}</span>
        ))}
        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#fbeed6', border: '1px solid #b3730a', marginRight: 4 }} />Jewish holiday / parsha</span>
      </div>
      {view !== 'day' && (
        <div className="cal-grid" style={{ marginBottom: 6 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Shabbos'].map((d) => <div key={d} className="dow">{d}</div>)}
        </div>
      )}
      <div className="cal-grid" style={view === 'day' ? { gridTemplateColumns: '1fr' } : undefined}>
        {days.map((d) => renderCell(d, view !== 'month'))}
      </div>
      {editing && (
        <RecordForm entity="diary_events" title="Event" fields={eventFields}
          record={editing.id ? editing : { date: iso(anchor), all_day: true, event_type: 'General' }}
          onClose={() => setEditing(null)} onSaved={() => setV((x) => x + 1)} />
      )}
    </div>
  );
}

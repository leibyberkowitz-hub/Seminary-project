import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api, qs, login, logout, getUser, getToken, isAdmin, fmtMoney, fmtDate, downloadCsv, siteName } from './api.js';

// ---------------------------------------------------------------- auth gate

export function AuthGate({ appName, children }) {
  const [user, setUser] = useState(getUser());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (getToken() && user) return children;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { setUser(await login(email, password)); }
    catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={submit}>
        <h1>{appName || siteName()}</h1>
        <div className="sub">Sign in with your {siteName()} account</div>
        {err && <div className="err">{err}</div>}
        <label className="fld"><span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
        </label>
        <label className="fld"><span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn" disabled={busy} style={{ width: '100%' }}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- layout

export function Layout({ appName, accent, nav, children }) {
  const user = getUser();
  useEffect(() => {
    if (accent) document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="dot" style={{ background: accent }} /> {appName}</div>
        {nav.map((group) => (
          <React.Fragment key={group.title}>
            <div className="group-title">{group.title}</div>
            {group.items.map((it) => (
              <NavLink key={it.to} to={it.to} end={it.to === '/'}
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
                {it.label}
              </NavLink>
            ))}
          </React.Fragment>
        ))}
        <div className="spacer" />
        <div className="userbox">
          <span>{user?.name || user?.email} · {user?.role}</span>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export function PageHead({ title, children }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      <div className="actions">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- value rendering

const hebrewRe = /[֐-׿]/;
export function Val({ col, row }) {
  const v = row[col.key];
  const label = row[`${col.key}_label`];
  if (col.render) return col.render(row);
  if (col.ref) return label ?? (v ? `#${v}` : '');
  if (col.type === 'money') return <span>{fmtMoney(v)}</span>;
  if (col.type === 'date') return <span>{fmtDate(v)}</span>;
  if (col.type === 'bool') return v ? '✓' : '';
  if (col.type === 'badge') {
    const cls = String(v || '').toLowerCase().replace(/[^a-z]+/g, '-');
    return v ? <span className={`badge ${cls}`}>{v}</span> : '';
  }
  if (typeof v === 'string' && hebrewRe.test(v)) return <bdi dir="rtl">{v}</bdi>;
  return <span>{v === null || v === undefined ? '' : String(v)}</span>;
}

// ---------------------------------------------------------------- data table

// columns: [{key, label, type?, ref?, render?, sortable?}]
// filters: [{key, label, options:[{id,label}] | entity:'classes'}]
// groupOptions: [{key, label}]  — client-side grouping
export function DataTable({
  entity, columns, defaultSort, defaultDir = 'asc', filters = [], groupOptions = [],
  searchable = true, exportable = false, onRowClick, extraQuery = {}, refreshKey = 0,
  emptyText = 'No records found.',
}) {
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(defaultSort || columns[0]?.key);
  const [dir, setDir] = useState(defaultDir);
  const [filterVals, setFilterVals] = useState({});
  const [filterOpts, setFilterOpts] = useState({});
  const [groupBy, setGroupBy] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    filters.forEach((f) => {
      if (f.entity && !filterOpts[f.key]) {
        api(`/${f.entity}/options`).then((o) => setFilterOpts((prev) => ({ ...prev, [f.key]: o })));
      }
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      api(`/${entity}${qs({ q, sort, dir, ...filterVals, ...extraQuery })}`)
        .then((d) => { if (live) { setRows(d.rows); setTotal(d.total); setErr(''); } })
        .catch((e) => live && setErr(e.message));
    }, q ? 250 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [entity, q, sort, dir, JSON.stringify(filterVals), JSON.stringify(extraQuery), refreshKey]);

  const grouped = useMemo(() => {
    if (!rows) return null;
    if (!groupBy) return [{ key: null, rows }];
    const col = columns.find((c) => c.key === groupBy);
    const map = new Map();
    for (const r of rows) {
      const label = col?.ref ? (r[`${groupBy}_label`] || '—') : (r[groupBy] ?? '—') || '—';
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(r);
    }
    return [...map.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([key, rs]) => ({ key, rows: rs }));
  }, [rows, groupBy, columns]);

  const clickSort = (c) => {
    if (c.sortable === false || c.render) return;
    if (sort === c.key) setDir(dir === 'asc' ? 'desc' : 'asc');
    else { setSort(c.key); setDir('asc'); }
  };

  return (
    <div>
      <div className="toolbar">
        {searchable && (
          <input type="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        )}
        {filters.map((f) => (
          <select key={f.key} value={filterVals[f.key] || ''}
            onChange={(e) => setFilterVals({ ...filterVals, [f.key]: e.target.value })}>
            <option value="">{f.label}: all</option>
            {(f.options || filterOpts[f.key] || []).map((o) => (
              <option key={o.id ?? o} value={o.id ?? o}>{o.label ?? o}</option>
            ))}
          </select>
        ))}
        {groupOptions.length > 0 && (
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="">Group by: none</option>
            {groupOptions.map((g) => <option key={g.key} value={g.key}>Group by: {g.label}</option>)}
          </select>
        )}
        <span className="muted" style={{ marginLeft: 'auto' }}>{total} records</span>
        {exportable && (
          <button className="btn secondary small" onClick={() => downloadCsv(entity, filterVals)}>Export CSV</button>
        )}
      </div>
      {err && <div className="panel error-text">{err}</div>}
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={(c.type === 'money' ? 'num ' : '') + (c.render ? 'nosort' : '')}
                  onClick={() => clickSort(c)}>
                  {c.label}{sort === c.key ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === null && <tr><td colSpan={columns.length} className="muted">Loading…</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={columns.length} className="muted">{emptyText}</td></tr>}
            {grouped?.map((g) => (
              <React.Fragment key={g.key ?? '_all'}>
                {g.key !== null && (
                  <tr className="group-row"><td colSpan={columns.length}>{g.key} · {g.rows.length}</td></tr>
                )}
                {g.rows.map((r) => (
                  <tr key={r.id ?? r.key} className={onRowClick ? 'clickable' : ''}
                    onClick={() => onRowClick && onRowClick(r)}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.type === 'money' ? 'num' : ''}><Val col={c} row={r} /></td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- record form modal

// fields: [{key, label, type: 'text'|'number'|'money'|'date'|'time'|'checkbox'|'textarea'|'select'|'ref',
//           entity?, options?, full?, rtl?}]
export function RecordForm({ entity, title, fields, record, onClose, onSaved }) {
  const [vals, setVals] = useState(() => {
    const v = {};
    for (const f of fields) {
      let x = record?.[f.key];
      if (f.type === 'date' && x) x = String(x).slice(0, 10);
      v[f.key] = x ?? (f.type === 'checkbox' ? false : '');
    }
    return v;
  });
  const [opts, setOpts] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fields.forEach((f) => {
      if (f.type === 'ref' && f.entity) {
        api(`/${f.entity}/options`).then((o) => setOpts((prev) => ({ ...prev, [f.key]: o })));
      }
    });
  }, []); // eslint-disable-line

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body = { ...vals };
      for (const f of fields) {
        if (f.type === 'ref' && body[f.key] === '') body[f.key] = null;
        if ((f.type === 'number' || f.type === 'money') && body[f.key] === '') body[f.key] = 0;
      }
      const saved = record?.id
        ? await api(`/${entity}/${record.id}`, { method: 'PUT', body })
        : await api(`/${entity}`, { method: 'POST', body });
      onSaved?.(saved);
      onClose();
    } catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  };

  const set = (k, v) => setVals((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={save}>
        <h2>{record?.id ? `Edit ${title}` : `New ${title}`}</h2>
        {err && <div className="error-text" style={{ marginBottom: 10 }}>{err}</div>}
        <div className="fields">
          {fields.map((f) => (
            <label key={f.key} className={'fld' + (f.full || f.type === 'textarea' ? ' full' : '')}>
              <span>{f.label}</span>
              {f.type === 'textarea' ? (
                <textarea rows={3} value={vals[f.key]} dir={f.rtl ? 'rtl' : undefined}
                  onChange={(e) => set(f.key, e.target.value)} />
              ) : f.type === 'checkbox' ? (
                <input type="checkbox" checked={!!vals[f.key]} onChange={(e) => set(f.key, e.target.checked)} />
              ) : f.type === 'select' ? (
                <select value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                  {!f.options?.includes(vals[f.key]) && <option value="">—</option>}
                  {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'ref' ? (
                <select value={vals[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">—</option>
                  {(opts[f.key] || []).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type={f.type === 'money' || f.type === 'number' ? 'number' : f.type || 'text'}
                  step={f.type === 'money' ? '0.01' : undefined}
                  dir={f.rtl ? 'rtl' : undefined}
                  value={vals[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
            </label>
          ))}
        </div>
        <div className="foot">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- generic detail view

export function FieldView({ label, children }) {
  return (
    <div className="fld-view">
      <div className="k">{label}</div>
      <div className="v">{children ?? ''}</div>
    </div>
  );
}

export function ChildTable({ title, rows, columns, onRowClick }) {
  return (
    <div className="panel">
      <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>{title} <span className="muted">({rows?.length || 0})</span></h3>
      {!rows?.length ? <div className="muted">None</div> : (
        <div className="table-wrap">
          <table className="grid">
            <thead><tr>{columns.map((c) => <th key={c.key} className={'nosort' + (c.type === 'money' ? ' num' : '')}>{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={onRowClick ? 'clickable' : ''} onClick={() => onRowClick?.(r)}>
                  {columns.map((c) => <td key={c.key} className={c.type === 'money' ? 'num' : ''}><Val col={c} row={r} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function DeleteButton({ entity, id, onDeleted, label = 'Delete' }) {
  if (!isAdmin()) return null;
  return (
    <button className="btn danger small" onClick={async () => {
      if (!window.confirm('Delete this record? This cannot be undone.')) return;
      await api(`/${entity}/${id}`, { method: 'DELETE' });
      onDeleted?.();
    }}>{label}</button>
  );
}

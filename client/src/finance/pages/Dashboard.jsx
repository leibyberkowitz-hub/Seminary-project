import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { api, qs, fmtMoney, fmtDate } from '../../shared/api.js';
import { PageHead } from '../../shared/ui.jsx';

export default function Dashboard() {
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api(`/dashboard/report${qs({ from, to, category, type })}`).then(setData).catch((e) => setErr(e.message));
  }, [from, to, category, type]);

  const categories = [...new Set((data?.byCategory || []).map((c) => c.category).filter(Boolean))];
  const chartData = (data?.monthly || []).map((m) => ({
    ...m, income: Number(m.income), expense: Number(m.expense), net: Number(m.income) - Number(m.expense),
  }));

  return (
    <div>
      <PageHead title="Reports" />
      <div className="toolbar">
        <label className="muted">From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="muted">To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {err && <div className="panel error-text">{err}</div>}
      <div className="cards">
        <div className="stat"><div className="label">Income</div><div className="value ok">{fmtMoney(data?.totals?.income)}</div></div>
        <div className="stat"><div className="label">Expenses</div><div className="value bad">{fmtMoney(data?.totals?.expense)}</div></div>
        <div className="stat"><div className="label">Running total (net)</div>
          <div className={`value ${Number(data?.totals?.net) >= 0 ? 'ok' : 'bad'}`}>{fmtMoney(data?.totals?.net)}</div></div>
        <div className="stat"><div className="label">Transactions</div><div className="value">{data?.totals?.count ?? '…'}</div></div>
      </div>

      <div className="panel">
        <h3 style={{ margin: '0 0 10px' }}>Monthly income vs expenses</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <ComposedChart data={chartData}>
              <CartesianGrid stroke="#e7e3da" vertical={false} />
              <XAxis dataKey="month" fontSize={12} tickFormatter={(m) => { const [y, mo] = m.split("-"); return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+mo - 1] + " " + y.slice(2); }} />
              <YAxis fontSize={12} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmtMoney(v)} />
              <Legend />
              <Bar dataKey="income" fill="#14804a" name="Income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#d13a4a" name="Expense" radius={[4, 4, 0, 0]} />
              <Line dataKey="net" stroke="#3a4db3" name="Net" strokeWidth={2} dot />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 2fr', gap: 16 }}>
        <div className="panel" style={{ margin: 0 }}>
          <h3 style={{ margin: '0 0 10px' }}>By category</h3>
          <table className="grid">
            <thead><tr><th className="nosort">Category</th><th className="nosort">Type</th><th className="nosort num">Net</th></tr></thead>
            <tbody>
              {(data?.byCategory || []).map((c, i) => (
                <tr key={i}><td>{c.category || '—'}</td><td>{c.type}</td>
                  <td className="num" style={{ color: Number(c.net) >= 0 ? '#14804a' : '#c02638' }}>{fmtMoney(c.net)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel" style={{ margin: 0 }}>
          <h3 style={{ margin: '0 0 10px' }}>Transaction feed</h3>
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="grid">
              <thead><tr><th className="nosort">Date</th><th className="nosort">Description</th><th className="nosort">Name</th><th className="nosort">Category</th><th className="nosort num">In</th><th className="nosort num">Out</th></tr></thead>
              <tbody>
                {(data?.feed || []).map((t) => (
                  <tr key={t.id}>
                    <td>{fmtDate(t.date)}</td>
                    <td>{t.description || t.full_description}</td>
                    <td>{t.name || t.staff_id_label || t.supplier_id_label}</td>
                    <td>{t.category}</td>
                    <td className="num" style={{ color: '#14804a' }}>{Number(t.amount_in) ? fmtMoney(t.amount_in) : ''}</td>
                    <td className="num" style={{ color: '#c02638' }}>{Number(t.amount_out) ? fmtMoney(t.amount_out) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

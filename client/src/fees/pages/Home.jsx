import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtMoney } from '../../shared/api.js';

export default function Home() {
  const [pupils, setPupils] = useState(null);
  const [fees, setFees] = useState(null);

  useEffect(() => {
    api('/pupils?active=true&limit=2000').then((d) => setPupils(d.rows)).catch(() => setPupils([]));
    api('/pupil_fees?limit=2000').then((d) => setFees(d.rows)).catch(() => setFees([]));
  }, []);

  const sum = (rows, key) => rows?.reduce((s, r) => s + Number(r[key] || 0), 0) ?? 0;
  const unpaid = fees?.filter((f) => !f.paid) ?? [];

  return (
    <div>
      <div className="page-head"><h1>Fees Overview</h1>
        <div className="actions"><Link to="/charges"><button className="btn">Manage Charges</button></Link></div>
      </div>
      <div className="cards">
        <div className="stat"><div className="label">Active pupils</div><div className="value">{pupils?.length ?? '…'}</div></div>
        <div className="stat"><div className="label">Full tuition (total)</div><div className="value">{fmtMoney(sum(pupils, 'full_tuition'))}</div></div>
        <div className="stat"><div className="label">Discounts given</div><div className="value" style={{ color: '#d97706' }}>{fmtMoney(sum(pupils, 'discount'))}</div></div>
        <div className="stat"><div className="label">Net tuition (total)</div><div className="value ok">{fmtMoney(sum(pupils, 'net_tuition'))}</div></div>
        <div className="stat"><div className="label">Unpaid charges</div><div className="value bad">{unpaid.length} · {fmtMoney(sum(unpaid, 'amount'))}</div></div>
      </div>
      <div className="panel">
        <p>
          This portal manages the money side of pupils: annual tuition with per-family discounts
          (net tuition is computed automatically), one-off fee charges (trips, books, dinners…),
          and per-family statements. It shares its database with the Attendance and Finance portals —
          pupils created there appear here immediately.
        </p>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { api, fmtMoney, fmtDate } from '../../shared/api.js';
import { PageHead } from '../../shared/ui.jsx';

export default function QuickBooksImport() {
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setPreview(null); setResult(null); setErr('');
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result));
    reader.readAsText(file);
  };

  const doPreview = async () => {
    setBusy(true); setErr(''); setResult(null);
    try { setPreview(await api('/import/quickbooks/preview', { method: 'POST', body: { csv, dateFormat } })); }
    catch (e) { setErr(e.message); setPreview(null); }
    finally { setBusy(false); }
  };

  const doImport = async () => {
    setBusy(true); setErr('');
    try { setResult(await api('/import/quickbooks', { method: 'POST', body: { csv, dateFormat } })); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHead title="QuickBooks Import" />
      <div className="panel">
        <p style={{ marginTop: 0 }}>
          Export a report from QuickBooks as <b>CSV</b> (e.g. <i>Transaction List by Date</i>, a bank register,
          or any report with Date, Name, Memo and Amount or Debit/Credit columns), then upload it here.
          The importer skips the report title rows automatically, understands amounts like <code>(650.00)</code> and{' '}
          <code>1,250.00</code>, and never imports the same row twice — re-running an overlapping report is safe.
        </p>
        <div className="toolbar">
          <input type="file" accept=".csv,text/csv" onChange={onFile} />
          <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
            <option value="DD/MM/YYYY">Dates are DD/MM/YYYY (UK)</option>
            <option value="MM/DD/YYYY">Dates are MM/DD/YYYY (US)</option>
          </select>
          <button className="btn" onClick={doPreview} disabled={!csv || busy}>Preview</button>
        </div>
        {fileName && <div className="muted">Loaded: {fileName} ({csv.length.toLocaleString()} chars)</div>}
      </div>

      {err && <div className="panel error-text">{err}</div>}

      {preview && (
        <>
          <div className="cards">
            <div className="stat"><div className="label">Rows recognised</div><div className="value">{preview.count}</div></div>
            <div className="stat"><div className="label">Income total</div><div className="value ok">{fmtMoney(preview.totals.income)}</div></div>
            <div className="stat"><div className="label">Expense total</div><div className="value bad">{fmtMoney(preview.totals.expense)}</div></div>
            <div className="stat"><div className="label">Rows skipped</div><div className="value">{preview.skipped.length}</div></div>
          </div>
          <div className="panel">
            <div className="page-head" style={{ marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Preview (first {preview.sample.length} rows)</h3>
              <button className="btn" onClick={doImport} disabled={busy || !preview.count}>
                {busy ? 'Importing…' : `Import ${preview.count} transactions`}
              </button>
            </div>
            <div className="table-wrap">
              <table className="grid">
                <thead><tr><th className="nosort">Date</th><th className="nosort">Type</th><th className="nosort">Category (Account)</th><th className="nosort">Name</th><th className="nosort">Description</th><th className="nosort num">In</th><th className="nosort num">Out</th></tr></thead>
                <tbody>
                  {preview.sample.map((t, i) => (
                    <tr key={i}>
                      <td>{fmtDate(t.date)}</td>
                      <td><span className={`badge ${t.type === 'income' ? 'ok' : 'bad'}`}>{t.type}</span></td>
                      <td>{t.category}</td><td>{t.name}</td><td>{t.description}</td>
                      <td className="num">{t.amount_in ? fmtMoney(t.amount_in) : ''}</td>
                      <td className="num">{t.amount_out ? fmtMoney(t.amount_out) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.skipped.length > 0 && (
              <details style={{ marginTop: 10 }}>
                <summary className="muted">{preview.skipped.length} rows skipped (no valid date/amount)</summary>
                {preview.skipped.map((s) => <div key={s.line} className="muted">line {s.line}: {s.raw}</div>)}
              </details>
            )}
          </div>
        </>
      )}

      {result && (
        <div className="panel" style={{ borderColor: '#059669' }}>
          ✅ Imported <b>{result.inserted}</b> new transactions
          {result.duplicates > 0 && <>, skipped <b>{result.duplicates}</b> already-imported duplicates</>}
          {result.skipped > 0 && <>, {result.skipped} unreadable rows</>}.
          {' '}See them in <a href="#/transactions">Transactions</a> (source = quickbooks) and the <a href="#/">Dashboard</a>.
        </div>
      )}
    </div>
  );
}

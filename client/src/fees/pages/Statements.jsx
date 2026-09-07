import React, { useEffect, useState } from 'react';
import { api, fmtMoney, fmtDate } from '../../shared/api.js';
import { PageHead, ChildTable } from '../../shared/ui.jsx';

export default function Statements() {
  const [contacts, setContacts] = useState([]);
  const [contactId, setContactId] = useState('');
  const [contact, setContact] = useState(null);
  const [fees, setFees] = useState([]);

  useEffect(() => { api('/contacts/options').then(setContacts); }, []);
  useEffect(() => {
    if (!contactId) { setContact(null); return; }
    api(`/contacts/${contactId}`).then(async (c) => {
      setContact(c);
      const pupilIds = (c._children?.pupils || []).map((p) => p.id);
      const all = [];
      for (const pid of pupilIds) {
        const d = await api(`/pupil_fees?pupil_id=${pid}&limit=500`);
        all.push(...d.rows);
      }
      setFees(all.sort((a, b) => (a.date < b.date ? 1 : -1)));
    });
  }, [contactId]);

  const pupils = contact?._children?.pupils || [];
  const totalNet = pupils.reduce((s, p) => s + Number(p.net_tuition || 0), 0);
  const unpaidFees = fees.filter((f) => !f.paid).reduce((s, f) => s + Number(f.amount || 0), 0);

  return (
    <div>
      <PageHead title="Family Statements" />
      <div className="toolbar">
        <select value={contactId} onChange={(e) => setContactId(e.target.value)} style={{ minWidth: 260 }}>
          <option value="">Choose a family / contact…</option>
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      {contact && (
        <>
          <div className="cards">
            <div className="stat"><div className="label">SCL (tuition) balance</div>
              <div className={`value ${Number(contact.scl_balance) < 0 ? 'bad' : 'ok'}`}>{fmtMoney(contact.scl_balance)}</div></div>
            <div className="stat"><div className="label">Donor balance</div><div className="value">{fmtMoney(contact.donor_balance)}</div></div>
            <div className="stat"><div className="label">Pupils</div><div className="value">{pupils.length}</div></div>
            <div className="stat"><div className="label">Annual net tuition</div><div className="value">{fmtMoney(totalNet)}</div></div>
            <div className="stat"><div className="label">Unpaid charges</div><div className="value bad">{fmtMoney(unpaidFees)}</div></div>
          </div>
          <div className="panel">
            <b>{contact.title} {contact.first_name} {contact.surname}</b>
            {contact.yiddish_name && <> · <bdi dir="rtl">{contact.yiddish_name}</bdi></>}
            <div className="muted" style={{ marginTop: 4 }}>
              {contact.home_number && <>Home: <a href={`tel:${contact.home_number}`}>{contact.home_number}</a> · </>}
              {contact.father_phone && <>Father: <a href={`tel:${contact.father_phone}`}>{contact.father_phone}</a> · </>}
              {contact.mother_phone && <>Mother: <a href={`tel:${contact.mother_phone}`}>{contact.mother_phone}</a></>}
            </div>
          </div>
          <ChildTable title="Pupils" rows={pupils} columns={[
            { key: 'pupil_code', label: 'ID' },
            { key: 'first_name', label: 'First Name' },
            { key: 'surname', label: 'Surname' },
            { key: 'full_tuition', label: 'Full Tuition', type: 'money' },
            { key: 'discount', label: 'Discount', type: 'money' },
            { key: 'net_tuition', label: 'Net Tuition', type: 'money' },
          ]} />
          <div className="panel">
            <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Fee charges ({fees.length})</h3>
            <div className="table-wrap">
              <table className="grid">
                <thead><tr><th className="nosort">Date</th><th className="nosort">Pupil</th><th className="nosort">Category</th><th className="nosort">Description</th><th className="nosort num">Amount</th><th className="nosort">Paid</th></tr></thead>
                <tbody>
                  {fees.map((f) => (
                    <tr key={f.id}>
                      <td>{fmtDate(f.date)}</td>
                      <td>{pupils.find((p) => p.id === f.pupil_id)?.first_name} {pupils.find((p) => p.id === f.pupil_id)?.surname}</td>
                      <td>{f.category}</td><td>{f.description}</td>
                      <td className="num">{fmtMoney(f.amount)}</td>
                      <td>{f.paid ? <span className="badge paid">Paid</span> : <span className="badge bad">Unpaid</span>}</td>
                    </tr>
                  ))}
                  {!fees.length && <tr><td colSpan={6} className="muted">No charges.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

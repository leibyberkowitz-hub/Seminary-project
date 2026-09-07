import React, { useEffect, useState } from 'react';
import { api } from '../../shared/api.js';
import { DataTable, PageHead, RecordForm, ChildTable, FieldView } from '../../shared/ui.jsx';
import { fmtMoney } from '../../shared/api.js';

const staffFields = [
  { key: 'name', label: 'Name' },
  { key: 'department', label: 'Department' },
  { key: 'class', label: 'Class' },
  { key: 'subject', label: 'Subject' },
  { key: 'type', label: 'Type', type: 'select', options: ['Monthly', 'Supply', 'Hourly', 'Contract'] },
  { key: 'term', label: 'Term' },
  { key: 'payment_method', label: 'Payment Method', type: 'select', options: ['Bank Transfer', 'Cheque', 'Cash'] },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  { key: 'babysitting', label: 'Babysitting', type: 'checkbox' },
  { key: 'balance', label: 'Balance', type: 'money' },
  { key: 'lessons_rate', label: 'Lessons Rate', type: 'money' },
  { key: 'window_rate', label: 'Window Rate', type: 'money' },
  { key: 'other_rate', label: 'Other Rate', type: 'money' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Staff() {
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (selected) api(`/staff/${selected.id}`).then(setDetail).catch(() => {});
    else setDetail(null);
  }, [selected, refreshKey]);

  const unpaidLessons = (detail?._children?.lessons || []).reduce((s, l) => s + Number(l.amount || 0), 0);

  return (
    <div>
      <PageHead title="Staff">
        <button className="btn" onClick={() => setEditing({})}>+ New Staff</button>
      </PageHead>
      <DataTable
        entity="staff" refreshKey={refreshKey} defaultSort="name" exportable
        onRowClick={setSelected}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'department', label: 'Department' },
          { key: 'subject', label: 'Subject' },
          { key: 'type', label: 'Type' },
          { key: 'payment_method', label: 'Payment' },
          { key: 'lessons_rate', label: 'Lessons Rate', type: 'money' },
          { key: 'balance', label: 'Balance', type: 'money' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'babysitting', label: 'Babysitting', type: 'bool' },
        ]}
        filters={[
          { key: 'status', label: 'Status', options: ['Active', 'Inactive'] },
          { key: 'type', label: 'Type', options: ['Monthly', 'Supply', 'Hourly', 'Contract'] },
        ]}
        groupOptions={[{ key: 'department', label: 'Department' }, { key: 'type', label: 'Type' }]}
      />
      {detail && (
        <>
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="page-head" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>{detail.name}</h2>
              <div className="actions">
                <button className="btn secondary small" onClick={() => setEditing(detail)}>Edit</button>
                <button className="btn secondary small" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
            <div className="detail-grid">
              <FieldView label="Running Balance"><b>{fmtMoney(detail.balance)}</b></FieldView>
              <FieldView label="Lessons logged (value)">{fmtMoney(unpaidLessons)}</FieldView>
              <FieldView label="Rates">
                Lessons {fmtMoney(detail.lessons_rate)} · Window {fmtMoney(detail.window_rate)} · Other {fmtMoney(detail.other_rate)}
              </FieldView>
            </div>
          </div>
          <ChildTable title="Lessons given" rows={detail._children?.lessons} columns={[
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'course_id', label: 'Course', ref: true },
            { key: 'type', label: 'Type' },
            { key: 'quantity', label: 'Qty' },
            { key: 'rate', label: 'Rate', type: 'money' },
            { key: 'amount', label: 'Amount', type: 'money' },
          ]} />
          <ChildTable title="Courses assigned" rows={detail._children?.courses} columns={[
            { key: 'name', label: 'Course' },
            { key: 'subject', label: 'Subject' },
            { key: 'semester', label: 'Semester' },
          ]} />
          <ChildTable title="Payments (transactions)" rows={detail._children?.transactions} columns={[
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'description', label: 'Description' },
            { key: 'amount_out', label: 'Paid', type: 'money' },
          ]} />
        </>
      )}
      {editing && (
        <RecordForm entity="staff" title="Staff Member" fields={staffFields}
          record={editing.id ? editing : null}
          onClose={() => setEditing(null)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}

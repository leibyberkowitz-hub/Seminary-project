import React, { useState } from 'react';
import { api } from '../../shared/api.js';
import { DataTable, PageHead, RecordForm } from '../../shared/ui.jsx';

const feeFields = [
  { key: 'pupil_id', label: 'Pupil', type: 'ref', entity: 'pupils' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'category', label: 'Category', type: 'select', options: ['Tuition', 'Trip', 'Books', 'Dinner', 'Registration', 'Other'] },
  { key: 'description', label: 'Description', full: true },
  { key: 'amount', label: 'Amount', type: 'money' },
  { key: 'paid', label: 'Paid', type: 'checkbox' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function PupilFees() {
  const [editing, setEditing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const togglePaid = async (r) => {
    await api(`/pupil_fees/${r.id}`, { method: 'PUT', body: { paid: !r.paid } });
    setRefreshKey((k) => k + 1);
  };

  return (
    <div>
      <PageHead title="Fee Charges">
        <button className="btn" onClick={() => setEditing({})}>+ New Charge</button>
      </PageHead>
      <DataTable
        entity="pupil_fees" refreshKey={refreshKey} defaultSort="date" defaultDir="desc"
        onRowClick={(r) => setEditing(r)}
        columns={[
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'pupil_id', label: 'Pupil', ref: true },
          { key: 'category', label: 'Category' },
          { key: 'description', label: 'Description' },
          { key: 'amount', label: 'Amount', type: 'money' },
          {
            key: 'paid', label: 'Paid', sortable: false,
            render: (r) => (
              <button className={`btn small ${r.paid ? '' : 'secondary'}`}
                style={r.paid ? { background: '#059669' } : {}}
                onClick={(e) => { e.stopPropagation(); togglePaid(r); }}>
                {r.paid ? 'Paid ✓' : 'Mark paid'}
              </button>
            ),
          },
        ]}
        filters={[
          { key: 'pupil_id', label: 'Pupil', entity: 'pupils' },
          { key: 'paid', label: 'Paid', options: [{ id: 'true', label: 'Paid' }, { id: 'false', label: 'Unpaid' }] },
        ]}
        groupOptions={[{ key: 'pupil_id', label: 'Pupil' }, { key: 'category', label: 'Category' }]}
      />
      {editing && (
        <RecordForm entity="pupil_fees" title="Fee Charge" fields={feeFields}
          record={editing.id ? editing : null}
          onClose={() => setEditing(null)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}

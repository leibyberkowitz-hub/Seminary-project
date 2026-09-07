import React, { useState } from 'react';
import { DataTable, PageHead, RecordForm } from '../../shared/ui.jsx';

const tuitionFields = [
  { key: 'full_tuition', label: 'Full Tuition', type: 'money' },
  { key: 'discount', label: 'Discount', type: 'money' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Tuition() {
  const [editing, setEditing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <PageHead title="Tuition & Discounts" />
      <DataTable
        entity="pupils" refreshKey={refreshKey} defaultSort="surname" exportable
        extraQuery={{ active: 'true' }}
        onRowClick={(r) => setEditing(r)}
        columns={[
          { key: 'pupil_code', label: 'ID' },
          { key: 'surname', label: 'Surname' },
          { key: 'first_name', label: 'First Name' },
          { key: 'class_id', label: 'Class', ref: true },
          { key: 'contact_id', label: 'Family', ref: true },
          { key: 'full_tuition', label: 'Full Tuition', type: 'money' },
          { key: 'discount', label: 'Discount', type: 'money' },
          { key: 'net_tuition', label: 'Net Tuition', type: 'money' },
        ]}
        filters={[{ key: 'class_id', label: 'Class', entity: 'classes' }]}
        groupOptions={[{ key: 'class_id', label: 'Class' }, { key: 'contact_id', label: 'Family' }]}
      />
      <p className="muted">Click a pupil to adjust their tuition or discount. Net tuition is calculated automatically.</p>
      {editing && (
        <RecordForm entity="pupils" title={`Tuition — ${editing.first_name} ${editing.surname}`}
          fields={tuitionFields} record={editing}
          onClose={() => setEditing(null)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}

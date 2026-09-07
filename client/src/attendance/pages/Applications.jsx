import React, { useState } from 'react';
import { api } from '../../shared/api.js';
import { DataTable, PageHead, RecordForm } from '../../shared/ui.jsx';

const appFields = [
  { key: 'first_name', label: 'First Name' },
  { key: 'surname', label: 'Surname' },
  { key: 'yiddish_name', label: 'Yiddish Name', rtl: true },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
  { key: 'contact_phone', label: 'Contact Phone' },
  { key: 'previous_school', label: 'Previous School' },
  { key: 'school_year_id', label: 'School Year', type: 'ref', entity: 'school_years' },
  { key: 'applied_on', label: 'Applied On', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Accepted', 'Rejected', 'Withdrawn'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Applications() {
  const [editing, setEditing] = useState(null); // null | {} | record
  const [refreshKey, setRefreshKey] = useState(0);

  // Accepting an application creates the pupil record automatically.
  const accept = async (r) => {
    if (!window.confirm(`Accept ${r.first_name} ${r.surname} and create a pupil record?`)) return;
    await api('/pupils', {
      method: 'POST',
      body: {
        first_name: r.first_name, surname: r.surname, yiddish_name: r.yiddish_name,
        date_of_birth: r.date_of_birth ? String(r.date_of_birth).slice(0, 10) : null,
        home_phone: r.contact_phone, previous_school: r.previous_school,
        school_year_id: r.school_year_id, active: true,
      },
    });
    await api(`/applications/${r.id}`, { method: 'PUT', body: { status: 'Accepted' } });
    setRefreshKey((k) => k + 1);
  };

  return (
    <div>
      <PageHead title="Applications">
        <button className="btn" onClick={() => setEditing({})}>+ New Application</button>
      </PageHead>
      <DataTable
        entity="applications" refreshKey={refreshKey} defaultSort="applied_on" defaultDir="desc"
        onRowClick={(r) => setEditing(r)}
        columns={[
          { key: 'surname', label: 'Surname' },
          { key: 'first_name', label: 'First Name' },
          { key: 'yiddish_name', label: 'Yiddish Name' },
          { key: 'date_of_birth', label: 'DOB', type: 'date' },
          { key: 'previous_school', label: 'Previous School' },
          { key: 'applied_on', label: 'Applied', type: 'date' },
          { key: 'status', label: 'Status', type: 'badge' },
          {
            key: '_accept', label: '', sortable: false,
            render: (r) => r.status === 'Pending'
              ? <button className="btn small" onClick={(e) => { e.stopPropagation(); accept(r); }}>Accept → Pupil</button>
              : null,
          },
        ]}
        filters={[{ key: 'status', label: 'Status', options: ['Pending', 'Accepted', 'Rejected', 'Withdrawn'] }]}
        groupOptions={[{ key: 'status', label: 'Status' }]}
      />
      {editing && (
        <RecordForm entity="applications" title="Application" fields={appFields}
          record={editing.id ? editing : null}
          onClose={() => setEditing(null)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}

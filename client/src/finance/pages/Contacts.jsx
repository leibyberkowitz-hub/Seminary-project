import React, { useState } from 'react';
import { DataTable, PageHead, RecordForm } from '../../shared/ui.jsx';

const contactFields = [
  { key: 'title', label: 'Title', type: 'select', options: ['Rabbi', 'Mr', 'Mrs', 'Ms', 'Dr'] },
  { key: 'first_name', label: 'First Name' },
  { key: 'surname', label: 'Surname' },
  { key: 'english_name', label: 'English Name' },
  { key: 'yiddish_name', label: 'Yiddish Name', rtl: true },
  { key: 'home_number', label: 'Home Number' },
  { key: 'father_phone', label: 'Father Phone' },
  { key: 'mother_phone', label: 'Mother Phone' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address', full: true },
  { key: 'old_id', label: 'Old ID' },
  { key: 'is_donor', label: 'Donor', type: 'checkbox' },
  { key: 'scl_balance', label: 'SCL (Tuition) Balance', type: 'money' },
  { key: 'donor_balance', label: 'Donor Balance', type: 'money' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Contacts() {
  const [editing, setEditing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <PageHead title="Contacts (Parents & Donors)">
        <button className="btn" onClick={() => setEditing({})}>+ New Contact</button>
      </PageHead>
      <DataTable
        entity="contacts" refreshKey={refreshKey} defaultSort="surname" exportable
        onRowClick={(r) => setEditing(r)}
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'surname', label: 'Surname' },
          { key: 'first_name', label: 'First Name' },
          { key: 'yiddish_name', label: 'Yiddish Name' },
          {
            key: 'home_number', label: 'Home', sortable: false,
            render: (r) => r.home_number && (
              <span onClick={(e) => e.stopPropagation()}>
                <a href={`tel:${r.home_number}`}>{r.home_number}</a>{' '}
                <a href={`sms:${r.home_number}`} title="Text">✉</a>
              </span>
            ),
          },
          { key: 'scl_balance', label: 'SCL Balance', type: 'money' },
          { key: 'donor_balance', label: 'Donor Balance', type: 'money' },
          { key: 'is_donor', label: 'Donor', type: 'bool' },
        ]}
        filters={[{ key: 'is_donor', label: 'Donor', options: [{ id: 'true', label: 'Donors' }, { id: 'false', label: 'Non-donors' }] }]}
      />
      {editing && (
        <RecordForm entity="contacts" title="Contact" fields={contactFields}
          record={editing.id ? editing : null}
          onClose={() => setEditing(null)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}

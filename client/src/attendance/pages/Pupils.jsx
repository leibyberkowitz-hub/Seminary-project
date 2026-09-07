import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, PageHead, RecordForm } from '../../shared/ui.jsx';

export const pupilFields = [
  { key: 'first_name', label: 'First Name' },
  { key: 'surname', label: 'Surname' },
  { key: 'hebrew_name', label: 'Hebrew Name', rtl: true },
  { key: 'yiddish_name', label: 'Yiddish Name', rtl: true },
  { key: 'pupil_code', label: 'Pupil ID' },
  { key: 'old_id', label: 'Old ID' },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
  { key: 'hebrew_birthday', label: 'Hebrew Birthday', rtl: true },
  { key: 'address', label: 'Address', full: true },
  { key: 'father_phone', label: 'Father Phone' },
  { key: 'mother_phone', label: 'Mother Phone' },
  { key: 'home_phone', label: 'Home Phone' },
  { key: 'contact_id', label: 'Parent Contact', type: 'ref', entity: 'contacts' },
  { key: 'group_id', label: 'Group', type: 'ref', entity: 'groups' },
  { key: 'school_year_id', label: 'School Year', type: 'ref', entity: 'school_years' },
  { key: 'class_id', label: 'Class / Parallel', type: 'ref', entity: 'classes' },
  { key: 'previous_school', label: 'Previous School' },
  { key: 'full_tuition', label: 'Full Tuition', type: 'money' },
  { key: 'discount', label: 'Discount', type: 'money' },
  { key: 'active', label: 'Active', type: 'checkbox' },
  { key: 'graduate', label: 'Graduate', type: 'checkbox' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Pupils() {
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <PageHead title="Pupils">
        <button className="btn" onClick={() => setCreating(true)}>+ New Pupil</button>
      </PageHead>
      <DataTable
        entity="pupils"
        refreshKey={refreshKey}
        defaultSort="surname"
        exportable
        onRowClick={(r) => nav(`/pupils/${r.id}`)}
        columns={[
          { key: 'pupil_code', label: 'ID' },
          { key: 'surname', label: 'Surname' },
          { key: 'first_name', label: 'First Name' },
          { key: 'yiddish_name', label: 'Yiddish Name' },
          { key: 'class_id', label: 'Class', ref: true },
          { key: 'group_id', label: 'Group', ref: true },
          { key: 'school_year_id', label: 'Year', ref: true },
          { key: 'net_tuition', label: 'Net Tuition', type: 'money' },
          { key: 'active', label: 'Active', type: 'bool' },
        ]}
        filters={[
          { key: 'class_id', label: 'Class', entity: 'classes' },
          { key: 'group_id', label: 'Group', entity: 'groups' },
          { key: 'school_year_id', label: 'Year', entity: 'school_years' },
          { key: 'active', label: 'Active', options: [{ id: 'true', label: 'Active' }, { id: 'false', label: 'Inactive' }] },
        ]}
        groupOptions={[
          { key: 'class_id', label: 'Class' },
          { key: 'group_id', label: 'Group' },
          { key: 'school_year_id', label: 'School Year' },
        ]}
      />
      {creating && (
        <RecordForm entity="pupils" title="Pupil" fields={pupilFields}
          onClose={() => setCreating(false)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}

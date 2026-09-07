import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, PageHead, RecordForm } from '../../shared/ui.jsx';

export const courseFields = [
  { key: 'name', label: 'Course Name' },
  { key: 'category', label: 'Category' },
  { key: 'subject', label: 'Subject' },
  { key: 'start_time', label: 'Start Time', type: 'time' },
  { key: 'end_time', label: 'End Time', type: 'time' },
  { key: 'staff_id', label: 'Assigned To', type: 'ref', entity: 'staff' },
  { key: 'class_id', label: 'Class', type: 'ref', entity: 'classes' },
  { key: 'semester', label: 'Semester', type: 'select', options: ['Winter', 'Summer', 'Full Year'] },
  { key: 'semester_contribution', label: 'Semester Contribution', type: 'money' },
  { key: 'fee_per_attendee', label: 'Fee Per Attendee', type: 'money' },
  { key: 'projected_expenses', label: 'Projected Expenses', type: 'money' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Courses() {
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <PageHead title="Courses">
        <button className="btn" onClick={() => setCreating(true)}>+ New Course</button>
      </PageHead>
      <DataTable
        entity="courses"
        refreshKey={refreshKey}
        defaultSort="name"
        exportable
        onRowClick={(r) => nav(`/courses/${r.id}`)}
        columns={[
          { key: 'name', label: 'Course' },
          { key: 'category', label: 'Category' },
          { key: 'subject', label: 'Subject' },
          { key: 'start_time', label: 'Start' },
          { key: 'end_time', label: 'End' },
          { key: 'staff_id', label: 'Assigned To', ref: true },
          { key: 'class_id', label: 'Class', ref: true },
          { key: 'semester', label: 'Semester' },
          { key: 'fee_per_attendee', label: 'Fee/Attendee', type: 'money' },
        ]}
        filters={[
          { key: 'staff_id', label: 'Staff', entity: 'staff' },
          { key: 'class_id', label: 'Class', entity: 'classes' },
          { key: 'semester', label: 'Semester', options: ['Winter', 'Summer', 'Full Year'] },
        ]}
        groupOptions={[
          { key: 'semester', label: 'Semester' },
          { key: 'category', label: 'Category' },
          { key: 'class_id', label: 'Class' },
          { key: 'staff_id', label: 'Staff' },
        ]}
      />
      {creating && (
        <RecordForm entity="courses" title="Course" fields={courseFields}
          onClose={() => setCreating(false)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}

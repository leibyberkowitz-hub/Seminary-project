import React, { useState } from 'react';
import { api, todayIso } from '../../shared/api.js';
import { DataTable, PageHead, RecordForm } from '../../shared/ui.jsx';

const taskFields = [
  { key: 'title', label: 'Task', full: true },
  { key: 'task_code', label: 'Task ID' },
  { key: 'category', label: 'Category' },
  { key: 'staff_id', label: 'Assigned To', type: 'ref', entity: 'staff' },
  { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Overdue', 'Done'] },
  { key: 'due_date', label: 'Due Date', type: 'date' },
  { key: 'completed_date', label: 'Completed', type: 'date' },
  { key: 'recurring', label: 'Recurring', type: 'checkbox' },
  { key: 'recur_days', label: 'Repeat every (days)', type: 'number' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Tasks() {
  const [editing, setEditing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Completing a recurring task spawns the next occurrence.
  const complete = async (r) => {
    await api(`/tasks/${r.id}`, { method: 'PUT', body: { status: 'Done', completed_date: todayIso() } });
    if (r.recurring && r.recur_days > 0) {
      const base = r.due_date ? new Date(r.due_date) : new Date();
      const next = new Date(Math.max(base.getTime(), Date.now()) + r.recur_days * 864e5);
      await api('/tasks', {
        method: 'POST',
        body: {
          title: r.title, task_code: r.task_code, category: r.category, description: r.description,
          staff_id: r.staff_id, status: 'Open', due_date: next.toISOString().slice(0, 10),
          recurring: true, recur_days: r.recur_days, notes: r.notes,
        },
      });
    }
    setRefreshKey((k) => k + 1);
  };

  return (
    <div>
      <PageHead title="Tasks">
        <button className="btn" onClick={() => setEditing({})}>+ New Task</button>
      </PageHead>
      <DataTable
        entity="tasks" refreshKey={refreshKey} defaultSort="due_date"
        onRowClick={(r) => setEditing(r)}
        columns={[
          { key: 'task_code', label: 'ID' },
          { key: 'title', label: 'Task' },
          { key: 'category', label: 'Category' },
          { key: 'staff_id', label: 'Assigned To', ref: true },
          { key: 'created_date', label: 'Created', type: 'date' },
          { key: 'due_date', label: 'Due', type: 'date' },
          { key: 'status', label: 'Status', type: 'badge' },
          { key: 'recurring', label: 'Recurring', type: 'bool' },
          {
            key: '_done', label: '', sortable: false,
            render: (r) => r.status !== 'Done'
              ? <button className="btn small" onClick={(e) => { e.stopPropagation(); complete(r); }}>Mark done</button>
              : null,
          },
        ]}
        filters={[
          { key: 'status', label: 'Status', options: ['Open', 'Overdue', 'Done'] },
          { key: 'staff_id', label: 'Assigned', entity: 'staff' },
        ]}
        groupOptions={[{ key: 'status', label: 'Status' }, { key: 'category', label: 'Category' }]}
      />
      {editing && (
        <RecordForm entity="tasks" title="Task" fields={taskFields}
          record={editing.id ? editing : null}
          onClose={() => setEditing(null)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}

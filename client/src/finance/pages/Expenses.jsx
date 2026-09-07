import React, { useState } from 'react';
import { DataTable, PageHead, RecordForm } from '../../shared/ui.jsx';

const expenseFields = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'description', label: 'Description', full: true },
  { key: 'category', label: 'Category' },
  { key: 'supplier_id', label: 'Supplier', type: 'ref', entity: 'suppliers' },
  { key: 'amount', label: 'Amount', type: 'money' },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Approved', 'Paid'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];
const allocationFields = [
  { key: 'expense_id', label: 'Expense', type: 'ref', entity: 'expenses' },
  { key: 'course_id', label: 'Course', type: 'ref', entity: 'courses' },
  { key: 'department', label: 'Department' },
  { key: 'amount', label: 'Amount', type: 'money' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Expenses() {
  const [editing, setEditing] = useState(null);
  const [allocating, setAllocating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <PageHead title="Expenses">
        <button className="btn secondary" onClick={() => setAllocating(true)}>+ Allocation</button>
        <button className="btn" onClick={() => setEditing({})}>+ New Expense</button>
      </PageHead>
      <DataTable
        entity="expenses" refreshKey={refreshKey} defaultSort="date" defaultDir="desc"
        onRowClick={(r) => setEditing(r)}
        columns={[
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'description', label: 'Description' },
          { key: 'category', label: 'Category' },
          { key: 'supplier_id', label: 'Supplier', ref: true },
          { key: 'amount', label: 'Amount', type: 'money' },
          { key: 'status', label: 'Status', type: 'badge' },
        ]}
        filters={[
          { key: 'status', label: 'Status', options: ['Pending', 'Approved', 'Paid'] },
          { key: 'supplier_id', label: 'Supplier', entity: 'suppliers' },
        ]}
        groupOptions={[{ key: 'category', label: 'Category' }, { key: 'status', label: 'Status' }]}
      />
      <div className="panel" style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 10px' }}>Expense allocations</h3>
        <DataTable
          entity="expense_allocations" refreshKey={refreshKey} defaultSort="id" defaultDir="desc" searchable={false}
          columns={[
            { key: 'expense_id', label: 'Expense', ref: true },
            { key: 'course_id', label: 'Course', ref: true },
            { key: 'department', label: 'Department' },
            { key: 'amount', label: 'Amount', type: 'money' },
          ]}
        />
      </div>
      {editing && (
        <RecordForm entity="expenses" title="Expense" fields={expenseFields}
          record={editing.id ? editing : null}
          onClose={() => setEditing(null)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
      {allocating && (
        <RecordForm entity="expense_allocations" title="Expense Allocation" fields={allocationFields}
          onClose={() => setAllocating(false)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}

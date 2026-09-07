import React, { useState } from 'react';
import { DataTable, PageHead, RecordForm } from '../../shared/ui.jsx';

const invoiceFields = [
  { key: 'number', label: 'Invoice Number' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'due_date', label: 'Due Date', type: 'date' },
  { key: 'direction', label: 'Direction', type: 'select', options: ['receivable', 'payable'] },
  { key: 'contact_id', label: 'Contact (receivable)', type: 'ref', entity: 'contacts' },
  { key: 'pupil_id', label: 'Pupil (optional)', type: 'ref', entity: 'pupils' },
  { key: 'supplier_id', label: 'Supplier (payable)', type: 'ref', entity: 'suppliers' },
  { key: 'description', label: 'Description', full: true },
  { key: 'amount', label: 'Amount', type: 'money' },
  { key: 'paid_amount', label: 'Paid Amount', type: 'money' },
  { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Invoices() {
  const [editing, setEditing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <PageHead title="Invoices">
        <button className="btn" onClick={() => setEditing({})}>+ New Invoice</button>
      </PageHead>
      <DataTable
        entity="invoices" refreshKey={refreshKey} defaultSort="date" defaultDir="desc"
        onRowClick={(r) => setEditing(r)}
        columns={[
          { key: 'number', label: 'No.' },
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'due_date', label: 'Due', type: 'date' },
          { key: 'direction', label: 'Direction' },
          { key: 'contact_id', label: 'Contact', ref: true },
          { key: 'supplier_id', label: 'Supplier', ref: true },
          { key: 'description', label: 'Description' },
          { key: 'amount', label: 'Amount', type: 'money' },
          { key: 'paid_amount', label: 'Paid', type: 'money' },
          { key: 'status', label: 'Status', type: 'badge' },
        ]}
        filters={[
          { key: 'direction', label: 'Direction', options: ['receivable', 'payable'] },
          { key: 'status', label: 'Status', options: ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'] },
        ]}
        groupOptions={[{ key: 'status', label: 'Status' }, { key: 'direction', label: 'Direction' }]}
      />
      {editing && (
        <RecordForm entity="invoices" title="Invoice" fields={invoiceFields}
          record={editing.id ? editing : { direction: 'receivable', status: 'Draft', date: new Date().toISOString().slice(0, 10) }}
          onClose={() => setEditing(null)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}

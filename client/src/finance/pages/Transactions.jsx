import React, { useState } from 'react';
import { DataTable, PageHead, RecordForm } from '../../shared/ui.jsx';

const txFields = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'type', label: 'Type', type: 'select', options: ['income', 'expense'] },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description', full: true },
  { key: 'full_description', label: 'Full Description', type: 'textarea' },
  { key: 'name', label: 'Payer / Payee Name' },
  { key: 'staff_id', label: 'Linked Staff', type: 'ref', entity: 'staff' },
  { key: 'supplier_id', label: 'Linked Supplier', type: 'ref', entity: 'suppliers' },
  { key: 'contact_id', label: 'Linked Contact', type: 'ref', entity: 'contacts' },
  { key: 'bank_account_id', label: 'Bank Account', type: 'ref', entity: 'bank_accounts' },
  { key: 'amount_in', label: 'Amount In', type: 'money' },
  { key: 'amount_out', label: 'Amount Out', type: 'money' },
];

export default function Transactions() {
  const [editing, setEditing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <PageHead title="Transactions">
        <button className="btn" onClick={() => setEditing({})}>+ New Transaction</button>
      </PageHead>
      <DataTable
        entity="transactions" refreshKey={refreshKey} defaultSort="date" defaultDir="desc" exportable
        onRowClick={(r) => setEditing(r)}
        columns={[
          { key: 'date', label: 'Date', type: 'date' },
          { key: 'type', label: 'Type', type: 'badge' },
          { key: 'category', label: 'Category' },
          { key: 'description', label: 'Description' },
          { key: 'name', label: 'Name' },
          { key: 'bank_account_id', label: 'Account', ref: true },
          { key: 'amount_in', label: 'In', type: 'money' },
          { key: 'amount_out', label: 'Out', type: 'money' },
          { key: 'source', label: 'Source' },
        ]}
        filters={[
          { key: 'type', label: 'Type', options: ['income', 'expense'] },
          { key: 'bank_account_id', label: 'Account', entity: 'bank_accounts' },
          { key: 'source', label: 'Source', options: [{ id: 'quickbooks', label: 'QuickBooks' }] },
        ]}
        groupOptions={[{ key: 'category', label: 'Category' }, { key: 'type', label: 'Type' }]}
      />
      {editing && (
        <RecordForm entity="transactions" title="Transaction" fields={txFields}
          record={editing.id ? editing : { type: 'income', date: new Date().toISOString().slice(0, 10) }}
          onClose={() => setEditing(null)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}

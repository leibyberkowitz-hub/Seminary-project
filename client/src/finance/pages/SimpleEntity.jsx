import React, { useState } from 'react';
import { DataTable, PageHead, RecordForm } from '../../shared/ui.jsx';

// Config-driven list + CRUD pages for the smaller finance entities.
const CONFIGS = {
  pledges: {
    title: 'Pledges', defaultSort: 'date', defaultDir: 'desc',
    fields: [
      { key: 'contact_id', label: 'Contact', type: 'ref', entity: 'contacts' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'purpose', label: 'Purpose', full: true },
      { key: 'amount', label: 'Pledged Amount', type: 'money' },
      { key: 'fulfilled', label: 'Fulfilled So Far', type: 'money' },
      { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Partially Fulfilled', 'Fulfilled', 'Cancelled'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'contact_id', label: 'Contact', ref: true },
      { key: 'purpose', label: 'Purpose' },
      { key: 'amount', label: 'Pledged', type: 'money' },
      { key: 'fulfilled', label: 'Fulfilled', type: 'money' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
    groupOptions: [{ key: 'status', label: 'Status' }, { key: 'contact_id', label: 'Contact' }],
  },
  charity_receipts: {
    title: 'Charity Receipts', defaultSort: 'date', defaultDir: 'desc',
    fields: [
      { key: 'contact_id', label: 'Contact', type: 'ref', entity: 'contacts' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'amount', label: 'Amount', type: 'money' },
      { key: 'method', label: 'Method', type: 'select', options: ['Cash', 'Cheque', 'Bank Transfer', 'Card', 'Standing Order'] },
      { key: 'receipt_number', label: 'Receipt Number' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      { key: 'receipt_number', label: 'No.' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'contact_id', label: 'Contact', ref: true },
      { key: 'amount', label: 'Amount', type: 'money' },
      { key: 'method', label: 'Method' },
    ],
  },
  loans: {
    title: 'Loans', defaultSort: 'date', defaultDir: 'desc',
    fields: [
      { key: 'contact_id', label: 'Contact', type: 'ref', entity: 'contacts' },
      { key: 'staff_id', label: 'Staff', type: 'ref', entity: 'staff' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'amount', label: 'Amount', type: 'money' },
      { key: 'repaid', label: 'Repaid', type: 'money' },
      { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Repaid', 'Written Off'] },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'contact_id', label: 'Contact', ref: true },
      { key: 'staff_id', label: 'Staff', ref: true },
      { key: 'amount', label: 'Amount', type: 'money' },
      { key: 'repaid', label: 'Repaid', type: 'money' },
      { key: 'status', label: 'Status', type: 'badge' },
    ],
  },
  suppliers: {
    title: 'Suppliers', defaultSort: 'name',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Address', full: true },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
    ],
    groupOptions: [{ key: 'category', label: 'Category' }],
  },
  bank_accounts: {
    title: 'Bank Accounts', defaultSort: 'name',
    fields: [
      { key: 'name', label: 'Account Name' },
      { key: 'bank', label: 'Bank' },
      { key: 'account_number', label: 'Account Number' },
      { key: 'sort_code', label: 'Sort Code' },
      { key: 'balance', label: 'Balance', type: 'money' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'bank', label: 'Bank' },
      { key: 'account_number', label: 'Account No.' },
      { key: 'sort_code', label: 'Sort Code' },
      { key: 'balance', label: 'Balance', type: 'money' },
    ],
  },
};

export default function SimpleEntity({ entity }) {
  const cfg = CONFIGS[entity];
  const [editing, setEditing] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <PageHead title={cfg.title}>
        <button className="btn" onClick={() => setEditing({})}>+ New</button>
      </PageHead>
      <DataTable
        entity={entity} refreshKey={refreshKey}
        defaultSort={cfg.defaultSort} defaultDir={cfg.defaultDir || 'asc'}
        onRowClick={(r) => setEditing(r)}
        columns={cfg.columns} groupOptions={cfg.groupOptions || []}
      />
      {editing && (
        <RecordForm entity={entity} title={cfg.title.replace(/s$/, '')} fields={cfg.fields}
          record={editing.id ? editing : null}
          onClose={() => setEditing(null)} onSaved={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}

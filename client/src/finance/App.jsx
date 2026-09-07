import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '../shared/ui.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Invoices from './pages/Invoices.jsx';
import Expenses from './pages/Expenses.jsx';
import SimpleEntity from './pages/SimpleEntity.jsx';
import Staff from './pages/Staff.jsx';
import Contacts from './pages/Contacts.jsx';
import QuickBooksImport from './pages/QuickBooksImport.jsx';

const nav = [
  { title: 'Finance', items: [
    { to: '/', label: 'Dashboard / Reports' },
    { to: '/transactions', label: 'Transactions' },
    { to: '/invoices', label: 'Invoices' },
    { to: '/expenses', label: 'Expenses' },
    { to: '/quickbooks', label: 'QuickBooks Import' },
  ]},
  { title: 'Donors & Credit', items: [
    { to: '/pledges', label: 'Pledges' },
    { to: '/charity_receipts', label: 'Charity Receipts' },
    { to: '/loans', label: 'Loans' },
  ]},
  { title: 'People', items: [
    { to: '/contacts', label: 'Contacts' },
    { to: '/staff', label: 'Staff' },
  ]},
  { title: 'Setup', items: [
    { to: '/suppliers', label: 'Suppliers' },
    { to: '/bank_accounts', label: 'Bank Accounts' },
  ]},
];

export default function App() {
  return (
    <Layout appName="Seminary Finance" accent="#7c3aed" nav={nav}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/quickbooks" element={<QuickBooksImport />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/pledges" element={<SimpleEntity key="pledges" entity="pledges" />} />
        <Route path="/charity_receipts" element={<SimpleEntity key="charity_receipts" entity="charity_receipts" />} />
        <Route path="/loans" element={<SimpleEntity key="loans" entity="loans" />} />
        <Route path="/suppliers" element={<SimpleEntity key="suppliers" entity="suppliers" />} />
        <Route path="/bank_accounts" element={<SimpleEntity key="bank_accounts" entity="bank_accounts" />} />
      </Routes>
    </Layout>
  );
}

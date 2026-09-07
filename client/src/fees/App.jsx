import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '../shared/ui.jsx';
import Home from './pages/Home.jsx';
import Tuition from './pages/Tuition.jsx';
import PupilFees from './pages/PupilFees.jsx';
import Statements from './pages/Statements.jsx';

const nav = [
  { title: 'Fees', items: [
    { to: '/', label: 'Overview' },
    { to: '/tuition', label: 'Tuition & Discounts' },
    { to: '/charges', label: 'Fee Charges' },
    { to: '/statements', label: 'Family Statements' },
  ]},
];

export default function App() {
  return (
    <Layout appName="Seminary Fees Office" accent="#059669" nav={nav}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tuition" element={<Tuition />} />
        <Route path="/charges" element={<PupilFees />} />
        <Route path="/statements" element={<Statements />} />
      </Routes>
    </Layout>
  );
}

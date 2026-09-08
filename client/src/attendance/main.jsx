import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '../shared/styles.css';
import { configureSite } from '../shared/api.js';
import { AuthGate } from '../shared/ui.jsx';
import App from './App.jsx';

configureSite('attendance', 'Seminary Attendance');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate appName="Seminary Attendance" mono="נ" accent="#0e7c66" tint="#dcefe9">
      <HashRouter><App /></HashRouter>
    </AuthGate>
  </React.StrictMode>
);

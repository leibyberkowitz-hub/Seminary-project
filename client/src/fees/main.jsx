import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '../shared/styles.css';
import { configureSite } from '../shared/api.js';
import { AuthGate } from '../shared/ui.jsx';
import App from './App.jsx';

configureSite('fees', 'Seminary Fees Office');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate appName="Seminary Fees Office">
      <HashRouter><App /></HashRouter>
    </AuthGate>
  </React.StrictMode>
);

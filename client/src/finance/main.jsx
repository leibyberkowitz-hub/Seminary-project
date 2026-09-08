import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '../shared/styles.css';
import { configureSite } from '../shared/api.js';
import { AuthGate } from '../shared/ui.jsx';
import App from './App.jsx';

configureSite('finance', 'Seminary Finance');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate appName="Seminary Finance" mono="כ" accent="#8a5a12" tint="#f1e7d4">
      <HashRouter><App /></HashRouter>
    </AuthGate>
  </React.StrictMode>
);

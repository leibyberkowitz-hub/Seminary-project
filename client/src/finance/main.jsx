import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import '../shared/styles.css';
import { AuthGate } from '../shared/ui.jsx';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate appName="Finance">
      <HashRouter><App /></HashRouter>
    </AuthGate>
  </React.StrictMode>
);

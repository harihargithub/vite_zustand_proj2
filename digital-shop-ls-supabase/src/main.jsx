//main.jsx under src folder
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerLicense } from '@syncfusion/ej2-base';
import AppActivity from './AppActivity';
import AppRoutes from './AppRoutes';

// .env - VITE_SYNCFUSION_LICENSE_KEY='Your SF Licence Key'
registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY);

// Render AppActivity in root
/* ReactDOM.createRoot(document.getElementById('root2')).render(
  <React.StrictMode>
    <AppActivity />
  </React.StrictMode>,
); */

// Render App in root2
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRoutes />
  </React.StrictMode>,
);
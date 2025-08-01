//main.jsx under src folder
import React from 'react';
import ReactDOM from 'react-dom/client';
// import App from './App';
import './index.css';
import { registerLicense } from '@syncfusion/ej2-base';
import AppActivity from './AppActivity';

// .env - VITE_SYNCFUSION_LICENSE_KEY='Your SF Licence Key'
registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppActivity />
  </React.StrictMode>,
);
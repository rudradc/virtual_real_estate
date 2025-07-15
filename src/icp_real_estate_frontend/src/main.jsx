import 'bootstrap/dist/css/bootstrap.min.css'; // ✅ Import Bootstrap CSS
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.scss'; // optional, you can keep it for custom styles

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

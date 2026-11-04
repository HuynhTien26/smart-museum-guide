import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Nếu bạn bỏ file mobileStyles.css thẳng vào thư mục apps/mobile-app/src/
import './styles/mobileStyles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
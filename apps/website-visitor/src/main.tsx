import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Nếu bạn bỏ file webStyles.css thẳng vào thư mục apps/mobile-app/src/
import './styles/webStyles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
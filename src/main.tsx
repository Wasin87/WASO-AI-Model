import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and ignore benign Vite WebSocket connection and closure errors to prevent console/log spam
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason && (
      (reason instanceof Error && reason.message && reason.message.includes('WebSocket')) ||
      (typeof reason === 'string' && reason.includes('WebSocket')) ||
      (reason.message && reason.message.includes('failed to connect to websocket'))
    )) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const message = event.message;
    if (message && (
      message.includes('WebSocket') || 
      message.includes('failed to connect to websocket')
    )) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


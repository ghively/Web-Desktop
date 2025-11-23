import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

window.onerror = function (message, source, lineno, colno, error) {
  document.body.innerHTML = `<div style="color: red; padding: 20px;">
    <h1>Runtime Error</h1>
    <pre>${message}</pre>
    <pre>${source}:${lineno}:${colno}</pre>
    <pre>${error?.stack}</pre>
  </div>`;
};

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  console.error(e);
  document.body.innerHTML = `<div style="color: red; padding: 20px;"><h1>Render Error</h1><pre>${e}</pre></div>`;
}

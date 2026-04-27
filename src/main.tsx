import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.onerror = function(message, source, lineno, colno, error) {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '0';
  div.style.left = '0';
  div.style.width = '100%';
  div.style.backgroundColor = 'red';
  div.style.color = 'white';
  div.style.padding = '20px';
  div.style.zIndex = '9999';
  div.style.fontFamily = 'monospace';
  div.innerText = `CRITICAL ERROR: ${message} at ${source}:${lineno}:${colno}\n${error}`;
  document.body.appendChild(div);
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

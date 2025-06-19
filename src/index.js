// POLYFILLS - na samej górze
import { Buffer } from 'buffer';
import process from 'process/browser.js';

// React imports
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Globalne zmienne PRZED renderowaniem
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  window.process = process;
  window.global = window;
}

console.log('🔧 Polyfills sprawdzenie:');
console.log('- Buffer:', typeof Buffer !== 'undefined');
console.log('- Process:', typeof process !== 'undefined');
console.log('- Window.Buffer:', typeof window.Buffer !== 'undefined');
console.log('- Window.process:', typeof window.process !== 'undefined');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
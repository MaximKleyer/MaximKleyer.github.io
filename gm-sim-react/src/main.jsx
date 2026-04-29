/**
 * main.jsx — The entry point of the entire React application.
 *
 * WHAT THIS FILE DOES:
 * This is the bridge between the HTML page and React. It finds the
 * <div id="root"> in index.html and tells React to render your app there.
 *
 * VANILLA JS EQUIVALENT:
 * In the old version, you had window.onload = () => startApp() which
 * manually built DOM elements. React replaces that with a declarative
 * approach — you describe WHAT you want, React figures out HOW to render it.
 *
 * WHY StrictMode?
 * React.StrictMode doesn't affect production. In development, it runs
 * your components twice to help catch bugs (like side effects in render).
 * You'll sometimes see console.logs fire twice — that's normal and intentional.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';

// createRoot is React 18's way of mounting.
// It finds the #root div and takes ownership of everything inside it.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * Toast.jsx — A small popup notification that appears briefly.
 *
 * REACT CONCEPT: useEffect for side effects
 *
 * useEffect lets you run code AFTER React renders. Here we use it
 * to start a timer that auto-dismisses the toast after a few seconds.
 *
 * The "cleanup" function (the return inside useEffect) cancels the
 * timer if the component unmounts before the timer fires — this
 * prevents memory leaks and "setState on unmounted component" warnings.
 *
 * useEffect dependency array [onClose]:
 *   - [] means "run once on mount"
 *   - [onClose] means "run when onClose changes" (safety habit)
 */

import { useEffect } from 'react';

export default function Toast({ message, type, onClose }) {
  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer); // cleanup on unmount
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      <button className="toast-close" onClick={onClose}>✕</button>
    </div>
  );
}
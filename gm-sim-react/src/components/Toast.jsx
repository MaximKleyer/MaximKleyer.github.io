/**
 * Toast.jsx — Notification popup with map scores.
 *
 * Now shows individual map results below the series score.
 * Example:
 *   W 2-1 vs Cloud9
 *   13-8 · 9-13 · 13-11
 */

import { useEffect } from 'react';

export default function Toast({ message, type, mapScores, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000); // 5s to read map scores
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        <span className="toast-message">{message}</span>
        {mapScores && mapScores.length > 0 && (
          <span className="toast-maps">
            {mapScores.join('  ·  ')}
          </span>
        )}
      </div>
      <button className="toast-close" onClick={onClose}>✕</button>
    </div>
  );
}

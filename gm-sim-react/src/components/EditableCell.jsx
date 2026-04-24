/**
 * EditableCell.jsx — Inline cell editor used during God Mode.
 *
 * Renders plain text when god mode is off. When on, renders an input that
 * commits its value on blur OR Enter keypress. This commit-on-blur pattern
 * avoids the focus-loss problem you'd get from live-binding every keystroke
 * through the parent's onChange handler (which would trigger a full
 * gameState re-render per character and kick the input's focus).
 *
 * The input keeps its OWN local state during editing — the parent
 * gameState only updates when the edit is committed. That way React
 * re-renders the table exactly once per edit, and the input stays
 * focused while the user types.
 *
 * Props:
 *   value       — current committed value (number or string)
 *   type        — 'number' or 'text' (affects input type + parsing)
 *   onCommit    — function(newValue) called when edit is committed
 *   editable    — boolean; when false, renders plain text
 *   className   — optional passthrough for the plain-text span
 *   min, max    — optional bounds for number inputs (display hint only;
 *                 actual clamping happens in the parent handler)
 *   width       — optional explicit width in px for the input
 */

import { useState, useEffect } from 'react';

export default function EditableCell({
  value, type = 'text', onCommit, editable = false,
  className, min, max, width,
}) {
  // Local draft state while editing. Initialized from the committed value.
  const [draft, setDraft] = useState(String(value ?? ''));

  // If the committed value changes externally (e.g. calcOverall recomputes
  // after editing a different stat), sync it into the draft. This won't
  // fire while the user is actively typing since draft updates don't
  // trigger this effect.
  useEffect(() => {
    setDraft(String(value ?? ''));
  }, [value]);

  if (!editable) {
    return <span className={className}>{value}</span>;
  }

  function commit() {
    // Only commit if the draft actually differs from the current value
    // (prevents triggering a save on focus-in/focus-out without edits).
    if (String(value) === draft) return;
    onCommit(draft);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); // triggers commit via onBlur
    } else if (e.key === 'Escape') {
      // Abandon edit — restore the committed value
      setDraft(String(value ?? ''));
      e.currentTarget.blur();
    }
  }

  return (
    <input
      type={type === 'number' ? 'number' : 'text'}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      min={min}
      max={max}
      style={{
        width: width || (type === 'number' ? 52 : 120),
        padding: '2px 6px',
        background: 'rgba(180, 130, 255, 0.10)',
        border: '1px solid rgba(180, 130, 255, 0.45)',
        borderRadius: 3,
        color: '#e8ecf3',
        fontFamily: 'inherit',
        fontSize: 'inherit',
      }}
    />
  );
}

/**
 * Settings.jsx — tunable league rules, changeable mid-save.
 *
 * Settings live on gameState.settings so they persist with the save and
 * travel with it. Everything here takes effect immediately: engine code
 * reads through getSalaryCap() rather than capturing a constant, so cap
 * headroom, AI signing decisions, and re-sign maths all update the
 * moment the value changes.
 *
 * Built as a general panel rather than a one-off control because more
 * settings are coming — add a row, not a new surface.
 */

import { useState } from 'react';
import {
  DEFAULT_SALARY_CAP, SALARY_CAP_MIN, SALARY_CAP_MAX, SALARY_CAP_STEP,
  computeTeamSalary,
} from '../data/salary.js';
import { REGION_KEYS } from '../data/regions.js';

function fmt(n) {
  return '$' + (n / 1000000).toFixed(2) + 'M';
}

const PRESETS = [
  { label: 'Tight',    value: 1800000, hint: 'hard choices, thin depth' },
  { label: 'Default',  value: DEFAULT_SALARY_CAP, hint: 'balanced' },
  { label: 'Loose',    value: 3500000, hint: 'stack stars' },
  { label: 'Sandbox',  value: 8000000, hint: 'cap barely binds' },
];

export default function Settings({ gameState, onChangeSalaryCap, onClose }) {
  const current = gameState?.settings?.salaryCap ?? DEFAULT_SALARY_CAP;
  const [draft, setDraft] = useState(current);

  // How many teams the draft value would put over the cap. Changing the
  // cap mid-season can strand teams above it, so say so up front rather
  // than letting it surface later as mysterious AI panic-releases.
  const salaries = [];
  for (const rk of REGION_KEYS) {
    for (const t of gameState?.regions?.[rk]?.teams || []) {
      salaries.push({ abbr: t.abbr, isHuman: t.isHuman, total: computeTeamSalary(t) });
    }
  }
  const overCap = salaries.filter(t => t.total > draft);
  const humanOver = overCap.some(t => t.isHuman);
  const maxTeam = salaries.reduce((m, t) => Math.max(m, t.total), 0);

  function apply() {
    onChangeSalaryCap(draft);
    onClose();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 950,
      background: 'rgba(6,8,14,0.82)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div className="card" style={{ width: 'min(560px, 96vw)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0 }}>Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: 'inherit',
              opacity: 0.6, cursor: 'pointer', fontSize: '1.1rem',
            }}
          >✕</button>
        </div>

        <h3 style={{ marginBottom: 4 }}>Salary Cap</h3>
        <p style={{ margin: '0 0 14px', fontSize: '0.78em', opacity: 0.6 }}>
          Applies to every team, immediately. Existing contracts are not rewritten.
        </p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 700 }}>{fmt(draft)}</span>
          {draft !== current && (
            <span style={{ fontSize: '0.75em', opacity: 0.6 }}>was {fmt(current)}</span>
          )}
        </div>

        <input
          type="range"
          min={SALARY_CAP_MIN}
          max={SALARY_CAP_MAX}
          step={SALARY_CAP_STEP}
          value={draft}
          onChange={e => setDraft(Number(e.target.value))}
          style={{ width: '100%', accentColor: '#ff4655' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68em', opacity: 0.5 }}>
          <span>{fmt(SALARY_CAP_MIN)}</span><span>{fmt(SALARY_CAP_MAX)}</span>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setDraft(p.value)}
              title={`${fmt(p.value)} — ${p.hint}`}
              style={{
                flex: '1 1 auto', padding: '8px 6px', borderRadius: 5, cursor: 'pointer',
                background: draft === p.value ? 'rgba(255,70,85,0.18)' : 'transparent',
                border: `1px solid ${draft === p.value ? '#ff4655' : 'rgba(255,255,255,0.15)'}`,
                color: 'inherit', fontSize: '0.78em', fontWeight: 600,
              }}
            >
              {p.label}
              <div style={{ fontSize: '0.85em', opacity: 0.6, fontWeight: 400 }}>{fmt(p.value)}</div>
            </button>
          ))}
        </div>

        <div style={{
          marginTop: 16, padding: '10px 12px', borderRadius: 5,
          background: 'rgba(255,255,255,0.03)', fontSize: '0.78em', lineHeight: 1.6,
        }}>
          <div style={{ opacity: 0.7 }}>
            Highest team payroll right now: <strong>{fmt(maxTeam)}</strong>
          </div>
          {overCap.length > 0 ? (
            <div style={{ color: humanOver ? '#ff5460' : '#fb923c' }}>
              {overCap.length} team{overCap.length === 1 ? '' : 's'} would be over this cap
              {humanOver && ' — including yours'}.
            </div>
          ) : (
            <div style={{ color: '#4ade80' }}>Every team fits under this cap.</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            onClick={apply}
            disabled={draft === current}
            style={{
              padding: '10px 18px', borderRadius: 5, fontWeight: 700,
              background: draft === current ? 'rgba(255,255,255,0.08)' : 'rgba(255,70,85,0.85)',
              border: `1px solid ${draft === current ? 'rgba(255,255,255,0.15)' : '#ff4655'}`,
              color: '#fff', cursor: draft === current ? 'not-allowed' : 'pointer',
              opacity: draft === current ? 0.5 : 1,
            }}
          >
            {draft === current ? 'No change' : 'Apply'}
          </button>
          <button
            onClick={() => setDraft(DEFAULT_SALARY_CAP)}
            style={{
              padding: '10px 14px', borderRadius: 5, cursor: 'pointer',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
              color: 'inherit', fontSize: '0.85em',
            }}
          >Reset to default</button>
        </div>
      </div>
    </div>
  );
}

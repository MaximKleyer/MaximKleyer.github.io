/**
 * RoleTag.jsx — one shared role badge.
 *
 * Roles show up on the Roster, in Free Agents and across tier 2, and all
 * three want the same colours and the same tooltips. Keeping one copy
 * means a retune lands everywhere at once.
 */

import { FLEX, roleLabel } from '../data/roles.js';

/**
 * RoleTag — primary role plus secondary if present. Playing off-role
 * costs about ten points of overall, so this is the column that explains
 * why a signing underperforms their rating.
 */
const ROLE_TAG_COLORS = {
  duelist: '#ff5460', initiator: '#4ade80', controller: '#a78bfa',
  sentinel: '#38bdf8', flex: '#facc15',
};

export function RoleTag({ player }) {
  const primary = player?.primaryRole;
  const secondary = player?.secondaryRole;
  if (!primary) return <span style={{ opacity: 0.35 }}>—</span>;

  if (primary === FLEX) {
    return (
      <span
        title="Flex — plays any role at a small penalty. Rare, and starts weak."
        style={{
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em',
          padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap',
          color: ROLE_TAG_COLORS.flex, border: `1px solid ${ROLE_TAG_COLORS.flex}`,
        }}
      >FLEX</span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <span
        title={`Primary: ${roleLabel(primary)} — full rating in this role`}
        style={{ color: ROLE_TAG_COLORS[primary], fontWeight: 700, fontSize: '0.76em' }}
      >{roleLabel(primary)}</span>
      {secondary && (
        <span
          title={`Secondary: ${roleLabel(secondary)} — about 3 overall below their best`}
          style={{ color: ROLE_TAG_COLORS[secondary], opacity: 0.55, fontSize: '0.68em' }}
        >/ {roleLabel(secondary)}</span>
      )}
    </span>
  );
}

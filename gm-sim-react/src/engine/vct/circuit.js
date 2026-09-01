/**
 * circuit.js — the VCT 2027 season, slot by slot.
 *
 * The calendar, exactly as specced:
 *
 *   Kickoff Open Quals → Kickoff → Masters I →
 *   Open Quals 1 → Cup 1 → Masters II →
 *   Open Quals 2 → Cup 2 → Champions
 *
 * Each slot runs to completion when advanced: qualifier slots run all
 * eleven sub-region brackets, regional slots run all four 16-team
 * events (8 partners + the 8 opens who just qualified), Masters takes
 * each region's event top-2, and Champions seeds the top 4 of every
 * region's Championship-points table — the route by which a grinding
 * open team can pass a floundering partner, per the 2027 announcement.
 *
 * Results are stored slim (see formats.js) under circuit.events, and
 * points accrue in circuit.points keyed `${regionKey}:${abbr}`.
 */

import { REGION_KEYS } from '../../data/regions.js';
import { SUB_REGIONS } from '../../data/vct/subregions.js';
import {
  CUP_POINTS, MASTERS_POINTS, MASTERS_SLOTS_PER_REGION, CHAMPIONS_SLOTS_PER_REGION,
} from '../../data/vct/points.js';
import { runOpenQualifier, runSixteenTeamEvent, runMastersEvent } from './formats.js';
import { allVctRegionTeams } from './generation.js';

export const VCT_SLOTS = [
  { key: 'kickoffQuals', type: 'quals',    label: 'Kickoff Open Qualifiers' },
  { key: 'kickoff',      type: 'regional', label: 'Kickoff',   qualsKey: 'kickoffQuals' },
  { key: 'masters1',     type: 'masters',  label: 'Masters I', sourceKey: 'kickoff' },
  { key: 'quals1',       type: 'quals',    label: 'Cup 1 Open Qualifiers' },
  { key: 'cup1',         type: 'regional', label: 'Cup 1',     qualsKey: 'quals1' },
  { key: 'masters2',     type: 'masters',  label: 'Masters II', sourceKey: 'cup1' },
  { key: 'quals2',       type: 'quals',    label: 'Cup 2 Open Qualifiers' },
  { key: 'cup2',         type: 'regional', label: 'Cup 2',     qualsKey: 'quals2' },
  { key: 'champions',    type: 'champions', label: 'Champions' },
];

export function initVctCircuit(gameState) {
  gameState.circuit = {
    slotIndex: -1,          // nothing played yet; next advance runs slot 0
    status: 'idle',         // 'idle' | 'season-complete'
    events: {},             // slotKey → results (see runners below)
    points: {},             // `${regionKey}:${abbr}` → championship points
    worldChampion: null,
  };
  return gameState.circuit;
}

export function currentVctSlot(gameState) {
  const i = gameState.circuit?.slotIndex ?? -1;
  return VCT_SLOTS[i] || null;
}

export function nextVctSlot(gameState) {
  const i = gameState.circuit?.slotIndex ?? -1;
  return VCT_SLOTS[i + 1] || null;
}

/* ─────────────── Points ─────────────── */

function addPoints(circuit, regionKey, team, n) {
  if (!team || !n) return;
  const key = `${regionKey}:${team.abbr}`;
  circuit.points[key] = (circuit.points[key] || 0) + n;
}

/** The region a team belongs to — needed when a Masters pays points. */
function regionOfTeam(gameState, team) {
  for (const rk of REGION_KEYS) {
    if (allVctRegionTeams(gameState.regions[rk]).includes(team)) return rk;
  }
  return null;
}

/** A region's points table, best first: [{ team, points }]. */
export function regionPointsTable(gameState, regionKey) {
  const circuit = gameState.circuit;
  const teams = allVctRegionTeams(gameState.regions[regionKey]);
  return teams
    .map(team => ({ team, points: circuit.points[`${regionKey}:${team.abbr}`] || 0 }))
    .sort((a, b) => b.points - a.points
      || b.team.overallRating - a.team.overallRating);
}

function awardEventPoints(circuit, regionKey, event, table) {
  const p = event.placements;
  addPoints(circuit, regionKey, p.champion, table.champion);
  addPoints(circuit, regionKey, p.runnerUp, table.runnerUp);
  addPoints(circuit, regionKey, p.third, table.top4);
  addPoints(circuit, regionKey, p.fourth, table.top4);
  for (const t of [...p.fifthSixth, ...p.seventhEighth]) {
    addPoints(circuit, regionKey, t, table.top8);
  }
  if (table.swiss) {
    for (const t of event.swissEliminated || []) addPoints(circuit, regionKey, t, table.swiss);
  }
}

/* ─────────────── Slot runners ─────────────── */

function runQualsSlot(gameState, slot) {
  const results = {};
  for (const rk of REGION_KEYS) {
    results[rk] = {};
    for (const [sk, def] of Object.entries(SUB_REGIONS[rk])) {
      const teams = gameState.regions[rk].subRegions[sk].teams;
      results[rk][sk] = runOpenQualifier(teams, def.slots);
    }
  }
  gameState.circuit.events[slot.key] = results;
}

function runRegionalSlot(gameState, slot) {
  const circuit = gameState.circuit;
  const quals = circuit.events[slot.qualsKey];
  const results = {};
  for (const rk of REGION_KEYS) {
    const partners = gameState.regions[rk].teams;
    const qualified = Object.values(quals?.[rk] || {}).flatMap(q => q.qualified);
    const event = runSixteenTeamEvent([...partners, ...qualified]);
    awardEventPoints(circuit, rk, event, CUP_POINTS);
    results[rk] = event;
  }
  circuit.events[slot.key] = results;
}

function runMastersSlot(gameState, slot) {
  const circuit = gameState.circuit;
  const source = circuit.events[slot.sourceKey];
  const field = [];
  for (const rk of REGION_KEYS) {
    const p = source?.[rk]?.placements;
    if (!p) continue;
    field.push(...[p.champion, p.runnerUp].filter(Boolean).slice(0, MASTERS_SLOTS_PER_REGION));
  }
  const event = runMastersEvent(field);
  // Masters points land on each team's HOME region table.
  const p = event.placements;
  const award = (team, n) => addPoints(circuit, regionOfTeam(gameState, team), team, n);
  if (p.champion) award(p.champion, MASTERS_POINTS.champion);
  if (p.runnerUp) award(p.runnerUp, MASTERS_POINTS.runnerUp);
  if (p.third) award(p.third, MASTERS_POINTS.top4);
  if (p.fourth) award(p.fourth, MASTERS_POINTS.top4);
  for (const t of [...p.fifthSixth, ...p.seventhEighth]) award(t, MASTERS_POINTS.top8);
  circuit.events[slot.key] = event;
}

function runChampionsSlot(gameState, slot) {
  const circuit = gameState.circuit;
  const field = [];
  for (const rk of REGION_KEYS) {
    field.push(...regionPointsTable(gameState, rk)
      .slice(0, CHAMPIONS_SLOTS_PER_REGION)
      .map(r => r.team));
  }
  const event = runSixteenTeamEvent(field, { bestOf: 3 });
  circuit.events[slot.key] = event;
  circuit.worldChampion = event.placements.champion || null;
  circuit.status = 'season-complete';
}

/* ─────────────── Advance ─────────────── */

/**
 * Play the next slot of the calendar to completion. Returns the slot
 * that was played, or null when the season is already over.
 */
export function advanceVctSlot(gameState) {
  const circuit = gameState.circuit || initVctCircuit(gameState);
  if (circuit.status === 'season-complete') return null;
  const slot = VCT_SLOTS[circuit.slotIndex + 1];
  if (!slot) { circuit.status = 'season-complete'; return null; }

  circuit.slotIndex += 1;
  if (slot.type === 'quals') runQualsSlot(gameState, slot);
  else if (slot.type === 'regional') runRegionalSlot(gameState, slot);
  else if (slot.type === 'masters') runMastersSlot(gameState, slot);
  else if (slot.type === 'champions') runChampionsSlot(gameState, slot);
  return slot;
}

/** Sim the remaining season in one call (tests, fast-forward). */
export function runFullVctSeason(gameState) {
  let guard = 0;
  while (gameState.circuit?.status !== 'season-complete' && guard++ < VCT_SLOTS.length + 2) {
    advanceVctSlot(gameState);
  }
  return gameState.circuit;
}

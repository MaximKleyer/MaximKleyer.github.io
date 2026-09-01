/**
 * editPlayer.js — the single entry point for God-Mode player edits.
 *
 * Extracted from App.jsx so the franchise app and the VCT 2027 app
 * apply exactly the same rules: validation, clamping, the overall
 * recompute after rating edits, contract inference, and the
 * native-language invariant on nationality changes.
 *
 * Mutates the player in place; the caller triggers the re-render.
 * Returns true when a change was applied.
 */

import { addLanguage, nativeLanguageOf } from '../data/languages.js';

export function applyPlayerEdit(gameState, player, field, value) {
  if (!gameState?.godMode) return false;   // defensive guard

  if (field === 'name' || field === 'tag') {
    player[field] = String(value);
  } else if (field === 'nationality') {
    const code = String(value).toUpperCase();
    if (!code) return false;
    player.nationality = code;
    // A player always speaks their nationality's language — the
    // invariant survives god-mode edits too. Old languages are kept:
    // changing a flag doesn't un-learn anything.
    addLanguage(player, nativeLanguageOf(code));
  } else if (field === 'age') {
    player.age = Math.max(16, Math.min(40, parseInt(value, 10) || player.age));
  } else if (['aim', 'positioning', 'utility', 'gamesense', 'clutch'].includes(field)) {
    const n = Math.max(1, Math.min(99, parseInt(value, 10) || 0));
    player.ratings[field] = n;
    player.overall = player.calcOverall();
  } else if (field === 'salary') {
    const n = Math.max(0, Math.round(parseInt(value, 10) || 0));
    if (player.contract) {
      player.contract.salary = n;
    } else if (n > 0) {
      player.contract = {
        salary: n,
        yearsRemaining: 1,
        signedYear: gameState.seasonNumber || 2025,
      };
    }
  } else if (field === 'yearsRemaining') {
    const n = Math.max(0, Math.min(3, parseInt(value, 10) || 0));
    if (player.contract) player.contract.yearsRemaining = n;
  } else {
    return false;   // unknown field, ignore
  }
  return true;
}

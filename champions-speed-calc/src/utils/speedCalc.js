// Pokemon Champions speed calculation engine
// All Pokemon are Level 50, 31 IVs, 0-32 SP per stat, max 66 total

import { SPEED_ABILITIES, STAT_ALIGNMENTS } from '../data/abilities.js';

/**
 * Calculate base Speed stat at Level 50 with given SP and alignment.
 * Formula: floor((floor((2*Base + 31 + floor(SP*8/4)) * 50/100) + 5) * natureMult)
 */
export function calcBaseSpeedStat(baseSpe, sp, alignment = 'Serious') {
  const evs = sp * 8;
  const raw = Math.floor(((2 * baseSpe + 31 + Math.floor(evs / 4)) * 50) / 100) + 5;
  const alignData = STAT_ALIGNMENTS[alignment];
  let mult = 1.0;
  if (alignData.boost === 'spe') mult = 1.1;
  else if (alignData.reduce === 'spe') mult = 0.9;
  return Math.floor(raw * mult);
}

/**
 * Apply stat stage multiplier (±1 to ±6)
 * +1 = 1.5x, +2 = 2.0x, +3 = 2.5x, +4 = 3.0x, +5 = 3.5x, +6 = 4.0x
 * -1 = 0.667x, -2 = 0.5x, ..., -6 = 0.25x
 */
export function applyStage(stat, stage) {
  if (stage >= 0) return Math.floor((stat * (2 + stage)) / 2);
  return Math.floor((stat * 2) / (2 - stage));
}

/**
 * Apply all field conditions and return effective Speed.
 * This is the master function for comparison.
 */
export function calcEffectiveSpeed({
  baseSpe,
  sp = 0,
  alignment = 'Serious',
  ability = null,
  item = null,
  stage = 0,
  tailwind = false,
  paralysis = false,
  weather = 'none',     // none | rain | sun | sand | snow
  terrain = 'none',     // none | electric | grassy | psychic | misty
  unburdenActive = false,
  trickRoom = false,    // for sort direction, not multiplier
}) {
  // Step 1: raw stat from base + SP + alignment
  let speed = calcBaseSpeedStat(baseSpe, sp, alignment);

  // Step 2: stat stages
  speed = applyStage(speed, stage);

  // Step 3: ability multipliers
  if (ability && SPEED_ABILITIES[ability]) {
    const ab = SPEED_ABILITIES[ability];
    if (ab.condition === 'weather' && weather === ab.value) speed *= ab.multiplier;
    else if (ab.condition === 'terrain' && terrain === ab.value) speed *= ab.multiplier;
    else if (ability === 'Unburden' && unburdenActive) speed *= 2;
    else if (ability === 'Quick Feet' && paralysis) speed = Math.floor(speed * 1.5);
  }

  // Step 4: item
  if (item === 'Choice Scarf') speed = Math.floor(speed * 1.5);
  if (item === 'Iron Ball') speed = Math.floor(speed * 0.5);

  // Step 5: paralysis (unless Quick Feet already handled it)
  if (paralysis && ability !== 'Quick Feet') {
    speed = Math.floor(speed * 0.5);
  }

  // Step 6: Tailwind (always applies last)
  if (tailwind) speed *= 2;

  return Math.floor(speed);
}

/**
 * Generate a sort-ready list of all Pokemon with calculated speeds
 * for the current field conditions.
 * `commonAssumptions` applies one SP/alignment/ability preset across the whole list.
 */
export function computeSpeedTable(pokemon, fieldConditions, commonAssumptions = {}) {
  const {
    sp = 32,
    alignment = 'Timid',
    useMaxSpeedAlignment = true,
    perPokemonOverrides = {},
  } = commonAssumptions;

  return pokemon.map(p => {
    const override = perPokemonOverrides[p.id] || {};
    const effectiveAlignment = override.alignment
      || (useMaxSpeedAlignment ? pickSpeedAlignment(alignment) : alignment);
    const effectiveSP = override.sp !== undefined ? override.sp : sp;
    const effectiveAbility = override.ability || p.abilities?.[0] || null;

    const speed = calcEffectiveSpeed({
      baseSpe: p.base[5],
      sp: effectiveSP,
      alignment: effectiveAlignment,
      ability: effectiveAbility,
      item: override.item || fieldConditions.defaultItem || null,
      stage: override.stage || 0,
      tailwind: fieldConditions.tailwind,
      paralysis: fieldConditions.paralysis,
      weather: fieldConditions.weather,
      terrain: fieldConditions.terrain,
      unburdenActive: override.unburdenActive || false,
      trickRoom: fieldConditions.trickRoom,
    });

    return {
      ...p,
      effectiveSpeed: speed,
      appliedAlignment: effectiveAlignment,
      appliedSP: effectiveSP,
      appliedAbility: effectiveAbility,
    };
  });
}

/**
 * Returns a Speed-boosting alignment if the provided one isn't already speed+.
 * Defaults to Timid if none provided.
 */
function pickSpeedAlignment(alignment) {
  const al = STAT_ALIGNMENTS[alignment];
  if (al && al.boost === 'spe') return alignment;
  return 'Timid';
}

/**
 * Mirror match comparison - returns who moves first.
 */
export function compareMirror(yourMon, opponentMon, field) {
  const yourSpeed = calcEffectiveSpeed({ ...yourMon, ...field });
  const oppSpeed = calcEffectiveSpeed({ ...opponentMon, ...field });

  let firstMover;
  if (field.trickRoom) {
    firstMover = yourSpeed < oppSpeed ? 'you' : (yourSpeed > oppSpeed ? 'opponent' : 'tie');
  } else {
    firstMover = yourSpeed > oppSpeed ? 'you' : (yourSpeed < oppSpeed ? 'opponent' : 'tie');
  }

  return { yourSpeed, oppSpeed, firstMover };
}

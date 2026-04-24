// Abilities that affect Speed calculations in Pokemon Champions
// Each ability has a condition and a multiplier

export const SPEED_ABILITIES = {
  'Swift Swim':    { condition: 'weather', value: 'rain',  multiplier: 2.0 },
  'Chlorophyll':   { condition: 'weather', value: 'sun',   multiplier: 2.0 },
  'Sand Rush':     { condition: 'weather', value: 'sand',  multiplier: 2.0 },
  'Slush Rush':    { condition: 'weather', value: 'snow',  multiplier: 2.0 },
  'Surge Surfer':  { condition: 'terrain', value: 'electric', multiplier: 2.0 },
  'Unburden':      { condition: 'itemConsumed', multiplier: 2.0 },
  'Quick Feet':    { condition: 'status',  value: 'any',   multiplier: 1.5 },
  'Speed Boost':   { condition: 'passive', multiplier: null }, // +1 stage per turn, manual
  'Steam Engine':  { condition: 'trigger', multiplier: null }, // +6 stages on Fire/Water hit
  'Motor Drive':   { condition: 'trigger', multiplier: null }, // +1 stage on Electric hit
  'Protosynthesis':{ condition: 'sun+booster', multiplier: 1.5 }, // Paradox - not in RegMA
  'Quark Drive':   { condition: 'electric+booster', multiplier: 1.5 }, // Paradox - not in RegMA
};

// Nature-equivalent Stat Alignment multipliers
// In Champions, alignments boost one stat +10% and reduce another -10%
export const STAT_ALIGNMENTS = {
  'Serious':  { boost: null, reduce: null }, // neutral
  'Timid':    { boost: 'spe', reduce: 'atk' },
  'Jolly':    { boost: 'spe', reduce: 'spa' },
  'Hasty':    { boost: 'spe', reduce: 'def' },
  'Naive':    { boost: 'spe', reduce: 'spd' },
  'Modest':   { boost: 'spa', reduce: 'atk' },
  'Adamant':  { boost: 'atk', reduce: 'spa' },
  'Bold':     { boost: 'def', reduce: 'atk' },
  'Impish':   { boost: 'def', reduce: 'spa' },
  'Calm':     { boost: 'spd', reduce: 'atk' },
  'Careful':  { boost: 'spd', reduce: 'spa' },
  'Brave':    { boost: 'atk', reduce: 'spe' },
  'Quiet':    { boost: 'spa', reduce: 'spe' },
  'Relaxed':  { boost: 'def', reduce: 'spe' },
  'Sassy':    { boost: 'spd', reduce: 'spe' },
};

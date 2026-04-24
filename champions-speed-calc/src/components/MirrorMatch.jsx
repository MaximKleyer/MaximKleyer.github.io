import React, { useState } from 'react';
import { calcEffectiveSpeed } from '../utils/speedCalc.js';
import { STAT_ALIGNMENTS } from '../data/abilities.js';
import { POKEMON } from '../data/pokemon.js';

const DEFAULT_SPREAD = {
  pokemonId: '',
  sp: 32,
  alignment: 'Timid',
  ability: null,
  item: null,
  stage: 0,
  unburdenActive: false,
};

function MirrorSide({ label, spread, setSpread, field }) {
  const pokemon = POKEMON.find(p => p.id === spread.pokemonId);

  const computedSpeed = pokemon ? calcEffectiveSpeed({
    baseSpe: pokemon.base[5],
    sp: spread.sp,
    alignment: spread.alignment,
    ability: spread.ability || pokemon.abilities[0],
    item: spread.item,
    stage: spread.stage,
    tailwind: field.tailwind,
    paralysis: field.paralysis,
    weather: field.weather,
    terrain: field.terrain,
    unburdenActive: spread.unburdenActive,
  }) : 0;

  return (
    <div className="mirror-side">
      <h4>{label}</h4>
      <select
        className="mon-select"
        value={spread.pokemonId}
        onChange={e => setSpread({ ...spread, pokemonId: e.target.value, ability: null })}
      >
        <option value="">Select a Pokémon...</option>
        {POKEMON.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {pokemon && (
        <>
          <div className="mirror-base-stats">
            Base Spe: <strong>{pokemon.base[5]}</strong>
          </div>

          <div className="mirror-controls">
            <label>
              SP in Speed:
              <input
                type="number"
                min={0}
                max={32}
                value={spread.sp}
                onChange={e => setSpread({
                  ...spread,
                  sp: Math.max(0, Math.min(32, Number(e.target.value))),
                })}
              />
            </label>

            <label>
              Alignment:
              <select
                value={spread.alignment}
                onChange={e => setSpread({ ...spread, alignment: e.target.value })}
              >
                {Object.keys(STAT_ALIGNMENTS).map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>

            <label>
              Ability:
              <select
                value={spread.ability || pokemon.abilities[0]}
                onChange={e => setSpread({ ...spread, ability: e.target.value })}
              >
                {pokemon.abilities.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>

            <label>
              Item:
              <select
                value={spread.item || ''}
                onChange={e => setSpread({ ...spread, item: e.target.value || null })}
              >
                <option value="">None</option>
                <option value="Choice Scarf">Choice Scarf</option>
                <option value="Iron Ball">Iron Ball</option>
              </select>
            </label>

            <label>
              Speed Stage:
              <select
                value={spread.stage}
                onChange={e => setSpread({ ...spread, stage: Number(e.target.value) })}
              >
                {[-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6].map(s => (
                  <option key={s} value={s}>{s > 0 ? `+${s}` : s}</option>
                ))}
              </select>
            </label>

            {spread.ability === 'Unburden' && (
              <label>
                <input
                  type="checkbox"
                  checked={spread.unburdenActive}
                  onChange={e => setSpread({ ...spread, unburdenActive: e.target.checked })}
                />
                Unburden active
              </label>
            )}
          </div>

          <div className="mirror-speed">
            <div className="mirror-speed-label">Effective Speed</div>
            <div className="mirror-speed-value">{computedSpeed}</div>
          </div>
        </>
      )}
    </div>
  );
}

export default function MirrorMatch({ field }) {
  const [yourSpread, setYourSpread] = useState({ ...DEFAULT_SPREAD });
  const [oppSpread, setOppSpread] = useState({ ...DEFAULT_SPREAD });

  const yourMon = POKEMON.find(p => p.id === yourSpread.pokemonId);
  const oppMon = POKEMON.find(p => p.id === oppSpread.pokemonId);

  let verdict = null;
  if (yourMon && oppMon) {
    const yourSpeed = calcEffectiveSpeed({
      baseSpe: yourMon.base[5], sp: yourSpread.sp, alignment: yourSpread.alignment,
      ability: yourSpread.ability || yourMon.abilities[0], item: yourSpread.item,
      stage: yourSpread.stage, tailwind: field.tailwind, paralysis: field.paralysis,
      weather: field.weather, terrain: field.terrain, unburdenActive: yourSpread.unburdenActive,
    });
    const oppSpeed = calcEffectiveSpeed({
      baseSpe: oppMon.base[5], sp: oppSpread.sp, alignment: oppSpread.alignment,
      ability: oppSpread.ability || oppMon.abilities[0], item: oppSpread.item,
      stage: oppSpread.stage, tailwind: field.tailwind, paralysis: field.paralysis,
      weather: field.weather, terrain: field.terrain, unburdenActive: oppSpread.unburdenActive,
    });

    let winner, msg;
    if (field.trickRoom) {
      if (yourSpeed < oppSpeed) { winner = 'you'; msg = 'You move first (Trick Room)'; }
      else if (yourSpeed > oppSpeed) { winner = 'opp'; msg = 'Opponent moves first (Trick Room)'; }
      else { winner = 'tie'; msg = 'Speed tie — 50/50'; }
    } else {
      if (yourSpeed > oppSpeed) { winner = 'you'; msg = 'You move first'; }
      else if (yourSpeed < oppSpeed) { winner = 'opp'; msg = 'Opponent moves first'; }
      else { winner = 'tie'; msg = 'Speed tie — 50/50'; }
    }

    verdict = { winner, msg, yourSpeed, oppSpeed, diff: Math.abs(yourSpeed - oppSpeed) };
  }

  return (
    <div className="mirror-match">
      <h2>Mirror Match</h2>
      <p className="mirror-note">
        Compare any two Pokémon head-to-head under current field conditions.
      </p>

      <div className="mirror-grid">
        <MirrorSide label="Your Pokémon" spread={yourSpread} setSpread={setYourSpread} field={field} />
        <div className="mirror-vs">
          {verdict ? (
            <div className={`verdict verdict-${verdict.winner}`}>
              <div className="verdict-msg">{verdict.msg}</div>
              <div className="verdict-diff">
                Speed diff: {verdict.diff === 0 ? '—' : `${verdict.diff} point${verdict.diff === 1 ? '' : 's'}`}
              </div>
            </div>
          ) : (
            <div className="verdict-placeholder">VS</div>
          )}
        </div>
        <MirrorSide label="Opposing Pokémon" spread={oppSpread} setSpread={setOppSpread} field={field} />
      </div>
    </div>
  );
}

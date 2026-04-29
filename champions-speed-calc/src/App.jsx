import React, { useState, useMemo } from 'react';
import { POKEMON } from './data/pokemon.js';
import { computeSpeedTable, calcEffectiveSpeed } from './utils/speedCalc.js';
import FilterPanel from './components/FilterPanel.jsx';
import SpeedTable from './components/SpeedTable.jsx';
import CustomSpreadPanel from './components/CustomSpreadPanel.jsx';
import MirrorMatch from './components/MirrorMatch.jsx';
import YourPokemonBuilder from './components/YourPokemonBuilder.jsx';
import './App.css';

const DEFAULT_FIELD = {
  tailwind: false,
  trickRoom: false,
  paralysis: false,
  weather: 'none',
  terrain: 'none',
  defaultItem: null,
};

const DEFAULT_ASSUMPTIONS = {
  sp: 32,
  alignment: 'Timid',
  activateWeatherAbilities: true,
};

const EMPTY_BUILDER = {
  pokemonId: null,
  sp: [0, 0, 0, 0, 0, 32],
  alignment: 'Timid',
  ability: null,
  item: null,
  stage: 0,
  unburdenActive: false,
};

export default function App() {
  const [view, setView] = useState('table'); // 'table' | 'mirror'
  const [field, setField] = useState(DEFAULT_FIELD);
  const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
  const [focusedId, setFocusedId] = useState(null);
  const [perPokemonOverrides, setPerPokemonOverrides] = useState({});
  const [builder, setBuilder] = useState(EMPTY_BUILDER);

  // Apply weather ability auto-pick across the roster
  const pokemonList = useMemo(() => {
    if (!assumptions.activateWeatherAbilities) return POKEMON;
    return POKEMON.map(p => {
      const pickedAbility = pickBestSpeedAbility(p, field);
      if (pickedAbility) return { ...p, preferredAbility: pickedAbility };
      return p;
    });
  }, [field.weather, field.terrain, field.paralysis, assumptions.activateWeatherAbilities]);

  const tableData = useMemo(() => {
    const effectiveOverrides = { ...perPokemonOverrides };
    pokemonList.forEach(p => {
      if (p.preferredAbility && !effectiveOverrides[p.id]?.ability) {
        effectiveOverrides[p.id] = {
          ...(effectiveOverrides[p.id] || {}),
          ability: p.preferredAbility,
        };
      }
    });
    return computeSpeedTable(pokemonList, field, {
      sp: assumptions.sp,
      alignment: assumptions.alignment,
      perPokemonOverrides: effectiveOverrides,
    });
  }, [pokemonList, field, assumptions, perPokemonOverrides]);

  // Compute the user's "your pokemon" row
  const builderPokemon = builder.pokemonId ? POKEMON.find(p => p.id === builder.pokemonId) : null;
  const builderEffectiveSpeed = builderPokemon
    ? calcEffectiveSpeed({
        baseSpe: builderPokemon.base[5],
        sp: builder.sp[5],
        alignment: builder.alignment,
        ability: builder.ability || builderPokemon.abilities[0],
        item: builder.item,
        stage: builder.stage,
        tailwind: field.tailwind,
        paralysis: field.paralysis,
        weather: field.weather,
        terrain: field.terrain,
        unburdenActive: builder.unburdenActive,
      })
    : 0;

  const customRow = builderPokemon
    ? {
        ...builderPokemon,
        id: `__custom_${builderPokemon.id}`, // distinct id to avoid collision with the same mon
        name: builderPokemon.name,
        isCustom: true,
        effectiveSpeed: builderEffectiveSpeed,
        appliedSP: builder.sp[5],
        appliedAlignment: builder.alignment,
        appliedAbility: builder.ability || builderPokemon.abilities[0],
      }
    : null;

  // Focused-pokemon (per-row "Customize" sidebar) flow — unchanged
  const focusedPokemon = focusedId ? POKEMON.find(p => p.id === focusedId) : null;
  const focusedSpread = focusedId
    ? (perPokemonOverrides[focusedId] || defaultSpreadFor(focusedPokemon, assumptions))
    : null;
  const focusedEffective = focusedPokemon && focusedSpread ? calcEffectiveSpeed({
    baseSpe: focusedPokemon.base[5],
    sp: focusedSpread.fullSP ? focusedSpread.fullSP[5] : (focusedSpread.sp ?? assumptions.sp),
    alignment: focusedSpread.alignment,
    ability: focusedSpread.ability || focusedPokemon.abilities[0],
    item: focusedSpread.item || field.defaultItem,
    stage: focusedSpread.stage || 0,
    tailwind: field.tailwind,
    paralysis: field.paralysis,
    weather: field.weather,
    terrain: field.terrain,
    unburdenActive: focusedSpread.unburdenActive,
  }) : 0;

  function handleCustomSpread(newSpread) {
    setPerPokemonOverrides({
      ...perPokemonOverrides,
      [focusedId]: {
        sp: newSpread.sp[5],
        fullSP: newSpread.sp,
        alignment: newSpread.alignment,
        ability: newSpread.ability,
        item: newSpread.item,
        stage: newSpread.stage,
        unburdenActive: newSpread.unburdenActive,
      },
    });
  }

  function clearBuilder() {
    setBuilder(EMPTY_BUILDER);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Champions Speed Calculator</h1>
        <p className="subtitle">Regulation M-A · Pokemon Champions</p>
        <nav className="view-nav">
          <button
            className={view === 'table' ? 'active' : ''}
            onClick={() => setView('table')}
          >
            Speed Table
          </button>
          <button
            className={view === 'mirror' ? 'active' : ''}
            onClick={() => setView('mirror')}
          >
            Mirror Match
          </button>
        </nav>
      </header>

      <FilterPanel
        field={field}
        setField={setField}
        assumptions={assumptions}
        setAssumptions={setAssumptions}
      />

      {view === 'table' ? (
        <>
          <YourPokemonBuilder
            builder={builder}
            setBuilder={setBuilder}
            effectiveSpeed={builderEffectiveSpeed}
            onClear={clearBuilder}
          />

          <div className="main-content">
            <div className="table-section">
              <SpeedTable
                data={tableData}
                trickRoom={field.trickRoom}
                onSelectForSpread={setFocusedId}
                focusedPokemonId={focusedId}
                customRow={customRow}
              />
            </div>

            {focusedPokemon && (
              <CustomSpreadPanel
                pokemon={focusedPokemon}
                spread={normalizeSpread(focusedSpread, focusedPokemon, assumptions)}
                onChange={handleCustomSpread}
                onClose={() => setFocusedId(null)}
                effectiveSpeed={focusedEffective}
              />
            )}
          </div>
        </>
      ) : (
        <MirrorMatch field={field} />
      )}

      <footer className="app-footer">
        <p>
          Built for Pokémon Champions Regulation M-A. Formula: Lv50, 31 IVs, 66 SP total (32 max/stat), 1 SP = 8 EVs.
          Data: {POKEMON.length} Pokémon including Mega forms.
        </p>
      </footer>
    </div>
  );
}

function pickBestSpeedAbility(pokemon, field) {
  for (const ab of pokemon.abilities) {
    if (ab === 'Swift Swim' && field.weather === 'rain') return ab;
    if (ab === 'Chlorophyll' && field.weather === 'sun') return ab;
    if (ab === 'Sand Rush' && field.weather === 'sand') return ab;
    if (ab === 'Slush Rush' && field.weather === 'snow') return ab;
    if (ab === 'Surge Surfer' && field.terrain === 'electric') return ab;
    if (ab === 'Quick Feet' && field.paralysis) return ab;
  }
  return null;
}

function defaultSpreadFor(pokemon, assumptions) {
  if (!pokemon) return null;
  return {
    fullSP: [0, 0, 0, 0, 0, assumptions.sp],
    alignment: assumptions.alignment,
    ability: pokemon.abilities[0],
    item: null,
    stage: 0,
    unburdenActive: false,
  };
}

function normalizeSpread(stored, pokemon, assumptions) {
  const fullSP = stored?.fullSP || [0,0,0,0,0, stored?.sp ?? assumptions.sp];
  return {
    sp: fullSP,
    alignment: stored?.alignment || assumptions.alignment,
    ability: stored?.ability || pokemon.abilities[0],
    item: stored?.item || null,
    stage: stored?.stage || 0,
    unburdenActive: stored?.unburdenActive || false,
  };
}

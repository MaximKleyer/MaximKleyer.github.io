# Champions Speed Calculator

Speed tier calculator for **Pokémon Champions Regulation M-A**. Built with React + Vite, deploys to GitHub Pages.

## Features

- **Sortable speed table** with all 263 Reg M-A Pokémon including Mega forms
- **Field condition filters**: Tailwind, Trick Room, paralysis, weather (Rain/Sun/Sand/Snow), terrain, Choice Scarf, Iron Ball
- **Auto-detection of speed abilities**: Swift Swim, Chlorophyll, Sand Rush, Slush Rush, Surge Surfer, Unburden, Quick Feet — activates automatically when matching field conditions are set
- **Custom SP spreads** per Pokémon: 6-stat sliders respecting the 66 SP limit (max 32 per stat), all 15 Stat Alignments, stat stages, items
- **Mirror match view**: head-to-head comparison of any two Pokémon with verdict on who moves first
- **Trick Room aware**: automatically flips sort direction and verdict logic
- **Dark competitive-analytics aesthetic** designed for long theorycrafting sessions

## Champions Stat Formula

All Pokémon are Level 50 with 31 IVs. Stat Points (SP) replace EVs:
- **66 SP total per Pokémon, max 32 per stat**
- **1 SP = 8 EVs equivalent** → effectively +1 stat per +1 SP at Lv50
- **Stat Alignments** replace Natures (Serious = neutral, all others ±10%)

Speed formula:
```
raw = floor((2 × BaseSpe + 31 + SP × 2) × 0.5) + 5
stat = floor(raw × alignmentMultiplier)
```

Then applied in order: stat stages → ability multiplier → item → paralysis → Tailwind.

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173/champions-speed-calc/`.

## Deploy to GitHub Pages

### One-time setup:

1. Create a new repo on GitHub (e.g., `champions-speed-calc`)
2. In **Settings → Pages**, set **Source** to **GitHub Actions**
3. Push this code to `main` branch
4. The included `.github/workflows/deploy.yml` auto-deploys on every push

If you rename the repo, update `base` in `vite.config.js` to match the new repo name.

### Manual deploy alternative (gh-pages branch):

```bash
npm install -D gh-pages
npm run deploy
```

## Project Structure

```
champions-speed-calc/
├── src/
│   ├── App.jsx                      # Main app + view routing
│   ├── App.css                      # All styling
│   ├── main.jsx                     # React entry point
│   ├── components/
│   │   ├── FilterPanel.jsx          # Field condition toggles
│   │   ├── SpeedTable.jsx           # Sortable roster table
│   │   ├── CustomSpreadPanel.jsx    # Per-Pokémon SP editor
│   │   └── MirrorMatch.jsx          # 1v1 comparison view
│   ├── data/
│   │   ├── pokemon.js               # Full Reg M-A roster with base stats
│   │   └── abilities.js             # Speed-affecting abilities & alignments
│   └── utils/
│       └── speedCalc.js             # Core stat math
├── .github/workflows/deploy.yml     # Auto-deploy to GH Pages
├── index.html
├── package.json
└── vite.config.js
```

## Known Caveats

- Mega stats for new Champions Megas (Mega Meganium, Mega Feraligatr, Mega Chimecho, etc.) are based on community data; verify against in-game values as databases mature.
- Speed Boost, Steam Engine, and Motor Drive are per-turn passive/trigger abilities not reflected in the automatic multiplier logic — use the "Speed Stage" dropdown to model them manually.
- The `pokemon.js` dataset is comprehensive but may occasionally drift from the exact in-game legal list as The Pokémon Company adjusts the roster. Check `Bulbapedia: List of Pokémon in Pokémon Champions` for authoritative changes.

## License

MIT — fork, modify, extend freely.

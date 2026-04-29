# ⚔️ Pocket Summoner: Episode 1

A nostalgic recreation of the classic iOS monster collection RPG **Pocket Summoner** (originally by Riida.com / CDE Entertainment, ~2010).

Built with React + Vite. Deployed on GitHub Pages.

> **Disclaimer:** This is a fan recreation for personal/educational purposes. Not affiliated with Riida.com or CDE Entertainment.

## 🎮 Features

### Phase 1 (Current)
- **9 Guards** from the original game — Doogie, Miki, Green TriFish, Waaga, BulbHead, BigiWorm, Red TriFish, Firebo, Dark Mage
- **Full type effectiveness chart** — Normal, Fire, Water, Ground, Wind, Grass, Poison, Dark, Light, Magical, Electricity
- **Auto-battle combat engine** — stats + type matchups + speed priority + level scaling
- **4 Quest zones** — Basalon Town → Dark Forest → Spirit Sands → Darkshire
- **Spirit drop system** — find spirits on quests, buy guards from the shop
- **Stat training** — spend gold to boost ATK/DEF/MATK/MDEF/SPD/INT
- **Energy system** with timed regeneration
- **localStorage save** — your progress persists between sessions

### Planned
- Champion Challenge (boss gauntlet)
- Guard Transformations (evolution chains)
- PvP vs AI opponents
- Sky Tower & King's Heart Forest zones
- Clan system

## 🛠️ Project Structure

```
src/
├── data/
│   ├── guards.js          # Guard database (stats, skills, types)
│   ├── quests.js           # Quest zones and quest definitions
│   └── typeChart.js        # Type effectiveness chart
├── engine/
│   ├── combat.js           # Auto-battle engine
│   └── formulas.js         # XP, training cost, HP calculations
├── components/
│   ├── TitleScreen.jsx
│   ├── MainMenu.jsx
│   ├── QuestScreen.jsx
│   ├── GuardsScreen.jsx
│   ├── ShopScreen.jsx
│   ├── BattleResultScreen.jsx
│   ├── QuestResultScreen.jsx
│   ├── ProfileScreen.jsx
│   └── ScreenHeader.jsx
├── hooks/
│   └── useGameState.js     # Core game state management
├── styles/
│   └── theme.css           # Global styles + CSS variables
├── App.jsx
└── main.jsx
```

## 🚀 Development

```bash
npm install
npm run dev
```

## 📦 Deploy to GitHub Pages

The project auto-deploys via the included GitHub Actions workflow.

1. Create a repo named `pocket-summoner` on GitHub
2. Push this code to the `main` branch
3. Go to **Settings → Pages → Source** → select **GitHub Actions**
4. Live at `https://yourusername.github.io/pocket-summoner/`

> If your repo name differs, update the `base` field in `vite.config.js`.

## 🎯 Type Chart Reference

| Type | Strong Against | Weak Against |
|------|---------------|-------------|
| Fire | Electricity, Dark, Grass | Water |
| Water | Fire, Ground | Electricity, Ground |
| Ground | Water, Electricity | Poison, Fire |
| Poison | Fire, Grass | Water, Wind |
| Dark | Normal | Light |
| Light | Dark, Magical | — |
| Magical | Normal | Dark, Light |
| Electricity | Water | Ground |

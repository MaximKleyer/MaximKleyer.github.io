import { installLocalStorage, newGame } from './tests/helpers.mjs';
import { simulateSeries } from './src/classes/Match.js';
installLocalStorage();
const gs = newGame();
const region = gs.regions.americas;
const [a, b] = region.teams.filter(t => !t.isHuman);
for (const t of [a, b]) for (const p of t.roster) {
  p.ratings = { aim: 75, positioning: 75, utility: 75, gamesense: 75, clutch: 75 };
  p.overall = p.calcOverall();
}
a.mapRatings = b.mapRatings;
a.strategy.iglId = a.startingFive[0].id;
a.startingFive[0].ratings.gamesense = 95;
b.strategy.iglId = b.startingFive[0].id;
b.startingFive[0].ratings.gamesense = 60;
let aw = 0; const N = 800;
for (let i = 0; i < N; i++) { if (simulateSeries(a, b, 3).winner === a) aw++; }
console.log(`${(100*aw/N).toFixed(1)}% series wins for the 95-IQ side`);

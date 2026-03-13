/**
 * Valorant GM Simulator - Bundled Game Script
 * All game logic in a single file for GitHub Pages compatibility
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const ROLES = ['Duelist', 'Initiator', 'Controller', 'Sentinel'];
const MAPS = ['Ascent', 'Bind', 'Haven', 'Split', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset', 'Abyss'];
const REGIONS = ['AMERICAS', 'EMEA', 'CHINA', 'APAC'];

const TEAM_NAMES = {
    AMERICAS: [
        { name: 'Sentinels', abbr: 'SEN' },
        { name: 'Cloud9', abbr: 'C9' },
        { name: '100 Thieves', abbr: '100T' },
        { name: 'NRG', abbr: 'NRG' },
        { name: 'LOUD', abbr: 'LOUD' },
        { name: 'FURIA', abbr: 'FUR' },
        { name: 'MIBR', abbr: 'MIBR' },
        { name: 'Leviatán', abbr: 'LEV' },
        { name: 'KRÜ Esports', abbr: 'KRU' },
        { name: 'G2 Esports', abbr: 'G2' },
        { name: 'Evil Geniuses', abbr: 'EG' },
        { name: 'Team Envy', abbr: 'ENVY' }
    ],
    EMEA: [
        { name: 'Fnatic', abbr: 'FNC' },
        { name: 'Team Vitality', abbr: 'VIT' },
        { name: 'Team Liquid', abbr: 'TL' },
        { name: 'NAVI', abbr: 'NAVI' },
        { name: 'Team Heretics', abbr: 'TH' },
        { name: 'Karmine Corp', abbr: 'KC' },
        { name: 'BBL Esports', abbr: 'BBL' },
        { name: 'FUT Esports', abbr: 'FUT' },
        { name: 'Giants Gaming', abbr: 'GX' },
        { name: 'Picific Esports', abbr: 'PCF' },
        { name: 'Gentle Mates', abbr: 'M8' },
        { name: 'ULF Esports', abbr: 'ULF' }
    ],
    CHINA: [
        { name: 'EDward Gaming', abbr: 'EDG' },
        { name: 'Bilibili Gaming', abbr: 'BLG' },
        { name: 'FunPlus Phoenix', abbr: 'FPX' },
        { name: 'Trace Esports', abbr: 'TE' },
        { name: 'JD Gaming', abbr: 'JDG' },
        { name: 'Nova Esports', abbr: 'NOVA' },
        { name: 'Dragon Ranger Gaming', abbr: 'DRG' },
        { name: 'All Gamers', abbr: 'AG' },
        { name: 'Wolves Esports', abbr: 'WOL' },
        { name: 'TyLoo', abbr: 'TYL' },
        { name: 'XLG Esports ', abbr: 'XLG' },
        { name: 'Titan Esports', abbr: 'TITN' }
    ],
    APAC: [
        { name: 'DRX', abbr: 'DRX' },
        { name: 'T1', abbr: 'T1' },
        { name: 'Gen.G', abbr: 'GEN' },
        { name: 'Paper Rex', abbr: 'PRX' },
        { name: 'ZETA DIVISION', abbr: 'ZETA' },
        { name: 'DetonatioN FocusMe', abbr: 'DFM' },
        { name: 'Global Esports', abbr: 'GE' },
        { name: 'Team Secret', abbr: 'TS' },
        { name: 'NS RedForce', abbr: 'NS' },
        { name: 'Varrel', abbr: 'VRL' },
        { name: 'Rex Regum Qeon', abbr: 'RRQ' },
        { name: 'Full Sense', abbr: 'FULL' }
    ]
};

const NATIONALITIES = {
    AMERICAS: ['USA', 'Canada', 'Brazil', 'Argentina', 'Chile', 'Mexico'],
    EMEA: ['France', 'Germany', 'UK', 'Spain', 'Turkey', 'Russia', 'Poland', 'Sweden', 'Denmark'],
    CHINA: ['China'],
    APAC: ['South Korea', 'Japan', 'Philippines', 'Indonesia', 'Thailand', 'Singapore', 'India']
};

const FIRST_NAMES = [
    'Alex', 'Ryan', 'Jake', 'Tyler', 'Chris', 'Matt', 'Kevin', 'Daniel',
    'Michael', 'Jason', 'David', 'James', 'John', 'Andrew', 'Nick', 'Eric',
    'Lee', 'Kim', 'Park', 'Chen', 'Wang', 'Liu', 'Zhang', 'Tanaka',
    'Carlos', 'Pedro', 'Lucas', 'Gabriel', 'Felipe', 'Bruno', 'Rafael',
    'Max', 'Tom', 'Ben', 'Sam', 'Jack', 'Will', 'Luke', 'Adam'
];

const IGN_STYLES = ['', 'x', 'z', '_', '1', '2', 'gg', 'tv', 'pro', 'god', 'ace', 'king', 'boss'];

const POINTS_TABLE = {
    kickoff: { 1: 3, 2: 2, 3: 1 },
    masters_1: { 1: 5, 2: 3, 3: 2, 4: 1 },
    stage_1: { 1: 5, 2: 3, 3: 2, 4: 1 },
    masters_2: { 1: 7, 2: 5, 3: 4, 4: 3, 5: 2, 6: 2 },
    stage_2: { 1: 7, 2: 5, 3: 4, 4: 3 }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(prefix = 'id') {
    return prefix + '_' + Math.random().toString(36).substr(2, 9);
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function formatMoney(amount) {
    return '$' + amount.toLocaleString();
}

function generateIGN() {
    const name = FIRST_NAMES[randInt(0, FIRST_NAMES.length - 1)];
    const style = IGN_STYLES[randInt(0, IGN_STYLES.length - 1)];
    const formats = [
        () => name.toLowerCase(),
        () => name.toLowerCase() + style,
        () => name.slice(0, randInt(3, 5)).toLowerCase() + style,
        () => name[0].toUpperCase() + name.slice(1, randInt(4, 6)).toLowerCase()
    ];
    return formats[randInt(0, formats.length - 1)]();
}

// ============================================================================
// PLAYER ATTRIBUTES
// ============================================================================

class PlayerAttributes {
    constructor(tier = 'average') {
        const ranges = {
            star: [75, 95],
            good: [65, 85],
            average: [50, 75],
            prospect: [35, 60]
        };
        const [min, max] = ranges[tier] || ranges.average;

        this.aim = {
            flicking: randInt(min, max),
            tracking: randInt(min, max),
            burstControl: randInt(min, max),
            microAdjustment: randInt(min, max)
        };

        this.gameSense = {
            mapAwareness: randInt(min, max),
            timing: randInt(min, max),
            economyIQ: randInt(min, max),
            clutchIQ: randInt(min, max),
            gameIQ: randInt(min, max)
        };

        this.movement = {
            positioning: randInt(min, max),
            peeking: randInt(min, max),
            counterStrafing: randInt(min, max),
            offAnglePlay: randInt(min, max)
        };

        this.agentProficiency = {
            utilityUsage: randInt(min, max),
            lineupKnowledge: randInt(min, max),
            agentPool: randInt(min, max)
        };

        this.teamPlay = {
            communication: randInt(min, max),
            supportPlay: randInt(min, max),
            discipline: randInt(min, max)
        };

        this.mental = {
            consistency: randInt(min, max),
            adaptability: randInt(min, max)
        };
    }

    get aimRating() {
        const a = this.aim;
        return Math.round(a.flicking * 0.3 + a.tracking * 0.25 + a.burstControl * 0.25 + a.microAdjustment * 0.2);
    }

    get gameSenseRating() {
        const g = this.gameSense;
        return Math.round(g.mapAwareness * 0.2 + g.timing * 0.2 + g.economyIQ * 0.15 + g.clutchIQ * 0.2 + g.gameIQ * 0.25);
    }

    get movementRating() {
        const m = this.movement;
        return Math.round(m.positioning * 0.35 + m.peeking * 0.25 + m.counterStrafing * 0.2 + m.offAnglePlay * 0.2);
    }

    get agentRating() {
        const a = this.agentProficiency;
        return Math.round(a.utilityUsage * 0.4 + a.lineupKnowledge * 0.3 + a.agentPool * 0.3);
    }

    get teamPlayRating() {
        const t = this.teamPlay;
        return Math.round(t.communication * 0.4 + t.supportPlay * 0.3 + t.discipline * 0.3);
    }

    get mentalRating() {
        const m = this.mental;
        return Math.round(m.consistency * 0.6 + m.adaptability * 0.4);
    }

    get overall() {
        return Math.round(
            this.aimRating * 0.25 +
            this.gameSenseRating * 0.2 +
            this.movementRating * 0.15 +
            this.agentRating * 0.15 +
            this.teamPlayRating * 0.1 +
            this.mentalRating * 0.15
        );
    }
}

// ============================================================================
// MATCH STATS
// ============================================================================

class MatchStats {
    constructor() {
        this.kills = 0;
        this.deaths = 0;
        this.assists = 0;
        this.damageDealt = 0;
        this.damageReceived = 0;
        this.headshots = 0;
        this.bodyshots = 0;
        this.legshots = 0;
        this.firstBloods = 0;
        this.clutchesWon = 0;
        this.roundsPlayed = 0;
        this.roundsWithKAST = 0;
        this.threeKs = 0;
        this.fourKs = 0;
        this.aces = 0;
    }

    get kd() { return this.deaths > 0 ? (this.kills / this.deaths).toFixed(2) : this.kills.toFixed(2); }
    get kad() { return this.deaths > 0 ? ((this.kills + this.assists) / this.deaths).toFixed(2) : (this.kills + this.assists).toFixed(2); }
    get kast() { return this.roundsPlayed > 0 ? ((this.roundsWithKAST / this.roundsPlayed) * 100).toFixed(1) : '0.0'; }
    get adr() { return this.roundsPlayed > 0 ? (this.damageDealt / this.roundsPlayed).toFixed(1) : '0.0'; }
    get ddDelta() { return this.roundsPlayed > 0 ? ((this.damageDealt - this.damageReceived) / this.roundsPlayed).toFixed(1) : '0.0'; }
    get headshotPct() {
        const total = this.headshots + this.bodyshots + this.legshots;
        return total > 0 ? ((this.headshots / total) * 100).toFixed(1) : '0.0';
    }
    get killsPerRound() { return this.roundsPlayed > 0 ? (this.kills / this.roundsPlayed).toFixed(2) : '0.00'; }
    get acs() {
        if (this.roundsPlayed === 0) return 0;
        const score = this.damageDealt + this.kills * 50 + this.assists * 25 + this.firstBloods * 50 + this.threeKs * 50 + this.fourKs * 100 + this.aces * 200;
        return Math.round(score / this.roundsPlayed);
    }

    add(other) {
        this.kills += other.kills;
        this.deaths += other.deaths;
        this.assists += other.assists;
        this.damageDealt += other.damageDealt;
        this.damageReceived += other.damageReceived;
        this.headshots += other.headshots;
        this.bodyshots += other.bodyshots;
        this.legshots += other.legshots;
        this.firstBloods += other.firstBloods;
        this.clutchesWon += other.clutchesWon;
        this.roundsPlayed += other.roundsPlayed;
        this.roundsWithKAST += other.roundsWithKAST;
        this.threeKs += other.threeKs;
        this.fourKs += other.fourKs;
        this.aces += other.aces;
    }
}

// ============================================================================
// PLAYER
// ============================================================================

class Player {
    constructor(name, role, nationality, age, tier = 'average') {
        this.id = generateId('player');
        this.name = name;
        this.role = role;
        this.nationality = nationality;
        this.age = age;
        this.teamId = null;
        this.attributes = new PlayerAttributes(tier);
        this.potential = this.calcPotential(tier);
        this.peakAge = randInt(22, 26);

        this.mapRatings = {};
        for (const map of MAPS) {
            this.mapRatings[map] = clamp(this.attributes.overall + randInt(-5, 5), 1, 99);
        }

        this.morale = randInt(60, 80);
        this.careerStats = new MatchStats();
        this.seasonStats = new MatchStats();
        this.mapStats = {};
        for (const map of MAPS) {
            this.mapStats[map] = new MatchStats();
        }

        this.contract = null;
    }

    calcPotential(tier) {
        const ranges = { star: [85, 99], good: [75, 92], average: [60, 85], prospect: [70, 95] };
        const [min, max] = ranges[tier] || ranges.average;
        return randInt(min, max);
    }

    get overall() { return this.attributes.overall; }
    getMapRating(map) { return this.mapRatings[map] || this.overall; }

    resetSeasonStats() {
        this.seasonStats = new MatchStats();
        for (const map of MAPS) {
            this.mapStats[map] = new MatchStats();
        }
    }

    recordMatchStats(mapName, stats) {
        this.careerStats.add(stats);
        this.seasonStats.add(stats);
        if (this.mapStats[mapName]) this.mapStats[mapName].add(stats);
    }

    updateMorale(change) {
        this.morale = clamp(this.morale + change, 0, 100);
    }
}

// ============================================================================
// CONTRACT & TEAM
// ============================================================================

class Contract {
    constructor(playerId, teamId, salary, years) {
        this.playerId = playerId;
        this.teamId = teamId;
        this.salary = salary;
        this.years = years;
        this.buyout = salary * 2;
    }
}

class TeamStats {
    constructor() {
        this.matchesWon = 0;
        this.matchesLost = 0;
        this.mapsWon = 0;
        this.mapsLost = 0;
        this.roundsWon = 0;
        this.roundsLost = 0;
        this.seasonPoints = 0;
    }

    get matchRecord() { return `${this.matchesWon}-${this.matchesLost}`; }
    get mapRecord() { return `${this.mapsWon}-${this.mapsLost}`; }

    reset() {
        this.matchesWon = 0;
        this.matchesLost = 0;
        this.mapsWon = 0;
        this.mapsLost = 0;
        this.roundsWon = 0;
        this.roundsLost = 0;
        this.seasonPoints = 0;
    }
}

class Finances {
    constructor(tier = 'average') {
        const budgets = {
            star: { balance: 5000000, budget: 2000000 },
            good: { balance: 3000000, budget: 1200000 },
            average: { balance: 1500000, budget: 800000 },
            prospect: { balance: 800000, budget: 500000 }
        };
        const base = budgets[tier] || budgets.average;
        this.balance = base.balance;
        this.yearlyBudget = base.budget;
    }
}

class Team {
    constructor(name, abbreviation, region, tier = 'average') {
        this.id = generateId('team');
        this.name = name;
        this.abbreviation = abbreviation;
        this.region = region;
        this.tier = tier;
        this.roster = [];
        this.contracts = {};
        this.finances = new Finances(tier);
        this.seasonStats = new TeamStats();
        this.isPlayerTeam = false;
        this.teamMorale = 70;
        this.streak = 0;
    }

    getOverall(players) {
        if (this.roster.length === 0) return 0;
        let total = 0;
        for (const pid of this.roster) {
            if (players[pid]) total += players[pid].overall;
        }
        return Math.round(total / this.roster.length);
    }

    get yearlySalary() {
        let total = 0;
        for (const c of Object.values(this.contracts)) total += c.salary;
        return total;
    }

    get capSpace() { return this.finances.yearlyBudget - this.yearlySalary; }

    addPlayer(playerId, contract) {
        if (this.roster.length >= 6) return false;
        this.roster.push(playerId);
        this.contracts[playerId] = contract;
        return true;
    }

    removePlayer(playerId) {
        const idx = this.roster.indexOf(playerId);
        if (idx > -1) {
            this.roster.splice(idx, 1);
            delete this.contracts[playerId];
            return true;
        }
        return false;
    }

    getStarters() { return this.roster.slice(0, 5); }
    getSubstitute() { return this.roster.length > 5 ? this.roster[5] : null; }

    updateTeamMorale(players) {
        if (this.roster.length === 0) { this.teamMorale = 50; return; }
        let total = 0;
        for (const pid of this.roster) {
            if (players[pid]) total += players[pid].morale;
        }
        this.teamMorale = Math.round(total / this.roster.length);
    }

    updateStreak(won) {
        this.streak = won ? (this.streak > 0 ? this.streak + 1 : 1) : (this.streak < 0 ? this.streak - 1 : -1);
    }

    resetSeason() {
        this.seasonStats.reset();
        this.streak = 0;
    }
}

// ============================================================================
// MATCH ENGINE
// ============================================================================

class MatchEngine {
    constructor() {
        this.agents = {
            Duelist: ['Jett', 'Raze', 'Phoenix', 'Reyna', 'Yoru', 'Neon', 'Iso'],
            Initiator: ['Sova', 'Breach', 'Skye', 'KAY/O', 'Fade', 'Gekko'],
            Controller: ['Brimstone', 'Omen', 'Astra', 'Viper', 'Harbor', 'Clove'],
            Sentinel: ['Sage', 'Cypher', 'Killjoy', 'Chamber', 'Deadlock', 'Vyse']
        };
    }

    pickAgent(player) {
        const agents = this.agents[player.role] || this.agents.Duelist;
        return agents[randInt(0, agents.length - 1)];
    }

    selectMap(played = []) {
        const available = MAPS.filter(m => !played.includes(m));
        return available.length > 0 ? available[randInt(0, available.length - 1)] : MAPS[randInt(0, MAPS.length - 1)];
    }

    calcTeamStrength(team, players, mapName) {
        const starters = team.getStarters();
        if (starters.length < 5) return 50;

        let total = 0;
        for (const pid of starters) {
            const p = players[pid];
            if (p) {
                let rating = p.getMapRating(mapName);
                rating *= 1 + (p.morale - 50) / 500;
                total += rating;
            }
        }
        total *= 1 + (team.teamMorale - 50) / 1000;
        return total / 5;
    }

    simulateRound(team1, team2, players, mapName, team1Attacking) {
        const t1Strength = this.calcTeamStrength(team1, players, mapName);
        const t2Strength = this.calcTeamStrength(team2, players, mapName);

        let t1WinProb = t1Strength / (t1Strength + t2Strength);
        t1WinProb += team1Attacking ? 0.05 : -0.05;
        t1WinProb = clamp(t1WinProb, 0.15, 0.85);

        const team1Wins = Math.random() < t1WinProb;
        
        // Generate player stats for this round
        const roundStats = {};
        const allPlayers = [...team1.getStarters(), ...team2.getStarters()];
        const winners = team1Wins ? team1.getStarters() : team2.getStarters();
        const losers = team1Wins ? team2.getStarters() : team1.getStarters();

        for (const pid of allPlayers) {
            roundStats[pid] = {
                kills: 0, deaths: 0, assists: 0, damage: 0, damageReceived: 0,
                headshots: 0, bodyshots: 0, legshots: 0, survived: false, kast: false
            };
        }

        // Deaths: losers die more
        const loserDeaths = randInt(3, 5);
        const winnerDeaths = randInt(0, Math.min(loserDeaths - 1, 4));

        const shuffledLosers = [...losers].sort(() => Math.random() - 0.5);
        const shuffledWinners = [...winners].sort(() => Math.random() - 0.5);

        for (let i = 0; i < loserDeaths && i < shuffledLosers.length; i++) {
            roundStats[shuffledLosers[i]].deaths = 1;
        }
        for (let i = 0; i < winnerDeaths && i < shuffledWinners.length; i++) {
            roundStats[shuffledWinners[i]].deaths = 1;
        }

        // Kills distribution
        const totalKills = loserDeaths + winnerDeaths;
        const killers = allPlayers.filter(pid => roundStats[pid].deaths === 0);

        for (let i = 0; i < totalKills; i++) {
            const killer = killers.length > 0 ? killers[randInt(0, killers.length - 1)] : allPlayers[randInt(0, allPlayers.length - 1)];
            roundStats[killer].kills++;

            const p = players[killer];
            const hsChance = p ? p.attributes.aim.flicking / 200 + 0.15 : 0.3;
            if (Math.random() < hsChance) roundStats[killer].headshots++;
            else if (Math.random() < 0.7) roundStats[killer].bodyshots++;
            else roundStats[killer].legshots++;
        }

        // Damage and KAST
        for (const pid of allPlayers) {
            const s = roundStats[pid];
            s.damage = s.kills * randInt(130, 170) + (s.deaths === 0 ? randInt(0, 80) : 0);
            s.damageReceived = s.deaths === 1 ? randInt(100, 150) : randInt(0, 100);
            s.survived = s.deaths === 0;
            s.kast = s.survived || s.kills > 0 || (s.deaths === 1 && s.kills > 0);
            
            // Assists for survivors without kills
            if (s.deaths === 0 && s.kills === 0 && Math.random() < 0.4) {
                s.assists = 1;
                s.kast = true;
            }
        }

        return { winner: team1Wins ? team1.id : team2.id, stats: roundStats };
    }

    simulateMap(team1, team2, players) {
        const mapName = this.selectMap();
        let t1Score = 0, t2Score = 0;
        const rounds = [];
        let t1Attacking = Math.random() < 0.5;
        let roundNum = 0;

        const playerMapStats = {};
        for (const pid of [...team1.roster, ...team2.roster]) {
            playerMapStats[pid] = new MatchStats();
        }

        while (t1Score < 13 && t2Score < 13 && roundNum < 50) {
            roundNum++;
            if (roundNum === 13) t1Attacking = !t1Attacking;
            if (roundNum > 24 && (roundNum - 25) % 2 === 0) t1Attacking = !t1Attacking;

            const result = this.simulateRound(team1, team2, players, mapName, t1Attacking);
            rounds.push(result);

            if (result.winner === team1.id) t1Score++;
            else t2Score++;

            // Aggregate stats
            for (const [pid, s] of Object.entries(result.stats)) {
                const ms = playerMapStats[pid];
                if (ms) {
                    ms.kills += s.kills;
                    ms.deaths += s.deaths;
                    ms.assists += s.assists;
                    ms.damageDealt += s.damage;
                    ms.damageReceived += s.damageReceived;
                    ms.headshots += s.headshots;
                    ms.bodyshots += s.bodyshots;
                    ms.legshots += s.legshots;
                    ms.roundsPlayed++;
                    if (s.kast) ms.roundsWithKAST++;
                    if (s.kills === 3) ms.threeKs++;
                    if (s.kills === 4) ms.fourKs++;
                    if (s.kills === 5) ms.aces++;
                }
            }

            // Check OT
            if (t1Score >= 12 && t2Score >= 12 && Math.abs(t1Score - t2Score) < 2) continue;
        }

        return {
            mapName,
            team1Score: t1Score,
            team2Score: t2Score,
            winner: t1Score > t2Score ? team1.id : team2.id,
            playerStats: playerMapStats,
            rounds
        };
    }

    simulateSeries(team1, team2, players, bestOf = 3) {
        const winsNeeded = Math.ceil(bestOf / 2);
        let t1Wins = 0, t2Wins = 0;
        const maps = [];
        const playedMaps = [];

        const seriesStats = {};
        for (const pid of [...team1.roster, ...team2.roster]) {
            seriesStats[pid] = new MatchStats();
        }

        while (t1Wins < winsNeeded && t2Wins < winsNeeded) {
            const mapResult = this.simulateMap(team1, team2, players);
            maps.push(mapResult);
            playedMaps.push(mapResult.mapName);

            if (mapResult.winner === team1.id) t1Wins++;
            else t2Wins++;

            for (const [pid, stats] of Object.entries(mapResult.playerStats)) {
                if (seriesStats[pid]) seriesStats[pid].add(stats);
            }
        }

        const winnerId = t1Wins > t2Wins ? team1.id : team2.id;
        const loserId = winnerId === team1.id ? team2.id : team1.id;

        return {
            team1Id: team1.id,
            team2Id: team2.id,
            team1Wins: t1Wins,
            team2Wins: t2Wins,
            winnerId,
            loserId,
            score: `${t1Wins}-${t2Wins}`,
            maps,
            playerStats: seriesStats
        };
    }

    applyResults(result, teams, players) {
        const winner = teams[result.winnerId];
        const loser = teams[result.loserId];

        winner.seasonStats.matchesWon++;
        loser.seasonStats.matchesLost++;
        winner.seasonStats.mapsWon += result.team1Wins > result.team2Wins ? result.team1Wins : result.team2Wins;
        winner.seasonStats.mapsLost += result.team1Wins > result.team2Wins ? result.team2Wins : result.team1Wins;
        loser.seasonStats.mapsWon += result.team1Wins > result.team2Wins ? result.team2Wins : result.team1Wins;
        loser.seasonStats.mapsLost += result.team1Wins > result.team2Wins ? result.team1Wins : result.team2Wins;

        winner.updateStreak(true);
        loser.updateStreak(false);

        for (const map of result.maps) {
            for (const [pid, stats] of Object.entries(map.playerStats)) {
                if (players[pid]) players[pid].recordMatchStats(map.mapName, stats);
            }
        }

        for (const pid of winner.roster) {
            if (players[pid]) players[pid].updateMorale(randInt(2, 5));
        }
        for (const pid of loser.roster) {
            if (players[pid]) players[pid].updateMorale(-randInt(1, 4));
        }

        winner.updateTeamMorale(players);
        loser.updateTeamMorale(players);
    }
}

// ============================================================================
// TOURNAMENT SYSTEM
// ============================================================================

class TripleElimBracket {
    constructor(teamIds) {
        this.teamIds = [...teamIds];
        this.losses = {};
        this.placements = {};
        this.matches = [];
        this.isComplete = false;

        for (const id of teamIds) this.losses[id] = 0;
    }

    getActive() { return this.teamIds.filter(id => this.losses[id] < 3); }

    generateMatches() {
        const active = this.getActive();
        if (active.length <= 1) {
            this.isComplete = true;
            if (active.length === 1) this.placements[active[0]] = 1;
            return [];
        }

        const byLosses = { 0: [], 1: [], 2: [] };
        for (const id of active) byLosses[this.losses[id]].push(id);

        const matches = [];
        for (let l = 0; l <= 2; l++) {
            const pool = [...byLosses[l]].sort(() => Math.random() - 0.5);
            while (pool.length >= 2) {
                matches.push({ id: generateId('match'), team1: pool.shift(), team2: pool.pop(), bestOf: 3 });
            }
        }
        this.matches.push(...matches);
        return matches;
    }

    recordResult(matchId, winnerId) {
        const match = this.matches.find(m => m.id === matchId);
        if (!match) return;

        const loserId = match.team1 === winnerId ? match.team2 : match.team1;
        this.losses[loserId]++;

        if (this.losses[loserId] >= 3) {
            this.placements[loserId] = this.getActive().length + 1;
        }

        if (this.getActive().length === 1) {
            this.placements[this.getActive()[0]] = 1;
            this.isComplete = true;
        }
    }
}

// ============================================================================
// DATA GENERATION
// ============================================================================

function generatePlayer(region, role, tier = 'average') {
    const nats = NATIONALITIES[region] || NATIONALITIES.AMERICAS;
    const nationality = nats[randInt(0, nats.length - 1)];
    const age = randInt(17, 28);
    const name = generateIGN();
    return new Player(name, role, nationality, age, tier);
}

function generateRoster(region, tier) {
    const roles = ['Duelist', 'Initiator', 'Controller', 'Sentinel', 'Initiator'];
    const players = roles.map(role => generatePlayer(region, role, tier));
    if (Math.random() < 0.5) {
        players.push(generatePlayer(region, ROLES[randInt(0, 3)], tier === 'star' ? 'good' : 'average'));
    }
    return players;
}

function calcSalary(player, tier) {
    const bases = { star: [150000, 300000], good: [80000, 150000], average: [40000, 80000], prospect: [20000, 40000] };
    const [min, max] = bases[tier] || bases.average;
    return Math.round(randInt(min, max) * (1 + (player.overall - 50) / 100));
}

function generateTeam(info, region, tier) {
    const team = new Team(info.name, info.abbr, region, tier);
    const roster = generateRoster(region, tier);
    
    for (const p of roster) {
        p.teamId = team.id;
        const salary = calcSalary(p, tier);
        const contract = new Contract(p.id, team.id, salary, randInt(1, 3));
        team.addPlayer(p.id, contract);
    }
    return { team, players: roster };
}

function generateRegion(region) {
    const infos = TEAM_NAMES[region];
    const teams = {};
    const players = {};
    
    const tiers = ['star', 'star', 'good', 'good', 'good', 'good', 'average', 'average', 'average', 'average', 'prospect', 'prospect'];
    const shuffled = tiers.sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < infos.length; i++) {
        const { team, players: roster } = generateTeam(infos[i], region, shuffled[i]);
        teams[team.id] = team;
        for (const p of roster) players[p.id] = p;
    }
    return { teams, players };
}

function generateFreeAgents(region, count = 20) {
    const fas = [];
    const tierDist = { star: 1, good: 4, average: 10, prospect: 5 };
    
    for (const [tier, num] of Object.entries(tierDist)) {
        for (let i = 0; i < num && fas.length < count; i++) {
            const role = ROLES[randInt(0, 3)];
            fas.push(generatePlayer(region, role, tier));
        }
    }
    return fas;
}

function generateGameState() {
    const allTeams = {};
    const allPlayers = {};
    const regionTeamIds = {};
    const freeAgentIds = {};

    for (const region of REGIONS) {
        const { teams, players } = generateRegion(region);
        Object.assign(allTeams, teams);
        Object.assign(allPlayers, players);
        regionTeamIds[region] = Object.keys(teams);

        const fas = generateFreeAgents(region, 20);
        freeAgentIds[region] = [];
        for (const fa of fas) {
            allPlayers[fa.id] = fa;
            freeAgentIds[region].push(fa.id);
        }
    }

    return { teams: allTeams, players: allPlayers, regionTeamIds, freeAgentIds };
}

// ============================================================================
// GAME CONTROLLER
// ============================================================================

let game = null;

class Game {
    constructor() {
        this.teams = {};
        this.players = {};
        this.regionTeamIds = {};
        this.freeAgentIds = {};
        this.playerTeamId = null;
        this.playerRegion = null;
        this.matchEngine = new MatchEngine();
        this.season = 1;
        this.week = 1;
        this.phase = 'preseason';
        this.tournament = null;
        this.seasonPoints = {};
        this.events = [];
    }

    newGame(teamId, region) {
        const state = generateGameState();
        this.teams = state.teams;
        this.players = state.players;
        this.regionTeamIds = state.regionTeamIds;
        this.freeAgentIds = state.freeAgentIds;

        this.playerTeamId = teamId;
        this.playerRegion = region;
        this.teams[teamId].isPlayerTeam = true;

        for (const tid of Object.keys(this.teams)) {
            this.seasonPoints[tid] = 0;
        }

        this.addEvent('game_start', `Welcome to ${this.teams[teamId].name}! Season ${this.season} begins.`);
        this.phase = 'kickoff';
        this.startKickoff();
    }

    get playerTeam() { return this.teams[this.playerTeamId]; }

    getTeamRoster(teamId) {
        const team = this.teams[teamId];
        if (!team) return [];
        return team.roster.map(id => this.players[id]).filter(p => p);
    }

    getFreeAgents() {
        const ids = this.freeAgentIds[this.playerRegion] || [];
        return ids.map(id => this.players[id]).filter(p => p);
    }

    addEvent(type, message) {
        this.events.push({ type, message, week: this.week, phase: this.phase, time: new Date().toISOString() });
        if (this.events.length > 100) this.events = this.events.slice(-100);
    }

    getRecentEvents(n = 20) { return this.events.slice(-n); }

    signPlayer(playerId, salary, years) {
        const player = this.players[playerId];
        const team = this.playerTeam;
        if (!player || !team) return { success: false, msg: 'Invalid' };

        const faIds = this.freeAgentIds[this.playerRegion] || [];
        if (!faIds.includes(playerId)) return { success: false, msg: 'Not a free agent' };
        if (team.roster.length >= 6) return { success: false, msg: 'Roster full' };
        if (salary > team.capSpace) return { success: false, msg: 'Cannot afford' };

        const contract = new Contract(playerId, team.id, salary, years);
        team.addPlayer(playerId, contract);
        player.teamId = team.id;

        const idx = faIds.indexOf(playerId);
        if (idx > -1) faIds.splice(idx, 1);

        this.addEvent('signing', `Signed ${player.name} (${formatMoney(salary)}/yr, ${years}yr)`);
        return { success: true, msg: `Signed ${player.name}` };
    }

    releasePlayer(playerId) {
        const player = this.players[playerId];
        const team = this.playerTeam;
        if (!player || !team) return { success: false, msg: 'Invalid' };
        if (team.roster.length <= 5) return { success: false, msg: 'Need 5 players' };

        team.removePlayer(playerId);
        player.teamId = null;

        if (!this.freeAgentIds[this.playerRegion]) this.freeAgentIds[this.playerRegion] = [];
        this.freeAgentIds[this.playerRegion].push(playerId);

        this.addEvent('release', `Released ${player.name}`);
        return { success: true, msg: `Released ${player.name}` };
    }

    getMarketValue(playerId) {
        const p = this.players[playerId];
        if (!p) return 0;
        let val = 20000;
        if (p.overall >= 85) val = 200000;
        else if (p.overall >= 75) val = 120000;
        else if (p.overall >= 65) val = 70000;
        else if (p.overall >= 55) val = 40000;
        if (p.age < 20) val *= 0.8;
        else if (p.age < 23) val *= 1.1;
        else if (p.age > 26) val *= 0.85;
        return Math.round(val);
    }

    startKickoff() {
        const teamIds = this.regionTeamIds[this.playerRegion];
        this.tournament = new TripleElimBracket(teamIds);
        this.addEvent('tournament', 'Kickoff begins!');
    }

    advanceWeek() {
        this.week++;
        const results = [];

        if (this.tournament && !this.tournament.isComplete) {
            const matches = this.tournament.generateMatches();

            for (const match of matches) {
                const t1 = this.teams[match.team1];
                const t2 = this.teams[match.team2];
                const result = this.matchEngine.simulateSeries(t1, t2, this.players, match.bestOf);
                this.matchEngine.applyResults(result, this.teams, this.players);
                this.tournament.recordResult(match.id, result.winnerId);

                results.push({
                    team1: t1.name,
                    team2: t2.name,
                    score: result.score,
                    winner: this.teams[result.winnerId].name,
                    isPlayerMatch: match.team1 === this.playerTeamId || match.team2 === this.playerTeamId
                });

                if (match.team1 === this.playerTeamId || match.team2 === this.playerTeamId) {
                    const won = result.winnerId === this.playerTeamId;
                    const opp = match.team1 === this.playerTeamId ? t2.name : t1.name;
                    this.addEvent(won ? 'match_win' : 'match_loss', `${won ? '✅ Victory' : '❌ Defeat'} vs ${opp} (${result.score})`);
                }
            }

            if (this.tournament.isComplete) {
                this.finalizeTournament();
            }
        }

        // AI moves
        if (Math.random() < 0.1) this.processAIMoves();

        return results;
    }

    finalizeTournament() {
        const placements = this.tournament.placements;
        const pointsTable = POINTS_TABLE[this.phase] || {};

        for (const [tid, place] of Object.entries(placements)) {
            const pts = pointsTable[place] || 0;
            this.seasonPoints[tid] = (this.seasonPoints[tid] || 0) + pts;
            this.teams[tid].seasonStats.seasonPoints = this.seasonPoints[tid];
        }

        const playerPlace = placements[this.playerTeamId];
        if (playerPlace) {
            const pts = pointsTable[playerPlace] || 0;
            this.addEvent('tournament_end', `${this.phase.toUpperCase()} complete! Finished ${playerPlace}${this.ordinal(playerPlace)} (+${pts} pts)`);
        }

        this.nextPhase();
    }

    ordinal(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    }

    nextPhase() {
        const phases = ['kickoff', 'stage_1', 'stage_2', 'offseason'];
        const idx = phases.indexOf(this.phase);
        this.phase = phases[(idx + 1) % phases.length];

        if (this.phase === 'offseason') {
            this.processOffseason();
            this.season++;
            this.phase = 'kickoff';
            this.week = 1;
            for (const tid of Object.keys(this.seasonPoints)) this.seasonPoints[tid] = 0;
            this.addEvent('new_season', `Season ${this.season} begins!`);
        }

        this.startKickoff();
    }

    processOffseason() {
        for (const t of Object.values(this.teams)) t.resetSeason();
        for (const p of Object.values(this.players)) p.resetSeasonStats();
        this.addEvent('offseason', 'Offseason complete.');
    }

    processAIMoves() {
        for (const [region, tids] of Object.entries(this.regionTeamIds)) {
            for (const tid of tids) {
                if (tid === this.playerTeamId) continue;
                const team = this.teams[tid];
                const fas = this.freeAgentIds[region] || [];

                if (Math.random() < 0.05 && team.roster.length < 6 && fas.length > 0) {
                    const faId = fas[randInt(0, fas.length - 1)];
                    const fa = this.players[faId];
                    const salary = this.getMarketValue(faId);
                    if (salary <= team.capSpace) {
                        const contract = new Contract(faId, tid, salary, randInt(1, 2));
                        team.addPlayer(faId, contract);
                        fa.teamId = tid;
                        fas.splice(fas.indexOf(faId), 1);
                        this.addEvent('ai_signing', `${team.name} signs ${fa.name}`);
                    }
                }
            }
        }
    }

    getStandings() {
        const tids = this.regionTeamIds[this.playerRegion] || [];
        return tids.map(tid => {
            const t = this.teams[tid];
            return {
                teamId: tid,
                name: t.name,
                abbr: t.abbreviation,
                points: this.seasonPoints[tid] || 0,
                record: t.seasonStats.matchRecord,
                mapRecord: t.seasonStats.mapRecord,
                isPlayer: tid === this.playerTeamId
            };
        }).sort((a, b) => b.points - a.points || b.record.localeCompare(a.record));
    }

    save(slot = 'autosave') {
        const data = {
            version: '1.0',
            teams: this.teams,
            players: this.players,
            regionTeamIds: this.regionTeamIds,
            freeAgentIds: this.freeAgentIds,
            playerTeamId: this.playerTeamId,
            playerRegion: this.playerRegion,
            season: this.season,
            week: this.week,
            phase: this.phase,
            seasonPoints: this.seasonPoints,
            events: this.events.slice(-50)
        };
        localStorage.setItem(`valgm_${slot}`, JSON.stringify(data));
        return true;
    }

    static load(slot = 'autosave') {
        const raw = localStorage.getItem(`valgm_${slot}`);
        if (!raw) return null;

        try {
            const data = JSON.parse(raw);
            const g = new Game();
            g.teams = data.teams;
            g.players = data.players;
            g.regionTeamIds = data.regionTeamIds;
            g.freeAgentIds = data.freeAgentIds;
            g.playerTeamId = data.playerTeamId;
            g.playerRegion = data.playerRegion;
            g.season = data.season;
            g.week = data.week;
            g.phase = data.phase;
            g.seasonPoints = data.seasonPoints;
            g.events = data.events || [];

            // Reconstruct class instances
            for (const [id, t] of Object.entries(g.teams)) {
                const team = Object.assign(new Team(t.name, t.abbreviation, t.region, t.tier), t);
                team.finances = Object.assign(new Finances(), t.finances);
                team.seasonStats = Object.assign(new TeamStats(), t.seasonStats);
                team.contracts = {};
                for (const [pid, c] of Object.entries(t.contracts || {})) {
                    team.contracts[pid] = Object.assign(new Contract(c.playerId, c.teamId, c.salary, c.years), c);
                }
                g.teams[id] = team;
            }

            for (const [id, p] of Object.entries(g.players)) {
                const player = Object.assign(new Player(p.name, p.role, p.nationality, p.age), p);
                player.attributes = Object.assign(new PlayerAttributes(), p.attributes);
                player.careerStats = Object.assign(new MatchStats(), p.careerStats);
                player.seasonStats = Object.assign(new MatchStats(), p.seasonStats);
                player.mapStats = {};
                for (const [map, s] of Object.entries(p.mapStats || {})) {
                    player.mapStats[map] = Object.assign(new MatchStats(), s);
                }
                g.players[id] = player;
            }

            return g;
        } catch (e) {
            console.error('Load error:', e);
            return null;
        }
    }

    static getSaveSlots() {
        const slots = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('valgm_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    const teamName = data.teams?.[data.playerTeamId]?.name || 'Unknown';
                    slots.push({ slot: key.replace('valgm_', ''), teamName, season: data.season });
                } catch {}
            }
        }
        return slots;
    }
}

// ============================================================================
// UI CONTROLLER
// ============================================================================

let selectedRegion = 'AMERICAS';
let currentRoleFilter = 'all';

function showScreen(id) {
    document.querySelectorAll('.game-container').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function showStartScreen() { showScreen('start-screen'); }
function showTeamSelection() {
    showScreen('team-selection');
    renderTeamGrid();
}

function showGameScreen() {
    showScreen('game-screen');
    updateUI();
}

function showLoadGame() {
    const container = document.getElementById('save-slots-container');
    const list = document.getElementById('save-slots-list');
    container.style.display = 'block';

    const slots = Game.getSaveSlots();
    if (slots.length === 0) {
        list.innerHTML = '<p style="opacity:0.7;">No saved games found.</p>';
        return;
    }

    list.innerHTML = slots.map(s => `
        <div class="save-slot" onclick="loadGame('${s.slot}')">
            <div class="save-slot-info">
                <h4>${s.teamName}</h4>
                <span>Season ${s.season}</span>
            </div>
        </div>
    `).join('');
}

function loadGame(slot) {
    game = Game.load(slot);
    if (game) {
        showGameScreen();
    } else {
        alert('Failed to load save.');
    }
}

function renderTeamGrid() {
    const grid = document.getElementById('teams-grid');
    const infos = TEAM_NAMES[selectedRegion];
    
    // Generate temp data for preview
    const state = generateGameState();
    const tids = state.regionTeamIds[selectedRegion];
    
    grid.innerHTML = tids.map(tid => {
        const team = state.teams[tid];
        const tierClass = `tier-${team.tier}`;
        const overall = team.getOverall(state.players);
        
        return `
            <div class="team-card" onclick="selectTeam('${tid}', '${selectedRegion}')">
                <h3>${team.name}</h3>
                <div class="team-abbr">${team.abbreviation}</div>
                <div style="margin-top:10px;opacity:0.7;">OVR: ${overall}</div>
                <div class="team-tier ${tierClass}">${team.tier}</div>
            </div>
        `;
    }).join('');
}

function selectTeam(teamId, region) {
    game = new Game();
    game.newGame(teamId, region);
    game.save();
    showGameScreen();
}

// Region tabs
document.querySelectorAll('.region-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.region-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        selectedRegion = tab.dataset.region;
        renderTeamGrid();
    });
});

// Nav tabs
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
});

// FA filters
document.querySelectorAll('.fa-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.fa-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentRoleFilter = btn.dataset.role;
        renderFreeAgents();
    });
});

function updateUI() {
    if (!game) return;

    // Header
    const team = game.playerTeam;
    document.getElementById('header-team-name').textContent = team.name;
    document.getElementById('header-team-region').textContent = game.playerRegion;
    document.getElementById('header-season').textContent = game.season;
    document.getElementById('header-week').textContent = game.week;
    document.getElementById('header-points').textContent = game.seasonPoints[game.playerTeamId] || 0;
    document.getElementById('header-record').textContent = team.seasonStats.matchRecord;

    renderRoster();
    renderStandings();
    renderTournament();
    renderFreeAgents();
    renderEvents();
}

function renderRoster() {
    const grid = document.getElementById('roster-grid');
    const team = game.playerTeam;
    const roster = game.getTeamRoster(game.playerTeamId);

    document.getElementById('roster-salary').textContent = formatMoney(team.yearlySalary);
    document.getElementById('roster-cap').textContent = formatMoney(team.finances.yearlyBudget) + ' budget';

    grid.innerHTML = roster.map((p, i) => {
        const isStarter = i < 5;
        const ovrClass = p.overall >= 90 ? 'overall-90' : p.overall >= 80 ? 'overall-80' : p.overall >= 70 ? 'overall-70' : p.overall >= 60 ? 'overall-60' : '';
        const moraleClass = p.morale < 40 ? 'low' : p.morale < 60 ? 'medium' : '';
        const contract = team.contracts[p.id];

        return `
            <div class="player-card ${isStarter ? 'starter' : 'sub'}" onclick="showPlayerModal('${p.id}')">
                <div class="player-overall ${ovrClass}">${p.overall}</div>
                <div class="player-info">
                    <h4>${p.name}</h4>
                    <div class="role">${p.role}</div>
                    <div class="nationality">${p.nationality} • ${p.age}yo</div>
                </div>
                <div class="player-stats">
                    K/D: ${p.seasonStats.kd}<br>
                    ACS: ${p.seasonStats.acs}
                </div>
                <div class="player-morale">
                    <div style="font-size:0.8rem;">Morale</div>
                    <div class="morale-bar">
                        <div class="morale-fill ${moraleClass}" style="width:${p.morale}%"></div>
                    </div>
                </div>
                <div class="player-contract">
                    <div class="salary">${formatMoney(contract?.salary || 0)}/yr</div>
                    <div style="opacity:0.6;">${contract?.years || 0}yr left</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderStandings() {
    const body = document.getElementById('standings-body');
    const standings = game.getStandings();

    body.innerHTML = standings.map((s, i) => `
        <tr class="${s.isPlayer ? 'player-team' : ''}">
            <td>${i + 1}</td>
            <td><strong>${s.abbr}</strong> ${s.name}</td>
            <td style="color:var(--val-teal);font-weight:bold;">${s.points}</td>
            <td>${s.record}</td>
            <td>${s.mapRecord}</td>
        </tr>
    `).join('');
}

function renderTournament() {
    document.getElementById('tournament-name').textContent = game.phase.replace('_', ' ').toUpperCase();
    document.getElementById('tournament-phase').textContent = game.tournament ? 
        (game.tournament.isComplete ? 'Complete' : 'In Progress') : 'Not Started';

    const content = document.getElementById('tournament-content');
    if (game.tournament) {
        const placements = game.tournament.placements;
        const placed = Object.entries(placements).sort((a, b) => a[1] - b[1]).slice(0, 8);

        if (placed.length > 0) {
            content.innerHTML = '<h4 style="margin-bottom:15px;">Placements</h4>' + placed.map(([tid, place]) => {
                const team = game.teams[tid];
                const isPlayer = tid === game.playerTeamId;
                return `<div class="match-result ${isPlayer ? 'win' : ''}" style="margin-bottom:5px;">
                    <span style="color:var(--val-gold);font-weight:bold;">#${place}</span>
                    <span style="margin-left:15px;">${team.name}</span>
                </div>`;
            }).join('');
        } else {
            content.innerHTML = '<p style="text-align:center;opacity:0.7;">Tournament in progress...</p>';
        }
    } else {
        content.innerHTML = '<p style="text-align:center;opacity:0.7;">No active tournament</p>';
    }
}

function renderFreeAgents() {
    const list = document.getElementById('freeagents-list');
    let fas = game.getFreeAgents();

    if (currentRoleFilter !== 'all') {
        fas = fas.filter(p => p.role === currentRoleFilter);
    }

    fas.sort((a, b) => b.overall - a.overall);

    list.innerHTML = fas.slice(0, 20).map(p => {
        const ovrClass = p.overall >= 90 ? 'overall-90' : p.overall >= 80 ? 'overall-80' : p.overall >= 70 ? 'overall-70' : p.overall >= 60 ? 'overall-60' : '';
        const value = game.getMarketValue(p.id);

        return `
            <div class="fa-card">
                <div class="player-overall ${ovrClass}">${p.overall}</div>
                <div class="player-info">
                    <h4>${p.name}</h4>
                    <div class="role">${p.role}</div>
                    <div class="nationality">${p.nationality} • ${p.age}yo</div>
                </div>
                <div style="text-align:center;">
                    <div style="color:var(--val-teal);font-weight:bold;">${formatMoney(value)}/yr</div>
                    <div style="opacity:0.6;font-size:0.8rem;">Est. Value</div>
                </div>
                <button class="btn-sign" onclick="showSignModal('${p.id}')">Sign</button>
            </div>
        `;
    }).join('');

    if (fas.length === 0) {
        list.innerHTML = '<p style="text-align:center;opacity:0.7;">No free agents available</p>';
    }
}

function renderEvents() {
    const log = document.getElementById('events-log');
    const events = game.getRecentEvents(30).reverse();

    log.innerHTML = events.map(e => {
        const icon = e.type === 'match_win' ? '✅' : e.type === 'match_loss' ? '❌' : 
                     e.type === 'signing' ? '✍️' : e.type === 'release' ? '👋' :
                     e.type === 'tournament' || e.type === 'tournament_end' ? '🏆' : '📰';
        return `
            <div class="event-item">
                <div class="event-icon">${icon}</div>
                <div class="event-message">${e.message}</div>
                <div class="event-meta">Week ${e.week}</div>
            </div>
        `;
    }).join('');
}

function showPlayerModal(playerId) {
    const player = game.players[playerId];
    if (!player) return;

    document.getElementById('modal-player-name').textContent = player.name;
    const content = document.getElementById('modal-player-content');

    const attrs = player.attributes;
    content.innerHTML = `
        <div style="margin-bottom:20px;">
            <span class="role" style="font-size:1.1rem;">${player.role}</span>
            <span style="margin-left:15px;opacity:0.7;">${player.nationality} • ${player.age}yo</span>
            <span style="float:right;font-size:1.5rem;font-weight:bold;color:var(--val-teal);">OVR ${player.overall}</span>
        </div>
        
        <div class="player-detail-stats">
            <div class="stat-category">
                <h4>Aim (${attrs.aimRating})</h4>
                <div class="stat-row"><span class="stat-name">Flicking</span><span class="stat-value">${attrs.aim.flicking}</span></div>
                <div class="stat-row"><span class="stat-name">Tracking</span><span class="stat-value">${attrs.aim.tracking}</span></div>
                <div class="stat-row"><span class="stat-name">Burst Control</span><span class="stat-value">${attrs.aim.burstControl}</span></div>
                <div class="stat-row"><span class="stat-name">Micro-Adj</span><span class="stat-value">${attrs.aim.microAdjustment}</span></div>
            </div>
            <div class="stat-category">
                <h4>Game Sense (${attrs.gameSenseRating})</h4>
                <div class="stat-row"><span class="stat-name">Map Awareness</span><span class="stat-value">${attrs.gameSense.mapAwareness}</span></div>
                <div class="stat-row"><span class="stat-name">Timing</span><span class="stat-value">${attrs.gameSense.timing}</span></div>
                <div class="stat-row"><span class="stat-name">Economy IQ</span><span class="stat-value">${attrs.gameSense.economyIQ}</span></div>
                <div class="stat-row"><span class="stat-name">Clutch IQ</span><span class="stat-value">${attrs.gameSense.clutchIQ}</span></div>
                <div class="stat-row"><span class="stat-name">Game IQ</span><span class="stat-value">${attrs.gameSense.gameIQ}</span></div>
            </div>
            <div class="stat-category">
                <h4>Movement (${attrs.movementRating})</h4>
                <div class="stat-row"><span class="stat-name">Positioning</span><span class="stat-value">${attrs.movement.positioning}</span></div>
                <div class="stat-row"><span class="stat-name">Peeking</span><span class="stat-value">${attrs.movement.peeking}</span></div>
                <div class="stat-row"><span class="stat-name">Counter-Strafe</span><span class="stat-value">${attrs.movement.counterStrafing}</span></div>
                <div class="stat-row"><span class="stat-name">Off-Angle</span><span class="stat-value">${attrs.movement.offAnglePlay}</span></div>
            </div>
            <div class="stat-category">
                <h4>Agent Prof. (${attrs.agentRating})</h4>
                <div class="stat-row"><span class="stat-name">Utility Usage</span><span class="stat-value">${attrs.agentProficiency.utilityUsage}</span></div>
                <div class="stat-row"><span class="stat-name">Lineup Knowledge</span><span class="stat-value">${attrs.agentProficiency.lineupKnowledge}</span></div>
                <div class="stat-row"><span class="stat-name">Agent Pool</span><span class="stat-value">${attrs.agentProficiency.agentPool}</span></div>
            </div>
        </div>

        <h4 style="margin-top:20px;color:var(--val-red);">Season Stats</h4>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:10px;">
            <div class="stat-box"><div class="label">K/D</div><div class="value">${player.seasonStats.kd}</div></div>
            <div class="stat-box"><div class="label">ACS</div><div class="value">${player.seasonStats.acs}</div></div>
            <div class="stat-box"><div class="label">KAST</div><div class="value">${player.seasonStats.kast}%</div></div>
            <div class="stat-box"><div class="label">HS%</div><div class="value">${player.seasonStats.headshotPct}%</div></div>
            <div class="stat-box"><div class="label">ADR</div><div class="value">${player.seasonStats.adr}</div></div>
            <div class="stat-box"><div class="label">DDΔ</div><div class="value">${player.seasonStats.ddDelta}</div></div>
            <div class="stat-box"><div class="label">FB</div><div class="value">${player.seasonStats.firstBloods}</div></div>
            <div class="stat-box"><div class="label">Aces</div><div class="value">${player.seasonStats.aces}</div></div>
        </div>

        ${player.teamId === game.playerTeamId && game.playerTeam.roster.length > 5 ? 
            `<button class="btn-val" style="margin-top:20px;width:100%;" onclick="releasePlayerConfirm('${playerId}')">Release Player</button>` : ''}
    `;

    document.getElementById('player-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('player-modal').classList.remove('active');
}

let signPlayerId = null;

function showSignModal(playerId) {
    signPlayerId = playerId;
    const player = game.players[playerId];
    const value = game.getMarketValue(playerId);
    const team = game.playerTeam;

    const content = document.getElementById('sign-modal-content');
    content.innerHTML = `
        <div style="margin-bottom:20px;">
            <h4>${player.name}</h4>
            <span class="role">${player.role}</span> • OVR ${player.overall}
        </div>
        <div style="margin-bottom:20px;">
            <div style="opacity:0.7;">Estimated Value: <span style="color:var(--val-teal)">${formatMoney(value)}/yr</span></div>
            <div style="opacity:0.7;">Your Cap Space: <span style="color:var(--val-teal)">${formatMoney(team.capSpace)}</span></div>
        </div>
        <div style="margin-bottom:15px;">
            <label style="display:block;margin-bottom:5px;">Salary (per year)</label>
            <input type="number" id="sign-salary" value="${value}" min="10000" max="${team.capSpace}" 
                   style="width:100%;padding:10px;background:var(--val-gray);border:none;color:white;border-radius:4px;">
        </div>
        <div style="margin-bottom:20px;">
            <label style="display:block;margin-bottom:5px;">Contract Length (years)</label>
            <select id="sign-years" style="width:100%;padding:10px;background:var(--val-gray);border:none;color:white;border-radius:4px;">
                <option value="1">1 Year</option>
                <option value="2" selected>2 Years</option>
                <option value="3">3 Years</option>
            </select>
        </div>
        <button class="btn-val" style="width:100%;" onclick="confirmSign()">Sign Player</button>
    `;

    document.getElementById('sign-modal').classList.add('active');
}

function closeSignModal() {
    document.getElementById('sign-modal').classList.remove('active');
    signPlayerId = null;
}

function confirmSign() {
    const salary = parseInt(document.getElementById('sign-salary').value);
    const years = parseInt(document.getElementById('sign-years').value);

    const result = game.signPlayer(signPlayerId, salary, years);
    if (result.success) {
        game.save();
        closeSignModal();
        updateUI();
    } else {
        alert(result.msg);
    }
}

function releasePlayerConfirm(playerId) {
    const player = game.players[playerId];
    if (confirm(`Release ${player.name}?`)) {
        const result = game.releasePlayer(playerId);
        if (result.success) {
            game.save();
            closeModal();
            updateUI();
        } else {
            alert(result.msg);
        }
    }
}

function advanceWeek() {
    const results = game.advanceWeek();
    game.save();
    updateUI();

    if (results.length > 0) {
        showResultsModal(results);
    }
}

function showResultsModal(results) {
    const content = document.getElementById('results-modal-content');
    content.innerHTML = `
        <h4 style="margin-bottom:20px;">Week ${game.week - 1} Results</h4>
        ${results.map(r => `
            <div class="match-result ${r.isPlayerMatch ? (r.winner === game.playerTeam.name ? 'win' : 'loss') : ''}">
                <div class="match-teams">
                    <div class="match-team ${r.winner === r.team1 ? 'winner' : ''}">${r.team1}</div>
                    <div class="match-score">${r.score}</div>
                    <div class="match-team ${r.winner === r.team2 ? 'winner' : ''}">${r.team2}</div>
                </div>
            </div>
        `).join('')}
    `;
    document.getElementById('results-modal').classList.add('active');
}

function closeResultsModal() {
    document.getElementById('results-modal').classList.remove('active');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Valorant GM Simulator loaded');
});

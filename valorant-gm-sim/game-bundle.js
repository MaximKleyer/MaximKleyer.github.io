/**
 * Valorant GM Simulator - Complete Game Bundle v2.0
 * Full VCT Tournament System with Bracket Visualization
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
        { name: '2Game Esports', abbr: '2G' }
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
        { name: 'Giants Gaming', abbr: 'GIA' },
        { name: 'KOI', abbr: 'KOI' },
        { name: 'Gentle Mates', abbr: 'M8' },
        { name: 'Apeks', abbr: 'APK' }
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
        { name: 'Four Angry Men', abbr: '4AM' },
        { name: 'RA Esports', abbr: 'RA' }
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
        { name: 'BLEED Esports', abbr: 'BLD' },
        { name: 'Talon Esports', abbr: 'TLN' },
        { name: 'Rex Regum Qeon', abbr: 'RRQ' },
        { name: 'Boom Esports', abbr: 'BOOM' }
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

// Points awarded per tournament placement
const POINTS_TABLE = {
    kickoff: { 1: 3, 2: 2, 3: 1 },
    masters_1: { 1: 5, 2: 3, 3: 2, 4: 1 },
    stage_1: { 1: 5, 2: 3, 3: 2, 4: 1 }, // Plus +1 per group win
    masters_2: { 1: 7, 2: 5, 3: 4, 4: 3, 5: 2, 6: 2 },
    stage_2: { 1: 7, 2: 5, 3: 4, 4: 3 } // Plus +1 per group win
};

// Phase order for the season
const PHASE_ORDER = [
    'roster_kickoff',    // Roster changes before Kickoff
    'kickoff',           // Kickoff tournament
    'roster_masters1',   // Roster changes before Masters 1
    'masters_1',         // Masters 1 (international)
    'groups_stage1',     // Group reveal for Stage 1
    'stage_1_groups',    // Stage 1 group play
    'stage_1_playoffs',  // Stage 1 playoffs
    'roster_masters2',   // Roster changes before Masters 2
    'masters_2',         // Masters 2 (international)
    'groups_stage2',     // Group reveal for Stage 2
    'stage_2_groups',    // Stage 2 group play
    'stage_2_playoffs',  // Stage 2 playoffs
    'roster_worlds',     // Roster changes before Worlds
    'worlds',            // Worlds (international)
    'offseason'          // End of season
];

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

function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
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
    get headshotPct() {
        const total = this.headshots + this.bodyshots + this.legshots;
        return total > 0 ? ((this.headshots / total) * 100).toFixed(1) : '0.0';
    }
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
        
        // Tournament placements
        this.kickoffPlace = null;
        this.stage1Place = null;
        this.stage2Place = null;
        this.masters1Place = null;
        this.masters2Place = null;
        this.worldsPlace = null;
        
        // Group stage wins (for bonus points)
        this.stage1GroupWins = 0;
        this.stage2GroupWins = 0;
    }

    get matchRecord() { return this.matchesWon + '-' + this.matchesLost; }
    get mapRecord() { return this.mapsWon + '-' + this.mapsLost; }

    reset() {
        this.matchesWon = 0;
        this.matchesLost = 0;
        this.mapsWon = 0;
        this.mapsLost = 0;
        this.roundsWon = 0;
        this.roundsLost = 0;
        this.seasonPoints = 0;
        this.kickoffPlace = null;
        this.stage1Place = null;
        this.stage2Place = null;
        this.masters1Place = null;
        this.masters2Place = null;
        this.worldsPlace = null;
        this.stage1GroupWins = 0;
        this.stage2GroupWins = 0;
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
        if (this.roster.length >= 7) return false;
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

        for (const pid of allPlayers) {
            const s = roundStats[pid];
            s.damage = s.kills * randInt(130, 170) + (s.deaths === 0 ? randInt(0, 80) : 0);
            s.damageReceived = s.deaths === 1 ? randInt(100, 150) : randInt(0, 100);
            s.survived = s.deaths === 0;
            s.kast = s.survived || s.kills > 0 || (s.deaths === 1 && s.kills > 0);
            
            if (s.deaths === 0 && s.kills === 0 && Math.random() < 0.4) {
                s.assists = 1;
                s.kast = true;
            }
        }

        return { winner: team1Wins ? team1.id : team2.id, stats: roundStats };
    }

    simulateMap(team1, team2, players, mapName = null) {
        if (!mapName) mapName = this.selectMap();
        let t1Score = 0, t2Score = 0;
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

            if (result.winner === team1.id) t1Score++;
            else t2Score++;

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

            if (t1Score >= 12 && t2Score >= 12 && Math.abs(t1Score - t2Score) < 2) continue;
        }

        return {
            mapName,
            team1Score: t1Score,
            team2Score: t2Score,
            winner: t1Score > t2Score ? team1.id : team2.id,
            loser: t1Score > t2Score ? team2.id : team1.id,
            score: t1Score + '-' + t2Score,
            playerStats: playerMapStats
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
            const mapName = this.selectMap(playedMaps);
            playedMaps.push(mapName);
            const mapResult = this.simulateMap(team1, team2, players, mapName);
            maps.push(mapResult);

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
            score: t1Wins + '-' + t2Wins,
            maps,
            playerStats: seriesStats
        };
    }

    applyResults(result, teams, players) {
        const winner = teams[result.winnerId];
        const loser = teams[result.loserId];

        winner.seasonStats.matchesWon++;
        loser.seasonStats.matchesLost++;
        
        const winnerMaps = result.team1Wins > result.team2Wins ? result.team1Wins : result.team2Wins;
        const loserMaps = result.team1Wins > result.team2Wins ? result.team2Wins : result.team1Wins;
        
        winner.seasonStats.mapsWon += winnerMaps;
        winner.seasonStats.mapsLost += loserMaps;
        loser.seasonStats.mapsWon += loserMaps;
        loser.seasonStats.mapsLost += winnerMaps;

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
// TOURNAMENT CLASSES
// ============================================================================

// Match object for tournament tracking
class TournamentMatch {
    constructor(team1Id, team2Id, bestOf = 3, roundName = '') {
        this.id = generateId('match');
        this.team1Id = team1Id;
        this.team2Id = team2Id;
        this.bestOf = bestOf;
        this.roundName = roundName;
        this.winnerId = null;
        this.loserId = null;
        this.score = null;
        this.played = false;
        this.seriesResult = null;
    }
}

// Triple Elimination Bracket (Kickoff)
class TripleElimBracket {
    constructor(teamIds) {
        this.teamIds = [...teamIds];
        this.losses = {};
        this.placements = {};
        this.completedMatches = [];
        this.currentRound = 0;
        this.isComplete = false;

        for (const id of teamIds) this.losses[id] = 0;
    }

    getActive() { 
        return this.teamIds.filter(id => this.losses[id] < 3 && !this.placements[id]); 
    }

    generateMatches() {
        const active = this.getActive();
        if (active.length <= 1) {
            this.isComplete = true;
            if (active.length === 1) this.placements[active[0]] = 1;
            return [];
        }

        this.currentRound++;
        const byLosses = { 0: [], 1: [], 2: [] };
        for (const id of active) byLosses[this.losses[id]].push(id);

        const matches = [];
        for (let l = 0; l <= 2; l++) {
            const pool = [...byLosses[l]].sort(() => Math.random() - 0.5);
            while (pool.length >= 2) {
                const roundName = l === 0 ? 'Winners Round ' + this.currentRound : 
                                  l === 1 ? 'Losers Round ' + this.currentRound : 
                                  'Elimination Round ' + this.currentRound;
                matches.push(new TournamentMatch(pool.shift(), pool.pop(), 3, roundName));
            }
        }
        return matches;
    }

    recordResult(match, seriesResult) {
        match.winnerId = seriesResult.winnerId;
        match.loserId = seriesResult.loserId;
        match.score = seriesResult.score;
        match.played = true;
        match.seriesResult = seriesResult;
        
        this.completedMatches.push(match);
        this.losses[match.loserId]++;

        if (this.losses[match.loserId] >= 3) {
            const remaining = this.getActive().length + 1;
            this.placements[match.loserId] = remaining;
        }

        if (this.getActive().length <= 1) {
            const winner = this.getActive()[0];
            if (winner) this.placements[winner] = 1;
            this.isComplete = true;
        }
    }
}

// Swiss Bracket (for Masters and Worlds groups)
class SwissBracket {
    constructor(teamIds, winsNeeded = 3, lossesOut = 3) {
        this.teamIds = [...teamIds];
        this.winsNeeded = winsNeeded;
        this.lossesOut = lossesOut;
        this.records = {};
        this.completedMatches = [];
        this.qualified = [];
        this.eliminated = [];
        this.currentRound = 0;
        this.isComplete = false;

        for (const id of teamIds) {
            this.records[id] = { wins: 0, losses: 0 };
        }
    }

    getActive() {
        return this.teamIds.filter(id => 
            !this.qualified.includes(id) && !this.eliminated.includes(id)
        );
    }

    generateMatches() {
        const active = this.getActive();
        if (active.length < 2 || this.isComplete) {
            this.isComplete = true;
            return [];
        }

        this.currentRound++;
        const byRecord = {};
        for (const id of active) {
            const key = this.records[id].wins + '-' + this.records[id].losses;
            if (!byRecord[key]) byRecord[key] = [];
            byRecord[key].push(id);
        }

        const matches = [];
        const paired = new Set();

        const sortedKeys = Object.keys(byRecord).sort((a, b) => {
            const [aW] = a.split('-').map(Number);
            const [bW] = b.split('-').map(Number);
            return bW - aW;
        });

        for (const key of sortedKeys) {
            const pool = byRecord[key].filter(id => !paired.has(id)).sort(() => Math.random() - 0.5);
            while (pool.length >= 2) {
                const t1 = pool.shift();
                const t2 = pool.pop();
                matches.push(new TournamentMatch(t1, t2, 3, 'Swiss Round ' + this.currentRound));
                paired.add(t1);
                paired.add(t2);
            }
        }

        return matches;
    }

    recordResult(match, seriesResult) {
        match.winnerId = seriesResult.winnerId;
        match.loserId = seriesResult.loserId;
        match.score = seriesResult.score;
        match.played = true;
        match.seriesResult = seriesResult;
        
        this.completedMatches.push(match);
        this.records[match.winnerId].wins++;
        this.records[match.loserId].losses++;

        if (this.records[match.winnerId].wins >= this.winsNeeded) {
            if (!this.qualified.includes(match.winnerId)) {
                this.qualified.push(match.winnerId);
            }
        }

        if (this.records[match.loserId].losses >= this.lossesOut) {
            if (!this.eliminated.includes(match.loserId)) {
                this.eliminated.push(match.loserId);
            }
        }

        if (this.getActive().length === 0) {
            this.isComplete = true;
        }
    }
}

// Double Elimination Bracket (for playoffs)
class DoubleElimBracket {
    constructor(seedOrder) {
        this.seeds = [...seedOrder];
        this.upperBracket = [];
        this.lowerBracket = [];
        this.grandFinal = null;
        this.completedMatches = [];
        this.placements = {};
        this.isComplete = false;
        this.currentRound = 0;
        this.pendingMatches = [];
        
        this.initBracket();
    }

    initBracket() {
        // For 8 teams: UB R1 has 4 matches
        const n = this.seeds.length;
        if (n === 8) {
            this.pendingMatches = [
                new TournamentMatch(this.seeds[0], this.seeds[7], 3, 'Upper Round 1'),
                new TournamentMatch(this.seeds[3], this.seeds[4], 3, 'Upper Round 1'),
                new TournamentMatch(this.seeds[1], this.seeds[6], 3, 'Upper Round 1'),
                new TournamentMatch(this.seeds[2], this.seeds[5], 3, 'Upper Round 1')
            ];
            this.upperBracket.push([...this.pendingMatches]);
        }
    }

    generateMatches() {
        return this.pendingMatches.filter(m => !m.played);
    }

    recordResult(match, seriesResult) {
        match.winnerId = seriesResult.winnerId;
        match.loserId = seriesResult.loserId;
        match.score = seriesResult.score;
        match.played = true;
        match.seriesResult = seriesResult;
        
        this.completedMatches.push(match);
        this.progressBracket(match);
    }

    progressBracket(match) {
        // Simple 8-team double elim progression
        const ubR1 = this.upperBracket[0] || [];
        const ubR1Done = ubR1.every(m => m.played);

        if (ubR1Done && !this.upperBracket[1]) {
            // Create UB Semis
            const winners = ubR1.map(m => m.winnerId);
            const losers = ubR1.map(m => m.loserId);
            
            this.upperBracket[1] = [
                new TournamentMatch(winners[0], winners[1], 3, 'Upper Semifinal'),
                new TournamentMatch(winners[2], winners[3], 3, 'Upper Semifinal')
            ];
            this.pendingMatches.push(...this.upperBracket[1]);
            
            // Create LB R1
            this.lowerBracket[0] = [
                new TournamentMatch(losers[0], losers[1], 3, 'Lower Round 1'),
                new TournamentMatch(losers[2], losers[3], 3, 'Lower Round 1')
            ];
            this.pendingMatches.push(...this.lowerBracket[0]);
        }

        const ubR2 = this.upperBracket[1] || [];
        const lbR1 = this.lowerBracket[0] || [];
        const ubR2Done = ubR2.length > 0 && ubR2.every(m => m.played);
        const lbR1Done = lbR1.length > 0 && lbR1.every(m => m.played);

        if (ubR2Done && lbR1Done && !this.upperBracket[2]) {
            // UB Final
            this.upperBracket[2] = [
                new TournamentMatch(ubR2[0].winnerId, ubR2[1].winnerId, 3, 'Upper Final')
            ];
            this.pendingMatches.push(...this.upperBracket[2]);
            
            // LB R2 (LB winners vs UB losers)
            this.lowerBracket[1] = [
                new TournamentMatch(lbR1[0].winnerId, ubR2[0].loserId, 3, 'Lower Round 2'),
                new TournamentMatch(lbR1[1].winnerId, ubR2[1].loserId, 3, 'Lower Round 2')
            ];
            this.pendingMatches.push(...this.lowerBracket[1]);
            
            // Eliminate LB R1 losers
            for (const m of lbR1) {
                this.placements[m.loserId] = 7; // 7th-8th
            }
        }

        const ubFinal = this.upperBracket[2] || [];
        const lbR2 = this.lowerBracket[1] || [];
        const ubFinalDone = ubFinal.length > 0 && ubFinal.every(m => m.played);
        const lbR2Done = lbR2.length > 0 && lbR2.every(m => m.played);

        if (ubFinalDone && lbR2Done && !this.lowerBracket[2]) {
            // LB Semifinal
            this.lowerBracket[2] = [
                new TournamentMatch(lbR2[0].winnerId, lbR2[1].winnerId, 3, 'Lower Semifinal')
            ];
            this.pendingMatches.push(...this.lowerBracket[2]);
            
            // Eliminate LB R2 losers
            for (const m of lbR2) {
                this.placements[m.loserId] = 5; // 5th-6th
            }
        }

        const lbSemi = this.lowerBracket[2] || [];
        const lbSemiDone = lbSemi.length > 0 && lbSemi.every(m => m.played);

        if (ubFinalDone && lbSemiDone && !this.lowerBracket[3]) {
            // LB Final (LB semi winner vs UB Final loser)
            this.lowerBracket[3] = [
                new TournamentMatch(lbSemi[0].winnerId, ubFinal[0].loserId, 3, 'Lower Final')
            ];
            this.pendingMatches.push(...this.lowerBracket[3]);
            
            // Eliminate LB semi loser
            this.placements[lbSemi[0].loserId] = 4;
        }

        const lbFinal = this.lowerBracket[3] || [];
        const lbFinalDone = lbFinal.length > 0 && lbFinal.every(m => m.played);

        if (ubFinalDone && lbFinalDone && !this.grandFinal) {
            // Grand Final (UB winner vs LB winner) - BO5
            this.grandFinal = new TournamentMatch(ubFinal[0].winnerId, lbFinal[0].winnerId, 5, 'Grand Final');
            this.pendingMatches.push(this.grandFinal);
            
            // Eliminate LB final loser
            this.placements[lbFinal[0].loserId] = 3;
        }

        if (this.grandFinal && this.grandFinal.played) {
            this.placements[this.grandFinal.winnerId] = 1;
            this.placements[this.grandFinal.loserId] = 2;
            this.isComplete = true;
        }
    }
}

// Group Stage (for Stage 1/2)
class GroupStage {
    constructor(groups, matchesPerPair = 2) {
        // groups = { A: [teamIds], B: [teamIds] }
        this.groups = groups;
        this.matchesPerPair = matchesPerPair;
        this.standings = {};
        this.completedMatches = [];
        this.pendingMatches = [];
        this.isComplete = false;

        for (const [groupName, teams] of Object.entries(groups)) {
            this.standings[groupName] = teams.map(id => ({
                teamId: id,
                wins: 0,
                losses: 0,
                mapWins: 0,
                mapLosses: 0
            }));
        }

        this.generateAllMatches();
    }

    generateAllMatches() {
        for (const [groupName, teams] of Object.entries(this.groups)) {
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    for (let k = 0; k < this.matchesPerPair; k++) {
                        const t1 = k % 2 === 0 ? teams[i] : teams[j];
                        const t2 = k % 2 === 0 ? teams[j] : teams[i];
                        this.pendingMatches.push(new TournamentMatch(t1, t2, 3, 'Group ' + groupName));
                    }
                }
            }
        }
    }

    generateMatches(count = 6) {
        return this.pendingMatches.filter(m => !m.played).slice(0, count);
    }

    recordResult(match, seriesResult) {
        match.winnerId = seriesResult.winnerId;
        match.loserId = seriesResult.loserId;
        match.score = seriesResult.score;
        match.played = true;
        match.seriesResult = seriesResult;
        
        this.completedMatches.push(match);

        // Update standings
        for (const [groupName, teams] of Object.entries(this.groups)) {
            if (teams.includes(match.winnerId) && teams.includes(match.loserId)) {
                const ws = this.standings[groupName].find(s => s.teamId === match.winnerId);
                const ls = this.standings[groupName].find(s => s.teamId === match.loserId);
                
                if (ws) {
                    ws.wins++;
                    ws.mapWins += seriesResult.team1Wins > seriesResult.team2Wins ? 
                                  seriesResult.team1Wins : seriesResult.team2Wins;
                    ws.mapLosses += seriesResult.team1Wins > seriesResult.team2Wins ? 
                                   seriesResult.team2Wins : seriesResult.team1Wins;
                }
                if (ls) {
                    ls.losses++;
                    ls.mapWins += seriesResult.team1Wins > seriesResult.team2Wins ? 
                                  seriesResult.team2Wins : seriesResult.team1Wins;
                    ls.mapLosses += seriesResult.team1Wins > seriesResult.team2Wins ? 
                                   seriesResult.team1Wins : seriesResult.team2Wins;
                }
                break;
            }
        }

        if (this.pendingMatches.every(m => m.played)) {
            this.isComplete = true;
        }
    }

    getGroupStandings(groupName) {
        const standings = this.standings[groupName] || [];
        return [...standings].sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            return (b.mapWins - b.mapLosses) - (a.mapWins - a.mapLosses);
        });
    }

    getTop(groupName, n) {
        return this.getGroupStandings(groupName).slice(0, n).map(s => s.teamId);
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
    // Add 1-2 more players for bench
    const extraCount = randInt(1, 2);
    for (let i = 0; i < extraCount; i++) {
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
        this.phase = 'roster_kickoff';
        this.phaseIndex = 0;
        
        this.tournament = null;
        this.tournamentType = null;
        this.seasonPoints = {};
        this.events = [];
        
        // For group reveals
        this.currentGroups = null;
        
        // Roster lock state
        this.rosterLocked = false;
    }

    newGame(teamId, region) {
        this.playerTeamId = teamId;
        this.playerRegion = region;
        this.teams[teamId].isPlayerTeam = true;

        for (const tid of Object.keys(this.teams)) {
            this.seasonPoints[tid] = 0;
        }

        this.addEvent('game_start', 'Welcome to ' + this.teams[teamId].name + '! Season ' + this.season + ' begins.');
        this.addEvent('roster_period', 'Roster changes are now open. Prepare your team for Kickoff!');
        
        this.phase = 'roster_kickoff';
        this.phaseIndex = 0;
        this.rosterLocked = false;
    }

    get playerTeam() { return this.teams[this.playerTeamId]; }

    isRosterPhase() {
        return this.phase.startsWith('roster_') || this.phase === 'offseason';
    }

    canModifyRoster() {
        return this.isRosterPhase();
    }

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

    // =========================================================================
    // ROSTER MANAGEMENT
    // =========================================================================

    signPlayer(playerId, salary, years) {
        if (!this.canModifyRoster()) {
            return { success: false, msg: 'Roster is locked during events' };
        }
        
        const player = this.players[playerId];
        const team = this.playerTeam;
        if (!player || !team) return { success: false, msg: 'Invalid' };

        const faIds = this.freeAgentIds[this.playerRegion] || [];
        if (!faIds.includes(playerId)) return { success: false, msg: 'Not a free agent' };
        if (team.roster.length >= 7) return { success: false, msg: 'Roster full (max 7)' };
        if (salary > team.capSpace) return { success: false, msg: 'Cannot afford' };

        const contract = new Contract(playerId, team.id, salary, years);
        team.addPlayer(playerId, contract);
        player.teamId = team.id;

        const idx = faIds.indexOf(playerId);
        if (idx > -1) faIds.splice(idx, 1);

        this.addEvent('signing', 'Signed ' + player.name + ' (' + formatMoney(salary) + '/yr, ' + years + 'yr)');
        return { success: true, msg: 'Signed ' + player.name };
    }

    releasePlayer(playerId) {
        if (!this.canModifyRoster()) {
            return { success: false, msg: 'Roster is locked during events' };
        }
        
        const player = this.players[playerId];
        const team = this.playerTeam;
        if (!player || !team) return { success: false, msg: 'Invalid' };

        team.removePlayer(playerId);
        player.teamId = null;

        if (!this.freeAgentIds[this.playerRegion]) this.freeAgentIds[this.playerRegion] = [];
        this.freeAgentIds[this.playerRegion].push(playerId);

        this.addEvent('release', 'Released ' + player.name);
        return { success: true, msg: 'Released ' + player.name };
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

    // =========================================================================
    // PHASE MANAGEMENT
    // =========================================================================

    canAdvance() {
        // During roster phases, need 5-7 players to advance
        if (this.isRosterPhase()) {
            const rosterSize = this.playerTeam.roster.length;
            if (rosterSize < 5 || rosterSize > 7) {
                return { can: false, reason: 'Need 5-7 players to continue (currently ' + rosterSize + ')' };
            }
        }
        return { can: true };
    }

    advancePhase() {
        const check = this.canAdvance();
        if (!check.can) {
            return { success: false, msg: check.reason, results: [] };
        }

        this.phaseIndex++;
        if (this.phaseIndex >= PHASE_ORDER.length) {
            this.startNewSeason();
            return { success: true, msg: 'New season started!', results: [] };
        }

        this.phase = PHASE_ORDER[this.phaseIndex];
        this.week++;

        // Initialize the new phase
        return this.initializePhase();
    }

    initializePhase() {
        const results = [];
        
        switch (this.phase) {
            case 'roster_kickoff':
            case 'roster_masters1':
            case 'roster_masters2':
            case 'roster_worlds':
                this.rosterLocked = false;
                this.addEvent('roster_period', 'Roster changes are now open.');
                break;
                
            case 'kickoff':
                this.rosterLocked = true;
                this.startKickoff();
                break;
                
            case 'masters_1':
            case 'masters_2':
                this.rosterLocked = true;
                this.startMasters();
                break;
                
            case 'groups_stage1':
                this.rosterLocked = false;
                this.setupStage1Groups();
                this.addEvent('groups_reveal', 'Stage 1 groups have been drawn!');
                break;
                
            case 'groups_stage2':
                this.rosterLocked = false;
                this.setupStage2Groups();
                this.addEvent('groups_reveal', 'Stage 2 groups have been drawn!');
                break;
                
            case 'stage_1_groups':
            case 'stage_2_groups':
                this.rosterLocked = true;
                this.startStageGroups();
                break;
                
            case 'stage_1_playoffs':
            case 'stage_2_playoffs':
                this.rosterLocked = true;
                this.startStagePlayoffs();
                break;
                
            case 'worlds':
                this.rosterLocked = true;
                this.startWorlds();
                break;
                
            case 'offseason':
                this.rosterLocked = false;
                this.processOffseason();
                break;
        }
        
        return { success: true, msg: 'Advanced to ' + this.phase, results };
    }

    advanceWeek() {
        // If in roster phase, just advance to next phase
        if (this.isRosterPhase() || this.phase.startsWith('groups_stage')) {
            return this.advancePhase();
        }

        this.week++;
        const results = [];

        if (this.tournament && !this.tournament.isComplete) {
            const matches = this.tournament.generateMatches();

            for (const match of matches) {
                const t1 = this.teams[match.team1Id];
                const t2 = this.teams[match.team2Id];
                const seriesResult = this.matchEngine.simulateSeries(t1, t2, this.players, match.bestOf);
                this.matchEngine.applyResults(seriesResult, this.teams, this.players);
                this.tournament.recordResult(match, seriesResult);

                results.push({
                    match: match,
                    team1: t1.name,
                    team2: t2.name,
                    score: seriesResult.score,
                    winner: this.teams[seriesResult.winnerId].name,
                    roundName: match.roundName,
                    isPlayerMatch: match.team1Id === this.playerTeamId || match.team2Id === this.playerTeamId
                });

                if (match.team1Id === this.playerTeamId || match.team2Id === this.playerTeamId) {
                    const won = seriesResult.winnerId === this.playerTeamId;
                    const opp = match.team1Id === this.playerTeamId ? t2.name : t1.name;
                    this.addEvent(won ? 'match_win' : 'match_loss', 
                        (won ? '✅ Victory' : '❌ Defeat') + ' vs ' + opp + ' (' + seriesResult.score + ')');
                }
            }

            if (this.tournament.isComplete) {
                this.finalizeTournament();
            }
        }

        // AI moves during roster periods
        if (this.isRosterPhase() && Math.random() < 0.15) {
            this.processAIMoves();
        }

        return { success: true, msg: 'Week ' + this.week, results };
    }

    // =========================================================================
    // TOURNAMENT INITIALIZATION
    // =========================================================================

    startKickoff() {
        const teamIds = this.regionTeamIds[this.playerRegion];
        this.tournament = new TripleElimBracket(teamIds);
        this.tournamentType = 'kickoff';
        this.addEvent('tournament', 'Kickoff Tournament begins!');
    }

    startMasters() {
        // For simplicity, simulate international Masters with top 3 from each region
        // Player's region teams qualify based on Kickoff placement
        const qualified = [];
        for (const region of REGIONS) {
            const teamIds = this.regionTeamIds[region];
            const sorted = [...teamIds].sort((a, b) => {
                const aPlace = this.teams[a].seasonStats.kickoffPlace || 99;
                const bPlace = this.teams[b].seasonStats.kickoffPlace || 99;
                return aPlace - bPlace;
            });
            qualified.push(...sorted.slice(0, 3));
        }
        
        this.tournament = new SwissBracket(qualified, 3, 3);
        this.tournamentType = this.phase;
        this.addEvent('tournament', this.phase.replace('_', ' ').toUpperCase() + ' begins!');
    }

    setupStage1Groups() {
        // Group based on Kickoff placement
        const teamIds = this.regionTeamIds[this.playerRegion];
        const sorted = [...teamIds].sort((a, b) => {
            const aPlace = this.teams[a].seasonStats.kickoffPlace || 99;
            const bPlace = this.teams[b].seasonStats.kickoffPlace || 99;
            return aPlace - bPlace;
        });
        
        // Snake draft into 2 groups
        const groupA = [];
        const groupB = [];
        for (let i = 0; i < sorted.length; i++) {
            if (i % 4 === 0 || i % 4 === 3) groupA.push(sorted[i]);
            else groupB.push(sorted[i]);
        }
        
        this.currentGroups = { A: groupA, B: groupB };
    }

    setupStage2Groups() {
        // Group based on total points
        const teamIds = this.regionTeamIds[this.playerRegion];
        const sorted = [...teamIds].sort((a, b) => {
            return (this.seasonPoints[b] || 0) - (this.seasonPoints[a] || 0);
        });
        
        const groupA = [];
        const groupB = [];
        for (let i = 0; i < sorted.length; i++) {
            if (i % 4 === 0 || i % 4 === 3) groupA.push(sorted[i]);
            else groupB.push(sorted[i]);
        }
        
        this.currentGroups = { A: groupA, B: groupB };
    }

    startStageGroups() {
        if (!this.currentGroups) {
            // Fallback
            this.setupStage1Groups();
        }
        this.tournament = new GroupStage(this.currentGroups, 2);
        this.tournamentType = this.phase;
        this.addEvent('tournament', this.phase.replace(/_/g, ' ').toUpperCase() + ' begins!');
    }

    startStagePlayoffs() {
        // Get top 4 from each group
        const gs = this.tournament;
        const topA = gs.getTop('A', 4);
        const topB = gs.getTop('B', 4);
        
        // Award group win bonus points
        const stageType = this.phase.includes('1') ? 'stage_1' : 'stage_2';
        for (const [groupName, standings] of Object.entries(gs.standings)) {
            for (const s of standings) {
                const team = this.teams[s.teamId];
                if (stageType === 'stage_1') {
                    team.seasonStats.stage1GroupWins = s.wins;
                } else {
                    team.seasonStats.stage2GroupWins = s.wins;
                }
                this.seasonPoints[s.teamId] = (this.seasonPoints[s.teamId] || 0) + s.wins;
            }
        }
        
        // Seed: 1A vs 4B, 2A vs 3B, 1B vs 4A, 2B vs 3A style
        const seeds = [
            topA[0], topB[3], topA[1], topB[2],
            topB[0], topA[3], topB[1], topA[2]
        ].filter(id => id);
        
        this.tournament = new DoubleElimBracket(seeds);
        this.tournamentType = this.phase;
        this.addEvent('tournament', 'Playoffs begin!');
    }

    startWorlds() {
        // Top 4 from each region by points
        const qualified = [];
        for (const region of REGIONS) {
            const teamIds = this.regionTeamIds[region];
            const sorted = [...teamIds].sort((a, b) => {
                return (this.seasonPoints[b] || 0) - (this.seasonPoints[a] || 0);
            });
            qualified.push(...sorted.slice(0, 4));
        }
        
        this.tournament = new SwissBracket(qualified, 3, 3);
        this.tournamentType = 'worlds';
        this.addEvent('tournament', 'VALORANT Champions begins!');
    }

    finalizeTournament() {
        const placements = this.tournament.placements || {};
        const pointsTable = POINTS_TABLE[this.tournamentType] || {};

        for (const [tid, place] of Object.entries(placements)) {
            const pts = pointsTable[place] || 0;
            this.seasonPoints[tid] = (this.seasonPoints[tid] || 0) + pts;
            this.teams[tid].seasonStats.seasonPoints = this.seasonPoints[tid];
            
            // Store placement
            const team = this.teams[tid];
            switch (this.tournamentType) {
                case 'kickoff': team.seasonStats.kickoffPlace = place; break;
                case 'masters_1': team.seasonStats.masters1Place = place; break;
                case 'masters_2': team.seasonStats.masters2Place = place; break;
                case 'stage_1_playoffs': team.seasonStats.stage1Place = place; break;
                case 'stage_2_playoffs': team.seasonStats.stage2Place = place; break;
                case 'worlds': team.seasonStats.worldsPlace = place; break;
            }
        }

        const playerPlace = placements[this.playerTeamId];
        if (playerPlace) {
            const pts = pointsTable[playerPlace] || 0;
            this.addEvent('tournament_end', 
                this.tournamentType.replace(/_/g, ' ').toUpperCase() + ' complete! ' +
                'Finished ' + ordinal(playerPlace) + ' (+' + pts + ' pts)');
        }

        // Auto-advance to next phase
        this.advancePhase();
    }

    processOffseason() {
        for (const t of Object.values(this.teams)) t.resetSeason();
        for (const p of Object.values(this.players)) p.resetSeasonStats();
        
        // Generate new free agents
        for (const region of REGIONS) {
            const newFAs = generateFreeAgents(region, 5);
            for (const fa of newFAs) {
                this.players[fa.id] = fa;
                if (!this.freeAgentIds[region]) this.freeAgentIds[region] = [];
                this.freeAgentIds[region].push(fa.id);
            }
        }
        
        this.addEvent('offseason', 'Offseason complete. New free agents available!');
    }

    startNewSeason() {
        this.season++;
        this.week = 1;
        this.phaseIndex = 0;
        this.phase = PHASE_ORDER[0];
        
        for (const tid of Object.keys(this.seasonPoints)) {
            this.seasonPoints[tid] = 0;
        }
        
        this.addEvent('new_season', 'Season ' + this.season + ' begins!');
        this.rosterLocked = false;
    }

    processAIMoves() {
        for (const [region, tids] of Object.entries(this.regionTeamIds)) {
            for (const tid of tids) {
                if (tid === this.playerTeamId) continue;
                const team = this.teams[tid];
                const fas = this.freeAgentIds[region] || [];

                if (Math.random() < 0.05 && team.roster.length < 7 && fas.length > 0) {
                    const faId = fas[randInt(0, fas.length - 1)];
                    const fa = this.players[faId];
                    const salary = this.getMarketValue(faId);
                    if (salary <= team.capSpace) {
                        const contract = new Contract(faId, tid, salary, randInt(1, 2));
                        team.addPlayer(faId, contract);
                        fa.teamId = tid;
                        fas.splice(fas.indexOf(faId), 1);
                        this.addEvent('ai_signing', team.name + ' signs ' + fa.name);
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
                kickoffPlace: t.seasonStats.kickoffPlace,
                stage1Place: t.seasonStats.stage1Place,
                isPlayer: tid === this.playerTeamId
            };
        }).sort((a, b) => b.points - a.points);
    }

    // =========================================================================
    // SAVE/LOAD
    // =========================================================================

    save(slot = 'autosave') {
        const data = {
            version: '2.0',
            teams: this.teams,
            players: this.players,
            regionTeamIds: this.regionTeamIds,
            freeAgentIds: this.freeAgentIds,
            playerTeamId: this.playerTeamId,
            playerRegion: this.playerRegion,
            season: this.season,
            week: this.week,
            phase: this.phase,
            phaseIndex: this.phaseIndex,
            seasonPoints: this.seasonPoints,
            currentGroups: this.currentGroups,
            rosterLocked: this.rosterLocked,
            events: this.events.slice(-50)
        };
        localStorage.setItem('valgm_' + slot, JSON.stringify(data));
        return true;
    }

    static load(slot = 'autosave') {
        const raw = localStorage.getItem('valgm_' + slot);
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
            g.phaseIndex = data.phaseIndex || 0;
            g.seasonPoints = data.seasonPoints;
            g.currentGroups = data.currentGroups;
            g.rosterLocked = data.rosterLocked || false;
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
                    const teamName = data.teams && data.teams[data.playerTeamId] ? 
                                     data.teams[data.playerTeamId].name : 'Unknown';
                    slots.push({ slot: key.replace('valgm_', ''), teamName, season: data.season });
                } catch (e) {}
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
let previewState = null;

function showScreen(id) {
    document.querySelectorAll('.game-container').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });
    const screen = document.getElementById(id);
    if (screen) {
        screen.classList.add('active');
        screen.style.display = id === 'start-screen' ? 'flex' : 'block';
    }
}

function showStartScreen() { 
    showScreen('start-screen'); 
}

function showTeamSelection() {
    previewState = generateGameState();
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

    list.innerHTML = slots.map(s => 
        '<div class="save-slot" data-slot="' + s.slot + '">' +
            '<div class="save-slot-info">' +
                '<h4>' + s.teamName + '</h4>' +
                '<span>Season ' + s.season + '</span>' +
            '</div>' +
        '</div>'
    ).join('');
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
    if (!grid || !previewState) return;
    
    const tids = previewState.regionTeamIds[selectedRegion];
    
    grid.innerHTML = tids.map(tid => {
        const team = previewState.teams[tid];
        const tierClass = 'tier-' + team.tier;
        const overall = team.getOverall(previewState.players);
        
        return '<div class="team-card" data-team-id="' + tid + '" data-region="' + selectedRegion + '">' +
            '<h3>' + team.name + '</h3>' +
            '<div class="team-abbr">' + team.abbreviation + '</div>' +
            '<div style="margin-top:10px;opacity:0.7;">OVR: ' + overall + '</div>' +
            '<div class="team-tier ' + tierClass + '">' + team.tier + '</div>' +
        '</div>';
    }).join('');
    
    grid.querySelectorAll('.team-card').forEach(card => {
        card.addEventListener('click', function() {
            const teamId = this.getAttribute('data-team-id');
            const region = this.getAttribute('data-region');
            selectTeam(teamId, region);
        });
    });
}

function selectTeam(teamId, region) {
    if (!previewState || !previewState.teams[teamId]) {
        alert('Error: Please try again');
        return;
    }
    
    game = new Game();
    game.teams = previewState.teams;
    game.players = previewState.players;
    game.regionTeamIds = previewState.regionTeamIds;
    game.freeAgentIds = previewState.freeAgentIds;
    game.newGame(teamId, region);
    game.save();
    previewState = null;
    showGameScreen();
}

function updateUI() {
    if (!game) return;

    const team = game.playerTeam;
    document.getElementById('header-team-name').textContent = team.name;
    document.getElementById('header-team-region').textContent = game.playerRegion;
    document.getElementById('header-season').textContent = game.season;
    document.getElementById('header-week').textContent = game.week;
    document.getElementById('header-points').textContent = game.seasonPoints[game.playerTeamId] || 0;
    document.getElementById('header-record').textContent = team.seasonStats.matchRecord;
    
    // Update phase indicator
    const phaseDisplay = document.getElementById('header-phase');
    if (phaseDisplay) {
        phaseDisplay.textContent = formatPhaseName(game.phase);
    }
    
    // Update advance button
    updateAdvanceButton();

    renderRoster();
    renderStandings();
    renderTournament();
    renderFreeAgents();
    renderEvents();
}

function formatPhaseName(phase) {
    const names = {
        'roster_kickoff': '📋 Roster Period (Kickoff)',
        'kickoff': '🏆 Kickoff',
        'roster_masters1': '📋 Roster Period',
        'masters_1': '🌍 Masters 1',
        'groups_stage1': '📊 Stage 1 Groups Reveal',
        'stage_1_groups': '🏆 Stage 1 Groups',
        'stage_1_playoffs': '🏆 Stage 1 Playoffs',
        'roster_masters2': '📋 Roster Period',
        'masters_2': '🌍 Masters 2',
        'groups_stage2': '📊 Stage 2 Groups Reveal',
        'stage_2_groups': '🏆 Stage 2 Groups',
        'stage_2_playoffs': '🏆 Stage 2 Playoffs',
        'roster_worlds': '📋 Roster Period',
        'worlds': '🌍 Champions',
        'offseason': '📋 Offseason'
    };
    return names[phase] || phase;
}

function updateAdvanceButton() {
    const btn = document.querySelector('.btn-advance');
    if (!btn) return;
    
    const check = game.canAdvance();
    btn.disabled = !check.can;
    
    if (game.isRosterPhase() || game.phase.startsWith('groups_stage')) {
        btn.textContent = '▶ Continue';
    } else {
        btn.textContent = '▶ Simulate Week';
    }
    
    if (!check.can) {
        btn.title = check.reason;
    } else {
        btn.title = '';
    }
}

function renderRoster() {
    const grid = document.getElementById('roster-grid');
    const team = game.playerTeam;
    const roster = game.getTeamRoster(game.playerTeamId);
    
    const canModify = game.canModifyRoster();

    document.getElementById('roster-salary').textContent = formatMoney(team.yearlySalary);
    document.getElementById('roster-cap').textContent = formatMoney(team.finances.yearlyBudget) + ' budget';
    
    // Show roster lock status
    const lockStatus = document.getElementById('roster-lock-status');
    if (lockStatus) {
        lockStatus.textContent = canModify ? '🔓 Roster Unlocked' : '🔒 Roster Locked';
        lockStatus.style.color = canModify ? 'var(--val-teal)' : 'var(--val-red)';
    }

    grid.innerHTML = roster.map((p, i) => {
        const isStarter = i < 5;
        const ovrClass = p.overall >= 90 ? 'overall-90' : p.overall >= 80 ? 'overall-80' : p.overall >= 70 ? 'overall-70' : p.overall >= 60 ? 'overall-60' : '';
        const moraleClass = p.morale < 40 ? 'low' : p.morale < 60 ? 'medium' : '';
        const contract = team.contracts[p.id];

        return '<div class="player-card ' + (isStarter ? 'starter' : 'sub') + '" data-player-id="' + p.id + '">' +
            '<div class="player-overall ' + ovrClass + '">' + p.overall + '</div>' +
            '<div class="player-info">' +
                '<h4>' + p.name + '</h4>' +
                '<div class="role">' + p.role + '</div>' +
                '<div class="nationality">' + p.nationality + ' • ' + p.age + 'yo</div>' +
            '</div>' +
            '<div class="player-stats">' +
                'K/D: ' + p.seasonStats.kd + '<br>' +
                'ACS: ' + p.seasonStats.acs +
            '</div>' +
            '<div class="player-morale">' +
                '<div style="font-size:0.8rem;">Morale</div>' +
                '<div class="morale-bar">' +
                    '<div class="morale-fill ' + moraleClass + '" style="width:' + p.morale + '%"></div>' +
                '</div>' +
            '</div>' +
            '<div class="player-contract">' +
                '<div class="salary">' + formatMoney(contract ? contract.salary : 0) + '/yr</div>' +
                '<div style="opacity:0.6;">' + (contract ? contract.years : 0) + 'yr left</div>' +
            '</div>' +
        '</div>';
    }).join('');
    
    // Roster size warning
    const rosterWarning = document.getElementById('roster-warning');
    if (rosterWarning) {
        if (roster.length < 5) {
            rosterWarning.textContent = '⚠️ Need at least 5 players to continue';
            rosterWarning.style.display = 'block';
        } else if (roster.length > 7) {
            rosterWarning.textContent = '⚠️ Maximum 7 players allowed';
            rosterWarning.style.display = 'block';
        } else {
            rosterWarning.style.display = 'none';
        }
    }
    
    // Add click handlers
    grid.querySelectorAll('.player-card').forEach(card => {
        card.addEventListener('click', function() {
            showPlayerModal(this.getAttribute('data-player-id'));
        });
    });
}

function renderStandings() {
    const body = document.getElementById('standings-body');
    const standings = game.getStandings();

    body.innerHTML = standings.map((s, i) => 
        '<tr class="' + (s.isPlayer ? 'player-team' : '') + '">' +
            '<td>' + (i + 1) + '</td>' +
            '<td><strong>' + s.abbr + '</strong> ' + s.name + '</td>' +
            '<td style="color:var(--val-teal);font-weight:bold;">' + s.points + '</td>' +
            '<td>' + s.record + '</td>' +
            '<td>' + s.mapRecord + '</td>' +
            '<td>' + (s.kickoffPlace ? ordinal(s.kickoffPlace) : '-') + '</td>' +
        '</tr>'
    ).join('');
}

function renderTournament() {
    const nameEl = document.getElementById('tournament-name');
    const phaseEl = document.getElementById('tournament-phase');
    const content = document.getElementById('tournament-content');
    
    nameEl.textContent = formatPhaseName(game.phase);
    
    // Group reveal screens
    if (game.phase === 'groups_stage1' || game.phase === 'groups_stage2') {
        phaseEl.textContent = 'Group Draw';
        renderGroupReveal(content);
        return;
    }
    
    // Active tournament
    if (game.tournament) {
        if (game.tournament.isComplete) {
            phaseEl.textContent = 'Complete';
        } else {
            phaseEl.textContent = 'In Progress';
        }
        
        if (game.tournament instanceof TripleElimBracket) {
            renderTripleElimBracket(content, game.tournament);
        } else if (game.tournament instanceof SwissBracket) {
            renderSwissBracket(content, game.tournament);
        } else if (game.tournament instanceof DoubleElimBracket) {
            renderDoubleElimBracket(content, game.tournament);
        } else if (game.tournament instanceof GroupStage) {
            renderGroupStage(content, game.tournament);
        }
    } else {
        phaseEl.textContent = game.isRosterPhase() ? 'Roster Period' : 'Waiting';
        content.innerHTML = '<p style="text-align:center;opacity:0.7;">No active tournament</p>';
    }
}

function renderGroupReveal(container) {
    if (!game.currentGroups) {
        container.innerHTML = '<p style="text-align:center;opacity:0.7;">Groups not yet drawn</p>';
        return;
    }
    
    const priorEvent = game.phase === 'groups_stage1' ? 'Kickoff' : 'Stage 1';
    const placeKey = game.phase === 'groups_stage1' ? 'kickoffPlace' : 'stage1Place';
    
    let html = '<div class="groups-reveal">';
    
    for (const [groupName, teamIds] of Object.entries(game.currentGroups)) {
        html += '<div class="group-card">' +
            '<h3 class="group-title">Group ' + groupName + '</h3>' +
            '<div class="group-teams">';
        
        for (const tid of teamIds) {
            const team = game.teams[tid];
            const place = team.seasonStats[placeKey];
            const isPlayer = tid === game.playerTeamId;
            
            html += '<div class="group-team ' + (isPlayer ? 'player-team' : '') + '">' +
                '<span class="team-name">' + team.name + '</span>' +
                '<span class="prior-place">' + priorEvent + ': ' + (place ? ordinal(place) : '-') + '</span>' +
            '</div>';
        }
        
        html += '</div></div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function renderTripleElimBracket(container, bracket) {
    let html = '<div class="bracket-triple-elim">';
    
    // Show completed matches grouped by round
    const matchesByRound = {};
    for (const match of bracket.completedMatches) {
        const round = match.roundName || 'Round';
        if (!matchesByRound[round]) matchesByRound[round] = [];
        matchesByRound[round].push(match);
    }
    
    for (const [roundName, matches] of Object.entries(matchesByRound)) {
        html += '<div class="bracket-round">' +
            '<h4 class="round-title">' + roundName + '</h4>' +
            '<div class="round-matches">';
        
        for (const match of matches) {
            const t1 = game.teams[match.team1Id];
            const t2 = game.teams[match.team2Id];
            const isPlayerMatch = match.team1Id === game.playerTeamId || match.team2Id === game.playerTeamId;
            
            html += '<div class="bracket-match ' + (isPlayerMatch ? 'player-match' : '') + '">' +
                '<div class="match-team ' + (match.winnerId === match.team1Id ? 'winner' : 'loser') + '">' +
                    '<span class="team-name">' + t1.abbreviation + '</span>' +
                '</div>' +
                '<div class="match-score">' + match.score + '</div>' +
                '<div class="match-team ' + (match.winnerId === match.team2Id ? 'winner' : 'loser') + '">' +
                    '<span class="team-name">' + t2.abbreviation + '</span>' +
                '</div>' +
            '</div>';
        }
        
        html += '</div></div>';
    }
    
    // Show final placements if complete
    if (bracket.isComplete) {
        html += '<div class="final-placements">' +
            '<h4>Final Standings</h4>';
        
        const sortedPlacements = Object.entries(bracket.placements)
            .sort((a, b) => a[1] - b[1])
            .slice(0, 6);
        
        for (const [tid, place] of sortedPlacements) {
            const team = game.teams[tid];
            const isPlayer = tid === game.playerTeamId;
            html += '<div class="placement-row ' + (isPlayer ? 'player-team' : '') + '">' +
                '<span class="place">' + ordinal(place) + '</span>' +
                '<span class="team-name">' + team.name + '</span>' +
            '</div>';
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function renderSwissBracket(container, bracket) {
    let html = '<div class="bracket-swiss">';
    
    // Show current records
    html += '<div class="swiss-standings">' +
        '<h4>Standings</h4>' +
        '<table class="swiss-table">' +
        '<thead><tr><th>Team</th><th>W</th><th>L</th><th>Status</th></tr></thead>' +
        '<tbody>';
    
    const sortedRecords = Object.entries(bracket.records)
        .map(([tid, rec]) => ({ tid, ...rec }))
        .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
    
    for (const rec of sortedRecords) {
        const team = game.teams[rec.tid];
        const isPlayer = rec.tid === game.playerTeamId;
        const qualified = bracket.qualified.includes(rec.tid);
        const eliminated = bracket.eliminated.includes(rec.tid);
        
        let status = '-';
        if (qualified) status = '✅ Qualified';
        else if (eliminated) status = '❌ Eliminated';
        
        html += '<tr class="' + (isPlayer ? 'player-team' : '') + '">' +
            '<td>' + team.abbreviation + '</td>' +
            '<td>' + rec.wins + '</td>' +
            '<td>' + rec.losses + '</td>' +
            '<td>' + status + '</td>' +
        '</tr>';
    }
    
    html += '</tbody></table></div>';
    
    // Show recent matches
    if (bracket.completedMatches.length > 0) {
        html += '<div class="swiss-matches">' +
            '<h4>Recent Matches</h4>';
        
        const recentMatches = bracket.completedMatches.slice(-8);
        for (const match of recentMatches) {
            const t1 = game.teams[match.team1Id];
            const t2 = game.teams[match.team2Id];
            const isPlayerMatch = match.team1Id === game.playerTeamId || match.team2Id === game.playerTeamId;
            
            html += '<div class="bracket-match ' + (isPlayerMatch ? 'player-match' : '') + '">' +
                '<div class="match-team ' + (match.winnerId === match.team1Id ? 'winner' : 'loser') + '">' +
                    '<span class="team-name">' + t1.abbreviation + '</span>' +
                '</div>' +
                '<div class="match-score">' + match.score + '</div>' +
                '<div class="match-team ' + (match.winnerId === match.team2Id ? 'winner' : 'loser') + '">' +
                    '<span class="team-name">' + t2.abbreviation + '</span>' +
                '</div>' +
            '</div>';
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function renderDoubleElimBracket(container, bracket) {
    let html = '<div class="bracket-double-elim">';
    
    // Upper Bracket
    html += '<div class="bracket-section">' +
        '<h4 class="bracket-section-title">Upper Bracket</h4>';
    
    for (let i = 0; i < bracket.upperBracket.length; i++) {
        const round = bracket.upperBracket[i];
        if (!round) continue;
        
        html += '<div class="bracket-round">' +
            '<div class="round-label">Round ' + (i + 1) + '</div>';
        
        for (const match of round) {
            html += renderBracketMatch(match);
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    
    // Lower Bracket
    html += '<div class="bracket-section">' +
        '<h4 class="bracket-section-title">Lower Bracket</h4>';
    
    for (let i = 0; i < bracket.lowerBracket.length; i++) {
        const round = bracket.lowerBracket[i];
        if (!round) continue;
        
        html += '<div class="bracket-round">' +
            '<div class="round-label">Round ' + (i + 1) + '</div>';
        
        for (const match of round) {
            html += renderBracketMatch(match);
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    
    // Grand Final
    if (bracket.grandFinal) {
        html += '<div class="bracket-section grand-final-section">' +
            '<h4 class="bracket-section-title">Grand Final</h4>' +
            renderBracketMatch(bracket.grandFinal) +
        '</div>';
    }
    
    // Placements
    if (Object.keys(bracket.placements).length > 0) {
        html += '<div class="final-placements">' +
            '<h4>Placements</h4>';
        
        const sortedPlacements = Object.entries(bracket.placements)
            .sort((a, b) => a[1] - b[1]);
        
        for (const [tid, place] of sortedPlacements) {
            const team = game.teams[tid];
            const isPlayer = tid === game.playerTeamId;
            html += '<div class="placement-row ' + (isPlayer ? 'player-team' : '') + '">' +
                '<span class="place">' + ordinal(place) + '</span>' +
                '<span class="team-name">' + team.name + '</span>' +
            '</div>';
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function renderBracketMatch(match) {
    if (!match.team1Id || !match.team2Id) {
        return '<div class="bracket-match pending">' +
            '<div class="match-team">TBD</div>' +
            '<div class="match-score">-</div>' +
            '<div class="match-team">TBD</div>' +
        '</div>';
    }
    
    const t1 = game.teams[match.team1Id];
    const t2 = game.teams[match.team2Id];
    const isPlayerMatch = match.team1Id === game.playerTeamId || match.team2Id === game.playerTeamId;
    
    if (!match.played) {
        return '<div class="bracket-match upcoming ' + (isPlayerMatch ? 'player-match' : '') + '">' +
            '<div class="match-team">' + t1.abbreviation + '</div>' +
            '<div class="match-score">vs</div>' +
            '<div class="match-team">' + t2.abbreviation + '</div>' +
        '</div>';
    }
    
    return '<div class="bracket-match ' + (isPlayerMatch ? 'player-match' : '') + '">' +
        '<div class="match-team ' + (match.winnerId === match.team1Id ? 'winner' : 'loser') + '">' +
            t1.abbreviation +
        '</div>' +
        '<div class="match-score">' + match.score + '</div>' +
        '<div class="match-team ' + (match.winnerId === match.team2Id ? 'winner' : 'loser') + '">' +
            t2.abbreviation +
        '</div>' +
    '</div>';
}

function renderGroupStage(container, gs) {
    let html = '<div class="group-stage">';
    
    for (const groupName of Object.keys(gs.groups)) {
        const standings = gs.getGroupStandings(groupName);
        
        html += '<div class="group-card">' +
            '<h4 class="group-title">Group ' + groupName + '</h4>' +
            '<table class="group-table">' +
            '<thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>Maps</th></tr></thead>' +
            '<tbody>';
        
        standings.forEach((s, i) => {
            const team = game.teams[s.teamId];
            const isPlayer = s.teamId === game.playerTeamId;
            const mapDiff = s.mapWins - s.mapLosses;
            
            html += '<tr class="' + (isPlayer ? 'player-team' : '') + '">' +
                '<td>' + (i + 1) + '</td>' +
                '<td>' + team.abbreviation + '</td>' +
                '<td>' + s.wins + '</td>' +
                '<td>' + s.losses + '</td>' +
                '<td>' + (mapDiff >= 0 ? '+' : '') + mapDiff + '</td>' +
            '</tr>';
        });
        
        html += '</tbody></table></div>';
    }
    
    // Recent matches
    if (gs.completedMatches.length > 0) {
        html += '<div class="group-matches">' +
            '<h4>Recent Matches</h4>';
        
        const recentMatches = gs.completedMatches.slice(-6);
        for (const match of recentMatches) {
            html += renderBracketMatch(match);
        }
        
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function renderFreeAgents() {
    const container = document.getElementById('fa-list');
    const fas = game.getFreeAgents();
    const canSign = game.canModifyRoster();
    
    let filtered = fas;
    if (currentRoleFilter !== 'all') {
        filtered = fas.filter(p => p.role === currentRoleFilter);
    }
    
    filtered.sort((a, b) => b.overall - a.overall);
    
    container.innerHTML = filtered.map(p => {
        const val = game.getMarketValue(p.id);
        const ovrClass = p.overall >= 90 ? 'overall-90' : p.overall >= 80 ? 'overall-80' : p.overall >= 70 ? 'overall-70' : p.overall >= 60 ? 'overall-60' : '';
        
        return '<div class="fa-card" data-player-id="' + p.id + '">' +
            '<div class="player-overall ' + ovrClass + '">' + p.overall + '</div>' +
            '<div class="fa-info">' +
                '<h4>' + p.name + '</h4>' +
                '<div>' + p.role + ' • ' + p.nationality + ' • ' + p.age + 'yo</div>' +
            '</div>' +
            '<div class="fa-value">' + formatMoney(val) + '/yr</div>' +
            '<button class="btn-sign" data-player-id="' + p.id + '" ' + (!canSign ? 'disabled' : '') + '>' +
                (canSign ? 'Sign' : '🔒') +
            '</button>' +
        '</div>';
    }).join('');
    
    // Lock message
    const lockMsg = document.getElementById('fa-lock-message');
    if (lockMsg) {
        if (canSign) {
            lockMsg.style.display = 'none';
        } else {
            lockMsg.style.display = 'block';
            lockMsg.textContent = '🔒 Roster locked during events. Sign players between tournaments.';
        }
    }
    
    // Add sign button handlers
    container.querySelectorAll('.btn-sign').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!this.disabled) {
                showSignModal(this.getAttribute('data-player-id'));
            }
        });
    });
    
    // Add card click handlers for player details
    container.querySelectorAll('.fa-card').forEach(card => {
        card.addEventListener('click', function() {
            showPlayerModal(this.getAttribute('data-player-id'));
        });
    });
}

function renderEvents() {
    const container = document.getElementById('events-list');
    const events = game.getRecentEvents(15);
    
    const icons = {
        'game_start': '🎮',
        'roster_period': '📋',
        'signing': '✍️',
        'release': '👋',
        'tournament': '🏆',
        'tournament_end': '🏆',
        'match_win': '✅',
        'match_loss': '❌',
        'groups_reveal': '📊',
        'ai_signing': '📰',
        'offseason': '🌴',
        'new_season': '🆕'
    };
    
    container.innerHTML = events.reverse().map(e => {
        const icon = icons[e.type] || '📢';
        return '<div class="event-item event-' + e.type + '">' +
            '<span class="event-icon">' + icon + '</span>' +
            '<span class="event-message">' + e.message + '</span>' +
            '<span class="event-week">W' + e.week + '</span>' +
        '</div>';
    }).join('');
}

// ============================================================================
// MODALS
// ============================================================================

function showPlayerModal(playerId) {
    const player = game.players[playerId];
    if (!player) return;
    
    const modal = document.getElementById('player-modal');
    const content = document.getElementById('player-modal-content');
    
    const team = player.teamId ? game.teams[player.teamId] : null;
    const contract = team ? team.contracts[playerId] : null;
    const isOnPlayerTeam = player.teamId === game.playerTeamId;
    const canRelease = isOnPlayerTeam && game.canModifyRoster();
    const a = player.attributes;
    
    content.innerHTML = 
        '<div class="modal-header">' +
            '<h2>' + player.name + '</h2>' +
            '<button class="modal-close" onclick="closePlayerModal()">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
            '<div class="player-detail-header">' +
                '<div class="player-overall overall-' + Math.floor(player.overall / 10) * 10 + '">' + player.overall + '</div>' +
                '<div class="player-basic-info">' +
                    '<div><strong>Role:</strong> ' + player.role + '</div>' +
                    '<div><strong>Age:</strong> ' + player.age + '</div>' +
                    '<div><strong>Nationality:</strong> ' + player.nationality + '</div>' +
                    '<div><strong>Team:</strong> ' + (team ? team.name : 'Free Agent') + '</div>' +
                    (contract ? '<div><strong>Contract:</strong> ' + formatMoney(contract.salary) + '/yr, ' + contract.years + ' yr left</div>' : '') +
                '</div>' +
            '</div>' +
            
            '<div class="attributes-section">' +
                '<h4>Attributes</h4>' +
                '<div class="attr-grid">' +
                    '<div class="attr-group">' +
                        '<h5>Aim (' + a.aimRating + ')</h5>' +
                        renderAttrBar('Flicking', a.aim.flicking) +
                        renderAttrBar('Tracking', a.aim.tracking) +
                        renderAttrBar('Burst Control', a.aim.burstControl) +
                        renderAttrBar('Micro Adjust', a.aim.microAdjustment) +
                    '</div>' +
                    '<div class="attr-group">' +
                        '<h5>Game Sense (' + a.gameSenseRating + ')</h5>' +
                        renderAttrBar('Map Awareness', a.gameSense.mapAwareness) +
                        renderAttrBar('Timing', a.gameSense.timing) +
                        renderAttrBar('Economy IQ', a.gameSense.economyIQ) +
                        renderAttrBar('Clutch IQ', a.gameSense.clutchIQ) +
                        renderAttrBar('Game IQ', a.gameSense.gameIQ) +
                    '</div>' +
                    '<div class="attr-group">' +
                        '<h5>Movement (' + a.movementRating + ')</h5>' +
                        renderAttrBar('Positioning', a.movement.positioning) +
                        renderAttrBar('Peeking', a.movement.peeking) +
                        renderAttrBar('Counter-Strafe', a.movement.counterStrafing) +
                        renderAttrBar('Off-Angle', a.movement.offAnglePlay) +
                    '</div>' +
                    '<div class="attr-group">' +
                        '<h5>Agent Prof. (' + a.agentRating + ')</h5>' +
                        renderAttrBar('Utility Usage', a.agentProficiency.utilityUsage) +
                        renderAttrBar('Lineups', a.agentProficiency.lineupKnowledge) +
                        renderAttrBar('Agent Pool', a.agentProficiency.agentPool) +
                    '</div>' +
                    '<div class="attr-group">' +
                        '<h5>Team Play (' + a.teamPlayRating + ')</h5>' +
                        renderAttrBar('Communication', a.teamPlay.communication) +
                        renderAttrBar('Support Play', a.teamPlay.supportPlay) +
                        renderAttrBar('Discipline', a.teamPlay.discipline) +
                    '</div>' +
                    '<div class="attr-group">' +
                        '<h5>Mental (' + a.mentalRating + ')</h5>' +
                        renderAttrBar('Consistency', a.mental.consistency) +
                        renderAttrBar('Adaptability', a.mental.adaptability) +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            '<div class="stats-section">' +
                '<h4>Season Stats</h4>' +
                '<div class="stat-row">' +
                    '<span>K/D: ' + player.seasonStats.kd + '</span>' +
                    '<span>ACS: ' + player.seasonStats.acs + '</span>' +
                    '<span>KAST: ' + player.seasonStats.kast + '%</span>' +
                    '<span>ADR: ' + player.seasonStats.adr + '</span>' +
                    '<span>HS%: ' + player.seasonStats.headshotPct + '%</span>' +
                '</div>' +
            '</div>' +
            
            (canRelease ? 
                '<div class="modal-actions">' +
                    '<button class="btn-val btn-release" onclick="releasePlayerConfirm(\'' + playerId + '\')">Release Player</button>' +
                '</div>' : '') +
        '</div>';
    
    modal.style.display = 'flex';
}

function renderAttrBar(name, value) {
    const colorClass = value >= 80 ? 'attr-high' : value >= 60 ? 'attr-mid' : 'attr-low';
    return '<div class="attr-row">' +
        '<span class="attr-name">' + name + '</span>' +
        '<div class="attr-bar-container">' +
            '<div class="attr-bar ' + colorClass + '" style="width:' + value + '%"></div>' +
        '</div>' +
        '<span class="attr-value">' + value + '</span>' +
    '</div>';
}

function closePlayerModal() {
    document.getElementById('player-modal').style.display = 'none';
}

function showSignModal(playerId) {
    const player = game.players[playerId];
    if (!player) return;
    
    const modal = document.getElementById('sign-modal');
    const content = document.getElementById('sign-modal-content');
    const marketValue = game.getMarketValue(playerId);
    
    content.innerHTML = 
        '<div class="modal-header">' +
            '<h2>Sign ' + player.name + '</h2>' +
            '<button class="modal-close" onclick="closeSignModal()">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
            '<div class="sign-player-info">' +
                '<div class="player-overall">' + player.overall + '</div>' +
                '<div>' +
                    '<strong>' + player.name + '</strong><br>' +
                    player.role + ' • ' + player.age + 'yo<br>' +
                    'Market Value: ' + formatMoney(marketValue) + '/yr' +
                '</div>' +
            '</div>' +
            '<div class="sign-form">' +
                '<div class="form-group">' +
                    '<label>Annual Salary</label>' +
                    '<input type="range" id="sign-salary" min="' + Math.round(marketValue * 0.8) + '" max="' + Math.round(marketValue * 1.5) + '" value="' + marketValue + '" oninput="updateSalaryDisplay()">' +
                    '<div id="salary-display">' + formatMoney(marketValue) + '/yr</div>' +
                '</div>' +
                '<div class="form-group">' +
                    '<label>Contract Length</label>' +
                    '<select id="sign-years">' +
                        '<option value="1">1 Year</option>' +
                        '<option value="2" selected>2 Years</option>' +
                        '<option value="3">3 Years</option>' +
                    '</select>' +
                '</div>' +
                '<div class="cap-info">' +
                    'Cap Space: ' + formatMoney(game.playerTeam.capSpace) +
                '</div>' +
            '</div>' +
            '<div class="modal-actions">' +
                '<button class="btn-val" onclick="confirmSign(\'' + playerId + '\')">Sign Player</button>' +
                '<button class="btn-val btn-val-secondary" onclick="closeSignModal()">Cancel</button>' +
            '</div>' +
        '</div>';
    
    modal.style.display = 'flex';
}

function updateSalaryDisplay() {
    const salary = parseInt(document.getElementById('sign-salary').value);
    document.getElementById('salary-display').textContent = formatMoney(salary) + '/yr';
}

function confirmSign(playerId) {
    const salary = parseInt(document.getElementById('sign-salary').value);
    const years = parseInt(document.getElementById('sign-years').value);
    
    const result = game.signPlayer(playerId, salary, years);
    
    if (result.success) {
        closeSignModal();
        game.save();
        updateUI();
    } else {
        alert(result.msg);
    }
}

function closeSignModal() {
    document.getElementById('sign-modal').style.display = 'none';
}

function releasePlayerConfirm(playerId) {
    const player = game.players[playerId];
    if (!player) return;
    
    if (confirm('Release ' + player.name + '? This cannot be undone.')) {
        const result = game.releasePlayer(playerId);
        if (result.success) {
            closePlayerModal();
            game.save();
            updateUI();
        } else {
            alert(result.msg);
        }
    }
}

function advanceWeek() {
    const result = game.advanceWeek();
    
    if (!result.success) {
        alert(result.msg);
        return;
    }
    
    game.save();
    
    if (result.results && result.results.length > 0) {
        showResultsModal(result.results);
    }
    
    updateUI();
}

function showResultsModal(results) {
    const modal = document.getElementById('results-modal');
    const content = document.getElementById('results-modal-content');
    
    const playerMatches = results.filter(r => r.isPlayerMatch);
    const otherMatches = results.filter(r => !r.isPlayerMatch);
    
    let html = '<div class="modal-header">' +
        '<h2>Week ' + game.week + ' Results</h2>' +
        '<button class="modal-close" onclick="closeResultsModal()">&times;</button>' +
    '</div>' +
    '<div class="modal-body">';
    
    if (playerMatches.length > 0) {
        html += '<h3 style="color:var(--val-red);">Your Matches</h3>';
        for (const r of playerMatches) {
            const won = r.winner === game.playerTeam.name;
            html += '<div class="result-match player-result ' + (won ? 'win' : 'loss') + '">' +
                '<div class="result-round">' + r.roundName + '</div>' +
                '<div class="result-teams">' +
                    '<span class="' + (r.team1 === r.winner ? 'winner' : '') + '">' + r.team1 + '</span>' +
                    ' <strong>' + r.score + '</strong> ' +
                    '<span class="' + (r.team2 === r.winner ? 'winner' : '') + '">' + r.team2 + '</span>' +
                '</div>' +
            '</div>';
        }
    }
    
    if (otherMatches.length > 0) {
        html += '<h3 style="margin-top:20px;">Other Matches</h3>';
        for (const r of otherMatches) {
            html += '<div class="result-match">' +
                '<div class="result-round">' + r.roundName + '</div>' +
                '<div class="result-teams">' +
                    '<span class="' + (r.team1 === r.winner ? 'winner' : '') + '">' + r.team1 + '</span>' +
                    ' <strong>' + r.score + '</strong> ' +
                    '<span class="' + (r.team2 === r.winner ? 'winner' : '') + '">' + r.team2 + '</span>' +
                '</div>' +
            '</div>';
        }
    }
    
    html += '<div class="modal-actions">' +
        '<button class="btn-val" onclick="closeResultsModal()">Continue</button>' +
    '</div></div>';
    
    content.innerHTML = html;
    modal.style.display = 'flex';
}

function closeResultsModal() {
    document.getElementById('results-modal').style.display = 'none';
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Valorant GM Simulator v2.0 loaded');
    
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
    
    // Save slots
    document.getElementById('save-slots-list').addEventListener('click', (e) => {
        const slot = e.target.closest('.save-slot');
        if (slot) {
            const slotName = slot.getAttribute('data-slot');
            if (slotName) loadGame(slotName);
        }
    });
    
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
});

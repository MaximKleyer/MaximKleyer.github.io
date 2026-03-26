/**
 * Valorant GM Simulator v3.0 - ZenGM-Inspired
 * Clean, table-based, sidebar navigation
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const ROLES = ['Duelist', 'Initiator', 'Controller', 'Sentinel'];
const MAPS = ['Ascent', 'Bind', 'Haven', 'Split', 'Icebox', 'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset'];
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
    EMEA: ['France', 'Germany', 'UK', 'Spain', 'Turkey', 'Russia', 'Poland', 'Sweden'],
    CHINA: ['China'],
    APAC: ['South Korea', 'Japan', 'Philippines', 'Indonesia', 'Thailand', 'Singapore']
};

const FIRST_NAMES = ['Alex', 'Ryan', 'Jake', 'Tyler', 'Chris', 'Matt', 'Kevin', 'Daniel', 'Michael', 'Jason', 'Lee', 'Kim', 'Park', 'Chen', 'Wang', 'Carlos', 'Pedro', 'Lucas', 'Max', 'Tom', 'Ben', 'Sam'];

const PHASE_ORDER = [
    'roster_kickoff', 'kickoff',
    'roster_masters1', 'masters_1',
    'groups_stage1', 'stage_1_groups', 'stage_1_playoffs',
    'roster_masters2', 'masters_2',
    'groups_stage2', 'stage_2_groups', 'stage_2_playoffs',
    'roster_worlds', 'worlds',
    'offseason'
];

// ============================================================================
// UTILITIES
// ============================================================================

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const genId = (p = 'id') => p + '_' + Math.random().toString(36).substr(2, 9);
const money = n => '$' + n.toLocaleString();
const ordinal = n => n + (['th','st','nd','rd'][n % 10 > 3 ? 0 : (n % 100 - n % 10 != 10) * n % 10] || 'th');

function generateIGN() {
    const name = FIRST_NAMES[rand(0, FIRST_NAMES.length - 1)];
    const styles = ['', 'x', 'z', '1', 'gg', 'tv'];
    return name.slice(0, rand(3, 6)).toLowerCase() + styles[rand(0, styles.length - 1)];
}

// ============================================================================
// PLAYER & TEAM CLASSES
// ============================================================================

class PlayerAttributes {
    constructor(tier = 'average') {
        const r = { star: [75, 95], good: [65, 85], average: [50, 75], prospect: [35, 60] }[tier] || [50, 75];
        this.aim = rand(r[0], r[1]);
        this.gameSense = rand(r[0], r[1]);
        this.movement = rand(r[0], r[1]);
        this.utility = rand(r[0], r[1]);
        this.teamplay = rand(r[0], r[1]);
        this.mental = rand(r[0], r[1]);
    }
    get overall() {
        return Math.round(this.aim * 0.25 + this.gameSense * 0.2 + this.movement * 0.15 + this.utility * 0.15 + this.teamplay * 0.1 + this.mental * 0.15);
    }
}

class MatchStats {
    constructor() {
        this.kills = 0; this.deaths = 0; this.assists = 0;
        this.damage = 0; this.rounds = 0;
    }
    get kd() { return this.deaths > 0 ? (this.kills / this.deaths).toFixed(2) : this.kills.toFixed(2); }
    get acs() { return this.rounds > 0 ? Math.round((this.damage + this.kills * 50) / this.rounds) : 0; }
    add(o) { this.kills += o.kills; this.deaths += o.deaths; this.assists += o.assists; this.damage += o.damage; this.rounds += o.rounds; }
}

class Player {
    constructor(name, role, nationality, age, tier = 'average') {
        this.id = genId('p');
        this.name = name;
        this.role = role;
        this.nationality = nationality;
        this.age = age;
        this.teamId = null;
        this.attributes = new PlayerAttributes(tier);
        this.potential = rand(this.attributes.overall, Math.min(99, this.attributes.overall + 20));
        this.morale = rand(60, 80);
        this.seasonStats = new MatchStats();
        this.salary = 0;
        this.contractYears = 0;
    }
    get overall() { return this.attributes.overall; }
}

class Team {
    constructor(name, abbr, region, tier = 'average') {
        this.id = genId('t');
        this.name = name;
        this.abbr = abbr;
        this.region = region;
        this.tier = tier;
        this.roster = [];
        this.budget = { star: 2000000, good: 1200000, average: 800000, prospect: 500000 }[tier] || 800000;
        this.isPlayer = false;
        this.matchesWon = 0;
        this.matchesLost = 0;
        this.mapsWon = 0;
        this.mapsLost = 0;
        this.kickoffPlace = null;
        this.stage1Place = null;
        this.stage2Place = null;
    }
    get payroll() { return this.roster.reduce((s, p) => s + (p.salary || 0), 0); }
    get capSpace() { return this.budget - this.payroll; }
    get overall() { return this.roster.length > 0 ? Math.round(this.roster.reduce((s, p) => s + p.overall, 0) / this.roster.length) : 0; }
    get record() { return this.matchesWon + '-' + this.matchesLost; }
    getStarters() { return this.roster.slice(0, 5); }
}

// ============================================================================
// MATCH ENGINE
// ============================================================================

class MatchEngine {
    simulateMap(t1, t2) {
        let s1 = 0, s2 = 0;
        const str1 = t1.overall + rand(-5, 5);
        const str2 = t2.overall + rand(-5, 5);
        const t1WinProb = clamp(str1 / (str1 + str2), 0.2, 0.8);
        
        while (s1 < 13 && s2 < 13) {
            if (Math.random() < t1WinProb) s1++; else s2++;
            if (s1 >= 12 && s2 >= 12 && Math.abs(s1 - s2) < 2) continue;
        }
        
        // Generate player stats
        const totalRounds = s1 + s2;
        for (const p of [...t1.getStarters(), ...t2.getStarters()]) {
            const isWinner = (t1.roster.includes(p) && s1 > s2) || (t2.roster.includes(p) && s2 > s1);
            const stats = new MatchStats();
            stats.rounds = totalRounds;
            stats.kills = rand(8, 20);
            stats.deaths = rand(6, 18);
            stats.assists = rand(2, 8);
            stats.damage = stats.kills * rand(130, 170) + rand(0, 500);
            p.seasonStats.add(stats);
        }
        
        return { t1Score: s1, t2Score: s2, winner: s1 > s2 ? t1 : t2, loser: s1 > s2 ? t2 : t1 };
    }

    simulateSeries(t1, t2, bestOf = 3) {
        let w1 = 0, w2 = 0;
        const needed = Math.ceil(bestOf / 2);
        const maps = [];
        
        while (w1 < needed && w2 < needed) {
            const result = this.simulateMap(t1, t2);
            maps.push({ t1Score: result.t1Score, t2Score: result.t2Score });
            if (result.winner === t1) w1++; else w2++;
        }
        
        const winner = w1 > w2 ? t1 : t2;
        const loser = w1 > w2 ? t2 : t1;
        
        winner.matchesWon++;
        loser.matchesLost++;
        winner.mapsWon += w1 > w2 ? w1 : w2;
        winner.mapsLost += w1 > w2 ? w2 : w1;
        loser.mapsWon += w1 > w2 ? w2 : w1;
        loser.mapsLost += w1 > w2 ? w1 : w2;
        
        // Morale
        for (const p of winner.roster) p.morale = clamp(p.morale + rand(2, 5), 0, 100);
        for (const p of loser.roster) p.morale = clamp(p.morale - rand(1, 4), 0, 100);
        
        return { winner, loser, score: (w1 > w2 ? w1 : w2) + '-' + (w1 > w2 ? w2 : w1), t1Wins: w1, t2Wins: w2, maps };
    }
}

// ============================================================================
// TOURNAMENT CLASSES
// ============================================================================

class TournamentMatch {
    constructor(t1, t2, round = '', bestOf = 3) {
        this.id = genId('m');
        this.team1 = t1;
        this.team2 = t2;
        this.round = round;
        this.bestOf = bestOf;
        this.played = false;
        this.winner = null;
        this.loser = null;
        this.score = null;
    }
}

class TripleElimBracket {
    constructor(teams) {
        this.teams = [...teams];
        this.losses = {};
        this.placements = {};
        this.matches = [];
        this.completedMatches = [];
        this.isComplete = false;
        this.currentRound = 0;
        teams.forEach(t => this.losses[t.id] = 0);
    }

    getActive() { return this.teams.filter(t => this.losses[t.id] < 3 && !this.placements[t.id]); }

    generateMatches() {
        const active = this.getActive();
        if (active.length <= 1) {
            this.isComplete = true;
            if (active.length === 1) this.placements[active[0].id] = 1;
            return [];
        }
        
        this.currentRound++;
        const pools = { 0: [], 1: [], 2: [] };
        active.forEach(t => pools[this.losses[t.id]].push(t));
        
        const newMatches = [];
        for (let l = 0; l <= 2; l++) {
            const pool = pools[l].sort(() => Math.random() - 0.5);
            while (pool.length >= 2) {
                const roundName = l === 0 ? 'Winners R' + this.currentRound : l === 1 ? 'Losers R' + this.currentRound : 'Elimination R' + this.currentRound;
                newMatches.push(new TournamentMatch(pool.shift(), pool.pop(), roundName));
            }
        }
        this.matches = newMatches;
        return newMatches;
    }

    recordResult(match, result) {
        match.played = true;
        match.winner = result.winner;
        match.loser = result.loser;
        match.score = result.score;
        this.completedMatches.push(match);
        this.losses[result.loser.id]++;
        
        if (this.losses[result.loser.id] >= 3) {
            this.placements[result.loser.id] = this.getActive().length + 1;
        }
        
        if (this.getActive().length <= 1) {
            const winner = this.getActive()[0];
            if (winner) this.placements[winner.id] = 1;
            this.isComplete = true;
        }
    }
}

class GroupStage {
    constructor(groups, matchesPerPair = 2) {
        this.groups = groups; // { A: [teams], B: [teams] }
        this.standings = {};
        this.matches = [];
        this.completedMatches = [];
        this.isComplete = false;
        
        for (const [g, teams] of Object.entries(groups)) {
            this.standings[g] = teams.map(t => ({ team: t, wins: 0, losses: 0, mapW: 0, mapL: 0 }));
        }
        this.generateAllMatches(matchesPerPair);
    }

    generateAllMatches(perPair) {
        for (const [g, teams] of Object.entries(this.groups)) {
            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    for (let k = 0; k < perPair; k++) {
                        this.matches.push(new TournamentMatch(teams[i], teams[j], 'Group ' + g));
                    }
                }
            }
        }
    }

    getUpcoming(n = 10) { return this.matches.filter(m => !m.played).slice(0, n); }

    recordResult(match, result) {
        match.played = true;
        match.winner = result.winner;
        match.loser = result.loser;
        match.score = result.score;
        this.completedMatches.push(match);
        
        for (const [g, standings] of Object.entries(this.standings)) {
            const ws = standings.find(s => s.team.id === result.winner.id);
            const ls = standings.find(s => s.team.id === result.loser.id);
            if (ws && ls) {
                ws.wins++;
                ws.mapW += result.t1Wins > result.t2Wins ? result.t1Wins : result.t2Wins;
                ws.mapL += result.t1Wins > result.t2Wins ? result.t2Wins : result.t1Wins;
                ls.losses++;
                ls.mapW += result.t1Wins > result.t2Wins ? result.t2Wins : result.t1Wins;
                ls.mapL += result.t1Wins > result.t2Wins ? result.t1Wins : result.t2Wins;
            }
        }
        
        if (this.matches.every(m => m.played)) this.isComplete = true;
    }

    getGroupStandings(g) {
        return [...this.standings[g]].sort((a, b) => b.wins - a.wins || (b.mapW - b.mapL) - (a.mapW - a.mapL));
    }
}

class DoubleElimBracket {
    constructor(seeds) {
        this.seeds = seeds;
        this.upperBracket = [[], [], []];
        this.lowerBracket = [[], [], [], []];
        this.grandFinal = null;
        this.completedMatches = [];
        this.placements = {};
        this.isComplete = false;
        this.initBracket();
    }

    initBracket() {
        if (this.seeds.length === 8) {
            this.upperBracket[0] = [
                new TournamentMatch(this.seeds[0], this.seeds[7], 'UB R1'),
                new TournamentMatch(this.seeds[3], this.seeds[4], 'UB R1'),
                new TournamentMatch(this.seeds[1], this.seeds[6], 'UB R1'),
                new TournamentMatch(this.seeds[2], this.seeds[5], 'UB R1')
            ];
        }
    }

    getUpcoming() {
        const all = [...this.upperBracket.flat(), ...this.lowerBracket.flat()];
        if (this.grandFinal) all.push(this.grandFinal);
        return all.filter(m => m && !m.played);
    }

    recordResult(match, result) {
        match.played = true;
        match.winner = result.winner;
        match.loser = result.loser;
        match.score = result.score;
        this.completedMatches.push(match);
        this.progress();
    }

    progress() {
        const ub0 = this.upperBracket[0];
        if (ub0.length === 4 && ub0.every(m => m.played) && this.upperBracket[1].length === 0) {
            this.upperBracket[1] = [
                new TournamentMatch(ub0[0].winner, ub0[1].winner, 'UB Semi'),
                new TournamentMatch(ub0[2].winner, ub0[3].winner, 'UB Semi')
            ];
            this.lowerBracket[0] = [
                new TournamentMatch(ub0[0].loser, ub0[1].loser, 'LB R1'),
                new TournamentMatch(ub0[2].loser, ub0[3].loser, 'LB R1')
            ];
        }

        const ub1 = this.upperBracket[1];
        const lb0 = this.lowerBracket[0];
        if (ub1.length === 2 && ub1.every(m => m.played) && lb0.length === 2 && lb0.every(m => m.played) && this.upperBracket[2].length === 0) {
            this.upperBracket[2] = [new TournamentMatch(ub1[0].winner, ub1[1].winner, 'UB Final')];
            this.lowerBracket[1] = [
                new TournamentMatch(lb0[0].winner, ub1[0].loser, 'LB R2'),
                new TournamentMatch(lb0[1].winner, ub1[1].loser, 'LB R2')
            ];
            lb0.forEach(m => { this.placements[m.loser.id] = 7; });
        }

        const ub2 = this.upperBracket[2];
        const lb1 = this.lowerBracket[1];
        if (ub2.length === 1 && ub2[0].played && lb1.length === 2 && lb1.every(m => m.played) && this.lowerBracket[2].length === 0) {
            this.lowerBracket[2] = [new TournamentMatch(lb1[0].winner, lb1[1].winner, 'LB Semi')];
            lb1.forEach(m => { this.placements[m.loser.id] = 5; });
        }

        const lb2 = this.lowerBracket[2];
        if (ub2.length === 1 && ub2[0].played && lb2.length === 1 && lb2[0].played && this.lowerBracket[3].length === 0) {
            this.lowerBracket[3] = [new TournamentMatch(lb2[0].winner, ub2[0].loser, 'LB Final')];
            this.placements[lb2[0].loser.id] = 4;
        }

        const lb3 = this.lowerBracket[3];
        if (lb3.length === 1 && lb3[0].played && !this.grandFinal) {
            this.grandFinal = new TournamentMatch(ub2[0].winner, lb3[0].winner, 'Grand Final', 5);
            this.placements[lb3[0].loser.id] = 3;
        }

        if (this.grandFinal && this.grandFinal.played) {
            this.placements[this.grandFinal.winner.id] = 1;
            this.placements[this.grandFinal.loser.id] = 2;
            this.isComplete = true;
        }
    }
}

// ============================================================================
// DATA GENERATION
// ============================================================================

function generatePlayer(region, role, tier = 'average') {
    const nats = NATIONALITIES[region] || NATIONALITIES.AMERICAS;
    return new Player(generateIGN(), role, nats[rand(0, nats.length - 1)], rand(17, 28), tier);
}

function generateTeam(info, region, tier) {
    const team = new Team(info.name, info.abbr, region, tier);
    const roles = ['Duelist', 'Initiator', 'Controller', 'Sentinel', 'Initiator'];
    
    for (const role of roles) {
        const p = generatePlayer(region, role, tier);
        p.teamId = team.id;
        p.salary = rand(40000, tier === 'star' ? 300000 : tier === 'good' ? 150000 : 80000);
        p.contractYears = rand(1, 3);
        team.roster.push(p);
    }
    
    // Add 1-2 bench players
    const extra = rand(1, 2);
    for (let i = 0; i < extra; i++) {
        const p = generatePlayer(region, ROLES[rand(0, 3)], tier === 'star' ? 'good' : 'average');
        p.teamId = team.id;
        p.salary = rand(30000, 60000);
        p.contractYears = rand(1, 2);
        team.roster.push(p);
    }
    
    return team;
}

function generateRegion(region) {
    const tiers = ['star', 'star', 'good', 'good', 'good', 'good', 'average', 'average', 'average', 'average', 'prospect', 'prospect'];
    const shuffled = tiers.sort(() => Math.random() - 0.5);
    return TEAM_NAMES[region].map((info, i) => generateTeam(info, region, shuffled[i]));
}

function generateFreeAgents(region, count = 20) {
    const fas = [];
    const tierDist = ['star', 'good', 'good', 'good', 'average', 'average', 'average', 'average', 'average', 'prospect', 'prospect'];
    for (let i = 0; i < count; i++) {
        fas.push(generatePlayer(region, ROLES[rand(0, 3)], tierDist[rand(0, tierDist.length - 1)]));
    }
    return fas;
}

// ============================================================================
// GAME CONTROLLER
// ============================================================================

let game = null;

class Game {
    constructor() {
        this.teams = {};
        this.freeAgents = {};
        this.playerTeamId = null;
        this.playerRegion = null;
        this.season = 1;
        this.week = 1;
        this.phase = 'roster_kickoff';
        this.phaseIndex = 0;
        this.tournament = null;
        this.tournamentType = null;
        this.currentGroups = null;
        this.seasonPoints = {};
        this.events = [];
        this.matchEngine = new MatchEngine();
    }

    init(teamId, region) {
        // Generate all regions
        for (const r of REGIONS) {
            const teams = generateRegion(r);
            for (const t of teams) this.teams[t.id] = t;
            this.freeAgents[r] = generateFreeAgents(r, 20);
        }
        
        this.playerTeamId = teamId;
        this.playerRegion = region;
        this.teams[teamId].isPlayer = true;
        
        for (const tid of Object.keys(this.teams)) this.seasonPoints[tid] = 0;
        
        this.addEvent('🎮', 'Welcome to ' + this.teams[teamId].name + '! Season ' + this.season + ' begins.');
        this.addEvent('📋', 'Roster changes are open before Kickoff.');
    }

    get playerTeam() { return this.teams[this.playerTeamId]; }
    get regionTeams() { return Object.values(this.teams).filter(t => t.region === this.playerRegion); }

    isRosterPhase() { return this.phase.startsWith('roster_') || this.phase === 'offseason' || this.phase.startsWith('groups_'); }
    isGroupStage() { return this.phase === 'stage_1_groups' || this.phase === 'stage_2_groups'; }

    addEvent(icon, msg) {
        this.events.unshift({ icon, msg, week: this.week });
        if (this.events.length > 50) this.events.pop();
    }

    getStandings() {
        return this.regionTeams
            .map(t => ({
                team: t,
                points: this.seasonPoints[t.id] || 0,
                isPlayer: t.id === this.playerTeamId
            }))
            .sort((a, b) => b.points - a.points);
    }

    // Roster management
    signPlayer(player, salary, years) {
        if (!this.isRosterPhase()) return { ok: false, msg: 'Roster locked during events' };
        if (this.playerTeam.roster.length >= 7) return { ok: false, msg: 'Roster full (max 7)' };
        if (salary > this.playerTeam.capSpace) return { ok: false, msg: 'Cannot afford' };
        
        player.teamId = this.playerTeamId;
        player.salary = salary;
        player.contractYears = years;
        this.playerTeam.roster.push(player);
        
        const faList = this.freeAgents[this.playerRegion];
        const idx = faList.indexOf(player);
        if (idx > -1) faList.splice(idx, 1);
        
        this.addEvent('✍️', 'Signed ' + player.name + ' (' + money(salary) + '/yr)');
        return { ok: true };
    }

    releasePlayer(player) {
        if (!this.isRosterPhase()) return { ok: false, msg: 'Roster locked during events' };
        
        const idx = this.playerTeam.roster.indexOf(player);
        if (idx > -1) {
            this.playerTeam.roster.splice(idx, 1);
            player.teamId = null;
            player.salary = 0;
            this.freeAgents[this.playerRegion].push(player);
            this.addEvent('👋', 'Released ' + player.name);
            return { ok: true };
        }
        return { ok: false, msg: 'Player not found' };
    }

    getMarketValue(player) {
        let val = 20000 + player.overall * 1500;
        if (player.age < 22) val *= 1.1;
        else if (player.age > 26) val *= 0.85;
        return Math.round(val);
    }

    // Phase management
    canAdvance() {
        if (this.isRosterPhase()) {
            const size = this.playerTeam.roster.length;
            if (size < 5 || size > 7) return { ok: false, msg: 'Need 5-7 players (have ' + size + ')' };
        }
        return { ok: true };
    }

    advancePhase() {
        this.phaseIndex++;
        if (this.phaseIndex >= PHASE_ORDER.length) {
            this.startNewSeason();
            return;
        }
        this.phase = PHASE_ORDER[this.phaseIndex];
        this.initPhase();
    }

    initPhase() {
        switch (this.phase) {
            case 'kickoff': this.startKickoff(); break;
            case 'masters_1': case 'masters_2': this.startMasters(); break;
            case 'groups_stage1': this.setupStageGroups('kickoff'); break;
            case 'groups_stage2': this.setupStageGroups('points'); break;
            case 'stage_1_groups': case 'stage_2_groups': this.startGroupStage(); break;
            case 'stage_1_playoffs': case 'stage_2_playoffs': this.startStagePlayoffs(); break;
            case 'worlds': this.startWorlds(); break;
            case 'offseason': this.processOffseason(); break;
        }
    }

    startKickoff() {
        this.tournament = new TripleElimBracket(this.regionTeams);
        this.tournamentType = 'kickoff';
        this.addEvent('🏆', 'Kickoff Tournament begins!');
    }

    startMasters() {
        // Simplified: top 3 from player's region
        const top3 = this.regionTeams.sort((a, b) => (a.kickoffPlace || 99) - (b.kickoffPlace || 99)).slice(0, 3);
        this.tournament = { teams: top3, isComplete: false, matches: [] };
        this.tournamentType = this.phase;
        this.addEvent('🌍', this.phase.replace('_', ' ').toUpperCase() + ' begins!');
        // Auto-complete for simplicity
        setTimeout(() => {
            this.tournament.isComplete = true;
            this.finalizeTournament();
        }, 0);
    }

    setupStageGroups(seedBy) {
        const sorted = seedBy === 'kickoff'
            ? this.regionTeams.sort((a, b) => (a.kickoffPlace || 99) - (b.kickoffPlace || 99))
            : this.regionTeams.sort((a, b) => (this.seasonPoints[b.id] || 0) - (this.seasonPoints[a.id] || 0));
        
        const groupA = [], groupB = [];
        sorted.forEach((t, i) => {
            if (i % 4 === 0 || i % 4 === 3) groupA.push(t);
            else groupB.push(t);
        });
        
        this.currentGroups = { A: groupA, B: groupB };
        this.addEvent('📊', 'Stage groups have been drawn!');
    }

    startGroupStage() {
        this.tournament = new GroupStage(this.currentGroups, 2);
        this.tournamentType = this.phase;
        this.addEvent('🏆', 'Group stage begins!');
    }

    startStagePlayoffs() {
        const gs = this.tournament;
        const topA = gs.getGroupStandings('A').slice(0, 4).map(s => s.team);
        const topB = gs.getGroupStandings('B').slice(0, 4).map(s => s.team);
        
        // Award group bonus points
        for (const [g, standings] of Object.entries(gs.standings)) {
            for (const s of standings) {
                this.seasonPoints[s.team.id] = (this.seasonPoints[s.team.id] || 0) + s.wins;
            }
        }
        
        const seeds = [topA[0], topB[3], topA[1], topB[2], topB[0], topA[3], topB[1], topA[2]].filter(t => t);
        this.tournament = new DoubleElimBracket(seeds);
        this.tournamentType = this.phase;
        this.addEvent('🏆', 'Playoffs begin!');
    }

    startWorlds() {
        const top4 = this.regionTeams.sort((a, b) => (this.seasonPoints[b.id] || 0) - (this.seasonPoints[a.id] || 0)).slice(0, 4);
        this.tournament = new DoubleElimBracket(top4.concat(top4).slice(0, 8)); // Pad if needed
        this.tournamentType = 'worlds';
        this.addEvent('🌍', 'Champions begins!');
    }

    processOffseason() {
        this.addEvent('🌴', 'Offseason - roster changes open.');
    }

    startNewSeason() {
        this.season++;
        this.week = 1;
        this.phaseIndex = 0;
        this.phase = PHASE_ORDER[0];
        for (const t of Object.values(this.teams)) {
            t.matchesWon = 0;
            t.matchesLost = 0;
            t.mapsWon = 0;
            t.mapsLost = 0;
            t.kickoffPlace = null;
            t.stage1Place = null;
            t.stage2Place = null;
        }
        for (const tid of Object.keys(this.seasonPoints)) this.seasonPoints[tid] = 0;
        this.addEvent('🆕', 'Season ' + this.season + ' begins!');
    }

    finalizeTournament() {
        const pointsTable = {
            kickoff: { 1: 3, 2: 2, 3: 1 },
            masters_1: { 1: 5, 2: 3, 3: 2 },
            masters_2: { 1: 7, 2: 5, 3: 4 },
            stage_1_playoffs: { 1: 5, 2: 3, 3: 2, 4: 1 },
            stage_2_playoffs: { 1: 7, 2: 5, 3: 4, 4: 3 },
            worlds: { 1: 10, 2: 7, 3: 5, 4: 3 }
        };
        
        const placements = this.tournament.placements || {};
        const table = pointsTable[this.tournamentType] || {};
        
        for (const [tid, place] of Object.entries(placements)) {
            const pts = table[place] || 0;
            this.seasonPoints[tid] = (this.seasonPoints[tid] || 0) + pts;
            
            const team = this.teams[tid];
            if (this.tournamentType === 'kickoff') team.kickoffPlace = place;
            else if (this.tournamentType === 'stage_1_playoffs') team.stage1Place = place;
            else if (this.tournamentType === 'stage_2_playoffs') team.stage2Place = place;
        }
        
        const playerPlace = placements[this.playerTeamId];
        if (playerPlace) {
            this.addEvent('🏆', ordinal(playerPlace) + ' place finish! (+' + (table[playerPlace] || 0) + ' pts)');
        }
        
        this.advancePhase();
    }

    // Simulation
    simWeek() {
        const check = this.canAdvance();
        if (!check.ok) return { ok: false, msg: check.msg, results: [] };
        
        this.week++;
        const results = [];
        
        if (this.isRosterPhase() || this.phase.startsWith('groups_stage')) {
            this.advancePhase();
            return { ok: true, msg: 'Advanced to ' + this.phase, results };
        }
        
        if (this.tournament) {
            let matches = [];
            
            if (this.tournament instanceof TripleElimBracket) {
                matches = this.tournament.generateMatches();
            } else if (this.tournament instanceof GroupStage) {
                matches = this.tournament.getUpcoming(6);
            } else if (this.tournament instanceof DoubleElimBracket) {
                matches = this.tournament.getUpcoming();
            }
            
            for (const match of matches) {
                const result = this.matchEngine.simulateSeries(match.team1, match.team2, match.bestOf);
                this.tournament.recordResult(match, result);
                
                const isPlayerMatch = match.team1.id === this.playerTeamId || match.team2.id === this.playerTeamId;
                results.push({
                    t1: match.team1.abbr,
                    t2: match.team2.abbr,
                    score: result.score,
                    winner: result.winner.abbr,
                    round: match.round,
                    isPlayer: isPlayerMatch
                });
                
                if (isPlayerMatch) {
                    const won = result.winner.id === this.playerTeamId;
                    this.addEvent(won ? '✅' : '❌', (won ? 'Victory' : 'Defeat') + ' vs ' + (won ? result.loser.abbr : result.winner.abbr) + ' (' + result.score + ')');
                }
            }
            
            if (this.tournament.isComplete) {
                this.finalizeTournament();
            }
        }
        
        return { ok: true, msg: 'Week ' + this.week, results };
    }

    simMonth() {
        const allResults = [];
        for (let i = 0; i < 4; i++) {
            const r = this.simWeek();
            if (!r.ok) return r;
            allResults.push(...r.results);
            if (!this.isGroupStage()) break; // Only full month for group stages
        }
        return { ok: true, msg: 'Simulated', results: allResults };
    }

    simToPlayoffs() {
        if (!this.isGroupStage()) return { ok: false, msg: 'Not in group stage' };
        const allResults = [];
        while (this.isGroupStage() && this.tournament && !this.tournament.isComplete) {
            const r = this.simWeek();
            if (!r.ok) return r;
            allResults.push(...r.results);
        }
        return { ok: true, msg: 'Simulated to playoffs', results: allResults };
    }

    // Save/Load
    save() {
        const data = {
            teams: this.teams,
            freeAgents: this.freeAgents,
            playerTeamId: this.playerTeamId,
            playerRegion: this.playerRegion,
            season: this.season,
            week: this.week,
            phase: this.phase,
            phaseIndex: this.phaseIndex,
            seasonPoints: this.seasonPoints,
            events: this.events.slice(0, 30)
        };
        localStorage.setItem('valgm_save', JSON.stringify(data));
    }

    static load() {
        const raw = localStorage.getItem('valgm_save');
        if (!raw) return null;
        try {
            const data = JSON.parse(raw);
            const g = new Game();
            Object.assign(g, data);
            
            // Reconstruct team rosters as Player instances
            for (const [tid, t] of Object.entries(g.teams)) {
                const team = Object.assign(new Team(t.name, t.abbr, t.region, t.tier), t);
                team.roster = t.roster.map(p => Object.assign(new Player(p.name, p.role, p.nationality, p.age), p));
                g.teams[tid] = team;
            }
            
            // Reconstruct free agents
            for (const [r, fas] of Object.entries(g.freeAgents)) {
                g.freeAgents[r] = fas.map(p => Object.assign(new Player(p.name, p.role, p.nationality, p.age), p));
            }
            
            return g;
        } catch (e) {
            console.error('Load error:', e);
            return null;
        }
    }
}

// ============================================================================
// UI CONTROLLER
// ============================================================================

let selectedRegion = 'AMERICAS';
let currentRoleFilter = 'all';
let pendingSignPlayer = null;
let previewTeams = null;

// Screen management
function showStartScreen() {
    document.getElementById('start-screen').style.display = 'flex';
    document.getElementById('team-select-screen').classList.remove('active');
    document.getElementById('game-container').classList.remove('active');
}

function showTeamSelection() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('team-select-screen').classList.add('active');
    
    // Generate preview teams
    previewTeams = {};
    for (const r of REGIONS) {
        const teams = generateRegion(r);
        for (const t of teams) previewTeams[t.id] = t;
    }
    
    renderTeamGrid();
}

function showGameScreen() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('team-select-screen').classList.remove('active');
    document.getElementById('game-container').classList.add('active');
    updateUI();
}

function renderTeamGrid() {
    const grid = document.getElementById('teams-grid');
    const teams = Object.values(previewTeams).filter(t => t.region === selectedRegion);
    
    grid.innerHTML = teams.map(t => `
        <div class="team-select-card" onclick="selectTeam('${t.id}', '${t.region}')">
            <h3>${t.name}</h3>
            <div class="abbr">${t.abbr}</div>
            <div class="ovr">OVR: ${t.overall}</div>
            <div class="team-tier tier-${t.tier}">${t.tier}</div>
        </div>
    `).join('');
}

function selectTeam(teamId, region) {
    game = new Game();
    
    // Use preview teams
    game.teams = previewTeams;
    for (const r of REGIONS) {
        game.freeAgents[r] = generateFreeAgents(r, 20);
    }
    
    game.playerTeamId = teamId;
    game.playerRegion = region;
    game.teams[teamId].isPlayer = true;
    for (const tid of Object.keys(game.teams)) game.seasonPoints[tid] = 0;
    
    game.addEvent('🎮', 'Welcome to ' + game.teams[teamId].name + '!');
    game.addEvent('📋', 'Roster period open.');
    
    game.save();
    previewTeams = null;
    showGameScreen();
}

function loadGame() {
    game = Game.load();
    if (game) {
        showGameScreen();
    } else {
        alert('No saved game found.');
    }
}

// Page navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.querySelector('.sidebar-link[data-page="' + pageId + '"]').classList.add('active');
    
    updateUI();
}

// Play menu
function togglePlayMenu() {
    document.getElementById('play-menu').classList.toggle('show');
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.play-dropdown')) {
        document.getElementById('play-menu')?.classList.remove('show');
    }
});

// Simulation functions
function simWeek() {
    togglePlayMenu();
    const result = game.simWeek();
    game.save();
    
    if (!result.ok) {
        alert(result.msg);
        return;
    }
    
    if (result.results.length > 0) {
        showResultsModal(result.results);
    }
    
    updateUI();
}

function simMonth() {
    togglePlayMenu();
    const result = game.simMonth();
    game.save();
    
    if (!result.ok) {
        alert(result.msg);
        return;
    }
    
    if (result.results.length > 0) {
        showResultsModal(result.results);
    }
    
    updateUI();
}

function simToPlayoffs() {
    togglePlayMenu();
    const result = game.simToPlayoffs();
    game.save();
    
    if (!result.ok) {
        alert(result.msg);
        return;
    }
    
    if (result.results.length > 0) {
        showResultsModal(result.results);
    }
    
    updateUI();
}

// UI Updates
function updateUI() {
    if (!game) return;
    
    const team = game.playerTeam;
    
    // Top bar
    document.getElementById('phase-display').textContent = 'Season ' + game.season + ' • Week ' + game.week + ' • ' + formatPhase(game.phase);
    document.getElementById('top-points').textContent = game.seasonPoints[game.playerTeamId] || 0;
    document.getElementById('top-record').textContent = team.record;
    document.getElementById('roster-status').textContent = game.isRosterPhase() ? '🔓 Roster Open' : '🔒 Roster Locked';
    
    // Update sim buttons
    const isGroupStage = game.isGroupStage();
    document.getElementById('sim-month-btn').disabled = !isGroupStage;
    document.getElementById('sim-playoffs-btn').disabled = !isGroupStage;
    
    // Dashboard
    document.getElementById('dashboard-team-name').textContent = team.name;
    
    renderDashboardStandings();
    renderDashboardLineup();
    renderDashboardFinances();
    renderDashboardNextMatch();
    renderDashboardBracket();
    
    // Other pages
    renderStandings();
    renderSchedule();
    renderRoster();
    renderFinances();
    renderFreeAgents();
    renderNews();
    
    // Roster lock notices
    const lockVisible = !game.isRosterPhase();
    document.getElementById('roster-lock-notice').classList.toggle('show', lockVisible);
    document.getElementById('fa-lock-notice').classList.toggle('show', lockVisible);
}

function formatPhase(phase) {
    const names = {
        roster_kickoff: 'Pre-Kickoff',
        kickoff: 'Kickoff',
        roster_masters1: 'Pre-Masters 1',
        masters_1: 'Masters 1',
        groups_stage1: 'Stage 1 Groups',
        stage_1_groups: 'Stage 1 Groups',
        stage_1_playoffs: 'Stage 1 Playoffs',
        roster_masters2: 'Pre-Masters 2',
        masters_2: 'Masters 2',
        groups_stage2: 'Stage 2 Groups',
        stage_2_groups: 'Stage 2 Groups',
        stage_2_playoffs: 'Stage 2 Playoffs',
        roster_worlds: 'Pre-Champions',
        worlds: 'Champions',
        offseason: 'Offseason'
    };
    return names[phase] || phase;
}

// Dashboard Rendering
function renderDashboardStandings() {
    const standings = game.getStandings().slice(0, 8);
    document.getElementById('dashboard-standings').innerHTML = standings.map((s, i) => `
        <tr class="${s.isPlayer ? 'player-row' : ''}">
            <td class="rank">${i + 1}</td>
            <td><a href="#" onclick="return false">${s.team.abbr}</a> ${s.team.name}</td>
            <td class="pts">${s.points}</td>
        </tr>
    `).join('');
}

function renderDashboardLineup() {
    const starters = game.playerTeam.getStarters();
    document.getElementById('dashboard-lineup').innerHTML = starters.map(p => `
        <tr>
            <td class="role">${p.role}</td>
            <td><a href="#" onclick="showPlayerModal('${p.id}'); return false" class="player-name">${p.name}</a></td>
            <td class="num ovr ${p.overall >= 80 ? 'ovr-high' : ''}">${p.overall}</td>
            <td class="num">${p.seasonStats.kd}</td>
            <td class="num">${p.seasonStats.acs}</td>
        </tr>
    `).join('');
}

function renderDashboardFinances() {
    const team = game.playerTeam;
    document.getElementById('dashboard-finances').innerHTML = `
        <div class="finance-row"><span class="finance-label">Budget</span><span class="finance-value">${money(team.budget)}</span></div>
        <div class="finance-row"><span class="finance-label">Payroll</span><span class="finance-value">${money(team.payroll)}</span></div>
        <div class="finance-row"><span class="finance-label">Cap Space</span><span class="finance-value ${team.capSpace >= 0 ? 'positive' : 'negative'}">${money(team.capSpace)}</span></div>
    `;
}

function renderDashboardNextMatch() {
    const container = document.getElementById('dashboard-next-match');
    
    if (!game.tournament || game.isRosterPhase()) {
        container.innerHTML = '<div class="next-match"><div style="text-align:center;color:var(--val-muted);">No upcoming match</div></div>';
        return;
    }
    
    let nextMatch = null;
    if (game.tournament.matches) {
        nextMatch = game.tournament.matches.find(m => !m.played && (m.team1.id === game.playerTeamId || m.team2.id === game.playerTeamId));
    }
    if (!nextMatch && game.tournament.getUpcoming) {
        const upcoming = game.tournament.getUpcoming();
        nextMatch = upcoming.find(m => m.team1.id === game.playerTeamId || m.team2.id === game.playerTeamId);
    }
    
    if (!nextMatch) {
        container.innerHTML = '<div class="next-match"><div style="text-align:center;color:var(--val-muted);">No upcoming match</div></div>';
        return;
    }
    
    const opp = nextMatch.team1.id === game.playerTeamId ? nextMatch.team2 : nextMatch.team1;
    container.innerHTML = `
        <div class="next-match">
            <div class="next-match-team player">${game.playerTeam.abbr}<br><small>${game.playerTeam.overall} ovr</small></div>
            <div class="next-match-vs">vs</div>
            <div class="next-match-team">${opp.abbr}<br><small>${opp.overall} ovr</small></div>
        </div>
        <div class="next-match-info">${nextMatch.round}</div>
    `;
}

function renderDashboardBracket() {
    const container = document.getElementById('dashboard-bracket');
    const titleEl = document.getElementById('tournament-title');
    
    titleEl.textContent = formatPhase(game.phase);
    
    if (!game.tournament) {
        container.innerHTML = '<p style="color:var(--val-muted);text-align:center;">No active tournament</p>';
        return;
    }
    
    if (game.tournament instanceof TripleElimBracket) {
        renderTripleElimMini(container, game.tournament);
    } else if (game.tournament instanceof GroupStage) {
        renderGroupStageMini(container, game.tournament);
    } else if (game.tournament instanceof DoubleElimBracket) {
        renderDoubleElimMini(container, game.tournament);
    }
}

function renderTripleElimMini(container, bracket) {
    // Show recent completed matches
    const recent = bracket.completedMatches.slice(-8);
    if (recent.length === 0) {
        container.innerHTML = '<p style="color:var(--val-muted);text-align:center;">Tournament starting...</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="bracket-container">
            ${recent.map(m => `
                <div class="bracket-match ${m.team1.id === game.playerTeamId || m.team2.id === game.playerTeamId ? 'player-match' : ''}">
                    <div class="bracket-team ${m.winner.id === m.team1.id ? 'winner' : 'loser'}">${m.team1.abbr} <span class="score">${m.score.split('-')[0]}</span></div>
                    <div class="bracket-team ${m.winner.id === m.team2.id ? 'winner' : 'loser'}">${m.team2.abbr} <span class="score">${m.score.split('-')[1]}</span></div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderGroupStageMini(container, gs) {
    let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">';
    
    for (const g of ['A', 'B']) {
        const standings = gs.getGroupStandings(g);
        html += `
            <div>
                <h4 style="margin-bottom:10px;">Group ${g}</h4>
                <table class="data-table">
                    <thead><tr><th>#</th><th>Team</th><th class="num">W</th><th class="num">L</th></tr></thead>
                    <tbody>
                        ${standings.map((s, i) => `
                            <tr class="${s.team.id === game.playerTeamId ? 'player-row' : ''}">
                                <td>${i + 1}</td>
                                <td>${s.team.abbr}</td>
                                <td class="num">${s.wins}</td>
                                <td class="num">${s.losses}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function renderDoubleElimMini(container, bracket) {
    const matches = [...bracket.upperBracket.flat(), ...bracket.lowerBracket.flat()];
    if (bracket.grandFinal) matches.push(bracket.grandFinal);
    
    const completed = matches.filter(m => m && m.played).slice(-6);
    
    if (completed.length === 0) {
        container.innerHTML = '<p style="color:var(--val-muted);text-align:center;">Playoffs starting...</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="bracket-container">
            ${completed.map(m => `
                <div class="bracket-match ${m.team1.id === game.playerTeamId || m.team2.id === game.playerTeamId ? 'player-match' : ''}">
                    <div class="bracket-team ${m.winner.id === m.team1.id ? 'winner' : 'loser'}">${m.team1.abbr} <span class="score">${m.score.split('-')[0]}</span></div>
                    <div class="bracket-team ${m.winner.id === m.team2.id ? 'winner' : 'loser'}">${m.team2.abbr} <span class="score">${m.score.split('-')[1]}</span></div>
                </div>
            `).join('')}
        </div>
    `;
}

// Standings Page
function renderStandings() {
    const standings = game.getStandings();
    document.getElementById('standings-body').innerHTML = standings.map((s, i) => `
        <tr class="${s.isPlayer ? 'player-row' : ''}">
            <td>${i + 1}</td>
            <td>${s.team.abbr} ${s.team.name}</td>
            <td class="num" style="color:var(--val-teal);font-weight:bold;">${s.points}</td>
            <td class="num">${s.team.record}</td>
            <td class="num">${s.team.mapsWon}-${s.team.mapsLost}</td>
            <td class="num">${s.team.kickoffPlace ? ordinal(s.team.kickoffPlace) : '-'}</td>
            <td class="num">${s.team.stage1Place ? ordinal(s.team.stage1Place) : '-'}</td>
        </tr>
    `).join('');
}

// Schedule Page
function renderSchedule() {
    const header = document.getElementById('schedule-header');
    const content = document.getElementById('schedule-content');
    
    header.textContent = formatPhase(game.phase);
    
    if (!game.tournament) {
        content.innerHTML = '<p style="color:var(--val-muted);">No active tournament</p>';
        return;
    }
    
    if (game.tournament instanceof GroupStage) {
        renderGroupSchedule(content, game.tournament);
    } else if (game.tournament instanceof TripleElimBracket) {
        renderTripleElimFull(content, game.tournament);
    } else if (game.tournament instanceof DoubleElimBracket) {
        renderDoubleElimFull(content, game.tournament);
    }
}

function renderGroupSchedule(container, gs) {
    const upcoming = gs.getUpcoming(10);
    
    let html = '<div class="schedule-list">';
    
    for (const match of upcoming) {
        const isPlayer = match.team1.id === game.playerTeamId || match.team2.id === game.playerTeamId;
        html += `
            <div class="schedule-match ${isPlayer ? 'player-match' : ''}">
                <div class="schedule-team">
                    <span>${match.team1.abbr}</span>
                    <span class="record">${match.team1.record}, ${match.team1.overall} ovr</span>
                </div>
                <div class="schedule-vs">vs</div>
                <div class="schedule-team right">
                    <span class="record">${match.team2.record}, ${match.team2.overall} ovr</span>
                    <span>${match.team2.abbr}</span>
                </div>
                <div class="schedule-action">
                    <button class="btn-sim" onclick="simWeek()">Sim to<br>game</button>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function renderTripleElimFull(container, bracket) {
    const matches = bracket.completedMatches;
    
    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">';
    
    for (const m of matches) {
        const isPlayer = m.team1.id === game.playerTeamId || m.team2.id === game.playerTeamId;
        html += `
            <div class="bracket-match ${isPlayer ? 'player-match' : ''}">
                <div class="bracket-team ${m.winner.id === m.team1.id ? 'winner' : 'loser'}">${m.team1.abbr} <span class="score">${m.score.split('-')[0]}</span></div>
                <div class="bracket-team ${m.winner.id === m.team2.id ? 'winner' : 'loser'}">${m.team2.abbr} <span class="score">${m.score.split('-')[1]}</span></div>
            </div>
        `;
    }
    
    html += '</div>';
    
    if (Object.keys(bracket.placements).length > 0) {
        html += '<h4 style="margin:20px 0 10px;">Placements</h4><table class="data-table"><tbody>';
        const sorted = Object.entries(bracket.placements).sort((a, b) => a[1] - b[1]);
        for (const [tid, place] of sorted) {
            const team = game.teams[tid];
            html += `<tr class="${tid === game.playerTeamId ? 'player-row' : ''}"><td>${ordinal(place)}</td><td>${team.name}</td></tr>`;
        }
        html += '</tbody></table>';
    }
    
    container.innerHTML = html;
}

function renderDoubleElimFull(container, bracket) {
    let html = '';
    
    // Upper Bracket
    html += '<h4 style="margin-bottom:10px;">Upper Bracket</h4>';
    html += '<div style="display:flex;gap:20px;overflow-x:auto;padding-bottom:10px;">';
    for (let i = 0; i < bracket.upperBracket.length; i++) {
        const round = bracket.upperBracket[i];
        if (round.length === 0) continue;
        html += `<div class="bracket-round"><div class="bracket-round-title">Round ${i + 1}</div>`;
        for (const m of round) {
            if (!m) continue;
            const isPlayer = m.team1?.id === game.playerTeamId || m.team2?.id === game.playerTeamId;
            if (m.played) {
                html += `
                    <div class="bracket-match ${isPlayer ? 'player-match' : ''}">
                        <div class="bracket-team ${m.winner.id === m.team1.id ? 'winner' : 'loser'}">${m.team1.abbr} <span class="score">${m.score.split('-')[0]}</span></div>
                        <div class="bracket-team ${m.winner.id === m.team2.id ? 'winner' : 'loser'}">${m.team2.abbr} <span class="score">${m.score.split('-')[1]}</span></div>
                    </div>
                `;
            } else {
                html += `
                    <div class="bracket-match ${isPlayer ? 'player-match' : ''}">
                        <div class="bracket-team">${m.team1?.abbr || 'TBD'}</div>
                        <div class="bracket-team">${m.team2?.abbr || 'TBD'}</div>
                    </div>
                `;
            }
        }
        html += '</div>';
    }
    html += '</div>';
    
    // Lower Bracket
    html += '<h4 style="margin:20px 0 10px;">Lower Bracket</h4>';
    html += '<div style="display:flex;gap:20px;overflow-x:auto;padding-bottom:10px;">';
    for (let i = 0; i < bracket.lowerBracket.length; i++) {
        const round = bracket.lowerBracket[i];
        if (round.length === 0) continue;
        html += `<div class="bracket-round"><div class="bracket-round-title">Round ${i + 1}</div>`;
        for (const m of round) {
            if (!m) continue;
            const isPlayer = m.team1?.id === game.playerTeamId || m.team2?.id === game.playerTeamId;
            if (m.played) {
                html += `
                    <div class="bracket-match ${isPlayer ? 'player-match' : ''}">
                        <div class="bracket-team ${m.winner.id === m.team1.id ? 'winner' : 'loser'}">${m.team1.abbr} <span class="score">${m.score.split('-')[0]}</span></div>
                        <div class="bracket-team ${m.winner.id === m.team2.id ? 'winner' : 'loser'}">${m.team2.abbr} <span class="score">${m.score.split('-')[1]}</span></div>
                    </div>
                `;
            } else {
                html += `
                    <div class="bracket-match ${isPlayer ? 'player-match' : ''}">
                        <div class="bracket-team">${m.team1?.abbr || 'TBD'}</div>
                        <div class="bracket-team">${m.team2?.abbr || 'TBD'}</div>
                    </div>
                `;
            }
        }
        html += '</div>';
    }
    html += '</div>';
    
    // Grand Final
    if (bracket.grandFinal) {
        const gf = bracket.grandFinal;
        const isPlayer = gf.team1?.id === game.playerTeamId || gf.team2?.id === game.playerTeamId;
        html += '<h4 style="margin:20px 0 10px;">Grand Final</h4>';
        if (gf.played) {
            html += `
                <div class="bracket-match ${isPlayer ? 'player-match' : ''}" style="max-width:200px;">
                    <div class="bracket-team ${gf.winner.id === gf.team1.id ? 'winner' : 'loser'}">${gf.team1.abbr} <span class="score">${gf.score.split('-')[0]}</span></div>
                    <div class="bracket-team ${gf.winner.id === gf.team2.id ? 'winner' : 'loser'}">${gf.team2.abbr} <span class="score">${gf.score.split('-')[1]}</span></div>
                </div>
            `;
        } else {
            html += `
                <div class="bracket-match ${isPlayer ? 'player-match' : ''}" style="max-width:200px;">
                    <div class="bracket-team">${gf.team1?.abbr || 'TBD'}</div>
                    <div class="bracket-team">${gf.team2?.abbr || 'TBD'}</div>
                </div>
            `;
        }
    }
    
    container.innerHTML = html;
}

// Roster Page
function renderRoster() {
    const team = game.playerTeam;
    const canModify = game.isRosterPhase();
    
    document.getElementById('roster-summary').textContent = team.roster.length + '/7 players • ' + money(team.payroll) + ' payroll • ' + money(team.capSpace) + ' cap space';
    
    document.getElementById('roster-body').innerHTML = team.roster.map((p, i) => {
        const moodClass = p.morale < 40 ? 'low' : p.morale < 60 ? 'med' : '';
        const ovrClass = p.overall >= 80 ? 'ovr-high' : '';
        return `
            <tr>
                <td><a href="#" onclick="showPlayerModal('${p.id}'); return false" class="player-name">${p.name}</a></td>
                <td>${p.role}</td>
                <td class="num">${p.age}</td>
                <td class="num ovr ${ovrClass}">${p.overall}</td>
                <td class="num">${p.potential}</td>
                <td>${money(p.salary)} / ${p.contractYears}yr</td>
                <td class="num">${p.seasonStats.kd}</td>
                <td class="num">${p.seasonStats.acs}</td>
                <td class="mood"><div class="mood-bar"><div class="mood-fill ${moodClass}" style="width:${p.morale}%"></div></div></td>
                <td><button class="btn-release" onclick="releasePlayer('${p.id}')" ${canModify ? '' : 'disabled'}>Release</button></td>
            </tr>
        `;
    }).join('');
}

// Finances Page
function renderFinances() {
    const team = game.playerTeam;
    document.getElementById('finances-detail').innerHTML = `
        <div class="finance-row"><span class="finance-label">Yearly Budget</span><span class="finance-value">${money(team.budget)}</span></div>
        <div class="finance-row"><span class="finance-label">Current Payroll</span><span class="finance-value">${money(team.payroll)}</span></div>
        <div class="finance-row"><span class="finance-label">Cap Space</span><span class="finance-value ${team.capSpace >= 0 ? 'positive' : 'negative'}">${money(team.capSpace)}</span></div>
        <hr style="border-color:var(--val-gray);margin:15px 0;">
        <h4 style="margin-bottom:10px;">Player Salaries</h4>
        ${team.roster.map(p => `
            <div class="finance-row">
                <span class="finance-label">${p.name} (${p.contractYears}yr)</span>
                <span class="finance-value">${money(p.salary)}</span>
            </div>
        `).join('')}
    `;
}

// Free Agents Page
function renderFreeAgents() {
    const fas = game.freeAgents[game.playerRegion] || [];
    const canSign = game.isRosterPhase();
    
    let filtered = fas;
    if (currentRoleFilter !== 'all') {
        filtered = fas.filter(p => p.role === currentRoleFilter);
    }
    filtered = filtered.sort((a, b) => b.overall - a.overall);
    
    document.getElementById('fa-body').innerHTML = filtered.map(p => {
        const val = game.getMarketValue(p);
        const ovrClass = p.overall >= 80 ? 'ovr-high' : '';
        return `
            <tr>
                <td><a href="#" onclick="showPlayerModal('${p.id}', true); return false" class="player-name">${p.name}</a></td>
                <td>${p.role}</td>
                <td class="num">${p.age}</td>
                <td class="num ovr ${ovrClass}">${p.overall}</td>
                <td class="num">${p.potential}</td>
                <td>${p.nationality}</td>
                <td class="num">${money(val)}</td>
                <td><button class="btn-sign" onclick="openSignModal('${p.id}')" ${canSign ? '' : 'disabled'}>Sign</button></td>
            </tr>
        `;
    }).join('');
}

// News Page
function renderNews() {
    document.getElementById('news-content').innerHTML = game.events.map(e => `
        <div class="news-item">
            <span class="news-icon">${e.icon}</span>
            <span class="news-text">${e.msg}</span>
            <span class="news-time">W${e.week}</span>
        </div>
    `).join('');
}

// Modals
function showModal(id) {
    document.getElementById(id).classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

function showPlayerModal(playerId, isFreeAgent = false) {
    const p = isFreeAgent 
        ? game.freeAgents[game.playerRegion].find(x => x.id === playerId)
        : game.playerTeam.roster.find(x => x.id === playerId);
    
    if (!p) return;
    
    document.getElementById('player-modal-title').textContent = p.name;
    document.getElementById('player-modal-body').innerHTML = `
        <div style="display:flex;gap:20px;margin-bottom:20px;">
            <div style="font-size:36px;font-weight:bold;color:${p.overall >= 80 ? 'var(--val-gold)' : 'var(--val-teal)'}">${p.overall}</div>
            <div>
                <div><strong>Role:</strong> ${p.role}</div>
                <div><strong>Age:</strong> ${p.age}</div>
                <div><strong>Nationality:</strong> ${p.nationality}</div>
                <div><strong>Potential:</strong> ${p.potential}</div>
                ${!isFreeAgent ? `<div><strong>Contract:</strong> ${money(p.salary)}/yr, ${p.contractYears}yr left</div>` : ''}
            </div>
        </div>
        
        <h4 style="margin-bottom:10px;">Attributes</h4>
        <div class="player-detail-grid">
            <div class="attr-box">
                <div class="attr-box-title">Core</div>
                <div class="attr-row"><span>Aim</span><span class="attr-value">${p.attributes.aim}</span></div>
                <div class="attr-row"><span>Game Sense</span><span class="attr-value">${p.attributes.gameSense}</span></div>
                <div class="attr-row"><span>Movement</span><span class="attr-value">${p.attributes.movement}</span></div>
            </div>
            <div class="attr-box">
                <div class="attr-box-title">Skills</div>
                <div class="attr-row"><span>Utility</span><span class="attr-value">${p.attributes.utility}</span></div>
                <div class="attr-row"><span>Teamplay</span><span class="attr-value">${p.attributes.teamplay}</span></div>
                <div class="attr-row"><span>Mental</span><span class="attr-value">${p.attributes.mental}</span></div>
            </div>
            <div class="attr-box">
                <div class="attr-box-title">Season Stats</div>
                <div class="attr-row"><span>K/D</span><span class="attr-value">${p.seasonStats.kd}</span></div>
                <div class="attr-row"><span>ACS</span><span class="attr-value">${p.seasonStats.acs}</span></div>
                <div class="attr-row"><span>Morale</span><span class="attr-value">${p.morale}%</span></div>
            </div>
        </div>
    `;
    
    const footer = document.getElementById('player-modal-footer');
    if (!isFreeAgent && game.isRosterPhase()) {
        footer.innerHTML = `
            <button class="btn-modal btn-modal-secondary" onclick="closeModal('player-modal')">Close</button>
            <button class="btn-modal btn-modal-danger" onclick="releasePlayer('${p.id}'); closeModal('player-modal');">Release</button>
        `;
    } else {
        footer.innerHTML = `<button class="btn-modal btn-modal-secondary" onclick="closeModal('player-modal')">Close</button>`;
    }
    
    showModal('player-modal');
}

function openSignModal(playerId) {
    const p = game.freeAgents[game.playerRegion].find(x => x.id === playerId);
    if (!p) return;
    
    pendingSignPlayer = p;
    const marketVal = game.getMarketValue(p);
    
    document.getElementById('sign-modal-title').textContent = 'Sign ' + p.name;
    document.getElementById('sign-modal-body').innerHTML = `
        <div style="display:flex;gap:15px;margin-bottom:20px;">
            <div style="font-size:28px;font-weight:bold;color:var(--val-teal);">${p.overall}</div>
            <div>
                <div><strong>${p.name}</strong></div>
                <div>${p.role} • ${p.age}yo</div>
                <div>Market Value: ${money(marketVal)}/yr</div>
            </div>
        </div>
        
        <div class="form-group">
            <label class="form-label">Annual Salary</label>
            <input type="range" id="sign-salary" class="form-control" 
                min="${Math.round(marketVal * 0.8)}" 
                max="${Math.round(marketVal * 1.5)}" 
                value="${marketVal}"
                oninput="document.getElementById('salary-display').textContent = money(this.value)">
            <div id="salary-display" style="text-align:center;margin-top:5px;color:var(--val-teal);font-weight:bold;">${money(marketVal)}</div>
        </div>
        
        <div class="form-group">
            <label class="form-label">Contract Length</label>
            <select id="sign-years" class="form-control">
                <option value="1">1 Year</option>
                <option value="2" selected>2 Years</option>
                <option value="3">3 Years</option>
            </select>
        </div>
        
        <div style="color:var(--val-muted);font-size:13px;">
            Cap Space: ${money(game.playerTeam.capSpace)}
        </div>
    `;
    
    showModal('sign-modal');
}

function confirmSign() {
    if (!pendingSignPlayer) return;
    
    const salary = parseInt(document.getElementById('sign-salary').value);
    const years = parseInt(document.getElementById('sign-years').value);
    
    const result = game.signPlayer(pendingSignPlayer, salary, years);
    
    if (result.ok) {
        closeModal('sign-modal');
        game.save();
        updateUI();
    } else {
        alert(result.msg);
    }
    
    pendingSignPlayer = null;
}

function releasePlayer(playerId) {
    const player = game.playerTeam.roster.find(p => p.id === playerId);
    if (!player) return;
    
    if (!confirm('Release ' + player.name + '?')) return;
    
    const result = game.releasePlayer(player);
    if (result.ok) {
        game.save();
        updateUI();
    } else {
        alert(result.msg);
    }
}

function showResultsModal(results) {
    const playerResults = results.filter(r => r.isPlayer);
    const otherResults = results.filter(r => !r.isPlayer);
    
    let html = '';
    
    if (playerResults.length > 0) {
        html += '<h4 style="margin-bottom:10px;">Your Matches</h4>';
        for (const r of playerResults) {
            const won = r.winner === game.playerTeam.abbr;
            html += `
                <div class="result-match ${won ? 'win' : 'loss'}">
                    <span class="result-teams">${r.t1} vs ${r.t2}</span>
                    <span class="result-score">${r.score}</span>
                </div>
            `;
        }
    }
    
    if (otherResults.length > 0 && otherResults.length <= 10) {
        html += '<h4 style="margin:20px 0 10px;">Other Results</h4>';
        for (const r of otherResults.slice(0, 8)) {
            html += `
                <div class="result-match">
                    <span class="result-teams">${r.t1} vs ${r.t2}</span>
                    <span class="result-score">${r.score}</span>
                </div>
            `;
        }
    }
    
    document.getElementById('results-modal-body').innerHTML = html;
    showModal('results-modal');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('Valorant GM Simulator v3.0 loaded');
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', () => {
            const page = link.dataset.page;
            if (page) showPage(page);
        });
    });
    
    // Region tabs
    document.querySelectorAll('.region-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.region-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            selectedRegion = tab.dataset.region;
            renderTeamGrid();
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
    
    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
});

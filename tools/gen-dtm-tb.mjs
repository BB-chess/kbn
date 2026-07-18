/**
 * Full KBNK distance-to-mate (DTM) tablebase via retrograde analysis.
 *
 * White always holds K+B+N; Black is the lone king. Every legal placement of
 * (wk, wb, wn, bk) with either side to move is solved exactly by working
 * backwards from all checkmate positions, then a forward-search self-check
 * validates a random sample.
 *
 * Usage:  node tools/gen-dtm-tb.mjs
 * Output: tb/kbnk-dtm.bin   (64^4 * 2 bytes = 32 MiB)
 *
 * Byte encoding (per position, indexed by posIndex*2 + stm; stm 0 = White, 1 = Black):
 *   0..252  = plies to mate under optimal play (0 = Black is checkmated now)
 *   254     = draw (White cannot force mate / stalemate / Black can hold)
 *   255     = illegal position
 * White-to-move winning values are odd (mate in N moves = 2N-1 plies).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'tb');

const POS = 64 * 64 * 64 * 64;   // 16,777,216
const SIZE = POS * 2;            // 33,554,432
const DRAW = 254, ILLEGAL = 255, UNKNOWN = 253;

// ---- geometry -------------------------------------------------------------
const fileOf = s => s & 7;
const rankOf = s => s >> 3;

const kAdj = new Uint8Array(4096);   // king adjacency (excludes equal square)
const knAtt = new Uint8Array(4096);  // knight attack
const kingSteps = [];
const knightSteps = [];
const bishopRays = [];               // 4 ordered ray arrays per square

const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

for (let s = 0; s < 64; s++) {
    const f = fileOf(s), r = rankOf(s);
    const ks = [], ns = [], rays = [[], [], [], []];
    for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
        if (!df && !dr) continue;
        const nf = f + df, nr = r + dr;
        if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
            const t = nr * 8 + nf;
            ks.push(t);
            kAdj[s * 64 + t] = 1;
        }
    }
    for (const [df, dr] of KNIGHT) {
        const nf = f + df, nr = r + dr;
        if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
            const t = nr * 8 + nf;
            ns.push(t);
            knAtt[s * 64 + t] = 1;
        }
    }
    for (let d = 0; d < 4; d++) {
        const [df, dr] = DIAG[d];
        let nf = f + df, nr = r + dr;
        while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
            rays[d].push(nr * 8 + nf);
            nf += df; nr += dr;
        }
    }
    kingSteps.push(ks);
    knightSteps.push(ns);
    bishopRays.push(rays);
}

// Is square `s` attacked by White (bishop blockers = {wk, wn})?
function attackedByWhite(s, wk, wb, wn) {
    if (kAdj[wk * 64 + s]) return true;
    if (knAtt[wn * 64 + s]) return true;
    const rays = bishopRays[wb];
    for (let d = 0; d < 4; d++) {
        const ray = rays[d];
        for (let i = 0; i < ray.length; i++) {
            const sq = ray[i];
            if (sq === s) return true;
            if (sq === wk || sq === wn) break;
        }
    }
    return false;
}

// Does the bishop hit `t` with a single blocker (used after the knight is captured)?
function bishopHits(wb, t, blocker) {
    const rays = bishopRays[wb];
    for (let d = 0; d < 4; d++) {
        const ray = rays[d];
        for (let i = 0; i < ray.length; i++) {
            const sq = ray[i];
            if (sq === t) return true;
            if (sq === blocker) break;
        }
    }
    return false;
}

// Count Black king's legal moves (captures of B/N included so that a capture
// keeps the counter above zero — meaning Black is never "forced lost").
function blackMoveCount(wk, wb, wn, bk) {
    let cnt = 0;
    const ks = kingSteps[bk];
    for (let i = 0; i < ks.length; i++) {
        const t = ks[i];
        if (t === wk) continue;
        if (kAdj[wk * 64 + t]) continue;
        if (t === wb) { if (!knAtt[wn * 64 + t]) cnt++; }
        else if (t === wn) { if (!bishopHits(wb, t, wk)) cnt++; }
        else { if (!attackedByWhite(t, wk, wb, wn)) cnt++; }
    }
    return cnt;
}

const posIndex = (wk, wb, wn, bk) => (wk << 18) | (wb << 12) | (wn << 6) | bk;

// ---- retrograde solve -----------------------------------------------------
console.log('Allocating', ((SIZE + POS + SIZE * 4) / 1e6).toFixed(0), 'MB…');
const val = new Uint8Array(SIZE).fill(UNKNOWN);
const degree = new Uint8Array(POS);
const queue = new Int32Array(SIZE);
let qhead = 0, qtail = 0;

console.log('Initialising terminals…');
let mates = 0;
for (let pos = 0; pos < POS; pos++) {
    const bk = pos & 63, wn = (pos >> 6) & 63, wb = (pos >> 12) & 63, wk = (pos >> 18) & 63;

    if (wk === wb || wk === wn || wk === bk || wb === wn || wb === bk || wn === bk ||
        kAdj[wk * 64 + bk]) {
        val[pos * 2] = ILLEGAL;
        val[pos * 2 + 1] = ILLEGAL;
        continue;
    }

    const blackInCheck = attackedByWhite(bk, wk, wb, wn);
    val[pos * 2] = blackInCheck ? ILLEGAL : UNKNOWN;   // White to move: Black may not be in check

    const cnt = blackMoveCount(wk, wb, wn, bk);
    if (cnt === 0) {
        if (blackInCheck) { val[pos * 2 + 1] = 0; queue[qtail++] = pos * 2 + 1; mates++; }
        else val[pos * 2 + 1] = DRAW;                  // stalemate
    } else {
        val[pos * 2 + 1] = UNKNOWN;
        degree[pos] = cnt;
    }
}
console.log('  checkmates:', mates.toLocaleString());

console.log('Retrograde BFS…');
let maxDist = 0;
while (qhead < qtail) {
    const q = queue[qhead++];
    const stm = q & 1, pos = q >> 1, d = val[q];
    if (d > maxDist) maxDist = d;
    const bk = pos & 63, wn = (pos >> 6) & 63, wb = (pos >> 12) & 63, wk = (pos >> 18) & 63;
    const nd = d + 1;

    if (stm === 1) {
        // Black to move is LOST(d) -> White-to-move predecessors are WON(d+1).
        // King un-move
        const kk = kingSteps[wk];
        for (let i = 0; i < kk.length; i++) {
            const o = kk[i];
            if (o === wb || o === wn || o === bk) continue;
            if (kAdj[o * 64 + bk]) continue;
            if (attackedByWhite(bk, o, wb, wn)) continue;
            const vi = posIndex(o, wb, wn, bk) * 2;
            if (val[vi] === UNKNOWN) { val[vi] = nd; queue[qtail++] = vi; }
        }
        // Knight un-move
        const nn = knightSteps[wn];
        for (let i = 0; i < nn.length; i++) {
            const o = nn[i];
            if (o === wk || o === wb || o === bk) continue;
            if (attackedByWhite(bk, wk, wb, o)) continue;
            const vi = posIndex(wk, wb, o, bk) * 2;
            if (val[vi] === UNKNOWN) { val[vi] = nd; queue[qtail++] = vi; }
        }
        // Bishop un-move
        const rays = bishopRays[wb];
        for (let dd = 0; dd < 4; dd++) {
            const ray = rays[dd];
            for (let i = 0; i < ray.length; i++) {
                const o = ray[i];
                if (o === wk || o === wn || o === bk) break;
                if (attackedByWhite(bk, wk, o, wn)) continue;
                const vi = posIndex(wk, o, wn, bk) * 2;
                if (val[vi] === UNKNOWN) { val[vi] = nd; queue[qtail++] = vi; }
            }
        }
    } else {
        // White to move is WON(d) -> Black-to-move predecessors lose their last
        // free square. Decrement each predecessor's move counter.
        const kk = kingSteps[bk];
        for (let i = 0; i < kk.length; i++) {
            const o = kk[i];
            if (o === wk || o === wb || o === wn) continue;
            if (kAdj[wk * 64 + o]) continue;
            const ppos = posIndex(wk, wb, wn, o);
            const vi = ppos * 2 + 1;
            if (val[vi] !== UNKNOWN) continue;
            const dg = --degree[ppos];
            if (dg === 0) { val[vi] = nd; queue[qtail++] = vi; }
        }
    }
}
console.log('  solved positions:', qtail.toLocaleString(), '· deepest =', maxDist, 'plies (mate in ' + Math.ceil(maxDist / 2) + ')');

// Everything still UNKNOWN is a draw.
let draws = 0;
for (let i = 0; i < SIZE; i++) if (val[i] === UNKNOWN) { val[i] = DRAW; draws++; }
console.log('  draw positions:', draws.toLocaleString());

// ---- forward-search self-verification ------------------------------------
// Independently re-derive each sampled position's value from its children
// (forward move application) and confirm it matches the retrograde table.
function whiteChildVals(wk, wb, wn, bk, out) {
    out.length = 0;
    const kk = kingSteps[wk];
    for (let i = 0; i < kk.length; i++) {
        const t = kk[i];
        if (t === wb || t === wn) continue;
        if (kAdj[bk * 64 + t]) continue;      // would touch the Black king
        out.push(val[posIndex(t, wb, wn, bk) * 2 + 1]);
    }
    const nn = knightSteps[wn];
    for (let i = 0; i < nn.length; i++) {
        const t = nn[i];
        if (t === wk || t === wb || t === bk) continue;
        out.push(val[posIndex(wk, wb, t, bk) * 2 + 1]);
    }
    const rays = bishopRays[wb];
    for (let d = 0; d < 4; d++) {
        const ray = rays[d];
        for (let i = 0; i < ray.length; i++) {
            const t = ray[i];
            if (t === wk || t === wn || t === bk) break;
            out.push(val[posIndex(wk, t, wn, bk) * 2 + 1]);
        }
    }
}

function blackChildInfo(wk, wb, wn, bk) {
    let hasCapture = false, hasDrawEmpty = false, moves = 0;
    let maxDist = -1, allWin = true;
    const kk = kingSteps[bk];
    for (let i = 0; i < kk.length; i++) {
        const t = kk[i];
        if (t === wk) continue;
        if (kAdj[wk * 64 + t]) continue;
        if (t === wb) { if (!knAtt[wn * 64 + t]) { hasCapture = true; moves++; } continue; }
        if (t === wn) { if (!bishopHits(wb, t, wk)) { hasCapture = true; moves++; } continue; }
        if (attackedByWhite(t, wk, wb, wn)) continue;
        moves++;
        const cv = val[posIndex(wk, wb, wn, t) * 2];    // White to move
        if (cv === DRAW || cv === ILLEGAL) { hasDrawEmpty = true; allWin = false; }
        else if (cv > maxDist) maxDist = cv;
    }
    return { hasCapture, hasDrawEmpty, moves, maxDist, allWin };
}

function verify(sampleCount) {
    console.log('Verifying', sampleCount.toLocaleString(), 'random positions (forward search)…');
    const out = [];
    let checked = 0, bad = 0;
    for (let s = 0; s < sampleCount; s++) {
        const pos = (Math.random() * POS) | 0;
        const bk = pos & 63, wn = (pos >> 6) & 63, wb = (pos >> 12) & 63, wk = (pos >> 18) & 63;

        // White to move
        const vw = val[pos * 2];
        if (vw !== ILLEGAL) {
            checked++;
            whiteChildVals(wk, wb, wn, bk, out);
            let best = 999;
            for (const cv of out) if (cv !== DRAW && cv !== ILLEGAL && cv < best) best = cv;
            const expect = best === 999 ? DRAW : best + 1;
            if (expect !== vw) {
                if (bad < 12) console.log('  MISMATCH white', { wk, wb, wn, bk, table: vw, expect });
                bad++;
            }
        }

        // Black to move
        const vb = val[pos * 2 + 1];
        if (vb !== ILLEGAL) {
            checked++;
            const info = blackChildInfo(wk, wb, wn, bk);
            let expect;
            if (info.moves === 0) {
                expect = attackedByWhite(bk, wk, wb, wn) ? 0 : DRAW;
            } else if (info.hasCapture || info.hasDrawEmpty || !info.allWin || info.maxDist < 0) {
                expect = DRAW;   // Black holds
            } else {
                expect = info.maxDist + 1;
            }
            if (expect !== vb) {
                if (bad < 12) console.log('  MISMATCH black', { wk, wb, wn, bk, table: vb, expect, info });
                bad++;
            }
        }
    }
    console.log('  checked', checked.toLocaleString(), '· mismatches', bad);
    return bad === 0;
}

const ok = verify(300000);

// Distribution of White-to-move mates by move count (odd plies).
const hist = {};
for (let pos = 0; pos < POS; pos++) {
    const v = val[pos * 2];
    if (v < DRAW && (v & 1) === 1) {
        const n = (v + 1) >> 1;
        hist[n] = (hist[n] || 0) + 1;
    }
}
const keys = Object.keys(hist).map(Number).sort((a, b) => a - b);
console.log('White-to-move mate distribution (mate in N : positions):');
for (const n of keys) console.log('  M' + n, hist[n].toLocaleString());

fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, 'kbnk-dtm.bin');
fs.writeFileSync(file, val);
console.log('Wrote', file, val.length.toLocaleString(), 'bytes.', ok ? 'Verification PASSED.' : 'VERIFICATION FAILED.');

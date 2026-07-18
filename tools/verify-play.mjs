/**
 * Forward-play check of the DTM tablebase: for several mate-in-N buckets,
 * pick random White-to-move positions and play them out with both sides
 * optimal (White minimises DTM, Black maximises), asserting mate arrives in
 * exactly N moves.  Usage: node tools/verify-play.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const val = new Uint8Array(fs.readFileSync(path.join(__dirname, '..', 'tb', 'kbnk-dtm.bin')));
const POS = val.length >> 1;
const DRAW = 254, ILLEGAL = 255;

const kAdj = new Uint8Array(4096), knAtt = new Uint8Array(4096);
const kingSteps = [], knightSteps = [], bishopRays = [];
const KN = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const DG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
for (let s = 0; s < 64; s++) {
    const f = s & 7, r = s >> 3, ks = [], ns = [], rays = [[], [], [], []];
    for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
        if (!df && !dr) continue;
        const nf = f + df, nr = r + dr;
        if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) { const t = nr * 8 + nf; ks.push(t); kAdj[s * 64 + t] = 1; }
    }
    for (const [df, dr] of KN) { const nf = f + df, nr = r + dr; if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) { const t = nr * 8 + nf; ns.push(t); knAtt[s * 64 + t] = 1; } }
    for (let d = 0; d < 4; d++) { const [df, dr] = DG[d]; let nf = f + df, nr = r + dr; while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) { rays[d].push(nr * 8 + nf); nf += df; nr += dr; } }
    kingSteps.push(ks); knightSteps.push(ns); bishopRays.push(rays);
}
const idx = (wk, wb, wn, bk) => (wk << 18) | (wb << 12) | (wn << 6) | bk;
function attByWhite(s, wk, wb, wn) {
    if (kAdj[wk * 64 + s] || knAtt[wn * 64 + s]) return true;
    const rays = bishopRays[wb];
    for (let d = 0; d < 4; d++) { const ray = rays[d]; for (let i = 0; i < ray.length; i++) { const sq = ray[i]; if (sq === s) return true; if (sq === wk || sq === wn) break; } }
    return false;
}

function whiteMoves(wk, wb, wn, bk) {
    const out = [];
    for (const t of kingSteps[wk]) { if (t === wb || t === wn) continue; if (kAdj[bk * 64 + t]) continue; out.push([t, wb, wn, bk]); }
    for (const t of knightSteps[wn]) { if (t === wk || t === wb || t === bk) continue; out.push([wk, wb, t, bk]); }
    const rays = bishopRays[wb];
    for (let d = 0; d < 4; d++) { const ray = rays[d]; for (let i = 0; i < ray.length; i++) { const t = ray[i]; if (t === wk || t === wn || t === bk) break; out.push([wk, t, wn, bk]); } }
    return out;
}
function bishopHits(wb, t, blocker) {
    const rays = bishopRays[wb];
    for (let d = 0; d < 4; d++) { const ray = rays[d]; for (let i = 0; i < ray.length; i++) { const sq = ray[i]; if (sq === t) return true; if (sq === blocker) break; } }
    return false;
}
function blackMoves(wk, wb, wn, bk) {
    const out = [];
    for (const t of kingSteps[bk]) {
        if (t === wk || kAdj[wk * 64 + t]) continue;
        if (t === wb) { if (!knAtt[wn * 64 + t]) out.push('draw'); continue; }   // safe capture => draw
        if (t === wn) { if (!bishopHits(wb, t, wk)) out.push('draw'); continue; }
        if (attByWhite(t, wk, wb, wn)) continue;
        out.push([wk, wb, wn, t]);
    }
    return out;
}

function playOut(wk, wb, wn, bk) {
    let plies = 0;
    while (true) {
        // White to move
        let best = null, bv = 9999;
        for (const c of whiteMoves(wk, wb, wn, bk)) {
            const v = val[idx(c[0], c[1], c[2], c[3]) * 2 + 1];
            if (v === DRAW || v === ILLEGAL) continue;
            if (v < bv) { bv = v; best = c; }
        }
        if (!best) throw new Error('white stuck');
        [wk, wb, wn, bk] = best; plies++;
        if (bv === 0) return plies;   // Black is now checkmated
        // Black to move (maximise)
        let bb = null, bmax = -1;
        for (const c of blackMoves(wk, wb, wn, bk)) {
            if (c === 'draw') throw new Error('black can draw from a won position');
            const v = val[idx(c[0], c[1], c[2], c[3]) * 2];
            if (v === DRAW || v === ILLEGAL) throw new Error('black reaches non-win');
            if (v > bmax) { bmax = v; bb = c; }
        }
        if (!bb) throw new Error('black stuck but not mated');
        [wk, wb, wn, bk] = bb; plies++;
    }
}

let fails = 0;
for (const N of [1, 2, 3, 4, 5, 6, 7, 8, 12, 20, 30, 33]) {
    const targetPly = 2 * N - 1;
    const pool = [];
    for (let pos = 0; pos < POS && pool.length < 4000; pos++) if (val[pos * 2] === targetPly) pool.push(pos);
    if (!pool.length) { console.log('M' + N, 'no positions'); continue; }
    let ok = 0, bad = 0;
    const samples = Math.min(200, pool.length);
    for (let i = 0; i < samples; i++) {
        const pos = pool[(Math.random() * pool.length) | 0];
        const played = playOut((pos >> 18) & 63, (pos >> 12) & 63, (pos >> 6) & 63, pos & 63);
        if (played === 2 * N - 1) ok++; else { bad++; fails++; if (bad <= 3) console.log('  M' + N + ' expected', 2 * N - 1, 'plies, played', played); }
    }
    console.log('M' + N, '· samples', samples, '· exact', ok, '· wrong', bad);
}
console.log(fails === 0 ? 'FORWARD PLAY OK' : 'FORWARD PLAY FAILURES: ' + fails);

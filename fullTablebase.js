/**
 * Full KBNK distance-to-mate tablebase (browser side).
 * Loads tb/kbnk-dtm.bin (32 MiB) built by tools/gen-dtm-tb.mjs and provides:
 *   - perfect-play move selection for either side (fullTablebaseMove)
 *   - exact mate-in-N position generation (generateMateInN)
 *
 * Byte encoding per position (index = posIndex*2 + stm, stm 0 = White, 1 = Black):
 *   0..252 plies-to-mate, 254 draw, 255 illegal. White-to-move wins are odd plies.
 */

const FTB_DRAW = 254, FTB_ILLEGAL = 255;
let lastTablebaseInfo = '';
let fullTb = null;
let fullTbReady = false;
let fullTbLoadFailed = false;
let fullTbLoadPromise = null;
let fullTbHist = null;                 // { N: count } for White-to-move mates
const fullTbBuckets = new Map();       // N -> Int32Array of posIndex

function ftbSq64(sq120) {
    const f = (sq120 % 10) - 1;
    const r = Math.floor(sq120 / 10) - 2;
    return r * 8 + f;
}
function ftbSq120(sq64) {
    const f = sq64 & 7, r = sq64 >> 3;
    return (r + 2) * 10 + (f + 1);
}
function ftbPosIndex(wk, wb, wn, bk) {
    return (wk << 18) | (wb << 12) | (wn << 6) | bk;
}
function ftbProbe(wk, wb, wn, bk, stm) {
    return fullTb[ftbPosIndex(wk, wb, wn, bk) * 2 + stm];
}

/**
 * Load the raw tablebase bytes. Prefers the gzipped file (small enough for a
 * GitHub browser upload and quicker to download), decompressing it in-browser;
 * falls back to the uncompressed .bin if the gzip isn't present.
 */
async function loadFtbBytes() {
    if (typeof DecompressionStream === 'function') {
        const gz = await fetch('tb/kbnk-dtm.bin.gz');
        if (gz.ok) {
            const stream = gz.body.pipeThrough(new DecompressionStream('gzip'));
            const buf = await new Response(stream).arrayBuffer();
            return new Uint8Array(buf);
        }
    }
    const res = await fetch('tb/kbnk-dtm.bin');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return new Uint8Array(await res.arrayBuffer());
}

async function ensureFullTbLoaded() {
    if (fullTbReady) return true;
    if (fullTbLoadPromise) return fullTbLoadPromise;
    fullTbLoadPromise = (async () => {
        try {
            fullTb = await loadFtbBytes();
            buildFtbHistogram();
            fullTbReady = true;
            if (typeof onFullTbReady === 'function') onFullTbReady();
            return true;
        } catch (e) {
            console.warn('Full TB load failed', e);
            fullTb = null;
            fullTbReady = false;
            fullTbLoadFailed = true;
            return false;
        }
    })();
    return fullTbLoadPromise;
}

function buildFtbHistogram() {
    fullTbHist = {};
    const POS = fullTb.length >> 1;
    for (let pos = 0; pos < POS; pos++) {
        const v = fullTb[pos * 2];
        if (v < FTB_DRAW && (v & 1) === 1) {
            const n = (v + 1) >> 1;
            fullTbHist[n] = (fullTbHist[n] || 0) + 1;
        }
    }
}

function ftbBucket(n) {
    if (fullTbBuckets.has(n)) return fullTbBuckets.get(n);
    const targetPly = 2 * n - 1;
    const POS = fullTb.length >> 1;
    let count = 0;
    for (let pos = 0; pos < POS; pos++) if (fullTb[pos * 2] === targetPly) count++;
    const arr = new Int32Array(count);
    let k = 0;
    for (let pos = 0; pos < POS && k < count; pos++) {
        if (fullTb[pos * 2] === targetPly) arr[k++] = pos;
    }
    fullTbBuckets.set(n, arr);
    return arr;
}

/** Read White KBN + Black king from the live 120-board as 0..63 squares. */
function ftbReadPieces() {
    let wk = -1, wb = -1, wn = -1, bk = -1;
    for (let s = 21; s < 99; s++) {
        if (s % 10 === 0 || s % 10 === 9) continue;
        const c = board[s];
        if (c === 6) wk = ftbSq64(s);
        else if (c === 3) wb = ftbSq64(s);
        else if (c === 2) wn = ftbSq64(s);
        else if (c === -6) bk = ftbSq64(s);
    }
    return { wk, wb, wn, bk };
}

/**
 * Perfect-play move from the full tablebase.
 * White (KBN) minimises distance to mate; the lone king maximises it / holds a draw.
 * @returns {[number,number]|null}
 */
function fullTablebaseMove(legalList) {
    if (!fullTbReady || attackingSide !== 0) return null;
    const { wk, wb, wn, bk } = ftbReadPieces();
    if (wk < 0 || wb < 0 || wn < 0 || bk < 0) return null;

    const list = legalList && legalList.length ? legalList : (typeof legalMoves === 'function' ? legalMoves() : []);
    if (!list.length) return null;

    if (player === 0) {
        // White to move: choose the smallest resulting Black-to-move distance.
        let best = null, bestCv = 9999;
        for (const mv of list) {
            makeMove(mv);
            const p = ftbReadPieces();
            let cv = FTB_ILLEGAL;
            if (p.bk >= 0 && p.wb >= 0 && p.wn >= 0 && p.wk >= 0) {
                cv = ftbProbe(p.wk, p.wb, p.wn, p.bk, 1);
            }
            undoMove();
            if (cv === FTB_ILLEGAL) continue;
            const score = cv === FTB_DRAW ? 9000 : cv;
            if (score < bestCv) { bestCv = score; best = mv; }
        }
        if (!best) return null;
        lastTablebaseInfo = bestCv >= 9000
            ? 'Full TB: no win found'
            : 'Full TB · mate in ' + Math.ceil(bestCv / 2);
        return best;
    }

    // Lone king to move: prefer capturing a minor (instant draw), else hold / delay.
    let best = null, bestScore = -1;
    for (const mv of list) {
        const victim = Math.abs(board[mv[1]]);
        if (victim === 2 || victim === 3) {
            lastTablebaseInfo = 'Full TB · draw (takes minor)';
            return mv;
        }
        makeMove(mv);
        const p = ftbReadPieces();
        let cv = FTB_ILLEGAL;
        if (p.bk >= 0 && p.wb >= 0 && p.wn >= 0 && p.wk >= 0) {
            cv = ftbProbe(p.wk, p.wb, p.wn, p.bk, 0);
        }
        undoMove();
        if (cv === FTB_ILLEGAL) continue;
        const score = cv === FTB_DRAW ? 100000 : cv;   // draw best, else drag it out
        if (score > bestScore) { bestScore = score; best = mv; }
    }
    if (!best) return null;
    lastTablebaseInfo = bestScore >= 100000
        ? 'Full TB · defending (draw)'
        : 'Full TB · lose in ' + Math.ceil(bestScore / 2);
    return best;
}

/** List of mate-in-N values available for generation, ascending. */
function availableMateDistances() {
    if (!fullTbHist) return [];
    return Object.keys(fullTbHist).map(Number).sort((a, b) => a - b);
}

/**
 * Place an exact "White to move, mate in N" position on the board.
 * @returns {boolean} success
 */
function generateMateInN(n) {
    if (!fullTbReady) return false;
    const bucket = ftbBucket(n);
    if (!bucket || bucket.length === 0) return false;

    const pos = bucket[(Math.random() * bucket.length) | 0];
    const bk = pos & 63, wn = (pos >> 6) & 63, wb = (pos >> 12) & 63, wk = (pos >> 18) & 63;

    clearBoardSquares();
    const wk120 = ftbSq120(wk), wb120 = ftbSq120(wb), wn120 = ftbSq120(wn), bk120 = ftbSq120(bk);
    board[wk120] = 6;
    board[wb120] = 3;
    board[wn120] = 2;
    board[bk120] = -6;

    historyIndex = 0;
    for (let i = 0; i < 14; i++) history[0][i] = 0;
    history[0][Wkc] = false;
    history[0][Wqc] = false;
    history[0][Bkc] = false;
    history[0][Bqc] = false;
    history[0][Wkp] = wk120;
    history[0][Bkp] = bk120;
    player = 0;                 // White (KBN) is always to move for a mate-in-N puzzle
    history[0][Player] = player;
    return true;
}

/** White mating moves still required for a distance-to-mate value of `plies`. */
function ftbMatesRemaining(plies) {
    return Math.ceil(plies / 2);
}

/**
 * Judge a human move against perfect play using the DTM tablebase.
 * MUST be called BEFORE the move is applied to the board.
 * Returns null when the tablebase cannot judge the position.
 *
 * Result: {
 *   side,          // 0 = attacker (White KBN), 1 = defender (lone king)
 *   verdict,       // 'best' | 'inaccuracy' | 'mistake' | 'blunder'
 *   drawSwing,     // 'lostWin' | 'lostDraw' | null
 *   matesAfter,    // mate distance (White moves) after the played move, or null if now a draw
 *   matesBest,     // mate distance after the best move, or null if the best move draws
 *   deltaMoves     // moves the mistake cost (0 when best)
 * }
 */
function assessHumanMove(move) {
    if (!fullTbReady) return null;
    const stm = player;
    const s = ftbReadPieces();
    if (s.wk < 0 || s.wb < 0 || s.wn < 0 || s.bk < 0) return null;
    const before = ftbProbe(s.wk, s.wb, s.wn, s.bk, stm);
    if (before === FTB_ILLEGAL) return null;

    const list = (typeof legalMoves === 'function') ? legalMoves() : [];
    if (!list.length) return null;

    let bestCv = null, bestIsDraw = false;
    let bestScore = (stm === 0 ? Infinity : -Infinity);
    let playedCv = null, playedIsDraw = false, played = false;

    for (const mv of list) {
        makeMove(mv);
        const p = ftbReadPieces();
        let cv;
        if (p.wk < 0 || p.wb < 0 || p.wn < 0 || p.bk < 0) {
            cv = FTB_DRAW;                       // a minor was captured -> can't mate
        } else {
            cv = ftbProbe(p.wk, p.wb, p.wn, p.bk, stm ^ 1);
        }
        undoMove();
        if (cv === FTB_ILLEGAL) continue;

        const isDraw = (cv === FTB_DRAW);
        const score = isDraw ? 1e9 : cv;         // draw pinned to the extreme
        const better = stm === 0 ? (score < bestScore) : (score > bestScore);
        if (better) { bestScore = score; bestCv = cv; bestIsDraw = isDraw; }
        if (mv[0] === move[0] && mv[1] === move[1]) {
            playedCv = cv; playedIsDraw = isDraw; played = true;
        }
    }
    if (!played) return null;

    const matesAfter = playedIsDraw ? null : ftbMatesRemaining(playedCv);
    const matesBest = bestIsDraw ? null : ftbMatesRemaining(bestCv);

    let verdict = 'best', drawSwing = null, deltaMoves = 0;

    if (stm === 0) {
        // Attacker: minimise the mate distance; a draw throws the win away.
        if (playedIsDraw && !bestIsDraw) { verdict = 'blunder'; drawSwing = 'lostWin'; }
        else if (!playedIsDraw && !bestIsDraw && playedCv > bestCv) {
            deltaMoves = (playedCv - bestCv) / 2;
            verdict = deltaMoves >= 4 ? 'blunder' : (deltaMoves >= 2 ? 'mistake' : 'inaccuracy');
        }
    } else {
        // Defender: maximise the mate distance; a draw is the ideal result.
        if (bestIsDraw && !playedIsDraw) { verdict = 'blunder'; drawSwing = 'lostDraw'; }
        else if (!playedIsDraw && !bestIsDraw && playedCv < bestCv) {
            deltaMoves = (bestCv - playedCv) / 2;
            verdict = deltaMoves >= 4 ? 'blunder' : (deltaMoves >= 2 ? 'mistake' : 'inaccuracy');
        }
    }

    return { side: stm, verdict, drawSwing, matesAfter, matesBest, deltaMoves };
}

/** Turn an assessHumanMove() result into { cls, text } for display, or null. */
function formatMoveFeedback(fb) {
    if (!fb) return null;

    if (fb.verdict === 'best') {
        const n = fb.matesAfter;
        if (fb.side === 0) {
            return { cls: 'good', text: n != null ? 'Best move — mate in ' + n + '.' : 'Best move.' };
        }
        return { cls: 'good', text: n != null ? 'Best defence — holds out to mate in ' + n + '.' : 'Best defence.' };
    }

    if (fb.drawSwing === 'lostWin') {
        return { cls: 'bad', text: 'Blunder — that throws the win away. It\u2019s now a draw!' };
    }
    if (fb.drawSwing === 'lostDraw') {
        return { cls: 'bad', text: 'Blunder — you had a draw there; now the win stands.' };
    }

    const label = fb.verdict === 'blunder' ? 'Blunder' : (fb.verdict === 'mistake' ? 'Mistake' : 'Inaccuracy');
    const unit = fb.deltaMoves === 1 ? 'move' : 'moves';
    const cls = fb.verdict === 'inaccuracy' ? 'warn' : 'bad';

    if (fb.side === 0) {
        return {
            cls,
            text: label + ' — mate is ' + fb.deltaMoves + ' ' + unit + ' further away now (mate in '
                + fb.matesAfter + ', best was ' + fb.matesBest + ').'
        };
    }
    return {
        cls,
        text: label + ' — you were mated ' + fb.deltaMoves + ' ' + unit + ' too soon (mate in '
            + fb.matesAfter + ', best defence ' + fb.matesBest + ').'
    };
}

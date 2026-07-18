function clearBoardSquares() {
    for (let i = 21; i < 99; i++) {
        if (i % 10 !== 0 && i % 10 !== 9) board[i] = 0;
    }
}

function randomSquare(exclude) {
    for (let attempt = 0; attempt < 200; attempt++) {
        const file = 1 + Math.floor(Math.random() * 8);
        const rank = 2 + Math.floor(Math.random() * 8);
        const sq = rank * 10 + file;
        if (!exclude.has(sq)) return sq;
    }
    throw new Error('randomSquare exhausted');
}

function kingsAdjacent(a, b) {
    const df = Math.abs((a % 10) - (b % 10));
    const dr = Math.abs(Math.floor(a / 10) - Math.floor(b / 10));
    return df <= 1 && dr <= 1 && !(df === 0 && dr === 0);
}

function countMaterial() {
    let wk = 0, wb = 0, wn = 0, bk = 0, bb = 0, bn = 0;
    for (let i = 21; i < 99; i++) {
        switch (board[i]) {
            case 6: wk++; break;
            case 3: wb++; break;
            case 2: wn++; break;
            case -6: bk++; break;
            case -3: bb++; break;
            case -2: bn++; break;
        }
    }
    return { wk, wb, wn, bk, bb, bn };
}

function isCompleteKbnk(whiteAttacks) {
    const m = countMaterial();
    if (m.wk !== 1 || m.bk !== 1) return false;
    if (whiteAttacks) return m.wb === 1 && m.wn === 1 && m.bb === 0 && m.bn === 0;
    return m.bb === 1 && m.bn === 1 && m.wb === 0 && m.wn === 0;
}

/** True if STM can capture B or N (would leave K+minor vs K — instant draw). */
function sideToMoveCanTakeMinor() {
    const caps = captureMoves();
    for (const mv of caps) {
        const victim = Math.abs(board[mv[1]]);
        if (victim === 2 || victim === 3) return true;
    }
    return false;
}

/** Place KBN vs K on random legal squares. whiteAttacks => White has K+B+N. */
function generateRandomKbnk(whiteAttacks) {
    for (let tries = 0; tries < 800; tries++) {
        clearBoardSquares();
        const used = new Set();

        const kAtt = randomSquare(used); used.add(kAtt);
        const kDef = randomSquare(used); used.add(kDef);
        if (kingsAdjacent(kAtt, kDef)) continue;

        const bSq = randomSquare(used); used.add(bSq);
        const nSq = randomSquare(used); used.add(nSq);

        // Lone king must not sit next to B/N (hanging captures → instant draw).
        if (kingsAdjacent(kDef, bSq) || kingsAdjacent(kDef, nSq)) continue;

        if (whiteAttacks) {
            board[kAtt] = 6;
            board[bSq] = 3;
            board[nSq] = 2;
            board[kDef] = -6;
        } else {
            board[kAtt] = -6;
            board[bSq] = -3;
            board[nSq] = -2;
            board[kDef] = 6;
        }

        historyIndex = 0;
        for (let i = 0; i < 14; i++) history[0][i] = 0;
        history[0][Wkc] = false;
        history[0][Wqc] = false;
        history[0][Bkc] = false;
        history[0][Bqc] = false;
        history[0][Wkp] = whiteAttacks ? kAtt : kDef;
        history[0][Bkp] = whiteAttacks ? kDef : kAtt;
        player = Math.random() < 0.5 ? 0 : 1;
        history[0][Player] = player;

        if (!isCompleteKbnk(whiteAttacks)) continue;

        // Illegal if the side not to move is in check (MNSCP inCheck convention).
        if (inCheck()) continue;

        const moves = legalMoves();
        if (!isCompleteKbnk(whiteAttacks)) continue;
        if (historyIndex !== 0) {
            historyIndex = 0;
            continue;
        }
        if (moves.length === 0) continue;

        // Defender to move must not be able to snatch B or N.
        if (sideToMoveCanTakeMinor()) continue;

        return true;
    }
    return false;
}

function boardToFenPlacement() {
    let fen = '';
    let index = 91;
    for (let rank = 8; rank > 0; rank--) {
        let gap = 0;
        for (let file = 1; file < 9; file++) {
            if (board[index] != 0) {
                if (gap) fen += gap;
                fen += pieceLetter[board[index] + 6];
                gap = 0;
            } else gap++;
            index++;
        }
        if (gap) fen += gap;
        if (rank > 1) fen += '/';
        index -= 18;
    }
    return fen;
}

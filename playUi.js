let lastMoveFrom = 0;
let lastMoveTo = 0;
let lastGameStatus = { over: false, result: '*', reason: '' };
let positionHistory = [];
let positionCounts = {};

function syncLastMoveHighlight() {
    if (historyIndex > 0) {
        lastMoveFrom = history[historyIndex][From];
        lastMoveTo = history[historyIndex][To];
    } else {
        lastMoveFrom = 0;
        lastMoveTo = 0;
    }
}

function resetPositionTracker() {
    positionHistory = [];
    positionCounts = {};
    recordCurrentPosition();
}

function recordCurrentPosition() {
    const key = makeFEN();
    positionHistory.push(key);
    positionCounts[key] = (positionCounts[key] || 0) + 1;
}

function undoTrackedPosition() {
    const key = positionHistory.pop();
    if (!key) return;
    positionCounts[key]--;
    if (positionCounts[key] <= 0) delete positionCounts[key];
}

function pliesSincePawnMoveOrCapture() {
    let plies = 0;
    for (let i = historyIndex; i > 0; i--) {
        if (history[i][Cap] !== 0) break;
        plies++;
    }
    return plies;
}

function hasInsufficientMaterial() {
    const pieces = [];
    for (let sq = 21; sq <= 98; sq++) {
        const piece = board[sq];
        if (piece !== 0 && piece !== 99 && Math.abs(piece) !== 6) pieces.push(piece);
    }
    if (pieces.length === 0) return true;
    if (pieces.length === 1 && (Math.abs(pieces[0]) === 2 || Math.abs(pieces[0]) === 3)) return true;
    return false;
}

function currentSideInCheck() {
    player ^= 1;
    const checked = inCheck();
    player ^= 1;
    return checked;
}

function getGameStatus() {
    LML = legalMoves();
    if (LML.length === 0) {
        const mateMove = historyIndex > 0
            ? convertToAlgebraic(history[historyIndex][From], history[historyIndex][To])
            : '';
        if (currentSideInCheck()) {
            return {
                over: true,
                result: player === 0 ? '0-1' : '1-0',
                reason: mateMove ? ('Checkmate (' + mateMove + '#)') : 'Checkmate'
            };
        }
        return { over: true, result: '1/2-1/2', reason: 'Stalemate' };
    }
    const currentPosition = makeFEN();
    if ((positionCounts[currentPosition] || 0) >= 3) {
        return { over: true, result: '1/2-1/2', reason: 'Draw by threefold repetition' };
    }
    if (pliesSincePawnMoveOrCapture() >= 100) {
        return { over: true, result: '1/2-1/2', reason: 'Draw by 50-move rule' };
    }
    if (hasInsufficientMaterial()) {
        return { over: true, result: '1/2-1/2', reason: 'Draw by insufficient material' };
    }
    return { over: false, result: '*', reason: '' };
}

function finishGame(status) {
    lastGameStatus = status;
    gameOverDisplayed = true;
    const messages = document.getElementById('messages');
    if (messages) messages.textContent = status.reason + '. ' + status.result;
    display();
    if (typeof updateMoveNavButtons === 'function') updateMoveNavButtons();
}

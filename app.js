let Piece = 0, From = 1, To = 2, Cap = 3, CapSq = 4, EpSq = 5, Wkc = 6, Wqc = 7, Bkc = 8, Bqc = 9, Hmc = 10, Player = 11, Wkp = 12, Bkp = 13;
let MAX_GAME_LENGTH = 350;
valueSquareNames();

let pitch = 110;
let soundOff = true;
let sideAtBottom = 'w';
let movesPlayed = '';
let history = new Array(MAX_GAME_LENGTH);
for (let i = 0; i < MAX_GAME_LENGTH; i++) history[i] = new Array(14);
for (let i = 0; i < 14; i++) history[0][i] = 0;

let board = new Int8Array(120).fill(0);
const blackPieces = new Set([-2, -3, -6]);
const whitePieces = new Set([2, 3, 6]);
let piecePositionList = [];
let moveArray = [];
let capArray = [];
let historyIndex = 0;
let player = 0;
let LML = [];
let computerMovePlayed;
let gameOverDisplayed = false;
let moves;
let humanPlaysSide = 0;   // 0 = White (attacks with KBN), 1 = Black (lone king)
let engineThinking = false;
let whiteAttacks = true;

let autoPlayActive = false;
const AUTO_DELAY = 450;   // ms between moves while watching auto-play
let positionGeneration = 0;   // bumped on new position / undo to cancel stale async engine moves

setOffBoard();

function updateAutoPlayBtn() {
    const btn = document.getElementById('autoPlayBtn');
    if (!btn) return;
    btn.textContent = autoPlayActive ? 'Stop' : 'Auto-play';
    btn.classList.toggle('primary', autoPlayActive);
}

function updateMoveNavButtons() {
    const back = document.getElementById('stepBackBtn');
    const fwd = document.getElementById('stepFwdBtn');
    const busy = autoPlayActive || engineThinking;
    if (back) back.disabled = busy || historyIndex === 0;
    if (fwd) fwd.disabled = busy || gameOverDisplayed;
}

function toggleAutoPlay() {
    if (autoPlayActive) {
        autoPlayActive = false;
        updateAutoPlayBtn();
        updateMoveNavButtons();
        return;
    }
    autoPlayActive = true;
    updateAutoPlayBtn();
    updateMoveNavButtons();
    if (gameOverDisplayed) startNewPosition();
    else maybeEngineReply(300);
}

function updateRoleFromUi() {
    const role = document.querySelector('input[name="role"]:checked').value;
    whiteAttacks = true;   // White always holds the KBN
    humanPlaysSide = role === 'attack' ? 0 : 1;
    sideAtBottom = humanPlaysSide === 0 ? 'w' : 'b';
}

/** Switch attack/defend without regenerating the board. */
function applyRoleChange() {
    positionGeneration++;   // cancel any in-flight engine reply for the old side
    updateRoleFromUi();
    display();
    updateMoveNavButtons();
    maybeEngineReply(250);
}

function startNewPosition() {
    positionGeneration++;
    gameOverDisplayed = false;
    lastGameStatus = { over: false, result: '*', reason: '' };
    movesPlayed = '';
    updateRoleFromUi();

    const target = document.getElementById('mateTarget')?.value || 'random';
    let generated = false;
    if (target !== 'random' && typeof fullTbReady !== 'undefined' && fullTbReady) {
        generated = generateMateInN(parseInt(target, 10));
    }
    if (!generated) generated = generateRandomKbnk(whiteAttacks);

    if (!generated) {
        document.getElementById('messages').textContent = 'Could not generate a legal position.';
        autoPlayActive = false;
        updateAutoPlayBtn();
        return;
    }

    gamePhase();
    startingPlayer = player;
    resetPositionTracker();
    syncLastMoveHighlight();
    display();
    updateFenLine();
    document.getElementById('messages').textContent = '';
    document.getElementById('bestValueDisplay').textContent = '';
    showMoveFeedback(null);

    maybeEngineReply(autoPlayActive ? AUTO_DELAY : 250);
    updateMoveNavButtons();
}

function updateFenLine() {
    const el = document.getElementById('fenLine');
    if (!el) return;
    const stm = player === 0 ? 'w' : 'b';
    el.textContent = boardToFenPlacement() + ' ' + stm + ' - - 0 1';
}

function applyHumanMove(fromSq, toSq) {
    if (autoPlayActive || engineThinking || gameOverDisplayed) return;
    if (player !== humanPlaysSide) return;

    const move = [fromSq, toSq];
    const feedback = (typeof assessHumanMove === 'function') ? assessHumanMove(move) : null;

    makeMove(move);
    recordMove(move[0], move[1]);
    recordCurrentPosition();
    syncLastMoveHighlight();
    display();
    updateFenLine();
    document.getElementById('moveInput').value = '';

    showMoveFeedback(feedback);

    const status = getGameStatus();
    if (status.over) {
        finishGame(status);
        return;
    }
    maybeEngineReply(120);
    updateMoveNavButtons();
}

function makeMoveFromInput() {
    if (autoPlayActive || engineThinking || gameOverDisplayed) return;
    if (player !== humanPlaysSide) return;

    const moveStr = String(document.getElementById('moveInput').value || '').trim();
    if (moveStr.length < 4) {
        document.getElementById('moveInput').value = '';
        return;
    }
    const boardIndexMove = convertMove(moveStr.substring(0, 4));
    const FS = boardIndexMove[0];
    const TS = boardIndexMove[1];

    let isValid = false;
    for (let i = 0; i < LML.length; i++) {
        if (LML[i][0] === FS && LML[i][1] === TS) { isValid = true; break; }
    }
    if (!isValid) {
        document.getElementById('moveInput').value = '';
        document.getElementById('moveInput').focus();
        return;
    }
    applyHumanMove(FS, TS);
}

function undoLastMove() {
    if (autoPlayActive || engineThinking) return;
    if (historyIndex === 0) return;
    positionGeneration++;
    const parts = movesPlayed.trim().split(/\s+/).filter(Boolean);
    parts.pop();
    movesPlayed = parts.length ? parts.join(' ') + ' ' : '';
    undoMove();
    undoTrackedPosition();
    // If it is still the engine to move, undo its move too (undo in pairs).
    if (historyIndex > 0 && player !== humanPlaysSide) {
        const parts2 = movesPlayed.trim().split(/\s+/).filter(Boolean);
        parts2.pop();
        movesPlayed = parts2.length ? parts2.join(' ') + ' ' : '';
        undoMove();
        undoTrackedPosition();
    }
    gamePhase();
    syncLastMoveHighlight();
    lastGameStatus = { over: false, result: '*', reason: '' };
    gameOverDisplayed = false;
    display();
    updateFenLine();
    document.getElementById('messages').textContent = '';
    showMoveFeedback(null);
    updateMoveNavButtons();
}

/** One ply back through the solution (unlike Undo, which rewinds in pairs). */
function stepBackward() {
    if (autoPlayActive || engineThinking) return;
    if (historyIndex === 0) return;
    positionGeneration++;
    const parts = movesPlayed.trim().split(/\s+/).filter(Boolean);
    parts.pop();
    movesPlayed = parts.length ? parts.join(' ') + ' ' : '';
    undoMove();
    undoTrackedPosition();
    gamePhase();
    syncLastMoveHighlight();
    lastGameStatus = { over: false, result: '*', reason: '' };
    gameOverDisplayed = false;
    display();
    updateFenLine();
    document.getElementById('messages').textContent = '';
    showMoveFeedback(null);
    updateMoveNavButtons();
}

/** Play the next perfect tablebase move for whoever is to move. */
async function stepForward() {
    if (autoPlayActive || engineThinking || gameOverDisplayed) return;

    engineThinking = true;
    updateMoveNavButtons();
    document.getElementById('undoMoveBtn').disabled = true;
    const gen = positionGeneration;

    if (!fullTbReady && !fullTbLoadFailed && typeof ensureFullTbLoaded === 'function') {
        document.getElementById('messages').textContent = 'Loading tablebase…';
        await ensureFullTbLoaded();
        if (gen === positionGeneration) document.getElementById('messages').textContent = '';
    }

    if (gen !== positionGeneration) {
        engineThinking = false;
        document.getElementById('undoMoveBtn').disabled = false;
        updateMoveNavButtons();
        return;
    }

    try {
        await computerMove();
        if (computerMovePlayed) {
            recordMove(computerMovePlayed[0], computerMovePlayed[1]);
            recordCurrentPosition();
            syncLastMoveHighlight();
            display();
            updateFenLine();
            showMoveFeedback(null);
            const status = getGameStatus();
            if (status.over) finishGame(status);
        }
    } finally {
        engineThinking = false;
        document.getElementById('undoMoveBtn').disabled = false;
        updateMoveNavButtons();
    }
}

async function computerMoveAndRecord() {
    if (engineThinking || gameOverDisplayed) return;
    if (!autoPlayActive && player === humanPlaysSide) return;

    engineThinking = true;
    updateMoveNavButtons();
    const gen = positionGeneration;
    document.getElementById('undoMoveBtn').disabled = true;

    // Don't move until the full tablebase is loaded.
    if (!fullTbReady && !fullTbLoadFailed && typeof ensureFullTbLoaded === 'function') {
        document.getElementById('messages').textContent = 'Loading tablebase…';
        await ensureFullTbLoaded();
        if (gen === positionGeneration) document.getElementById('messages').textContent = '';
    }

    // Position changed during loading (new position / undo): abandon this reply
    // so a stale move can't be applied to a fresh board.
    if (gen !== positionGeneration) {
        engineThinking = false;
        document.getElementById('undoMoveBtn').disabled = false;
        updateMoveNavButtons();
        return;
    }

    let ended = false;
    try {
        await computerMove();
        if (computerMovePlayed) {
            recordMove(computerMovePlayed[0], computerMovePlayed[1]);
            recordCurrentPosition();
            syncLastMoveHighlight();
            display();
            updateFenLine();
            const status = getGameStatus();
            if (status.over) {
                finishGame(status);
                ended = true;
                if (autoPlayActive) {
                    // Stop after the game ends.
                    autoPlayActive = false;
                    updateAutoPlayBtn();
                }
            }
        } else {
            ended = true;
            autoPlayActive = false;
            updateAutoPlayBtn();
        }
    } finally {
        engineThinking = false;
        document.getElementById('undoMoveBtn').disabled = false;
        updateMoveNavButtons();
    }

    if (!ended && autoPlayActive && !gameOverDisplayed) {
        maybeEngineReply(AUTO_DELAY);
    }
}

async function showHint() {
    if (autoPlayActive || engineThinking || gameOverDisplayed) return;
    if (player !== humanPlaysSide) return;

    // Need the tablebase to know the perfect move; load it on demand.
    if (typeof fullTbReady !== 'undefined' && !fullTbReady && !fullTbLoadFailed
        && typeof ensureFullTbLoaded === 'function') {
        const gen = positionGeneration;
        document.getElementById('messages').textContent = 'Loading tablebase…';
        await ensureFullTbLoaded();
        if (gen !== positionGeneration) return;   // position changed while loading
        document.getElementById('messages').textContent = '';
    }
    if (player !== humanPlaysSide || gameOverDisplayed) return;

    const best = (typeof fullTablebaseMove === 'function') ? fullTablebaseMove(LML) : null;
    if (!best) {
        document.getElementById('messages').textContent = 'No hint available.';
        return;
    }
    highlightHint(best[0]);
}

function showMoveFeedback(feedback) {
    const el = document.getElementById('moveFeedback');
    if (!el) return;
    const f = (typeof formatMoveFeedback === 'function') ? formatMoveFeedback(feedback) : null;
    el.className = 'feedback' + (f ? ' ' + f.cls : '');
    el.textContent = f ? f.text : '';
}

function maybeEngineReply(delayMs) {
    if (gameOverDisplayed) return;
    if (!autoPlayActive && player === humanPlaysSide) return;
    setTimeout(() => {
        if (gameOverDisplayed) return;
        if (!autoPlayActive && player === humanPlaysSide) return;
        if (engineThinking) return;
        computerMoveAndRecord();
    }, delayMs);
}

document.getElementById('undoMoveBtn').addEventListener('click', undoLastMove);
document.getElementById('hintBtn').addEventListener('click', showHint);
document.getElementById('stepBackBtn').addEventListener('click', stepBackward);
document.getElementById('stepFwdBtn').addEventListener('click', stepForward);
document.getElementById('newPositionBtn').addEventListener('click', startNewPosition);
document.getElementById('autoPlayBtn').addEventListener('click', toggleAutoPlay);
document.getElementById('moveInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') makeMoveFromInput();
});
document.querySelectorAll('input[name="role"]').forEach((el) => {
    el.addEventListener('change', () => {
        if (autoPlayActive) return;
        applyRoleChange();
    });
});
document.getElementById('mateTarget').addEventListener('change', () => {
    if (!autoPlayActive) startNewPosition();
});

function onFullTbReady() {
    const sel = document.getElementById('mateTarget');
    const info = document.getElementById('mateTargetInfo');
    if (!sel || typeof availableMateDistances !== 'function') return;
    const dists = availableMateDistances();
    const current = sel.value;
    sel.innerHTML = '<option value="random">Random</option>';
    for (const n of dists) {
        const opt = document.createElement('option');
        opt.value = String(n);
        opt.textContent = 'Mate in ' + n;
        sel.appendChild(opt);
    }
    if ([...sel.options].some(o => o.value === current)) sel.value = current;
    if (info) {
        const deepest = dists.length ? dists[dists.length - 1] : 0;
        info.textContent = 'Ready · exact mates up to M' + deepest;
    }
}

if (typeof ensureFullTbLoaded === 'function') {
    ensureFullTbLoaded().then((ok) => {
        const info = document.getElementById('mateTargetInfo');
        if (!ok && info) info.textContent = 'Tablebase unavailable — serve over http:// (use start.bat).';
    });
}

updateAutoPlayBtn();
updateMoveNavButtons();
startNewPosition();

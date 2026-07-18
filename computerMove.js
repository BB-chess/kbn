/**
 * Engine move: play the perfect move from the distance-to-mate tablebase.
 * (KBNK is fully solved, so no search is needed.)
 */
async function computerMove() {
    const msg = document.getElementById('messages');
    if (msg) msg.innerText = '';
    computerMovePlayed = '';

    moves = legalMoves();
    if (moves.length === 0) return;

    let chosen = null;
    if (typeof fullTbReady !== 'undefined' && fullTbReady && typeof fullTablebaseMove === 'function') {
        chosen = fullTablebaseMove(moves);
    }
    if (!chosen) chosen = moves[0];   // safety net if the tablebase isn't loaded

    makeMove(chosen);
    computerMovePlayed = chosen;

    const info = document.getElementById('bestValueDisplay');
    if (info) info.innerText = lastTablebaseInfo || '';
}

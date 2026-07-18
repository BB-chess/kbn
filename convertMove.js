function convertMove(move) {
    const from = move.charCodeAt(0) - 97 + 10 * (move.charCodeAt(1) - 49) + 21;
    const to = move.charCodeAt(2) - 97 + 10 * (move.charCodeAt(3) - 49) + 21;
    return [from, to];
}

function convertToAlgebraic(a, b) {
    return alg[a] + alg[b];
}

let attackingSide = 0; // 0 = White has KBN, 1 = Black has KBN
let bishopIsLight = true;
let targetCorners = [28, 91]; // h1 / a8

/** Work out who holds the bishop+knight and which corners deliver mate. */
function gamePhase() {
    let wn = 0, wb = 0, bn = 0, bb = 0;
    let wbSq = 0, bbSq = 0;

    for (let i = 21; i < 99; i++) {
        const c = board[i];
        if (c === 2) wn++;
        else if (c === 3) { wb++; wbSq = i; }
        else if (c === -2) bn++;
        else if (c === -3) { bb++; bbSq = i; }
    }

    if (wn === 1 && wb === 1 && bn === 0 && bb === 0) {
        attackingSide = 0;
        bishopIsLight = ((wbSq % 10) + Math.floor(wbSq / 10)) % 2 === 0;
    } else if (bn === 1 && bb === 1 && wn === 0 && wb === 0) {
        attackingSide = 1;
        bishopIsLight = ((bbSq % 10) + Math.floor(bbSq / 10)) % 2 === 0;
    }
    targetCorners = bishopIsLight ? [28, 91] : [21, 98]; // h1/a8 or a1/h8

    const hint = document.getElementById('cornerHint');
    if (hint) {
        const names = targetCorners.map(sq => alg[sq]).join(' / ');
        hint.textContent = 'Mating corner: ' + names +
            (bishopIsLight ? ' (light-square bishop)' : ' (dark-square bishop)');
    }
}

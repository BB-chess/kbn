function recordMove(a, b) {
    gamePhase();
    const offset = 21;
    const start = a - offset;
    const end = b - offset;
    movesPlayed += String.fromCharCode(97 + (start % 10)) +
        String.fromCharCode(49 + Math.floor(start / 10)) +
        String.fromCharCode(97 + (end % 10)) +
        String.fromCharCode(49 + Math.floor(end / 10)) +
        ' ';
}

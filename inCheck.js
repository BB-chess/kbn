function inCheck() {
    const blackKingP = history[historyIndex][Bkp];
    const whiteKingP = history[historyIndex][Wkp];
    const kingDiff = Math.abs(blackKingP - whiteKingP);

    if (kingDiff === 1 || kingDiff === 10 || kingDiff === 11 || kingDiff === 9) return true;

    if (player === 1) {
        const kingP = whiteKingP;
        if (board[kingP + 21] === -2 || board[kingP + 19] === -2 || board[kingP - 21] === -2 || board[kingP - 19] === -2 ||
            board[kingP + 8] === -2 || board[kingP + 12] === -2 || board[kingP - 8] === -2 || board[kingP - 12] === -2)
            return true;

        const bishopOffsets = [11, -11, 9, -9];
        for (let i = 0; i < bishopOffsets.length; i++) {
            for (let j = 1; j < 8; j++) {
                const pos = kingP + bishopOffsets[i] * j;
                if (board[pos] === -3) return true;
                if (board[pos] !== 0) break;
            }
        }
        return false;
    }

    if (player === 0) {
        const kingP = blackKingP;
        if (board[kingP + 21] === 2 || board[kingP + 19] === 2 || board[kingP - 21] === 2 || board[kingP - 19] === 2 ||
            board[kingP + 8] === 2 || board[kingP + 12] === 2 || board[kingP - 8] === 2 || board[kingP - 12] === 2)
            return true;

        const bishopOffsets = [11, -11, 9, -9];
        for (let i = 0; i < bishopOffsets.length; i++) {
            for (let j = 1; j < 8; j++) {
                const pos = kingP + bishopOffsets[i] * j;
                if (board[pos] === 3) return true;
                if (board[pos] !== 0) break;
            }
        }
        return false;
    }
}

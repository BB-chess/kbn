function undoMove() {
    const move = history[historyIndex];
    const start = move[From];
    const dest = move[To];
    const victim = move[Cap];
    const vicSq = move[CapSq];
    const piece = move[Piece];

    board[start] = piece;
    board[dest] = 0;
    if (vicSq) board[vicSq] = victim;

    historyIndex--;
    player ^= 1;
}

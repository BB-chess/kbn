function makeMove(move) {
    const startSq = move[0];
    const endSq = move[1];
    const piece = board[startSq];
    const captured = board[endSq];

    board[startSq] = 0;
    board[endSq] = piece;

    player ^= 1;
    historyIndex++;

    history[historyIndex] = history[historyIndex - 1].slice();
    history[historyIndex][EpSq] = 0;
    history[historyIndex][Piece] = piece;
    history[historyIndex][From] = startSq;
    history[historyIndex][To] = endSq;
    history[historyIndex][Cap] = captured;
    history[historyIndex][CapSq] = captured ? endSq : 0;
    history[historyIndex][Wkc] = false;
    history[historyIndex][Wqc] = false;
    history[historyIndex][Bkc] = false;
    history[historyIndex][Bqc] = false;

    if (piece === -6) history[historyIndex][Bkp] = endSq;
    else if (piece === 6) history[historyIndex][Wkp] = endSq;

    return captured;
}

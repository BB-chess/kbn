const pieceLetter = ['k', 'q', 'r', 'b', 'n', 'p', '', 'P', 'N', 'B', 'R', 'Q', 'K'];

function makeFEN() {
    let FEN = '';
    let index = 91;
    for (let rank = 8; rank > 0; rank--) {
        let gap = 0;
        for (let file = 1; file < 9; file++) {
            if (board[index] != 0) {
                if (gap != 0) FEN += gap;
                FEN += pieceLetter[board[index] + 6];
                gap = 0;
            } else gap++;
            index++;
        }
        if (gap != 0) FEN += gap;
        FEN += '/';
        index -= 18;
    }
    FEN += player
        + history[historyIndex][5].toString()
        + history[historyIndex][6].toString()
        + history[historyIndex][7].toString()
        + history[historyIndex][8].toString()
        + history[historyIndex][9].toString();
    return FEN;
}

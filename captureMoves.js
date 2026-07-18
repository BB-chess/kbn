function captureMoves() {
    piecePositionList = [];
    capArray = [];
    let index = 20;

    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            index++;
            const piece = board[index];
            if (player === 0) {
                if (piece <= 0) continue;
                piecePositionList.push([index, rank, file]);
                if (piece === 3) {
                    for (const direction of bishopMoves[index]) {
                        for (const target of direction) {
                            if (board[target] < 0) testForCheck2([index, target]);
                            if (board[target] !== 0) break;
                        }
                    }
                } else if (piece === 2) {
                    for (const d of [21, 19, -21, -19, 12, 8, -12, -8]) {
                        if (blackPieces.has(board[index + d])) testForCheck2([index, index + d]);
                    }
                } else if (piece === 6) {
                    for (const d of [1, 10, -1, -10, 11, 9, -11, -9]) {
                        if (blackPieces.has(board[index + d])) testForCheck2([index, index + d]);
                    }
                }
            } else {
                if (piece >= 0) continue;
                piecePositionList.push([index, rank, file]);
                if (piece === -3) {
                    for (const direction of bishopMoves[index]) {
                        for (const target of direction) {
                            if (board[target] > 0) testForCheck2([index, target]);
                            if (board[target] !== 0) break;
                        }
                    }
                } else if (piece === -2) {
                    for (const d of [21, 19, -21, -19, 12, 8, -12, -8]) {
                        if (whitePieces.has(board[index + d])) testForCheck2([index, index + d]);
                    }
                } else if (piece === -6) {
                    for (const d of [1, 10, -1, -10, 11, 9, -11, -9]) {
                        if (whitePieces.has(board[index + d])) testForCheck2([index, index + d]);
                    }
                }
            }
        }
        index += 2;
    }
    return capArray;
}

function testForCheck2([aa, bb]) {
    makeMove([aa, bb]);
    if (!inCheck()) capArray.push([aa, bb]);
    undoMove();
}

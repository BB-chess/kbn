function legalMoves() {
    player ^= 1;
    const playerIsInCheck = inCheck();
    player ^= 1;
    return playerIsInCheck ? inCheckLegalMoves() : notInCheckLegalMoves();
}

function gatherOwnPieces() {
    piecePositionList = [];
    let index = 20;
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            index++;
            const piece = board[index];
            if (player === 0 && piece > 0) piecePositionList.push([index, rank, file]);
            else if (player === 1 && piece < 0) piecePositionList.push([index, rank, file]);
        }
        index += 2;
    }
}

function inCheckLegalMoves() {
    moveArray = captureMoves();
    for (const [index] of piecePositionList) {
        const piece = board[index];
        if (Math.abs(piece) === 3) {
            for (const direction of bishopMoves[index] || []) {
                for (const target of direction) {
                    if (board[target] === 0) {
                        makeMove([index, target]);
                        if (!inCheck()) moveArray.push([index, target]);
                        undoMove();
                    }
                    if (board[target] !== 0) break;
                }
            }
        } else if (Math.abs(piece) === 2) {
            for (const target of springerMoves[index]) {
                if (board[target] === 0) {
                    makeMove([index, target]);
                    if (!inCheck()) moveArray.push([index, target]);
                    undoMove();
                }
            }
        } else if (Math.abs(piece) === 6) {
            for (const offset of [1, 10, -1, -10, 11, 9, -11, -9]) {
                if (board[index + offset] === 0) {
                    makeMove([index, index + offset]);
                    if (!inCheck()) moveArray.push([index, index + offset]);
                    undoMove();
                }
            }
        }
    }
    return moveArray;
}

function notInCheckLegalMoves() {
    gatherOwnPieces();
    moveArray = captureMoves();
    for (const [index] of piecePositionList) {
        const piece = board[index];
        if (Math.abs(piece) === 3) {
            for (const direction of bishopMoves[index] || []) {
                for (const target of direction) {
                    if (board[target] === 0) {
                        makeMove([index, target]);
                        if (!inCheck()) moveArray.push([index, target]);
                        undoMove();
                    }
                    if (board[target] !== 0) break;
                }
            }
        } else if (Math.abs(piece) === 2) {
            for (const target of springerMoves[index]) {
                if (board[target] === 0) {
                    makeMove([index, target]);
                    if (!inCheck()) moveArray.push([index, target]);
                    undoMove();
                }
            }
        } else if (Math.abs(piece) === 6) {
            for (const offset of [1, 10, -1, -10, 11, 9, -11, -9]) {
                if (board[index + offset] === 0) {
                    makeMove([index, index + offset]);
                    if (!inCheck()) moveArray.push([index, index + offset]);
                    undoMove();
                }
            }
        }
    }
    return moveArray;
}

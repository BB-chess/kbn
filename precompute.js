const bishopMoves = Array(111).fill(null).map(() => [[], [], [], []]);

for (let square = 21; square <= 98; square++) {
    const row = Math.floor(square / 10);
    const col = square % 10;
    if (row >= 2 && row <= 9 && col >= 1 && col <= 8) {
        for (let r = row + 1, c = col + 1; r <= 9 && c <= 8; r++, c++) bishopMoves[square][0].push(r * 10 + c);
        for (let r = row + 1, c = col - 1; r <= 9 && c >= 1; r++, c--) bishopMoves[square][1].push(r * 10 + c);
        for (let r = row - 1, c = col + 1; r >= 2 && c <= 8; r--, c++) bishopMoves[square][2].push(r * 10 + c);
        for (let r = row - 1, c = col - 1; r >= 2 && c >= 1; r--, c--) bishopMoves[square][3].push(r * 10 + c);
    }
}

const kingMoves = Array(111).fill(null).map(() => []);

for (let square = 21; square <= 98; square++) {
    const row = Math.floor(square / 10);
    const col = square % 10;
    if (row >= 2 && row <= 9 && col >= 1 && col <= 8) {
        const possibleMoves = [
            [row + 1, col], [row - 1, col], [row, col + 1], [row, col - 1],
            [row + 1, col + 1], [row + 1, col - 1], [row - 1, col + 1], [row - 1, col - 1]
        ];
        for (const [r, c] of possibleMoves) {
            if (r >= 2 && r <= 9 && c >= 1 && c <= 8) kingMoves[square].push(r * 10 + c);
        }
    }
}

const springerMoves = Array(111).fill(null).map(() => []);
const springerOffsets = [
    [2, 1], [2, -1], [-2, 1], [-2, -1],
    [1, 2], [1, -2], [-1, 2], [-1, -2]
];

for (let square = 21; square <= 98; square++) {
    const row = Math.floor(square / 10);
    const col = square % 10;
    if (row >= 2 && row <= 9 && col >= 1 && col <= 8) {
        for (const [rOffset, cOffset] of springerOffsets) {
            const r = row + rOffset;
            const c = col + cOffset;
            if (r >= 2 && r <= 9 && c >= 1 && c <= 8) springerMoves[square].push(r * 10 + c);
        }
    }
}

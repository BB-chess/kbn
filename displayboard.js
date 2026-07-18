let draggedFrom = null;

const imagePieces = {
    '2': 'pieces/wN.svg', '-2': 'pieces/bN.svg',
    '3': 'pieces/wB.svg', '-3': 'pieces/bB.svg',
    '6': 'pieces/wK.svg', '-6': 'pieces/bK.svg'
};

function handleDragStart(event) {
    const el = event.target;
    const cell = el.closest('td');
    if (!cell) return;
    draggedFrom = {
        col: parseInt(cell.dataset.col),
        row: parseInt(cell.dataset.row),
        element: el
    };
    // Hide the source piece during the drag, but only while the drag is still
    // live. A very short / aborted drag (easy to trigger with fast clicking)
    // can fire 'dragend' before this timeout runs; without the guard that left
    // the piece stuck invisible ("vanishing king").
    let dragEnded = false;
    el.addEventListener('dragend', () => {
        dragEnded = true;
        el.style.visibility = 'visible';
        draggedFrom = null;
    }, { once: true });
    setTimeout(() => { if (!dragEnded) el.style.visibility = 'hidden'; }, 0);
}

function handleDragOver(event) {
    event.preventDefault();
}

function handleDrop(event) {
    event.preventDefault();
    const cell = event.currentTarget;
    const toCol = parseInt(cell.dataset.col);
    const toRow = parseInt(cell.dataset.row);
    if (!draggedFrom || isNaN(toCol) || isNaN(toRow)) return;

    const move =
        String.fromCharCode(97 + draggedFrom.col) + (draggedFrom.row + 1) +
        String.fromCharCode(97 + toCol) + (toRow + 1);
    document.getElementById('moveInput').value = move;
    makeMoveFromInput();
    if (draggedFrom.element) draggedFrom.element.style.visibility = 'visible';
    draggedFrom = null;
}

function handleClick(event) {
    const target = event.target.closest('td');
    if (!target) return;
    const col = parseInt(target.dataset.col);
    const row = parseInt(target.dataset.row);
    const bp = 20 + col + 10 * row + 1;
    const file = String.fromCharCode(97 + col);
    const rank = row + 1;
    const moveInput = document.getElementById('moveInput');
    moveInput.value += file + rank;

    if (moveInput.value.length === 2 && player === 0 && board[bp] < 1) moveInput.value = '';
    if (moveInput.value.length === 2 && player === 1 && board[bp] > -1) moveInput.value = '';
    if (moveInput.value.length === 4) makeMoveFromInput();
    if (moveInput.value.length > 4) moveInput.value = '';
}

function display() {
    playBeep();
    const chessboardElement = document.getElementById('chessboard');
    chessboardElement.innerHTML = '';
    const fragment = document.createDocumentFragment();

    const createCell = (piece, isLightSquare, col, row) => {
        const cell = document.createElement('td');
        cell.dataset.col = col;
        cell.dataset.row = row;
        const sq = col + 10 * row + 21;
        let bg = isLightSquare ? '#f0d9b5' : '#b58863';
        if (typeof lastMoveFrom === 'number' && (sq === lastMoveFrom || sq === lastMoveTo)) {
            bg = isLightSquare ? '#cdd26a' : '#aaa23a';
        }
        // Hint mating corners lightly
        if (targetCorners && (sq === targetCorners[0] || sq === targetCorners[1])) {
            cell.classList.add('corner-hint');
        }
        cell.style.backgroundColor = bg;
        cell.style.position = 'relative';
        cell.style.padding = '0';

        if (piece !== 0) {
            const img = document.createElement('img');
            img.src = imagePieces[String(piece)];
            img.alt = '';
            img.className = 'piece';
            img.draggable = false;
            if ((player === 0 && piece > 0) || (player === 1 && piece < 0)) {
                if (!autoPlayActive && humanPlaysSide === player) {
                    img.draggable = true;
                    img.addEventListener('dragstart', handleDragStart);
                }
            }
            cell.appendChild(img);
        }

        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('drop', handleDrop);
        return cell;
    };

    // White at bottom: rank 8 at top of DOM, file a on the left.
    const isWhiteBottom = sideAtBottom === 'w';
    for (let r = 0; r < 8; r++) {
        const actualRow = isWhiteBottom ? 7 - r : r;
        const rowElement = document.createElement('tr');
        for (let col = 0; col < 8; col++) {
            const actualCol = isWhiteBottom ? col : 7 - col;
            const piece = board[actualCol + 10 * actualRow + 21];
            // a1 is dark: light when (file + rank) is odd (0-based).
            const isLight = (actualCol + actualRow) % 2 === 1;
            rowElement.appendChild(createCell(piece, isLight, actualCol, actualRow));
        }
        fragment.appendChild(rowElement);
    }

    chessboardElement.appendChild(fragment);
    chessboardElement.removeEventListener('click', handleClick);
    chessboardElement.addEventListener('click', handleClick);

    LML = legalMoves();
    const game = document.getElementById('Thegame');
    player ^= 1;
    const cs = inCheck();
    player ^= 1;

    game.innerHTML = formatMoves(movesPlayed);
    if (lastGameStatus && lastGameStatus.over) {
        game.innerHTML += '<div class="game-over-banner">' + lastGameStatus.reason +
            '<br><strong>' + lastGameStatus.result + '</strong></div>';
    } else {
        if (LML.length === 0 && cs) game.innerHTML += 'Checkmate.<br>Game over.';
        if (LML.length === 0 && !cs) game.innerHTML += 'Stalemate.<br>Game over.';
    }
    game.scrollTop = game.scrollHeight;

    const plyEl = document.getElementById('fiftyMove');
    if (plyEl) plyEl.textContent = '50-move plies: ' + pliesSincePawnMoveOrCapture() + ' / 100';
}

let startingPlayer = 0;

function formatMoves(movesString) {
    if (typeof movesString !== 'string') return '';
    const moves = movesString.trim().split(/\s+/).filter(Boolean);
    if (!moves.length) return '';
    let formatted = '';
    let i = 0;
    let num = 1;
    if (startingPlayer === 1) {
        formatted += `1. ... ${moves[0]}<br>`;
        i = 1;
        num = 2;
    }
    for (; i < moves.length; i += 2) {
        formatted += `${num}. ${moves[i]} ${moves[i + 1] || ''}<br>`;
        num++;
    }
    return formatted;
}

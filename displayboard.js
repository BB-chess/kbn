let draggedFrom = null;
let selectedSq = null;         // board index of the click-selected piece, or null
let selectedFromStr = '';      // its algebraic square (e.g. "e1")

function clearSelection() {
    selectedSq = null;
    selectedFromStr = '';
    updateSelectionHighlight();
}

function updateSelectionHighlight() {
    document.querySelectorAll('#chessboard td').forEach((td) => {
        const c = parseInt(td.dataset.col);
        const r = parseInt(td.dataset.row);
        const sq = c + 10 * r + 21;
        td.classList.toggle('selected-square', selectedSq != null && sq === selectedSq);
    });
}

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
    if (autoPlayActive || engineThinking || gameOverDisplayed) return;
    if (player !== humanPlaysSide) return;

    const target = event.target.closest('td');
    if (!target) return;
    const col = parseInt(target.dataset.col);
    const row = parseInt(target.dataset.row);
    const bp = col + 10 * row + 21;
    const sqStr = String.fromCharCode(97 + col) + (row + 1);
    const moveInput = document.getElementById('moveInput');
    const ownPiece = (player === 0 && board[bp] > 0) || (player === 1 && board[bp] < 0);

    // Nothing selected yet: first click must land on one of the player's pieces.
    if (selectedSq == null) {
        if (!ownPiece) { moveInput.value = ''; return; }
        selectedSq = bp;
        selectedFromStr = sqStr;
        moveInput.value = sqStr;
        updateSelectionHighlight();
        return;
    }

    // Clicking the selected piece again clears the selection.
    if (bp === selectedSq) {
        moveInput.value = '';
        clearSelection();
        return;
    }

    // Clicking another of your own pieces switches the selection.
    if (ownPiece) {
        selectedSq = bp;
        selectedFromStr = sqStr;
        moveInput.value = sqStr;
        updateSelectionHighlight();
        return;
    }

    // Otherwise the second click is the destination.
    moveInput.value = selectedFromStr + sqStr;
    clearSelection();
    makeMoveFromInput();
}

function display() {
    playBeep();
    selectedSq = null;             // a fresh render always starts unselected
    selectedFromStr = '';
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

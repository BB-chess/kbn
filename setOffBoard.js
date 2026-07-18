function setOffBoard() {
    // Set the off-board positions to 99
    for (let i = 0; i < 20; i++) {
        board[i] = 99;					
        board[i + 100] = 99;			
    }
    for (let i = 20; i < 100; i += 10) {
        board[i] = 99;					
        board[i + 9] = 99;
    }
    return;
}
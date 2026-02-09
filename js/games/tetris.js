// === TETRIS GAME ===
function initTetris() {
    currentGameTitle.textContent = 'TETRIS';
    gameControls.innerHTML = 'Arrow Keys: ← → Move | ↓ Fast Drop | ↑ Rotate';
    
    canvas.width = 240;
    canvas.height = 480;
    
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 24;
    
    const SHAPES = [
        [[1,1,1,1]], // I
        [[1,1],[1,1]], // O
        [[0,1,0],[1,1,1]], // T
        [[1,0,0],[1,1,1]], // L
        [[0,0,1],[1,1,1]], // J
        [[0,1,1],[1,1,0]], // S
        [[1,1,0],[0,1,1]]  // Z
    ];
    
    const COLORS = ['#00ffff', '#ffff00', '#ff00ff', '#ff8800', '#0000ff', '#00ff00', '#ff0000'];
    
    let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let currentPiece = null;
    let currentColor = null;
    let pieceX = 0;
    let pieceY = 0;
    let gameOver = false;
    
    function spawnPiece() {
        const shapeIndex = Math.floor(Math.random() * SHAPES.length);
        currentPiece = SHAPES[shapeIndex].map(row => [...row]);
        currentColor = COLORS[shapeIndex];
        pieceX = Math.floor(COLS / 2) - Math.floor(currentPiece[0].length / 2);
        pieceY = 0;
        
        if (collision()) {
            gameOver = true;
        }
    }
    
    function collision(offsetX = 0, offsetY = 0, piece = currentPiece) {
        for (let y = 0; y < piece.length; y++) {
            for (let x = 0; x < piece[y].length; x++) {
                if (piece[y][x]) {
                    const newX = pieceX + x + offsetX;
                    const newY = pieceY + y + offsetY;
                    if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
                    if (newY >= 0 && board[newY][newX]) return true;
                }
            }
        }
        return false;
    }
    
    function merge() {
        for (let y = 0; y < currentPiece.length; y++) {
            for (let x = 0; x < currentPiece[y].length; x++) {
                if (currentPiece[y][x]) {
                    if (pieceY + y >= 0) {
                        board[pieceY + y][pieceX + x] = currentColor;
                    }
                }
            }
        }
    }
    
    function clearLines() {
        let linesCleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (board[y].every(cell => cell !== 0)) {
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(0));
                linesCleared++;
                y++;
            }
        }
        if (linesCleared > 0) {
            updateScore(score + linesCleared * 100);
            playSound(800, 0.1);
        }
    }
    
    function rotate() {
        const rotated = currentPiece[0].map((_, i) =>
            currentPiece.map(row => row[i]).reverse()
        );
        if (!collision(0, 0, rotated)) {
            currentPiece = rotated;
            playSound(400, 0.05);
        }
    }
    
    handleKeyDown = (e) => {
        // Restart on space when game over
        if (gameOver && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('tetris');
            return;
        }
        if (gameOver) return;
        switch(e.key) {
            case 'ArrowLeft':
                if (!collision(-1, 0)) pieceX--;
                break;
            case 'ArrowRight':
                if (!collision(1, 0)) pieceX++;
                break;
            case 'ArrowDown':
                if (!collision(0, 1)) pieceY++;
                break;
            case 'ArrowUp':
                rotate();
                break;
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    addTouchDpad({
        onLeft: (p) => { if (p && !gameOver && !collision(-1, 0)) pieceX--; },
        onRight: (p) => { if (p && !gameOver && !collision(1, 0)) pieceX++; },
        onDown: (p) => { if (p && !gameOver && !collision(0, 1)) pieceY++; },
        onUp: (p) => { if (p && !gameOver) rotate(); },
        snapCardinal: true
    });
    
    spawnPiece();
    
    let lastTime = 0;
    let dropInterval = 1500;
    
    function update(currentTime) {
        gameLoop = requestAnimationFrame(update);
        
        // Draw
        ctx.fillStyle = '#000022';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = '#111133';
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * BLOCK_SIZE, 0);
            ctx.lineTo(x * BLOCK_SIZE, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * BLOCK_SIZE);
            ctx.lineTo(canvas.width, y * BLOCK_SIZE);
            ctx.stroke();
        }
        
        // Draw board
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (board[y][x]) {
                    ctx.fillStyle = board[y][x];
                    ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
                }
            }
        }
        
        // Draw current piece
        if (currentPiece && !gameOver) {
            ctx.fillStyle = currentColor;
            for (let y = 0; y < currentPiece.length; y++) {
                for (let x = 0; x < currentPiece[y].length; x++) {
                    if (currentPiece[y][x]) {
                        ctx.fillRect(
                            (pieceX + x) * BLOCK_SIZE + 1,
                            (pieceY + y) * BLOCK_SIZE + 1,
                            BLOCK_SIZE - 2,
                            BLOCK_SIZE - 2
                        );
                    }
                }
            }
        }
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '22px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME', canvas.width / 2, canvas.height / 2 - 20);
            ctx.fillText('OVER', canvas.width / 2, canvas.height / 2 + 12);
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('SPACE to restart', canvas.width / 2, canvas.height / 2 + 44);
            return;
        }
        
        // Drop piece (fixed interval so speed doesn't vary with frame rate)
        if (currentTime - lastTime >= dropInterval) {
            lastTime += dropInterval;
            if (!collision(0, 1)) {
                pieceY++;
            } else {
                merge();
                clearLines();
                spawnPiece();
            }
        }
    }
    
    gameLoop = requestAnimationFrame(update);
}


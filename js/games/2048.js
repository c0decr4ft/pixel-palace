// === 2048 GAME ===
function init2048() {
    currentGameTitle.textContent = '2048';
    gameControls.innerHTML = 'Arrow Keys or D-pad to move tiles';
    
    canvas.width = 260;
    canvas.height = 260;
    
    const gridSize = 4;
    const tileSize = 56;
    const padding = 7;
    
    let grid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
    let gameOver = false;
    let won = false;
    
    const colors = {
        0: '#1a1a2e',
        2: '#eee4da',
        4: '#ede0c8',
        8: '#f2b179',
        16: '#f59563',
        32: '#f67c5f',
        64: '#f65e3b',
        128: '#edcf72',
        256: '#edcc61',
        512: '#edc850',
        1024: '#edc53f',
        2048: '#edc22e'
    };
    
    const textColors = {
        2: '#776e65',
        4: '#776e65'
    };
    
    function addRandomTile() {
        const emptyCells = [];
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (grid[r][c] === 0) emptyCells.push({r, c});
            }
        }
        if (emptyCells.length > 0) {
            const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
        }
    }
    
    function slide(row) {
        let arr = row.filter(val => val !== 0);
        let missing = gridSize - arr.length;
        let zeros = Array(missing).fill(0);
        return zeros.concat(arr);
    }
    
    function combine(row) {
        for (let i = gridSize - 1; i > 0; i--) {
            if (row[i] === row[i-1] && row[i] !== 0) {
                row[i] *= 2;
                row[i-1] = 0;
                updateScore(score + row[i]);
                if (row[i] === 2048 && !won) {
                    won = true;
                    playSound(1000, 0.5);
                }
                playSound(400 + row[i], 0.1);
            }
        }
        return row;
    }
    
    function moveRight() {
        let moved = false;
        for (let r = 0; r < gridSize; r++) {
            let oldRow = [...grid[r]];
            let newRow = slide(grid[r]);
            newRow = combine(newRow);
            newRow = slide(newRow);
            grid[r] = newRow;
            if (oldRow.join(',') !== newRow.join(',')) moved = true;
        }
        return moved;
    }
    
    function moveLeft() {
        let moved = false;
        for (let r = 0; r < gridSize; r++) {
            let oldRow = [...grid[r]];
            let newRow = grid[r].reverse();
            newRow = slide(newRow);
            newRow = combine(newRow);
            newRow = slide(newRow);
            grid[r] = newRow.reverse();
            if (oldRow.join(',') !== grid[r].join(',')) moved = true;
        }
        return moved;
    }
    
    function transpose() {
        grid = grid[0].map((_, i) => grid.map(row => row[i]));
    }
    
    function moveUp() {
        transpose();
        let moved = moveLeft();
        transpose();
        return moved;
    }
    
    function moveDown() {
        transpose();
        let moved = moveRight();
        transpose();
        return moved;
    }
    
    function checkGameOver() {
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (grid[r][c] === 0) return false;
            }
        }
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (c < gridSize - 1 && grid[r][c] === grid[r][c+1]) return false;
                if (r < gridSize - 1 && grid[r][c] === grid[r+1][c]) return false;
            }
        }
        return true;
    }
    
    const MOVE_COOLDOWN_MS = 120;
    let lastMoveTime = 0;
    
    function tryMove(moveFn) {
        if (gameOver) return;
        if (Date.now() - lastMoveTime < MOVE_COOLDOWN_MS) return;
        const moved = moveFn();
        if (moved) {
            lastMoveTime = Date.now();
            addRandomTile();
            if (checkGameOver()) {
                gameOver = true;
                playSound(100, 0.5);
            }
        }
    }
    
    handleKeyDown = (e) => {
        if (gameOver && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('2048');
            return;
        }
        if (e.repeat || gameOver) return;
        switch (e.key) {
            case 'ArrowUp': e.preventDefault(); tryMove(moveUp); break;
            case 'ArrowDown': e.preventDefault(); tryMove(moveDown); break;
            case 'ArrowLeft': e.preventDefault(); tryMove(moveLeft); break;
            case 'ArrowRight': e.preventDefault(); tryMove(moveRight); break;
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    /* Swipe gesture detection — swipe anywhere on screen to move tiles */
    let swipeStartX = null;
    let swipeStartY = null;
    const SWIPE_MIN = 25; // minimum px to count as a swipe

    function onSwipeStart(e) {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
    }
    function onSwipeMove(e) {
        if (swipeStartX !== null) e.preventDefault(); // stop page scroll while swiping
    }
    function onSwipeEnd(e) {
        if (swipeStartX === null || swipeStartY === null) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - swipeStartX;
        const dy = t.clientY - swipeStartY;
        swipeStartX = null;
        swipeStartY = null;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (Math.max(ax, ay) < SWIPE_MIN) return;
        if (ax >= ay) {
            tryMove(dx > 0 ? moveRight : moveLeft);
        } else {
            tryMove(dy > 0 ? moveDown : moveUp);
        }
    }

    /* Attach to the gameContainer so the user can swipe the whole play area */
    const swipeTarget = gameContainer || canvas;
    swipeTarget.addEventListener('touchstart', onSwipeStart, { passive: false });
    swipeTarget.addEventListener('touchmove', onSwipeMove, { passive: false });
    swipeTarget.addEventListener('touchend', onSwipeEnd, { passive: false });

    cleanupFunctions.push(() => {
        swipeTarget.removeEventListener('touchstart', onSwipeStart);
        swipeTarget.removeEventListener('touchmove', onSwipeMove);
        swipeTarget.removeEventListener('touchend', onSwipeEnd);
    });
    
    // Initialize with 2 tiles
    addRandomTile();
    addRandomTile();
    
    function draw() {
        gameLoop = requestAnimationFrame(draw);
        
        // Background
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Grid background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(5, 5, canvas.width - 10, canvas.height - 10);
        
        // Draw tiles
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const value = grid[r][c];
                const x = c * (tileSize + padding) + padding;
                const y = r * (tileSize + padding) + padding;
                
                const tileColor = colors[value] || '#3c3a32';
                ctx.fillStyle = tileColor;
                ctx.fillRect(x, y, tileSize, tileSize);
                // Subtle glow for non-zero tiles (no shadowBlur)
                if (value > 0) {
                    ctx.globalAlpha = 0.15;
                    ctx.fillStyle = tileColor;
                    ctx.fillRect(x - 2, y - 2, tileSize + 4, tileSize + 4);
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = tileColor;
                    ctx.fillRect(x, y, tileSize, tileSize);
                }
                
                if (value > 0) {
                    ctx.fillStyle = textColors[value] || '#f9f6f2';
                    const fontSize = value >= 1024 ? 15 : value >= 128 ? 19 : 22;
                    ctx.font = `bold ${fontSize}px Orbitron`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(String(value), x + tileSize/2, y + tileSize/2);
                }
            }
        }
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '20px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 14);
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 22);
        }
        
        if (won && !gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff00';
            ctx.font = '20px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('YOU WIN!', canvas.width/2, canvas.height/2 - 14);
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Keep playing!', canvas.width/2, canvas.height/2 + 16);
        }
    }
    
    gameLoop = requestAnimationFrame(draw);
}


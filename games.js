// === PIXEL PALACE - GAME CENTER ===

// DOM Elements
const lobby = document.getElementById('lobby');
const gameContainer = document.getElementById('gameContainer');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const backBtn = document.getElementById('backBtn');
const scoreValue = document.getElementById('scoreValue');
const currentGameTitle = document.getElementById('currentGameTitle');
const gameControls = document.getElementById('gameControls');
const touchControls = document.getElementById('touchControls');
const tabs = document.querySelectorAll('.tab');
const cabinets = document.querySelectorAll('.game-cabinet');

if (!canvas || !ctx) {
    console.error('PIXEL PALACE: Canvas not found or 2D context not available. Check that index.html has <canvas id="gameCanvas">.');
}

let currentGame = null;
let gameLoop = null;
let score = 0;
let cleanupFunctions = [];

// Sound Effects (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration, type = 'square') {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
}

// Category Filter
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const category = tab.dataset.category;
        
        cabinets.forEach(cabinet => {
            if (category === 'all' || cabinet.dataset.category === category) {
                cabinet.classList.remove('hidden');
            } else {
                cabinet.classList.add('hidden');
            }
        });
    });
});

// Play Button Handlers
document.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        e.preventDefault();
        const cabinet = btn.closest('.game-cabinet');
        const gameName = cabinet.dataset.game;
        startGame(gameName);
    });
});

// Prevent cabinet clicks from doing anything
document.querySelectorAll('.game-cabinet').forEach(cabinet => {
    cabinet.addEventListener('click', (e) => {
        // Only allow clicks on the play button
        if (!e.target.classList.contains('play-btn')) {
            e.stopPropagation();
        }
    });
});

// Back Button
if (backBtn) {
    backBtn.addEventListener('click', () => {
        stopGame();
        if (gameContainer) gameContainer.classList.remove('active');
        if (lobby) lobby.style.display = 'block';
    });
}

// Display names for the game header (so the correct game name always shows when you start)
const GAME_DISPLAY_NAMES = {
    snake: 'SNAKE',
    tetris: 'TETRIS',
    pong: 'PONG',
    breakout: 'BREAKOUT',
    spaceinvaders: 'SPACE INVADERS',
    memory: 'MEMORY',
    flappy: 'FLAPPY PIXEL',
    '2048': '2048'
};

function startGame(gameName) {
    if (!lobby || !gameContainer || !canvas || !ctx) {
        console.error('PIXEL PALACE: Cannot start game — required elements (lobby, gameContainer, canvas) missing.');
        return;
    }
    lobby.style.display = 'none';
    gameContainer.classList.add('active');
    score = 0;
    updateScore(0);
    
    // Show the name of the game you're playing in the header
    if (currentGameTitle) {
        currentGameTitle.textContent = GAME_DISPLAY_NAMES[gameName] || gameName.toUpperCase();
    }
    
    // Resume audio context
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    switch(gameName) {
        case 'snake':
            initSnake();
            break;
        case 'tetris':
            initTetris();
            break;
        case 'pong':
            initPong();
            break;
        case 'breakout':
            initBreakout();
            break;
        case 'spaceinvaders':
            initSpaceInvaders();
            break;
        case 'memory':
            initMemory();
            break;
        case 'flappy':
            initFlappy();
            break;
        case '2048':
            init2048();
            break;
    }
}

function stopGame() {
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    if (lobby) lobby.style.display = 'block';
    if (gameContainer) gameContainer.classList.remove('active');
    currentGame = null;
    
    // Run all cleanup functions
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions = [];
    
    // Clear canvas
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Remove all event listeners
    if (handleKeyDown) document.removeEventListener('keydown', handleKeyDown);
    if (handleKeyUp) document.removeEventListener('keyup', handleKeyUp);
    if (canvas) {
        canvas.onclick = null;
        canvas.onmousemove = null;
        canvas.ontouchstart = null;
        canvas.ontouchend = null;
        canvas.ontouchmove = null;
    }
    if (touchControls) {
        touchControls.innerHTML = '';
        touchControls.classList.remove('has-buttons');
    }
}

let handleKeyUp = null;

function updateScore(newScore) {
    score = newScore;
    if (scoreValue) scoreValue.textContent = score;
}

let handleKeyDown = null;

// --- Touch support helpers ---
function getEventCanvasCoords(e) {
    const t = e.touches && e.touches.length ? e.touches[0] : e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : e;
    if (!t || !canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
}

function clearTouchControls() {
    if (touchControls) {
        touchControls.innerHTML = '';
        touchControls.classList.remove('has-buttons');
    }
}

function addTouchDpad(options) {
    if (!touchControls) return;
    const { onLeft, onRight, onUp, onDown, onAction, actionLabel } = options;
    touchControls.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'touch-dpad-wrap';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '1rem';
    wrap.style.justifyContent = 'center';
    wrap.style.flexWrap = 'wrap';

    const makeBtn = (label, handler) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'touch-btn';
        btn.innerHTML = label;
        btn.setAttribute('aria-label', label);
        const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
        btn.addEventListener('touchstart', (e) => { prevent(e); handler(true); }, { passive: false });
        btn.addEventListener('touchend', (e) => { prevent(e); handler(false); }, { passive: false });
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); handler(true); });
        btn.addEventListener('mouseup', () => handler(false));
        btn.addEventListener('mouseleave', () => handler(false));
        return btn;
    };

    const dpad = document.createElement('div');
    dpad.className = 'touch-dpad';
    if (onUp) {
        const row = document.createElement('div');
        row.className = 'touch-dpad-row';
        row.appendChild(makeBtn('<span class="arrow">↑</span>', onUp));
        dpad.appendChild(row);
    }
        if (onLeft || onRight) {
        const row = document.createElement('div');
        row.className = 'touch-dpad-row';
        if (onLeft) row.appendChild(makeBtn('<span class="arrow">←</span>', onLeft));
        if (onRight) row.appendChild(makeBtn('<span class="arrow">→</span>', onRight));
        dpad.appendChild(row);
    }
    if (onDown) {
        const row = document.createElement('div');
        row.className = 'touch-dpad-row';
        row.appendChild(makeBtn('<span class="arrow">↓</span>', onDown));
        dpad.appendChild(row);
    }
    wrap.appendChild(dpad);
    if (onAction && actionLabel) {
        const actionBtn = makeBtn(actionLabel, (pressed) => { if (pressed) onAction(); });
        actionBtn.className = 'touch-btn action-btn';
        wrap.appendChild(actionBtn);
    }
    touchControls.appendChild(wrap);
    touchControls.classList.add('has-buttons');
}

// === SNAKE GAME ===
function initSnake() {
    currentGameTitle.textContent = 'SNAKE';
    gameControls.innerHTML = 'Arrow Keys or WASD to move';
    
    canvas.width = 400;
    canvas.height = 400;
    
    const gridSize = 20;
    const tileCount = canvas.width / gridSize;
    
    let snake = [{x: 10, y: 10}];
    let direction = {x: 0, y: 0};
    let food = spawnFood();
    let gameOver = false;
    
    function spawnFood() {
        return {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    }
    
    handleKeyDown = (e) => {
        // Restart on space when game over
        if (gameOver && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('snake');
            return;
        }
        
        switch(e.key) {
            case 'ArrowUp': case 'w': case 'W':
                if (direction.y !== 1) direction = {x: 0, y: -1};
                break;
            case 'ArrowDown': case 's': case 'S':
                if (direction.y !== -1) direction = {x: 0, y: 1};
                break;
            case 'ArrowLeft': case 'a': case 'A':
                if (direction.x !== 1) direction = {x: -1, y: 0};
                break;
            case 'ArrowRight': case 'd': case 'D':
                if (direction.x !== -1) direction = {x: 1, y: 0};
                break;
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    addTouchDpad({
        onLeft: (pressed) => { if (pressed && direction.x !== 1) direction = { x: -1, y: 0 }; },
        onRight: (pressed) => { if (pressed && direction.x !== -1) direction = { x: 1, y: 0 }; },
        onUp: (pressed) => { if (pressed && direction.y !== 1) direction = { x: 0, y: -1 }; },
        onDown: (pressed) => { if (pressed && direction.y !== -1) direction = { x: 0, y: 1 }; }
    });
    
    let lastTime = 0;
    const gameSpeed = 100;
    
    function update(currentTime) {
        gameLoop = requestAnimationFrame(update);
        
        if (currentTime - lastTime < gameSpeed) return;
        lastTime = currentTime;
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '30px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
            ctx.font = '12px "Press Start 2P"';
            ctx.fillStyle = '#ffff00';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 40);
            return;
        }
        
        // Move snake
        if (direction.x !== 0 || direction.y !== 0) {
            const head = {
                x: snake[0].x + direction.x,
                y: snake[0].y + direction.y
            };
            
            // Check wall collision
            if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
                gameOver = true;
                playSound(100, 0.5);
                return;
            }
            
            // Check self collision
            for (let segment of snake) {
                if (head.x === segment.x && head.y === segment.y) {
                    gameOver = true;
                    playSound(100, 0.5);
                    return;
                }
            }
            
            snake.unshift(head);
            
            // Check food collision
            if (head.x === food.x && head.y === food.y) {
                updateScore(score + 10);
                food = spawnFood();
                playSound(600, 0.1);
            } else {
                snake.pop();
            }
        }
        
        // Draw
        ctx.fillStyle = '#001100';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = '#002200';
        for (let i = 0; i < tileCount; i++) {
            ctx.beginPath();
            ctx.moveTo(i * gridSize, 0);
            ctx.lineTo(i * gridSize, canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * gridSize);
            ctx.lineTo(canvas.width, i * gridSize);
            ctx.stroke();
        }
        
        // Draw food
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize/2,
            food.y * gridSize + gridSize/2,
            gridSize/2 - 2,
            0, Math.PI * 2
        );
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw snake
        snake.forEach((segment, index) => {
            const gradient = ctx.createRadialGradient(
                segment.x * gridSize + gridSize/2,
                segment.y * gridSize + gridSize/2,
                0,
                segment.x * gridSize + gridSize/2,
                segment.y * gridSize + gridSize/2,
                gridSize/2
            );
            gradient.addColorStop(0, '#00ff00');
            gradient.addColorStop(1, '#00aa00');
            ctx.fillStyle = gradient;
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = index === 0 ? 15 : 5;
            ctx.fillRect(
                segment.x * gridSize + 1,
                segment.y * gridSize + 1,
                gridSize - 2,
                gridSize - 2
            );
        });
        ctx.shadowBlur = 0;
    }
    
    gameLoop = requestAnimationFrame(update);
}

// === TETRIS GAME ===
function initTetris() {
    currentGameTitle.textContent = 'TETRIS';
    gameControls.innerHTML = 'Arrow Keys: ← → Move | ↓ Fast Drop | ↑ Rotate';
    
    canvas.width = 300;
    canvas.height = 600;
    
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;
    
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
        onUp: (p) => { if (p && !gameOver) rotate(); }
    });
    
    spawnPiece();
    
    let lastTime = 0;
    let dropInterval = 500;
    
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
                    ctx.shadowColor = board[y][x];
                    ctx.shadowBlur = 10;
                    ctx.fillRect(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
                }
            }
        }
        ctx.shadowBlur = 0;
        
        // Draw current piece
        if (currentPiece && !gameOver) {
            ctx.fillStyle = currentColor;
            ctx.shadowColor = currentColor;
            ctx.shadowBlur = 15;
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
            ctx.shadowBlur = 0;
        }
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 40);
            return;
        }
        
        // Drop piece
        if (currentTime - lastTime > dropInterval) {
            lastTime = currentTime;
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

// === PONG GAME ===
function initPong() {
    currentGameTitle.textContent = 'PONG';
    gameControls.innerHTML = 'W/S or ↑/↓ to move paddle';
    
    canvas.width = 600;
    canvas.height = 400;
    
    const paddleWidth = 15;
    const paddleHeight = 80;
    const ballSize = 15;
    
    let playerY = canvas.height / 2 - paddleHeight / 2;
    let aiY = canvas.height / 2 - paddleHeight / 2;
    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let ballSpeedX = 5;
    let ballSpeedY = 3;
    let playerScore = 0;
    let aiScore = 0;
    
    const keys = {};
    
    handleKeyDown = (e) => {
        keys[e.key] = true;
    };
    handleKeyUp = (e) => {
        keys[e.key] = false;
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    const touchKeys = {};
    addTouchDpad({
        onUp: (p) => { touchKeys['ArrowUp'] = p; },
        onDown: (p) => { touchKeys['ArrowDown'] = p; }
    });
    
    function update() {
        gameLoop = requestAnimationFrame(update);
        
        // Player movement
        if (keys['w'] || keys['W'] || keys['ArrowUp'] || touchKeys['ArrowUp']) {
            playerY = Math.max(0, playerY - 8);
        }
        if (keys['s'] || keys['S'] || keys['ArrowDown'] || touchKeys['ArrowDown']) {
            playerY = Math.min(canvas.height - paddleHeight, playerY + 8);
        }
        
        // AI movement
        const aiCenter = aiY + paddleHeight / 2;
        if (aiCenter < ballY - 20) {
            aiY = Math.min(canvas.height - paddleHeight, aiY + 4);
        } else if (aiCenter > ballY + 20) {
            aiY = Math.max(0, aiY - 4);
        }
        
        // Ball movement
        ballX += ballSpeedX;
        ballY += ballSpeedY;
        
        // Ball collision with top/bottom
        if (ballY <= 0 || ballY >= canvas.height - ballSize) {
            ballSpeedY = -ballSpeedY;
            playSound(300, 0.05);
        }
        
        // Ball collision with paddles
        // Player paddle
        if (ballX <= paddleWidth + 20 && 
            ballY + ballSize >= playerY && 
            ballY <= playerY + paddleHeight &&
            ballSpeedX < 0) {
            ballSpeedX = -ballSpeedX * 1.05;
            const hitPos = (ballY - playerY) / paddleHeight;
            ballSpeedY = (hitPos - 0.5) * 10;
            playSound(500, 0.1);
        }
        
        // AI paddle
        if (ballX >= canvas.width - paddleWidth - 20 - ballSize && 
            ballY + ballSize >= aiY && 
            ballY <= aiY + paddleHeight &&
            ballSpeedX > 0) {
            ballSpeedX = -ballSpeedX * 1.05;
            const hitPos = (ballY - aiY) / paddleHeight;
            ballSpeedY = (hitPos - 0.5) * 10;
            playSound(500, 0.1);
        }
        
        // Scoring
        if (ballX < 0) {
            aiScore++;
            resetBall();
            playSound(200, 0.3);
        }
        if (ballX > canvas.width) {
            playerScore++;
            updateScore(playerScore);
            resetBall();
            playSound(800, 0.2);
        }
        
        // Limit ball speed
        ballSpeedX = Math.max(-15, Math.min(15, ballSpeedX));
        ballSpeedY = Math.max(-10, Math.min(10, ballSpeedY));
        
        // Draw
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Center line
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Paddles
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
        ctx.fillRect(20, playerY, paddleWidth, paddleHeight);
        
        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.fillRect(canvas.width - paddleWidth - 20, aiY, paddleWidth, paddleHeight);
        
        // Ball
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(ballX + ballSize/2, ballY + ballSize/2, ballSize/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Scores
        ctx.font = '48px "Press Start 2P"';
        ctx.fillStyle = '#00ffff';
        ctx.textAlign = 'center';
        ctx.fillText(playerScore, canvas.width / 4, 60);
        ctx.fillStyle = '#ff00ff';
        ctx.fillText(aiScore, 3 * canvas.width / 4, 60);
    }
    
    function resetBall() {
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * 5;
        ballSpeedY = (Math.random() - 0.5) * 6;
    }
    
    gameLoop = requestAnimationFrame(update);
}

// === BREAKOUT GAME ===
function initBreakout() {
    currentGameTitle.textContent = 'BREAKOUT';
    gameControls.innerHTML = 'Arrow Keys or Mouse to move paddle';
    
    canvas.width = 600;
    canvas.height = 500;
    
    const paddleWidth = 100;
    const paddleHeight = 15;
    const ballSize = 10;
    const brickRows = 5;
    const brickCols = 10;
    const brickWidth = 55;
    const brickHeight = 20;
    const brickPadding = 5;
    const brickOffsetTop = 50;
    const brickOffsetLeft = 20;
    
    let paddleX = canvas.width / 2 - paddleWidth / 2;
    let ballX = canvas.width / 2;
    let ballY = canvas.height - 50;
    let ballSpeedX = 4;
    let ballSpeedY = -4;
    let gameOver = false;
    let win = false;
    
    const brickColors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00ffff'];
    
    let bricks = [];
    for (let r = 0; r < brickRows; r++) {
        bricks[r] = [];
        for (let c = 0; c < brickCols; c++) {
            bricks[r][c] = { x: 0, y: 0, status: 1, color: brickColors[r] };
        }
    }
    
    const keys = {};
    
    handleKeyDown = (e) => { 
        keys[e.key] = true;
        // Restart on space when game over or win
        if ((gameOver || win) && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('breakout');
            return;
        }
    };
    handleKeyUp = (e) => { keys[e.key] = false; };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    function setPaddleFromClientX(clientX) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const canvasX = (clientX - rect.left) * scaleX;
        paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, canvasX - paddleWidth / 2));
    }
    canvas.onmousemove = (e) => setPaddleFromClientX(e.clientX);
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length) {
            e.preventDefault();
            setPaddleFromClientX(e.touches[0].clientX);
        }
    }, { passive: false });
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length) setPaddleFromClientX(e.touches[0].clientX);
    }, { passive: true });
    
    function update() {
        gameLoop = requestAnimationFrame(update);
        
        if (keys['ArrowLeft']) paddleX = Math.max(0, paddleX - 8);
        if (keys['ArrowRight']) paddleX = Math.min(canvas.width - paddleWidth, paddleX + 8);
        
        if (!gameOver && !win) {
            ballX += ballSpeedX;
            ballY += ballSpeedY;
            
            // Wall collisions
            if (ballX <= 0 || ballX >= canvas.width - ballSize) {
                ballSpeedX = -ballSpeedX;
                playSound(300, 0.05);
            }
            if (ballY <= 0) {
                ballSpeedY = -ballSpeedY;
                playSound(300, 0.05);
            }
            
            // Paddle collision
            if (ballY >= canvas.height - paddleHeight - 20 - ballSize &&
                ballX >= paddleX && ballX <= paddleX + paddleWidth) {
                ballSpeedY = -Math.abs(ballSpeedY);
                const hitPos = (ballX - paddleX) / paddleWidth;
                ballSpeedX = (hitPos - 0.5) * 10;
                playSound(500, 0.1);
            }
            
            // Bottom - game over
            if (ballY > canvas.height) {
                gameOver = true;
                playSound(100, 0.5);
            }
            
            // Brick collisions
            let bricksLeft = 0;
            for (let r = 0; r < brickRows; r++) {
                for (let c = 0; c < brickCols; c++) {
                    const brick = bricks[r][c];
                    if (brick.status === 1) {
                        bricksLeft++;
                        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                        brick.x = brickX;
                        brick.y = brickY;
                        
                        if (ballX >= brickX && ballX <= brickX + brickWidth &&
                            ballY >= brickY && ballY <= brickY + brickHeight) {
                            ballSpeedY = -ballSpeedY;
                            brick.status = 0;
                            updateScore(score + 10);
                            playSound(600 + r * 100, 0.1);
                        }
                    }
                }
            }
            
            if (bricksLeft === 0) {
                win = true;
                playSound(1000, 0.5);
            }
        }
        
        // Draw
        ctx.fillStyle = '#000011';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw bricks
        for (let r = 0; r < brickRows; r++) {
            for (let c = 0; c < brickCols; c++) {
                const brick = bricks[r][c];
                if (brick.status === 1) {
                    const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                    const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                    ctx.fillStyle = brick.color;
                    ctx.shadowColor = brick.color;
                    ctx.shadowBlur = 10;
                    ctx.fillRect(brickX, brickY, brickWidth, brickHeight);
                }
            }
        }
        ctx.shadowBlur = 0;
        
        // Draw paddle
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
        ctx.fillRect(paddleX, canvas.height - paddleHeight - 20, paddleWidth, paddleHeight);
        
        // Draw ball
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '30px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 40);
        }
        
        if (win) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff00';
            ctx.font = '30px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('YOU WIN!', canvas.width/2, canvas.height/2);
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('Press SPACE to play again', canvas.width/2, canvas.height/2 + 40);
        }
    }
    
    gameLoop = requestAnimationFrame(update);
}

// === SPACE INVADERS ===
function initSpaceInvaders() {
    currentGameTitle.textContent = 'SPACE INVADERS';
    gameControls.innerHTML = '← → Move | SPACE Shoot';
    
    canvas.width = 600;
    canvas.height = 500;
    
    const playerWidth = 50;
    const playerHeight = 30;
    let playerX = canvas.width / 2 - playerWidth / 2;
    
    const invaderRows = 4;
    const invaderCols = 8;
    const invaderWidth = 40;
    const invaderHeight = 30;
    const invaderPadding = 15;
    
    let invaders = [];
    let invaderDirection = 1;
    let invaderSpeed = 1;
    let bullets = [];
    let enemyBullets = [];
    let gameOver = false;
    let win = false;
    
    // Initialize invaders
    for (let r = 0; r < invaderRows; r++) {
        for (let c = 0; c < invaderCols; c++) {
            invaders.push({
                x: c * (invaderWidth + invaderPadding) + 50,
                y: r * (invaderHeight + invaderPadding) + 50,
                alive: true
            });
        }
    }
    
    const keys = {};
    
    function doFire() {
        if (!gameOver && !win) {
            bullets.push({ x: playerX + playerWidth / 2, y: canvas.height - 60 });
            playSound(400, 0.1);
        }
    }
    handleKeyDown = (e) => {
        keys[e.key] = true;
        // Restart on space when game over or win
        if ((gameOver || win) && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('spaceinvaders');
            return;
        }
        if (e.key === ' ' && !gameOver && !win) doFire();
    };
    handleKeyUp = (e) => { keys[e.key] = false; };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    const touchKeys = {};
    addTouchDpad({
        onLeft: (p) => { touchKeys['ArrowLeft'] = p; },
        onRight: (p) => { touchKeys['ArrowRight'] = p; },
        onAction: doFire,
        actionLabel: 'FIRE'
    });
    
    let lastEnemyShot = 0;
    
    function update(currentTime) {
        gameLoop = requestAnimationFrame(update);
        
        if (!gameOver && !win) {
            // Player movement
            if (keys['ArrowLeft'] || touchKeys['ArrowLeft']) playerX = Math.max(0, playerX - 6);
            if (keys['ArrowRight'] || touchKeys['ArrowRight']) playerX = Math.min(canvas.width - playerWidth, playerX + 6);
            
            // Move invaders
            let moveDown = false;
            let aliveInvaders = invaders.filter(inv => inv.alive);
            
            if (aliveInvaders.length === 0) {
                win = true;
                playSound(1000, 0.5);
            }
            
            for (let inv of aliveInvaders) {
                if ((inv.x <= 0 && invaderDirection < 0) || 
                    (inv.x >= canvas.width - invaderWidth && invaderDirection > 0)) {
                    moveDown = true;
                    break;
                }
            }
            
            if (moveDown) {
                invaderDirection = -invaderDirection;
                for (let inv of invaders) {
                    inv.y += 20;
                    if (inv.alive && inv.y > canvas.height - 100) {
                        gameOver = true;
                        playSound(100, 0.5);
                    }
                }
            } else {
                for (let inv of invaders) {
                    inv.x += invaderDirection * invaderSpeed;
                }
            }
            
            // Move bullets
            bullets = bullets.filter(b => {
                b.y -= 8;
                return b.y > 0;
            });
            
            // Enemy shooting
            if (currentTime - lastEnemyShot > 1500 && aliveInvaders.length > 0) {
                const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
                enemyBullets.push({ x: shooter.x + invaderWidth / 2, y: shooter.y + invaderHeight });
                lastEnemyShot = currentTime;
            }
            
            enemyBullets = enemyBullets.filter(b => {
                b.y += 5;
                return b.y < canvas.height;
            });
            
            // Bullet-invader collision
            for (let bullet of bullets) {
                for (let inv of invaders) {
                    if (inv.alive &&
                        bullet.x >= inv.x && bullet.x <= inv.x + invaderWidth &&
                        bullet.y >= inv.y && bullet.y <= inv.y + invaderHeight) {
                        inv.alive = false;
                        bullet.y = -100;
                        updateScore(score + 20);
                        playSound(600, 0.1);
                    }
                }
            }
            
            // Enemy bullet-player collision
            for (let bullet of enemyBullets) {
                if (bullet.x >= playerX && bullet.x <= playerX + playerWidth &&
                    bullet.y >= canvas.height - 50 && bullet.y <= canvas.height - 20) {
                    gameOver = true;
                    playSound(100, 0.5);
                }
            }
        }
        
        // Draw
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Stars
        ctx.fillStyle = '#333';
        for (let i = 0; i < 50; i++) {
            ctx.fillRect(
                (i * 73) % canvas.width,
                (i * 97 + currentTime * 0.01) % canvas.height,
                2, 2
            );
        }
        
        // Draw invaders
        for (let inv of invaders) {
            if (inv.alive) {
                ctx.fillStyle = '#00ff00';
                ctx.shadowColor = '#00ff00';
                ctx.shadowBlur = 10;
                // Simple alien shape
                ctx.fillRect(inv.x + 5, inv.y, invaderWidth - 10, invaderHeight - 10);
                ctx.fillRect(inv.x, inv.y + 10, invaderWidth, invaderHeight - 15);
                ctx.fillRect(inv.x + 5, inv.y + invaderHeight - 10, 10, 10);
                ctx.fillRect(inv.x + invaderWidth - 15, inv.y + invaderHeight - 10, 10, 10);
            }
        }
        
        // Draw player
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(playerX + playerWidth / 2, canvas.height - 50);
        ctx.lineTo(playerX, canvas.height - 20);
        ctx.lineTo(playerX + playerWidth, canvas.height - 20);
        ctx.closePath();
        ctx.fill();
        
        // Draw bullets
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 10;
        for (let bullet of bullets) {
            ctx.fillRect(bullet.x - 2, bullet.y, 4, 15);
        }
        
        // Draw enemy bullets
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        for (let bullet of enemyBullets) {
            ctx.fillRect(bullet.x - 2, bullet.y, 4, 15);
        }
        ctx.shadowBlur = 0;
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '30px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 40);
        }
        
        if (win) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff00';
            ctx.font = '30px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('YOU WIN!', canvas.width/2, canvas.height/2);
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('Press SPACE to play again', canvas.width/2, canvas.height/2 + 40);
        }
    }
    
    gameLoop = requestAnimationFrame(update);
}

// === MEMORY GAME ===
function initMemory() {
    currentGameTitle.textContent = 'MEMORY';
    gameControls.innerHTML = 'Click cards to match pairs';
    
    canvas.width = 500;
    canvas.height = 400;
    
    const symbols = ['★', '♦', '♣', '♥', '●', '■', '▲', '◆'];
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#88ff00'];
    
    let cards = [];
    const rows = 4;
    const cols = 4;
    const cardWidth = 100;
    const cardHeight = 80;
    const padding = 15;
    
    // Create pairs
    let pairs = [];
    for (let i = 0; i < 8; i++) {
        pairs.push({ symbol: symbols[i], color: colors[i] });
        pairs.push({ symbol: symbols[i], color: colors[i] });
    }
    
    // Shuffle
    pairs.sort(() => Math.random() - 0.5);
    
    // Create cards
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const pair = pairs[r * cols + c];
            cards.push({
                x: c * (cardWidth + padding) + 25,
                y: r * (cardHeight + padding) + 20,
                symbol: pair.symbol,
                color: pair.color,
                flipped: false,
                matched: false
            });
        }
    }
    
    let flippedCards = [];
    let canClick = true;
    let moves = 0;
    
    function handleCardTap(e) {
        if (!canClick) return;
        const coords = e.touches ? getEventCanvasCoords(e) : (() => {
            const rect = canvas.getBoundingClientRect();
            return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
        })();
        if (!coords) return;
        const mouseX = coords.x, mouseY = coords.y;
        
        for (let card of cards) {
            if (mouseX >= card.x && mouseX <= card.x + cardWidth &&
                mouseY >= card.y && mouseY <= card.y + cardHeight &&
                !card.flipped && !card.matched) {
                
                card.flipped = true;
                flippedCards.push(card);
                playSound(500, 0.1);
                
                if (flippedCards.length === 2) {
                    moves++;
                    canClick = false;
                    
                    if (flippedCards[0].symbol === flippedCards[1].symbol) {
                        flippedCards[0].matched = true;
                        flippedCards[1].matched = true;
                        flippedCards = [];
                        canClick = true;
                        updateScore(score + 50);
                        playSound(800, 0.2);
                        
                        // Check win
                        if (cards.every(c => c.matched)) {
                            setTimeout(() => {
                                alert(`You won in ${moves} moves!`);
                            }, 500);
                        }
                    } else {
                        setTimeout(() => {
                            flippedCards[0].flipped = false;
                            flippedCards[1].flipped = false;
                            flippedCards = [];
                            canClick = true;
                        }, 1000);
                    }
                }
                break;
            }
        }
    }
    canvas.onclick = (e) => handleCardTap(e);
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length) { e.preventDefault(); handleCardTap(e); }
    }, { passive: false });
    
    function draw() {
        gameLoop = requestAnimationFrame(draw);
        
        ctx.fillStyle = '#1a0030';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let card of cards) {
            if (card.flipped || card.matched) {
                // Show card
                ctx.fillStyle = '#222';
                ctx.strokeStyle = card.color;
                ctx.lineWidth = 3;
                ctx.shadowColor = card.color;
                ctx.shadowBlur = card.matched ? 20 : 10;
                ctx.fillRect(card.x, card.y, cardWidth, cardHeight);
                ctx.strokeRect(card.x, card.y, cardWidth, cardHeight);
                
                ctx.fillStyle = card.color;
                ctx.font = '36px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(card.symbol, card.x + cardWidth/2, card.y + cardHeight/2);
            } else {
                // Card back
                ctx.fillStyle = '#ff00ff';
                ctx.shadowColor = '#ff00ff';
                ctx.shadowBlur = 5;
                ctx.fillRect(card.x, card.y, cardWidth, cardHeight);
                ctx.strokeStyle = '#aa00aa';
                ctx.lineWidth = 3;
                ctx.strokeRect(card.x + 5, card.y + 5, cardWidth - 10, cardHeight - 10);
                
                ctx.fillStyle = '#aa00aa';
                ctx.font = '24px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', card.x + cardWidth/2, card.y + cardHeight/2);
            }
        }
        ctx.shadowBlur = 0;
    }
    
    gameLoop = requestAnimationFrame(draw);
}

// === FLAPPY BIRD ===
function initFlappy() {
    currentGameTitle.textContent = 'FLAPPY PIXEL';
    gameControls.innerHTML = 'SPACE or Click to flap';
    
    canvas.width = 400;
    canvas.height = 600;
    
    const birdSize = 30;
    let birdY = canvas.height / 2;
    let birdVelocity = 0;
    const gravity = 0.5;
    const flapStrength = -10;
    
    const pipeWidth = 60;
    const pipeGap = 250;
    let pipes = [];
    let gameOver = false;
    let started = false;
    
    // Fixed timing - use game-relative time
    let gameStartTime = 0;
    let lastPipeSpawnTime = 0;
    const pipeSpawnInterval = 2000; // spawn pipe every 2 seconds
    
    function spawnPipe() {
        const minHeight = 80;
        const maxHeight = canvas.height - pipeGap - minHeight;
        const height = Math.random() * (maxHeight - minHeight) + minHeight;
        // Limit pipes array to prevent memory issues
        if (pipes.length < 10) {
            pipes.push({
                x: canvas.width,
                topHeight: height,
                passed: false
            });
        }
    }
    
    function flap() {
        if (gameOver) return;
        if (!started) {
            started = true;
            gameStartTime = performance.now();
            lastPipeSpawnTime = gameStartTime;
        }
        birdVelocity = flapStrength;
        playSound(400, 0.1);
    }
    
    handleKeyDown = (e) => {
        if (e.key === ' ') {
            e.preventDefault();
            // Restart on space when game over
            if (gameOver) {
                stopGame();
                startGame('flappy');
                return;
            }
            flap();
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    canvas.onclick = () => {
        if (gameOver) {
            stopGame();
            startGame('flappy');
            return;
        }
        flap();
    };
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameOver) {
            stopGame();
            startGame('flappy');
            return;
        }
        flap();
    }, { passive: false });
    
    spawnPipe();
    
    function update() {
        gameLoop = requestAnimationFrame(update);
        
        const currentTime = performance.now();
        
        // Draw background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#001133');
        gradient.addColorStop(1, '#003366');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Stars
        ctx.fillStyle = '#ffffff33';
        for (let i = 0; i < 30; i++) {
            ctx.fillRect((i * 47) % canvas.width, (i * 83) % canvas.height, 2, 2);
        }
        
        if (started && !gameOver) {
            // Bird physics
            birdVelocity += gravity;
            birdY += birdVelocity;
            
            // Spawn pipes using proper time tracking
            if (currentTime - lastPipeSpawnTime > pipeSpawnInterval) {
                spawnPipe();
                lastPipeSpawnTime = currentTime;
            }
            
            // Move pipes
            pipes = pipes.filter(pipe => {
                pipe.x -= 3;
                return pipe.x > -pipeWidth;
            });
            
            // Collision detection
            const birdX = 80;
            
            // Ground/ceiling
            if (birdY < 0 || birdY > canvas.height - birdSize) {
                gameOver = true;
                playSound(100, 0.5);
            }
            
            // Pipes - only check if not already game over
            if (!gameOver) {
                for (let pipe of pipes) {
                    // Check collision
                    if (birdX + birdSize > pipe.x && birdX < pipe.x + pipeWidth) {
                        if (birdY < pipe.topHeight || birdY + birdSize > pipe.topHeight + pipeGap) {
                            gameOver = true;
                            playSound(100, 0.5);
                            break;
                        }
                    }
                    
                    // Score
                    if (!pipe.passed && pipe.x + pipeWidth < birdX) {
                        pipe.passed = true;
                        updateScore(score + 1);
                        playSound(600, 0.1);
                    }
                }
            }
        }
        
        // Draw pipes
        for (let pipe of pipes) {
            // Top pipe
            ctx.fillStyle = '#00cc00';
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 10;
            ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
            ctx.fillRect(pipe.x - 5, pipe.topHeight - 30, pipeWidth + 10, 30);
            
            // Bottom pipe
            const bottomY = pipe.topHeight + pipeGap;
            ctx.fillRect(pipe.x, bottomY, pipeWidth, canvas.height - bottomY);
            ctx.fillRect(pipe.x - 5, bottomY, pipeWidth + 10, 30);
        }
        ctx.shadowBlur = 0;
        
        // Draw bird
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 20;
        
        const birdX = 80;
        const rotation = Math.min(Math.max(birdVelocity * 3, -30), 90);
        
        ctx.save();
        ctx.translate(birdX + birdSize/2, birdY + birdSize/2);
        ctx.rotate(rotation * Math.PI / 180);
        
        // Bird body
        ctx.beginPath();
        ctx.arc(0, 0, birdSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(8, -5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(9, -6, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Beak
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(25, 0);
        ctx.lineTo(15, 8);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        ctx.shadowBlur = 0;
        
        // Instructions
        if (!started) {
            ctx.fillStyle = '#fff';
            ctx.font = '16px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('TAP TO START', canvas.width/2, canvas.height/2 + 100);
        }
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 30);
            ctx.font = '14px "Press Start 2P"';
            ctx.fillStyle = '#fff';
            ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 10);
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 50);
        }
    }
    
    gameLoop = requestAnimationFrame(update);
}

// === 2048 GAME ===
function init2048() {
    currentGameTitle.textContent = '2048';
    gameControls.innerHTML = 'Arrow Keys to move tiles';
    
    canvas.width = 400;
    canvas.height = 400;
    
    const gridSize = 4;
    const tileSize = 90;
    const padding = 10;
    
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
        // Check for empty cells
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (grid[r][c] === 0) return false;
            }
        }
        // Check for possible merges
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                if (c < gridSize - 1 && grid[r][c] === grid[r][c+1]) return false;
                if (r < gridSize - 1 && grid[r][c] === grid[r+1][c]) return false;
            }
        }
        return true;
    }
    
    handleKeyDown = (e) => {
        // Restart on space when game over
        if (gameOver && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('2048');
            return;
        }
        if (gameOver) return;
        let moved = false;
        
        switch(e.key) {
            case 'ArrowUp': moved = moveUp(); break;
            case 'ArrowDown': moved = moveDown(); break;
            case 'ArrowLeft': moved = moveLeft(); break;
            case 'ArrowRight': moved = moveRight(); break;
        }
        
        if (moved) {
            addRandomTile();
            if (checkGameOver()) {
                gameOver = true;
                playSound(100, 0.5);
            }
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    addTouchDpad({
        onLeft: (p) => {
            if (!p || gameOver) return;
            let moved = moveLeft();
            if (moved) { addRandomTile(); if (checkGameOver()) { gameOver = true; playSound(100, 0.5); } }
        },
        onRight: (p) => {
            if (!p || gameOver) return;
            let moved = moveRight();
            if (moved) { addRandomTile(); if (checkGameOver()) { gameOver = true; playSound(100, 0.5); } }
        },
        onUp: (p) => {
            if (!p || gameOver) return;
            let moved = moveUp();
            if (moved) { addRandomTile(); if (checkGameOver()) { gameOver = true; playSound(100, 0.5); } }
        },
        onDown: (p) => {
            if (!p || gameOver) return;
            let moved = moveDown();
            if (moved) { addRandomTile(); if (checkGameOver()) { gameOver = true; playSound(100, 0.5); } }
        }
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
                
                ctx.fillStyle = colors[value] || '#3c3a32';
                if (value > 0) {
                    ctx.shadowColor = colors[value] || '#3c3a32';
                    ctx.shadowBlur = 15;
                }
                ctx.fillRect(x, y, tileSize, tileSize);
                ctx.shadowBlur = 0;
                
                if (value > 0) {
                    ctx.fillStyle = textColors[value] || '#f9f6f2';
                    ctx.font = value >= 1000 ? 'bold 28px Orbitron' : 'bold 36px Orbitron';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(value, x + tileSize/2, y + tileSize/2);
                }
            }
        }
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '28px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 30);
        }
        
        if (won && !gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff00';
            ctx.font = '28px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('YOU WIN!', canvas.width/2, canvas.height/2 - 20);
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('Keep playing!', canvas.width/2, canvas.height/2 + 20);
        }
    }
    
    gameLoop = requestAnimationFrame(draw);
}

// Game Creator System Removed for Security

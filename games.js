// === PIXEL PALACE - GAME CENTER ===

// DOM Elements
const lobby = document.getElementById('lobby');
const gameContainer = document.getElementById('gameContainer');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const backBtn = document.getElementById('backBtn');
const scoreValue = document.getElementById('scoreValue');
const currentGameTitle = document.getElementById('currentGameTitle');
const gameControls = document.getElementById('gameControls');
const tabs = document.querySelectorAll('.tab');
const cabinets = document.querySelectorAll('.game-cabinet');

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
backBtn.addEventListener('click', () => {
    stopGame();
    gameContainer.classList.remove('active');
    lobby.style.display = 'block';
});

function startGame(gameName) {
    lobby.style.display = 'none';
    gameContainer.classList.add('active');
    score = 0;
    updateScore(0);
    
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
        case 'online':
            initOnline();
            break;
        case 'race':
            initRace();
            break;
        case 'tanks':
            initTanks();
            break;
        case 'minesweeper':
            initMinesweeper();
            break;
        case 'connect4':
            initConnect4();
            break;
        case 'tower':
            initTower();
            break;
        case 'asteroids':
            initAsteroids();
            break;
        case 'drawing':
            initDrawing();
            break;
        case 'zombies':
            initZombies();
            break;
        case 'runner':
            initRunner();
            break;
        case 'wordle':
            initWordle();
            break;
        case 'royale':
            initRoyale();
            break;
    }
}

function stopGame() {
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    currentGame = null;
    
    // Run all cleanup functions
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions = [];
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Remove all event listeners
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    canvas.onclick = null;
    canvas.onmousemove = null;
}

let handleKeyUp = null;

function updateScore(newScore) {
    score = newScore;
    scoreValue.textContent = score;
}

let handleKeyDown = null;

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
    
    function update() {
        gameLoop = requestAnimationFrame(update);
        
        // Player movement
        if (keys['w'] || keys['W'] || keys['ArrowUp']) {
            playerY = Math.max(0, playerY - 8);
        }
        if (keys['s'] || keys['S'] || keys['ArrowDown']) {
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
    
    canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, mouseX - paddleWidth / 2));
    };
    
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
    
    handleKeyDown = (e) => {
        keys[e.key] = true;
        // Restart on space when game over or win
        if ((gameOver || win) && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('spaceinvaders');
            return;
        }
        if (e.key === ' ' && !gameOver && !win) {
            bullets.push({ x: playerX + playerWidth / 2, y: canvas.height - 60 });
            playSound(400, 0.1);
        }
    };
    handleKeyUp = (e) => { keys[e.key] = false; };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    let lastEnemyShot = 0;
    
    function update(currentTime) {
        gameLoop = requestAnimationFrame(update);
        
        if (!gameOver && !win) {
            // Player movement
            if (keys['ArrowLeft']) playerX = Math.max(0, playerX - 6);
            if (keys['ArrowRight']) playerX = Math.min(canvas.width - playerWidth, playerX + 6);
            
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
    
    canvas.onclick = (e) => {
        if (!canClick) return;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
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
    };
    
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

// === ONLINE ARENA BATTLE ===
function initOnline() {
    currentGameTitle.textContent = 'CYBER ARENA';
    gameControls.innerHTML = 'Click targets to score! Build combos for multipliers!';
    
    canvas.width = 700;
    canvas.height = 520;
    
    // Generate unique player ID
    const playerId = 'player_' + Math.random().toString(36).substr(2, 9);
    const playerHue = Math.random() * 360;
    const playerColor = `hsl(${playerHue}, 100%, 50%)`;
    const playerName = 'Player ' + Math.floor(Math.random() * 1000);
    
    // Game state
    let targets = [];
    let particles = [];
    let players = {};
    let gameTime = 60;
    let gameStarted = false;
    let roundOver = false;
    let lastTargetSpawn = 0;
    let mouseX = 0;
    let mouseY = 0;
    let combo = 0;
    let comboTimer = 0;
    let lastHitTime = 0;
    let screenShake = 0;
    
    // Target types
    const targetTypes = [
        { type: 'normal', color: '#ff00ff', points: 10, radius: 25, icon: '●' },
        { type: 'fast', color: '#00ffff', points: 25, radius: 20, speed: 3, icon: '◆' },
        { type: 'big', color: '#ffff00', points: 15, radius: 40, icon: '★' },
        { type: 'golden', color: '#ffd700', points: 100, radius: 18, rare: true, icon: '♦' },
        { type: 'bomb', color: '#ff0000', points: -50, radius: 30, icon: '💣' }
    ];
    
    // BroadcastChannel for local multiplayer
    let channel = null;
    try {
        channel = new BroadcastChannel('pixel_palace_arena');
        
        channel.onmessage = (event) => {
            const data = event.data;
            if (data.type === 'player_update') {
                players[data.playerId] = {
                    x: data.x,
                    y: data.y,
                    score: data.score,
                    color: data.color,
                    name: data.name,
                    combo: data.combo,
                    lastSeen: Date.now()
                };
            } else if (data.type === 'target_hit') {
                targets = targets.filter(t => t.id !== data.targetId);
            } else if (data.type === 'player_left') {
                delete players[data.playerId];
            }
        };
    } catch (e) {
        console.log('BroadcastChannel not supported');
    }
    
    function broadcastPosition() {
        if (channel) {
            channel.postMessage({
                type: 'player_update',
                playerId: playerId,
                x: mouseX,
                y: mouseY,
                score: score,
                color: playerColor,
                name: playerName,
                combo: combo
            });
        }
    }
    
    function spawnTarget() {
        // Choose target type
        let typeIndex = 0;
        const rand = Math.random();
        if (rand < 0.05) typeIndex = 3; // Golden (5%)
        else if (rand < 0.15) typeIndex = 4; // Bomb (10%)
        else if (rand < 0.35) typeIndex = 1; // Fast (20%)
        else if (rand < 0.50) typeIndex = 2; // Big (15%)
        else typeIndex = 0; // Normal (50%)
        
        const template = targetTypes[typeIndex];
        const id = 'target_' + Date.now() + '_' + Math.random();
        
        targets.push({
            id: id,
            x: Math.random() * (canvas.width - 120) + 60,
            y: Math.random() * (canvas.height - 150) + 80,
            vx: template.speed ? (Math.random() - 0.5) * template.speed : 0,
            vy: template.speed ? (Math.random() - 0.5) * template.speed : 0,
            radius: template.radius,
            baseColor: template.color,
            points: template.points,
            type: template.type,
            icon: template.icon,
            spawnTime: Date.now(),
            lifetime: template.type === 'golden' ? 2000 : (template.type === 'fast' ? 2500 : 4000),
            pulse: 0
        });
    }
    
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = 3 + Math.random() * 5;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                color: color,
                size: 3 + Math.random() * 5
            });
        }
    }
    
    canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    };
    
    canvas.onclick = (e) => {
        if (!gameStarted) {
            gameStarted = true;
            gameTime = 60;
            roundOver = false;
            combo = 0;
            return;
        }
        
        if (roundOver) {
            gameStarted = true;
            gameTime = 60;
            roundOver = false;
            updateScore(0);
            combo = 0;
            targets = [];
            particles = [];
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        let hit = false;
        for (let i = targets.length - 1; i >= 0; i--) {
            const target = targets[i];
            const dist = Math.sqrt((clickX - target.x) ** 2 + (clickY - target.y) ** 2);
            if (dist < target.radius) {
                const now = Date.now();
                
                if (target.type === 'bomb') {
                    // Hit bomb - lose points and reset combo
                    updateScore(Math.max(0, score + target.points));
                    combo = 0;
                    screenShake = 15;
                    spawnParticles(target.x, target.y, '#ff0000', 20);
                    playSound(150, 0.3);
                } else {
                    // Combo system
                    if (now - lastHitTime < 1500) {
                        combo++;
                    } else {
                        combo = 1;
                    }
                    lastHitTime = now;
                    comboTimer = 1.5;
                    
                    const multiplier = Math.min(combo, 10);
                    const points = target.points * multiplier;
                    updateScore(score + points);
                    
                    screenShake = 3;
                    spawnParticles(target.x, target.y, target.baseColor, 12);
                    playSound(400 + combo * 50, 0.15);
                }
                
                if (channel) {
                    channel.postMessage({
                        type: 'target_hit',
                        targetId: target.id,
                        playerId: playerId
                    });
                }
                
                targets.splice(i, 1);
                hit = true;
                break;
            }
        }
        
        // Miss - reset combo
        if (!hit) {
            combo = 0;
            playSound(100, 0.1);
        }
    };
    
    cleanupFunctions.push(() => {
        if (channel) {
            channel.postMessage({ type: 'player_left', playerId: playerId });
            channel.close();
        }
    });
    
    let lastTime = performance.now();
    
    function update() {
        gameLoop = requestAnimationFrame(update);
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        // Screen shake
        ctx.save();
        if (screenShake > 0) {
            ctx.translate(
                (Math.random() - 0.5) * screenShake,
                (Math.random() - 0.5) * screenShake
            );
            screenShake *= 0.9;
        }
        
        // Advanced animated background with multiple layers
        const time = Date.now() * 0.001;
        
        // Base gradient with animated color shifts
        const hueShift = (time * 20) % 360;
        const bgGrad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width * 1.2
        );
        bgGrad.addColorStop(0, `hsl(${hueShift}, 70%, 15%)`);
        bgGrad.addColorStop(0.3, `hsl(${(hueShift + 60) % 360}, 60%, 8%)`);
        bgGrad.addColorStop(0.6, `hsl(${(hueShift + 120) % 360}, 50%, 5%)`);
        bgGrad.addColorStop(1, '#000000');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Animated starfield
        for (let i = 0; i < 50; i++) {
            const starX = (i * 137.508) % canvas.width;
            const starY = (i * 197.508) % canvas.height;
            const brightness = (Math.sin(time * 2 + i) + 1) / 2;
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.8})`;
            ctx.fillRect(starX, starY, 2, 2);
        }
        
        // Enhanced hexagonal grid with glow
        ctx.strokeStyle = `rgba(${100 + Math.sin(time) * 50}, ${50 + Math.cos(time) * 50}, 255, 0.25)`;
        ctx.shadowColor = `rgba(150, 50, 255, 0.5)`;
        ctx.shadowBlur = 5;
        ctx.lineWidth = 1.5;
        const hexSize = 40;
        const gridOffset = (time * 20) % (hexSize * 2);
        for (let row = 0; row < canvas.height / hexSize + 2; row++) {
            for (let col = 0; col < canvas.width / hexSize + 2; col++) {
                const x = col * hexSize * 1.5 + (row % 2) * hexSize * 0.75 - gridOffset;
                const y = row * hexSize * 0.866 - gridOffset;
                drawHexagon(x, y, hexSize / 2);
            }
        }
        ctx.shadowBlur = 0;
        
        // Multiple animated pulse rings with varying speeds
        for (let i = 0; i < 5; i++) {
            const speed = 30 + i * 10;
            const radius = ((time * speed + i * 100) % 500);
            const alpha = Math.max(0, 0.4 - radius / 2000);
            const ringHue = (hueShift + i * 30) % 360;
            ctx.strokeStyle = `hsla(${ringHue}, 80%, 60%, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = `hsl(${ringHue}, 100%, 50%)`;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        // Energy waves
        for (let i = 0; i < 3; i++) {
            const waveY = ((time * 100 + i * 200) % (canvas.height + 200)) - 100;
            const waveGrad = ctx.createLinearGradient(0, waveY - 20, 0, waveY + 20);
            waveGrad.addColorStop(0, 'transparent');
            waveGrad.addColorStop(0.5, `rgba(${100 + i * 50}, ${150 + i * 30}, 255, 0.15)`);
            waveGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = waveGrad;
            ctx.fillRect(0, waveY - 20, canvas.width, 40);
        }
        
        if (!gameStarted) {
            drawStartScreen(time);
            ctx.restore();
            return;
        }
        
        // Combo timer
        if (comboTimer > 0) {
            comboTimer -= deltaTime;
            if (comboTimer <= 0) combo = 0;
        }
        
        if (!roundOver) {
            gameTime -= deltaTime;
            if (gameTime <= 0) {
                gameTime = 0;
                roundOver = true;
            }
            
            // Spawn targets faster as time runs out
            const spawnRate = gameTime < 20 ? 500 : (gameTime < 40 ? 700 : 900);
            if (currentTime - lastTargetSpawn > spawnRate && targets.length < 10) {
                spawnTarget();
                lastTargetSpawn = currentTime;
            }
            
            targets = targets.filter(t => Date.now() - t.spawnTime < t.lifetime);
            broadcastPosition();
            
            const now = Date.now();
            for (let id in players) {
                if (now - players[id].lastSeen > 3000) {
                    delete players[id];
                }
            }
        }
        
        // Update and draw targets
        for (let target of targets) {
            // Move fast targets
            if (target.vx || target.vy) {
                target.x += target.vx;
                target.y += target.vy;
                if (target.x < target.radius || target.x > canvas.width - target.radius) target.vx *= -1;
                if (target.y < target.radius || target.y > canvas.height - target.radius) target.vy *= -1;
            }
            
            target.pulse += deltaTime * 5;
            
            const age = Date.now() - target.spawnTime;
            const fadeStart = target.lifetime - 800;
            let alpha = 1;
            if (age > fadeStart) {
                alpha = 1 - (age - fadeStart) / 800;
            }
            
            // Advanced multi-layer glow effect
            const glowSize = 12 + Math.sin(target.pulse * 2) * 5;
            const pulseIntensity = (Math.sin(target.pulse * 3) + 1) / 2;
            
            // Outer glow rings (multiple layers)
            for (let layer = 3; layer >= 1; layer--) {
                const layerSize = glowSize * (layer / 3);
                const layerAlpha = alpha * (0.15 / layer);
                ctx.shadowColor = target.baseColor;
                ctx.shadowBlur = 25 * layer;
                ctx.beginPath();
                ctx.arc(target.x, target.y, target.radius + layerSize, 0, Math.PI * 2);
                ctx.fillStyle = `${target.baseColor}${Math.floor(layerAlpha * 255).toString(16).padStart(2, '0')}`;
                ctx.fill();
            }
            
            // Main target with advanced gradient
            const grad = ctx.createRadialGradient(
                target.x - target.radius * 0.4, target.y - target.radius * 0.4, 0,
                target.x, target.y, target.radius * 1.2
            );
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.2, target.baseColor);
            grad.addColorStop(0.5, target.baseColor);
            grad.addColorStop(0.8, shadeColor(target.baseColor, -40));
            grad.addColorStop(1, shadeColor(target.baseColor, -60));
            
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = 30;
            ctx.fill();
            
            // Inner highlight
            const highlightGrad = ctx.createRadialGradient(
                target.x - target.radius * 0.2, target.y - target.radius * 0.2, 0,
                target.x, target.y, target.radius * 0.5
            );
            highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            highlightGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = highlightGrad;
            ctx.fill();
            
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            
            // Animated border ring
            ctx.strokeStyle = target.baseColor;
            ctx.lineWidth = 3;
            ctx.globalAlpha = alpha * pulseIntensity;
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            
            // Icon/points
            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.font = `bold ${target.radius * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (target.type === 'bomb') {
                ctx.fillText('💣', target.x, target.y);
            } else {
                ctx.fillText(target.points > 0 ? '+' + target.points : target.points, target.x, target.y);
            }
            
            // Timer ring
            const progress = 1 - age / target.lifetime;
            ctx.strokeStyle = target.baseColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius + 5, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
            ctx.stroke();
        }
        
        // Advanced particle system with trails and effects
        particles = particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3;
            p.vx *= 0.98; // Air resistance
            p.life -= deltaTime * 2;
            p.rotation = (p.rotation || 0) + p.vx * 0.1;
            
            if (p.life > 0) {
                // Particle trail
                ctx.fillStyle = p.color + Math.floor(p.life * 0.3 * 255).toString(16).padStart(2, '0');
                ctx.fillRect(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.6, p.size * 0.6);
                
                // Main particle with glow
                ctx.shadowColor = p.color;
                ctx.shadowBlur = p.size * 2;
                ctx.globalAlpha = p.life;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                
                // Star-shaped particles for golden targets
                if (p.color.includes('ffd700') || p.color.includes('gold')) {
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                        const x = Math.cos(angle) * p.size;
                        const y = Math.sin(angle) * p.size;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fillStyle = p.color;
                    ctx.fill();
                } else {
                    // Circular particles with gradient
                    const partGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                    partGrad.addColorStop(0, '#ffffff');
                    partGrad.addColorStop(1, p.color);
                    ctx.fillStyle = partGrad;
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                ctx.restore();
                ctx.globalAlpha = 1;
                ctx.shadowBlur = 0;
                return true;
            }
            return false;
        });
        
        // Draw other players
        for (let id in players) {
            const p = players[id];
            
            // Trail
            ctx.fillStyle = p.color + '40';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 25, 0, Math.PI * 2);
            ctx.fill();
            
            // Cursor
            ctx.beginPath();
            ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(p.name, p.x, p.y - 30);
            ctx.font = '8px "Press Start 2P"';
            ctx.fillText(p.score + ' pts', p.x, p.y + 35);
            if (p.combo > 1) {
                ctx.fillStyle = '#ffff00';
                ctx.fillText('x' + p.combo, p.x, p.y + 48);
            }
        }
        
        // Draw your cursor
        const cursorPulse = 1 + Math.sin(time * 8) * 0.1;
        
        // Crosshair
        ctx.strokeStyle = playerColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 30 * cursorPulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mouseX - 40, mouseY);
        ctx.lineTo(mouseX - 20, mouseY);
        ctx.moveTo(mouseX + 20, mouseY);
        ctx.lineTo(mouseX + 40, mouseY);
        ctx.moveTo(mouseX, mouseY - 40);
        ctx.lineTo(mouseX, mouseY - 20);
        ctx.moveTo(mouseX, mouseY + 20);
        ctx.lineTo(mouseX, mouseY + 40);
        ctx.stroke();
        
        // Center dot
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 8, 0, Math.PI * 2);
        ctx.fillStyle = playerColor;
        ctx.shadowColor = playerColor;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw HUD
        drawHUD();
        
        if (roundOver) {
            drawRoundOver();
        }
        
        ctx.restore();
    }
    
    function drawHexagon(x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const px = x + size * Math.cos(angle);
            const py = y + size * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
    }
    
    function shadeColor(color, percent) {
        // Simple color shading
        return color;
    }
    
    function drawStartScreen(time) {
        // Title
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ff00ff';
        ctx.font = '36px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('CYBER ARENA', canvas.width / 2, 120);
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#00ffff';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText('TARGET SHOOTER', canvas.width / 2, 160);
        
        // Target types preview
        ctx.fillStyle = '#888';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText('TARGET TYPES:', canvas.width / 2, 220);
        
        const typePreview = [
            { color: '#ff00ff', name: 'NORMAL', pts: '+10' },
            { color: '#00ffff', name: 'FAST', pts: '+25' },
            { color: '#ffff00', name: 'BIG', pts: '+15' },
            { color: '#ffd700', name: 'GOLDEN', pts: '+100!' },
            { color: '#ff0000', name: 'BOMB', pts: 'AVOID!' }
        ];
        
        typePreview.forEach((t, i) => {
            const x = 140 + i * 100;
            ctx.fillStyle = t.color;
            ctx.shadowColor = t.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x, 260, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '7px "Press Start 2P"';
            ctx.fillText(t.name, x, 290);
            ctx.fillStyle = t.color;
            ctx.fillText(t.pts, x, 305);
        });
        
        // Combo info
        ctx.fillStyle = '#ffff00';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText('🔥 BUILD COMBOS FOR MULTIPLIERS! 🔥', canvas.width / 2, 350);
        
        // Start button
        const pulse = 1 + Math.sin(time * 4) * 0.05;
        ctx.save();
        ctx.translate(canvas.width / 2, 420);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 20;
        ctx.fillRect(-100, -25, 200, 50);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText('CLICK TO START', 0, 8);
        ctx.restore();
        
        ctx.fillStyle = '#666';
        ctx.font = '9px "Press Start 2P"';
        ctx.fillText('Open multiple tabs for multiplayer!', canvas.width / 2, 490);
    }
    
    function drawHUD() {
        // Timer (center top)
        const timerColor = gameTime < 10 ? '#ff0000' : (gameTime < 20 ? '#ffff00' : '#00ff00');
        ctx.fillStyle = '#000';
        ctx.fillRect(canvas.width / 2 - 60, 10, 120, 40);
        ctx.strokeStyle = timerColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - 60, 10, 120, 40);
        
        ctx.fillStyle = timerColor;
        ctx.font = '24px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(gameTime), canvas.width / 2, 42);
        
        // Combo (top right)
        if (combo > 0) {
            const comboScale = 1 + Math.min(combo, 10) * 0.05;
            ctx.save();
            ctx.translate(canvas.width - 80, 50);
            ctx.scale(comboScale, comboScale);
            
            ctx.fillStyle = combo >= 5 ? '#ff00ff' : (combo >= 3 ? '#ffff00' : '#fff');
            ctx.font = '20px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('x' + combo, 0, 0);
            
            if (combo >= 3) {
                ctx.fillStyle = '#ff6600';
                ctx.font = '10px "Press Start 2P"';
                ctx.fillText(combo >= 5 ? 'MEGA!' : 'COMBO!', 0, 20);
            }
            ctx.restore();
            
            // Combo timer bar
            ctx.fillStyle = '#333';
            ctx.fillRect(canvas.width - 130, 70, 100, 8);
            ctx.fillStyle = combo >= 5 ? '#ff00ff' : '#ffff00';
            ctx.fillRect(canvas.width - 130, 70, (comboTimer / 1.5) * 100, 8);
        }
        
        // Score (top left)
        ctx.fillStyle = '#000';
        ctx.fillRect(10, 10, 150, 50);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 150, 50);
        
        ctx.fillStyle = '#00ffff';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText('SCORE', 20, 30);
        ctx.fillStyle = '#fff';
        ctx.font = '18px "Press Start 2P"';
        ctx.fillText(score.toString(), 20, 52);
        
        // Player list (bottom left)
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(10, canvas.height - 120, 150, 110);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#666';
        ctx.strokeRect(10, canvas.height - 120, 150, 110);
        
        ctx.fillStyle = '#fff';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText('PLAYERS', 20, canvas.height - 100);
        
        let leaderboard = [{ name: 'YOU', score: score, color: playerColor }];
        for (let id in players) {
            leaderboard.push(players[id]);
        }
        leaderboard.sort((a, b) => b.score - a.score);
        
        leaderboard.slice(0, 4).forEach((p, i) => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(25, canvas.height - 80 + i * 22, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '7px "Press Start 2P"';
            ctx.fillText(`${p.name}: ${p.score}`, 35, canvas.height - 77 + i * 22);
        });
    }
    
    function drawRoundOver() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Trophy/rank
        let leaderboard = [{ name: 'YOU', score: score, color: playerColor }];
        for (let id in players) {
            leaderboard.push(players[id]);
        }
        leaderboard.sort((a, b) => b.score - a.score);
        const rank = leaderboard.findIndex(p => p.name === 'YOU') + 1;
        
        ctx.fillStyle = '#ffd700';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(rank === 1 ? '🏆' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : '🎮')), canvas.width / 2, 100);
        
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff00ff';
        ctx.font = '28px "Press Start 2P"';
        ctx.fillText('ROUND OVER', canvas.width / 2, 160);
        ctx.shadowBlur = 0;
        
        // Your score
        ctx.fillStyle = '#fff';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText('YOUR SCORE', canvas.width / 2, 210);
        ctx.fillStyle = '#00ffff';
        ctx.font = '32px "Press Start 2P"';
        ctx.fillText(score.toString(), canvas.width / 2, 260);
        
        // Leaderboard
        ctx.fillStyle = '#ffff00';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('LEADERBOARD', canvas.width / 2, 320);
        
        leaderboard.slice(0, 5).forEach((p, i) => {
            const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : '  '));
            ctx.fillStyle = p.name === 'YOU' ? '#00ffff' : '#fff';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText(`${medal} ${p.name}: ${p.score}`, canvas.width / 2, 355 + i * 25);
        });
        
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('CLICK TO PLAY AGAIN', canvas.width / 2, 490);
    }
    
    gameLoop = requestAnimationFrame(update);
}

// === NEON KART - FULL MARIO KART CLONE ===
function initRace() {
    currentGameTitle.textContent = 'NEON KART';
    gameControls.innerHTML = '↑ Accelerate | ↓ Brake | ← → Steer | SPACE Item | SHIFT Drift';
    
    canvas.width = 800;
    canvas.height = 550;
    
    // Game state
    let gameState = 'menu'; // menu, character_select, kart_select, mode_select, waiting, countdown, racing, finished
    let peer = null;
    let connections = [];
    let roomCode = '';
    let isHost = false;
    let players = {};
    let myId = '';
    let countdown = 3;
    let raceTime = 0;
    let totalLaps = 3;
    let finishOrder = [];
    let gameMode = 'solo'; // solo, private, public
    
    // === CHARACTERS ===
    const characters = [
        { id: 'blaze', name: 'BLAZE', color: '#ff4444', speed: 4, accel: 3, handling: 3, desc: 'Speed demon' },
        { id: 'frost', name: 'FROST', color: '#44aaff', speed: 3, accel: 3, handling: 4, desc: 'Ice cool handling' },
        { id: 'volt', name: 'VOLT', color: '#ffff44', speed: 3, accel: 5, handling: 2, desc: 'Quick starter' },
        { id: 'shadow', name: 'SHADOW', color: '#aa44ff', speed: 5, accel: 2, handling: 3, desc: 'Top speed master' },
        { id: 'terra', name: 'TERRA', color: '#44ff44', speed: 2, accel: 4, handling: 4, desc: 'Balanced racer' },
        { id: 'nova', name: 'NOVA', color: '#ff44aa', speed: 4, accel: 4, handling: 2, desc: 'Power player' },
        { id: 'cyber', name: 'CYBER', color: '#44ffff', speed: 3, accel: 3, handling: 4, desc: 'Tech specialist' },
        { id: 'inferno', name: 'INFERNO', color: '#ff8800', speed: 5, accel: 3, handling: 2, desc: 'Burning speed' }
    ];
    let selectedCharacter = 0;
    
    // === KARTS ===
    const karts = [
        { id: 'speedster', name: 'SPEEDSTER', speedMod: 1.2, accelMod: 0.9, handlingMod: 0.9, style: 'sleek' },
        { id: 'tank', name: 'TANK', speedMod: 0.9, accelMod: 0.8, handlingMod: 1.3, style: 'heavy' },
        { id: 'balanced', name: 'STANDARD', speedMod: 1.0, accelMod: 1.0, handlingMod: 1.0, style: 'normal' },
        { id: 'rocket', name: 'ROCKET', speedMod: 1.3, accelMod: 1.1, handlingMod: 0.7, style: 'rocket' },
        { id: 'buggy', name: 'BUGGY', speedMod: 0.95, accelMod: 1.2, handlingMod: 1.1, style: 'offroad' },
        { id: 'phantom', name: 'PHANTOM', speedMod: 1.1, accelMod: 1.0, handlingMod: 1.0, style: 'ghost' }
    ];
    let selectedKart = 0;
    
    // === ITEMS/POWER-UPS ===
    const itemTypes = [
        { id: 'boost', name: 'BOOST', icon: '🚀', effect: 'speed' },
        { id: 'shield', name: 'SHIELD', icon: '🛡️', effect: 'protect' },
        { id: 'missile', name: 'MISSILE', icon: '🎯', effect: 'attack' },
        { id: 'banana', name: 'BANANA', icon: '🍌', effect: 'trap' },
        { id: 'lightning', name: 'LIGHTNING', icon: '⚡', effect: 'slow_all' },
        { id: 'star', name: 'STAR', icon: '⭐', effect: 'invincible' }
    ];
    let currentItem = null;
    let itemBoxes = [];
    let activeItems = []; // Items on track (bananas, etc)
    
    // === TRACKS ===
    const tracks = [
        { id: 'neon_circuit', name: 'NEON CIRCUIT', laps: 3, difficulty: 'Easy' },
        { id: 'cyber_highway', name: 'CYBER HIGHWAY', laps: 3, difficulty: 'Medium' },
        { id: 'rainbow_road', name: 'RAINBOW ROAD', laps: 2, difficulty: 'Hard' }
    ];
    let selectedTrack = 0;
    
    // === PSEUDO 3D RACING ENGINE ===
    const road = {
        length: 6000,      // Total track length
        width: 2000,       // Road width
        lanes: 3,          // Number of lanes
        segmentLength: 200 // Length of each road segment
    };
    
    // Generate track with curves and hills
    const segments = [];
    const colors = {
        road: { light: '#6B6B6B', dark: '#696969' },
        rumble: { light: '#FF0000', dark: '#FFFFFF' },
        grass: { light: '#10AA10', dark: '#009A00' },
        lane: '#FFFFFF'
    };
    
    // Track definition - curves and hills
    function generateTrack() {
        segments.length = 0;
        const numSegments = road.length / road.segmentLength;
        
        for (let i = 0; i < numSegments; i++) {
            segments.push({
                index: i,
                p1: { world: { z: i * road.segmentLength }, camera: {}, screen: {} },
                p2: { world: { z: (i + 1) * road.segmentLength }, camera: {}, screen: {} },
                curve: 0,
                hill: 0,
                color: Math.floor(i / 3) % 2 ? colors.road.dark : colors.road.light,
                rumbleColor: Math.floor(i / 3) % 2 ? colors.rumble.dark : colors.rumble.light,
                grassColor: Math.floor(i / 5) % 2 ? colors.grass.dark : colors.grass.light,
                sprite: null,
                checkpoint: false
            });
        }
        
        // Add curves (like Mario Kart tracks)
        addCurve(0, 20, 0);           // Straight start
        addCurve(20, 60, 2);          // Right curve
        addCurve(60, 100, 0);         // Straight
        addCurve(100, 150, -3);       // Left curve
        addCurve(150, 180, 0);        // Straight  
        addCurve(180, 230, 2.5);      // Right curve
        addCurve(230, 260, -2);       // S-curve
        addCurve(260, 300, 0);        // Straight finish
        
        // Add hills
        addHill(30, 50, 30);          // Small hill
        addHill(80, 100, -20);        // Dip
        addHill(140, 160, 50);        // Big hill
        addHill(200, 220, -30);       // Valley
        addHill(250, 270, 20);        // Gentle rise
        
        // Add sprites (trees, signs, etc.)
        for (let i = 0; i < numSegments; i += 5) {
            if (Math.random() > 0.3) {
                const side = Math.random() > 0.5 ? 1 : -1;
                const spriteType = Math.random() > 0.7 ? 'palm' : (Math.random() > 0.5 ? 'tree' : 'bush');
                segments[i].sprite = { type: spriteType, offset: side * (1.2 + Math.random() * 0.5) };
            }
        }
        
        // Add checkpoints/finish line
        segments[0].checkpoint = 'finish';
        segments[Math.floor(numSegments / 4)].checkpoint = 'cp1';
        segments[Math.floor(numSegments / 2)].checkpoint = 'cp2';
        segments[Math.floor(numSegments * 3 / 4)].checkpoint = 'cp3';
    }
    
    function addCurve(start, end, curve) {
        for (let i = start; i < end && i < segments.length; i++) {
            segments[i].curve = curve;
        }
    }
    
    function addHill(start, end, height) {
        const length = end - start;
        for (let i = start; i < end && i < segments.length; i++) {
            const progress = (i - start) / length;
            segments[i].hill = Math.sin(progress * Math.PI) * height;
        }
    }
    
    // Player car - will be initialized based on character/kart selection
    let player = null;
    
    function initPlayer() {
        const char = characters[selectedCharacter];
        const kart = karts[selectedKart];
        
        player = {
            x: 0,
            z: 0,
            speed: 0,
            maxSpeed: 250 + (char.speed * 15 * kart.speedMod),
            accel: 100 + (char.accel * 20 * kart.accelMod),
            braking: 200,
            decel: 80,
            handling: 2 + (char.handling * 0.3 * kart.handlingMod),
            turning: 0,
            lap: 0,
            checkpoint: 0,
            finished: false,
            finishTime: 0,
            drifting: false,
            driftPower: 0,
            boostTimer: 0,
            shieldTimer: 0,
            starTimer: 0,
            character: char,
            kart: kart,
            position: 1
        };
    }
    
    // Camera
    const camera = {
        height: 1500,      // Camera height above road
        depth: 0.8,        // Camera depth (FOV)
        playerZ: 300       // Player distance from camera
    };
    
    const keys = {};
    
    handleKeyDown = (e) => {
        keys[e.key] = true;
        keys[e.code] = true;
        
        // ESC to go back
        if (e.key === 'Escape') {
            if (gameState === 'character_select') gameState = 'menu';
            else if (gameState === 'kart_select') gameState = 'character_select';
            else if (gameState === 'mode_select') gameState = 'kart_select';
            else if (gameState === 'joining') gameState = 'mode_select';
        }
        
        // Use item with SPACE
        if (e.key === ' ' && gameState === 'racing' && currentItem && player) {
            useItem();
        }
        
        // Character select with arrow keys
        if (gameState === 'character_select') {
            if (e.key === 'ArrowLeft') selectedCharacter = (selectedCharacter - 1 + characters.length) % characters.length;
            if (e.key === 'ArrowRight') selectedCharacter = (selectedCharacter + 1) % characters.length;
            if (e.key === 'ArrowUp') selectedCharacter = (selectedCharacter - 4 + characters.length) % characters.length;
            if (e.key === 'ArrowDown') selectedCharacter = (selectedCharacter + 4) % characters.length;
            if (e.key === 'Enter') gameState = 'kart_select';
        }
        
        // Kart select with arrow keys
        if (gameState === 'kart_select') {
            if (e.key === 'ArrowLeft') selectedKart = (selectedKart - 1 + karts.length) % karts.length;
            if (e.key === 'ArrowRight') selectedKart = (selectedKart + 1) % karts.length;
            if (e.key === 'ArrowUp') selectedKart = (selectedKart - 3 + karts.length) % karts.length;
            if (e.key === 'ArrowDown') selectedKart = (selectedKart + 3) % karts.length;
            if (e.key === 'Enter') gameState = 'mode_select';
        }
        
        // Enter room code
        if (gameState === 'joining' && e.key.length === 1 && roomCode.length < 6) {
            roomCode += e.key.toUpperCase();
        }
        if (gameState === 'joining' && e.key === 'Backspace') {
            roomCode = roomCode.slice(0, -1);
        }
        if (gameState === 'joining' && e.key === 'Enter' && roomCode.length >= 4) {
            joinRoom(roomCode);
        }
    };
    handleKeyUp = (e) => { 
        keys[e.key] = false; 
        keys[e.code] = false;
        
        // Release drift for mini-boost
        if ((e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && player && player.drifting) {
            player.drifting = false;
            if (player.driftPower > 30) {
                player.boostTimer = player.driftPower / 50;
                playSound(1200, 0.15);
            }
            player.driftPower = 0;
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    function useItem() {
        if (!currentItem) return;
        
        switch (currentItem.effect) {
            case 'speed':
                player.boostTimer = 2;
                playSound(1000, 0.2);
                break;
            case 'protect':
                player.shieldTimer = 5;
                playSound(600, 0.15);
                break;
            case 'invincible':
                player.starTimer = 8;
                playSound(1200, 0.2);
                break;
            case 'trap':
                activeItems.push({ type: 'banana', z: player.z - 100, x: player.x });
                break;
            case 'attack':
                // Missile - would hit other players
                playSound(400, 0.2);
                break;
            case 'slow_all':
                // Lightning - would slow other players
                playSound(200, 0.3);
                break;
        }
        currentItem = null;
    }
    
    // Generate room code
    function generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }
    
    // Create room as host
    function createRoom() {
        roomCode = generateRoomCode();
        isHost = true;
        gameState = 'waiting';
        
        try {
            peer = new Peer(roomCode);
            
            peer.on('open', (id) => {
                myId = id;
                console.log('Room created:', id);
            });
            
            peer.on('connection', (conn) => {
                connections.push(conn);
                setupConnection(conn);
            });
            
            peer.on('error', (err) => {
                console.error('Peer error:', err);
                gameState = 'menu';
            });
        } catch (e) {
            console.error('PeerJS error:', e);
            gameState = 'menu';
        }
    }
    
    // Join existing room
    function joinRoom(code) {
        isHost = false;
        gameState = 'connecting';
        
        try {
            peer = new Peer();
            
            peer.on('open', (id) => {
                myId = id;
                const conn = peer.connect(code);
                connections.push(conn);
                setupConnection(conn);
            });
            
            peer.on('error', (err) => {
                console.error('Peer error:', err);
                gameState = 'menu';
                roomCode = '';
            });
        } catch (e) {
            console.error('PeerJS error:', e);
            gameState = 'menu';
        }
    }
    
    // Setup connection handlers
    function setupConnection(conn) {
        conn.on('open', () => {
            gameState = 'waiting';
            conn.send({ type: 'player_join', player: { x: player.x, z: player.z, color: player.carColor }, id: myId });
        });
        
        conn.on('data', (data) => {
            if (data.type === 'player_join') {
                players[data.id] = data.player;
            }
            if (data.type === 'player_update') {
                players[data.id] = data.player;
            }
            if (data.type === 'start_countdown') {
                gameState = 'countdown';
                countdown = 3;
            }
            if (data.type === 'race_start') {
                gameState = 'racing';
                raceTime = 0;
            }
            if (data.type === 'player_finish') {
                if (!finishOrder.includes(data.id)) {
                    finishOrder.push(data.id);
                }
            }
        });
        
        conn.on('close', () => {
            connections = connections.filter(c => c !== conn);
        });
    }
    
    // Broadcast to all connections
    function broadcast(data) {
        connections.forEach(conn => {
            if (conn.open) {
                conn.send(data);
            }
        });
    }
    
    // Start race (host only)
    function startRace() {
        if (!isHost) return;
        broadcast({ type: 'start_countdown' });
        gameState = 'countdown';
        countdown = 3;
    }
    
    // Click handler
    canvas.onclick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        if (gameState === 'menu') {
            // Start button
            if (x > 300 && x < 500 && y > 350 && y < 410) {
                gameState = 'character_select';
            }
        }
        
        if (gameState === 'character_select') {
            // Character grid (4x2)
            const gridX = 100, gridY = 180, cellW = 150, cellH = 120;
            for (let i = 0; i < characters.length; i++) {
                const col = i % 4;
                const row = Math.floor(i / 4);
                const cx = gridX + col * cellW;
                const cy = gridY + row * cellH;
                if (x > cx && x < cx + cellW - 10 && y > cy && y < cy + cellH - 10) {
                    selectedCharacter = i;
                }
            }
            // Confirm button
            if (x > 300 && x < 500 && y > 450 && y < 510) {
                gameState = 'kart_select';
            }
        }
        
        if (gameState === 'kart_select') {
            // Kart grid (3x2)
            const gridX = 100, gridY = 180, cellW = 200, cellH = 100;
            for (let i = 0; i < karts.length; i++) {
                const col = i % 3;
                const row = Math.floor(i / 3);
                const cx = gridX + col * cellW;
                const cy = gridY + row * cellH;
                if (x > cx && x < cx + cellW - 10 && y > cy && y < cy + cellH - 10) {
                    selectedKart = i;
                }
            }
            // Confirm button
            if (x > 300 && x < 500 && y > 450 && y < 510) {
                gameState = 'mode_select';
            }
        }
        
        if (gameState === 'mode_select') {
            // Time Trial
            if (x > 100 && x < 300 && y > 200 && y < 280) {
                gameMode = 'solo';
                initPlayer();
                generateTrack();
                gameState = 'countdown';
                countdown = 3;
            }
            // Private Room
            if (x > 300 && x < 500 && y > 200 && y < 280) {
                gameMode = 'private';
                initPlayer();
                generateTrack();
                createRoom();
            }
            // Join Room
            if (x > 500 && x < 700 && y > 200 && y < 280) {
                gameMode = 'private';
                initPlayer();
                generateTrack();
                gameState = 'joining';
                roomCode = '';
            }
            // Quick Match (random online)
            if (x > 250 && x < 550 && y > 320 && y < 400) {
                gameMode = 'public';
                initPlayer();
                generateTrack();
                // For public matches, generate random room
                roomCode = 'PUBLIC' + Math.floor(Math.random() * 100);
                createRoom();
            }
        }
        
        if (gameState === 'waiting' && isHost && Object.keys(players).length > 0) {
            if (x > 300 && x < 500 && y > 420 && y < 480) {
                startRace();
            }
        }
        
        if (gameState === 'finished') {
            finishOrder = [];
            currentItem = null;
            activeItems = [];
            gameState = 'menu';
        }
    };
    
    // Cleanup
    cleanupFunctions.push(() => {
        if (peer) {
            peer.destroy();
        }
    });
    
    generateTrack();
    
    let lastTime = performance.now();
    let countdownTimer = 0;
    
    // Project 3D point to 2D screen
    function project(p, cameraX, cameraY, cameraZ) {
        const scale = camera.depth / (p.world.z - cameraZ);
        p.screen.x = Math.round(canvas.width / 2 + scale * (p.world.x - cameraX) * canvas.width / 2);
        p.screen.y = Math.round(canvas.height / 2 - scale * (p.world.y - cameraY) * canvas.height / 2);
        p.screen.w = Math.round(scale * road.width * canvas.width / 2);
        p.screen.scale = scale;
    }
    
    // Helper function to lighten color
    function lightenColor(color, percent) {
        // Simple implementation - if color is hex, convert and lighten
        if (typeof color === 'string' && color.startsWith('#')) {
            const num = parseInt(color.replace('#', ''), 16);
            const r = Math.min(255, ((num >> 16) & 0xFF) + percent);
            const g = Math.min(255, ((num >> 8) & 0xFF) + percent);
            const b = Math.min(255, (num & 0xFF) + percent);
            return `rgb(${r}, ${g}, ${b})`;
        }
        return color;
    }
    
    // Draw polygon
    function drawPoly(x1, y1, x2, y2, x3, y3, x4, y4, color) {
        if (typeof color === 'string' && color.includes('gradient')) {
            ctx.fillStyle = color;
        } else {
            ctx.fillStyle = color;
        }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.closePath();
        ctx.fill();
    }
    
    // Draw sprite (tree, etc.)
    function drawSprite(segment, spriteX, scale) {
        if (!segment.sprite) return;
        
        const sprite = segment.sprite;
        const destW = 80 * scale;
        const destH = sprite.type === 'palm' ? 150 * scale : (sprite.type === 'tree' ? 120 * scale : 60 * scale);
        const destX = spriteX - destW / 2;
        const destY = segment.p1.screen.y - destH;
        
        if (destY > canvas.height || destY + destH < 0) return;
        
        ctx.save();
        
        // Draw tree/palm/bush
        if (sprite.type === 'palm') {
            // Palm trunk
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(destX + destW * 0.4, destY + destH * 0.3, destW * 0.2, destH * 0.7);
            // Palm leaves
            ctx.fillStyle = '#228B22';
            ctx.beginPath();
            ctx.arc(destX + destW / 2, destY + destH * 0.3, destW * 0.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (sprite.type === 'tree') {
            // Tree trunk
            ctx.fillStyle = '#654321';
            ctx.fillRect(destX + destW * 0.35, destY + destH * 0.5, destW * 0.3, destH * 0.5);
            // Tree foliage
            ctx.fillStyle = '#006400';
            ctx.beginPath();
            ctx.moveTo(destX + destW / 2, destY);
            ctx.lineTo(destX, destY + destH * 0.6);
            ctx.lineTo(destX + destW, destY + destH * 0.6);
            ctx.closePath();
            ctx.fill();
        } else {
            // Bush
            ctx.fillStyle = '#32CD32';
            ctx.beginPath();
            ctx.arc(destX + destW / 2, destY + destH / 2, destW / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    // Draw player's kart (Mario Kart style from behind)
    function drawPlayerKart() {
        if (!player) return;
        
        const kartWidth = 110;
        const kartHeight = 70;
        const kartX = canvas.width / 2 - kartWidth / 2 + player.turning * 60;
        const kartY = canvas.height - 160;
        const color = player.character.color;
        const kartStyle = player.kart.style;
        
        // Tilt based on turning
        ctx.save();
        ctx.translate(kartX + kartWidth / 2, kartY + kartHeight / 2);
        ctx.rotate(player.turning * 0.18);
        ctx.translate(-kartWidth / 2, -kartHeight / 2);
        
        // Star power glow
        if (player.starTimer > 0) {
            const hue = (Date.now() * 0.5) % 360;
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            ctx.shadowBlur = 40;
        }
        
        // Shield effect
        if (player.shieldTimer > 0) {
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.ellipse(kartWidth / 2, kartHeight / 2, kartWidth * 0.7, kartHeight * 0.8, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(kartWidth / 2, kartHeight + 15, kartWidth * 0.6, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Wheels
        ctx.fillStyle = '#1a1a1a';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        // Back wheels (larger for kart look)
        ctx.fillRect(-12, kartHeight - 30, 28, 35);
        ctx.strokeRect(-12, kartHeight - 30, 28, 35);
        ctx.fillRect(kartWidth - 16, kartHeight - 30, 28, 35);
        ctx.strokeRect(kartWidth - 16, kartHeight - 30, 28, 35);
        // Front wheels (angled with steering)
        ctx.save();
        ctx.translate(12, 18);
        ctx.rotate(player.turning * 0.35);
        ctx.fillRect(-10, -12, 20, 24);
        ctx.restore();
        ctx.save();
        ctx.translate(kartWidth - 12, 18);
        ctx.rotate(player.turning * 0.35);
        ctx.fillRect(-10, -12, 20, 24);
        ctx.restore();
        
        // Kart body based on style
        const gradient = ctx.createLinearGradient(0, 0, kartWidth, kartHeight);
        gradient.addColorStop(0, shadeColor(color, 20));
        gradient.addColorStop(0.5, color);
        gradient.addColorStop(1, shadeColor(color, -30));
        ctx.fillStyle = gradient;
        
        if (kartStyle === 'sleek' || kartStyle === 'ghost') {
            // Sleek aerodynamic body
            ctx.beginPath();
            ctx.moveTo(15, kartHeight - 5);
            ctx.lineTo(5, kartHeight - 25);
            ctx.quadraticCurveTo(10, 10, kartWidth / 2, 5);
            ctx.quadraticCurveTo(kartWidth - 10, 10, kartWidth - 5, kartHeight - 25);
            ctx.lineTo(kartWidth - 15, kartHeight - 5);
            ctx.closePath();
            ctx.fill();
        } else if (kartStyle === 'heavy') {
            // Tank-like box body
            ctx.fillRect(5, 15, kartWidth - 10, kartHeight - 20);
            ctx.fillStyle = shadeColor(color, -20);
            ctx.fillRect(10, 20, kartWidth - 20, 15);
        } else if (kartStyle === 'rocket') {
            // Rocket with fins
            ctx.beginPath();
            ctx.moveTo(kartWidth / 2, 0);
            ctx.lineTo(kartWidth - 10, 20);
            ctx.lineTo(kartWidth - 5, kartHeight - 10);
            ctx.lineTo(5, kartHeight - 10);
            ctx.lineTo(10, 20);
            ctx.closePath();
            ctx.fill();
            // Fins
            ctx.fillStyle = shadeColor(color, -30);
            ctx.beginPath();
            ctx.moveTo(0, kartHeight);
            ctx.lineTo(15, kartHeight - 20);
            ctx.lineTo(15, kartHeight);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(kartWidth, kartHeight);
            ctx.lineTo(kartWidth - 15, kartHeight - 20);
            ctx.lineTo(kartWidth - 15, kartHeight);
            ctx.fill();
        } else {
            // Standard kart
            ctx.beginPath();
            ctx.moveTo(12, kartHeight - 5);
            ctx.lineTo(5, kartHeight - 25);
            ctx.lineTo(15, 15);
            ctx.lineTo(kartWidth - 15, 15);
            ctx.lineTo(kartWidth - 5, kartHeight - 25);
            ctx.lineTo(kartWidth - 12, kartHeight - 5);
            ctx.closePath();
            ctx.fill();
        }
        
        // Cockpit
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.ellipse(kartWidth / 2, 32, 28, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Driver (character)
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(kartWidth / 2, 25, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Visor
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.ellipse(kartWidth / 2, 30, 14, 8, 0, 0, Math.PI);
        ctx.fill();
        
        // Exhaust flames when boosting
        if (player.boostTimer > 0 || player.drifting) {
            const flameIntensity = player.boostTimer > 0 ? 1.5 : (player.driftPower / 100);
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.moveTo(kartWidth / 2 - 20, kartHeight);
            ctx.lineTo(kartWidth / 2, kartHeight + 25 * flameIntensity + Math.random() * 20);
            ctx.lineTo(kartWidth / 2 + 20, kartHeight);
            ctx.fill();
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.moveTo(kartWidth / 2 - 10, kartHeight);
            ctx.lineTo(kartWidth / 2, kartHeight + 18 * flameIntensity + Math.random() * 12);
            ctx.lineTo(kartWidth / 2 + 10, kartHeight);
            ctx.fill();
            
            // Drift sparks
            if (player.drifting) {
                ctx.fillStyle = '#ffff00';
                for (let i = 0; i < 5; i++) {
                    const sparkX = (player.turning > 0 ? -20 : kartWidth + 10) + Math.random() * 10;
                    const sparkY = kartHeight - 10 + Math.random() * 20;
                    ctx.fillRect(sparkX, sparkY, 4, 4);
                }
            }
        }
        
        // Speed lines when going fast
        if (player.speed > player.maxSpeed * 0.75) {
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const lineX = 10 + Math.random() * (kartWidth - 20);
                ctx.beginPath();
                ctx.moveTo(lineX, kartHeight);
                ctx.lineTo(lineX + player.turning * -25, kartHeight + 40 + Math.random() * 25);
                ctx.stroke();
            }
        }
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
    
    // Helper to shade colors
    function shadeColor(color, percent) {
        // Simple HSL lightness adjustment
        if (color.startsWith('hsl')) {
            const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (match) {
                const h = parseInt(match[1]);
                const s = parseInt(match[2]);
                const l = Math.min(100, Math.max(0, parseInt(match[3]) + percent));
                return `hsl(${h}, ${s}%, ${l}%)`;
            }
        }
        return color;
    }
    
    function update() {
        gameLoop = requestAnimationFrame(update);
        
        const currentTime = performance.now();
        const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
        lastTime = currentTime;
        
        // Handle menu states
        if (gameState === 'menu') {
            drawMenu();
            return;
        }
        
        if (gameState === 'character_select') {
            drawCharacterSelect();
            return;
        }
        
        if (gameState === 'kart_select') {
            drawKartSelect();
            return;
        }
        
        if (gameState === 'mode_select') {
            drawModeSelect();
            return;
        }
        
        if (gameState === 'joining') {
            drawJoinScreen();
            return;
        }
        
        if (gameState === 'connecting') {
            ctx.fillStyle = '#1a0a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffff00';
            ctx.font = '20px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('CONNECTING...', canvas.width/2, canvas.height/2);
            return;
        }
        
        if (gameState === 'waiting') {
            drawRace(dt);
            drawWaitingScreen();
            return;
        }
        
        if (gameState === 'countdown') {
            countdownTimer += dt;
            if (countdownTimer >= 1) {
                countdownTimer = 0;
                countdown--;
                playSound(600, 0.1);
                if (countdown <= 0) {
                    gameState = 'racing';
                    broadcast({ type: 'race_start' });
                    playSound(1000, 0.2);
                }
            }
            drawRace(dt);
            drawCountdown();
            return;
        }
        
        if (gameState === 'racing') {
            raceTime += dt;
            updatePlayer(dt);
            updateItems(dt);
            if (player) {
                broadcast({ type: 'player_update', player: { x: player.x, z: player.z, color: player.character.color, lap: player.lap }, id: myId });
            }
        }
        
        drawRace(dt);
        drawHUD();
        
        if (gameState === 'finished') {
            drawFinishScreen();
        }
    }
    
    function updateItems(dt) {
        // Update item boxes
        if (itemBoxes.length < 5 && Math.random() < 0.01) {
            itemBoxes.push({
                z: player.z + 2000 + Math.random() * 3000,
                x: (Math.random() - 0.5) * 1.5,
                collected: false
            });
        }
        
        // Check item collection
        itemBoxes = itemBoxes.filter(box => {
            if (box.collected) return false;
            if (box.z < player.z - 100) return false;
            
            const dz = Math.abs(box.z - player.z);
            const dx = Math.abs(box.x - player.x);
            
            if (dz < 50 && dx < 0.3 && !currentItem) {
                currentItem = itemTypes[Math.floor(Math.random() * itemTypes.length)];
                playSound(800, 0.1);
                return false;
            }
            return true;
        });
        
        // Update boost/shield/star timers
        if (player.boostTimer > 0) {
            player.boostTimer -= dt;
            player.speed = Math.min(player.speed + 500 * dt, player.maxSpeed * 1.5);
        }
        if (player.shieldTimer > 0) player.shieldTimer -= dt;
        if (player.starTimer > 0) player.starTimer -= dt;
    }
    
    function updatePlayer(dt) {
        if (!player || player.finished) return;
        
        const baseMaxSpeed = player.maxSpeed;
        let currentMaxSpeed = baseMaxSpeed;
        
        // Boost from item or drift
        if (player.boostTimer > 0) {
            currentMaxSpeed = baseMaxSpeed * 1.4;
        }
        if (player.starTimer > 0) {
            currentMaxSpeed = baseMaxSpeed * 1.3;
        }
        
        // Drifting
        const isDrifting = keys['Shift'] || keys['ShiftLeft'] || keys['ShiftRight'];
        if (isDrifting && player.speed > 100 && (keys['ArrowLeft'] || keys['ArrowRight'] || keys['a'] || keys['d'])) {
            player.drifting = true;
            player.driftPower = Math.min(100, player.driftPower + dt * 40);
        }
        
        // Acceleration
        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            player.speed += player.accel * dt;
        } else if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            player.speed -= player.braking * dt;
        } else {
            player.speed -= player.decel * dt;
        }
        player.speed = Math.max(0, Math.min(currentMaxSpeed, player.speed));
        
        // Steering (affected by handling stat)
        const turnSpeed = player.handling * (player.speed / baseMaxSpeed);
        const driftMultiplier = player.drifting ? 1.5 : 1;
        
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
            player.turning = Math.max(-1, player.turning - turnSpeed * dt * driftMultiplier);
            player.x -= turnSpeed * dt * 0.6 * driftMultiplier;
        } else if (keys['ArrowRight'] || keys['d'] || keys['D']) {
            player.turning = Math.min(1, player.turning + turnSpeed * dt * driftMultiplier);
            player.x += turnSpeed * dt * 0.6 * driftMultiplier;
        } else {
            player.turning *= 0.85;
        }
        
        // Move forward
        player.z += player.speed * dt * 12;
        
        // Apply curve centrifugal force
        const segmentIndex = Math.floor(player.z / road.segmentLength) % segments.length;
        const segment = segments[segmentIndex];
        if (segment) {
            const curveForce = segment.curve * player.speed * dt * 0.0004;
            player.x += player.drifting ? curveForce * 0.5 : curveForce;
        }
        
        // Keep player on road
        if (player.x < -1.3) { player.x = -1.3; player.speed *= 0.9; }
        if (player.x > 1.3) { player.x = 1.3; player.speed *= 0.9; }
        
        // Off-road slowdown (unless star power)
        if (Math.abs(player.x) > 0.95 && player.starTimer <= 0) {
            player.speed *= 0.97;
        }
        
        // Check banana collision
        activeItems = activeItems.filter(item => {
            if (item.type === 'banana') {
                const dz = Math.abs(item.z - player.z);
                const dx = Math.abs(item.x - player.x);
                if (dz < 30 && dx < 0.2 && player.shieldTimer <= 0 && player.starTimer <= 0) {
                    player.speed *= 0.3;
                    playSound(200, 0.3);
                    return false;
                }
            }
            return true;
        });
        
        // Wrap around track (lap completion)
        if (player.z >= road.length) {
            player.z -= road.length;
            player.lap++;
            playSound(800, 0.2);
            
            if (player.lap >= totalLaps) {
                player.finished = true;
                player.finishTime = raceTime;
                finishOrder.push(myId);
                broadcast({ type: 'player_finish', id: myId, time: raceTime });
                gameState = 'finished';
            }
        }
    }
    
    function drawRace(dt) {
        if (!player) {
            // Draw empty track preview if no player
            ctx.fillStyle = '#1a0a3e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }
        
        // Advanced sky gradient with animated colors
        const time = Date.now() * 0.001;
        const hueShift = (time * 10) % 360;
        const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
        skyGradient.addColorStop(0, `hsl(${(hueShift + 240) % 360}, 80%, 15%)`);
        skyGradient.addColorStop(0.2, `hsl(${(hueShift + 260) % 360}, 70%, 20%)`);
        skyGradient.addColorStop(0.5, `hsl(${(hueShift + 280) % 360}, 60%, 25%)`);
        skyGradient.addColorStop(0.8, `hsl(${(hueShift + 20) % 360}, 80%, 40%)`);
        skyGradient.addColorStop(1, `hsl(${(hueShift + 30) % 360}, 100%, 50%)`);
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
        
        // Enhanced starfield with varying sizes and brightness
        for (let i = 0; i < 150; i++) {
            const sx = (i * 137.508 + player.z * 0.01) % canvas.width;
            const sy = (i * 73.197) % (canvas.height / 3);
            const brightness = (Math.sin(time * 2 + i * 0.1) + 1) / 2;
            const size = 1 + Math.floor((i % 4));
            const starColor = `rgba(255, 255, 255, ${brightness * (0.6 + size * 0.2)})`;
            ctx.fillStyle = starColor;
            ctx.shadowColor = starColor;
            ctx.shadowBlur = size * 3;
            ctx.fillRect(sx - size/2, sy - size/2, size, size);
        }
        ctx.shadowBlur = 0;
        
        // Shooting stars
        for (let i = 0; i < 3; i++) {
            const trailX = ((time * 100 + i * 200 + player.z * 0.01) % 1200) - 200;
            const trailY = 50 + (i * 80);
            const trailGrad = ctx.createLinearGradient(trailX, trailY, trailX + 40, trailY);
            trailGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            trailGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = trailGrad;
            ctx.fillRect(trailX, trailY, 40, 2);
        }
        
        // Distant city/mountains
        ctx.fillStyle = '#1a0a3e';
        for (let i = 0; i < 8; i++) {
            const mx = (i * 140 - (player.z * 0.015 + player.x * 15) % 180);
            const height = 40 + Math.sin(i * 2) * 30 + (i % 2) * 20;
            ctx.fillRect(mx, canvas.height / 2 - height, 80, height);
            // Windows
            ctx.fillStyle = '#ffff00';
            for (let w = 0; w < 3; w++) {
                for (let h = 0; h < 3; h++) {
                    if (Math.random() > 0.3) {
                        ctx.fillRect(mx + 10 + w * 20, canvas.height / 2 - height + 10 + h * 15, 8, 8);
                    }
                }
            }
            ctx.fillStyle = '#1a0a3e';
        }
        
        // Ground base
        ctx.fillStyle = colors.grass.dark;
        ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);
        
        // Calculate base segment
        const baseSegmentIndex = Math.floor(player.z / road.segmentLength);
        const basePercent = (player.z % road.segmentLength) / road.segmentLength;
        
        // Calculate cumulative curve/hill
        let x = 0;
        let dx = 0;
        let y = camera.height;
        
        // Draw road segments from back to front
        const drawDistance = 100;
        for (let n = drawDistance; n > 0; n--) {
            const segmentIndex = (baseSegmentIndex + n) % segments.length;
            const segment = segments[segmentIndex];
            
            if (!segment) continue;
            
            // Calculate world position
            segment.p1.world.x = x;
            segment.p1.world.y = y + segment.hill;
            segment.p1.world.z = (n - basePercent) * road.segmentLength;
            
            segment.p2.world.x = x + dx;
            segment.p2.world.y = y + segments[(segmentIndex + 1) % segments.length].hill;
            segment.p2.world.z = (n + 1 - basePercent) * road.segmentLength;
            
            // Update curve offset
            x += dx;
            dx += segment.curve;
            
            // Project to screen
            project(segment.p1, player.x * road.width / 2, camera.height, camera.playerZ);
            project(segment.p2, player.x * road.width / 2, camera.height, camera.playerZ);
        }
        
        // Draw from far to near
        for (let n = drawDistance; n > 0; n--) {
            const segmentIndex = (baseSegmentIndex + n) % segments.length;
            const segment = segments[segmentIndex];
            
            if (!segment) continue;
            
            const p1 = segment.p1.screen;
            const p2 = segment.p2.screen;
            
            // Skip if behind camera
            if (p1.y >= p2.y) continue;
            
            // Grass
            drawPoly(0, p1.y, canvas.width, p1.y, canvas.width, p2.y, 0, p2.y, segment.grassColor);
            
            // Rumble strips
            const rumbleW1 = p1.w * 1.1;
            const rumbleW2 = p2.w * 1.1;
            drawPoly(
                p1.x - rumbleW1, p1.y,
                p1.x + rumbleW1, p1.y,
                p2.x + rumbleW2, p2.y,
                p2.x - rumbleW2, p2.y,
                segment.rumbleColor
            );
            
            // Enhanced road with gradient and glow
            const roadGrad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            roadGrad.addColorStop(0, segment.color);
            roadGrad.addColorStop(0.5, lightenColor(segment.color, 10));
            roadGrad.addColorStop(1, segment.color);
            drawPoly(
                p1.x - p1.w, p1.y,
                p1.x + p1.w, p1.y,
                p2.x + p2.w, p2.y,
                p2.x - p2.w, p2.y,
                roadGrad
            );
            
            // Road center line glow
            if (n < 20) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.shadowColor = '#ffff00';
                ctx.shadowBlur = 5;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
            
            // Lane markings
            if (Math.floor(segmentIndex / 4) % 2 === 0) {
                const laneW1 = p1.w / 20;
                const laneW2 = p2.w / 20;
                ctx.fillStyle = '#fff';
                drawPoly(
                    p1.x - laneW1, p1.y,
                    p1.x + laneW1, p1.y,
                    p2.x + laneW2, p2.y,
                    p2.x - laneW2, p2.y,
                    '#fff'
                );
            }
            
            // Finish line
            if (segment.checkpoint === 'finish') {
                ctx.fillStyle = '#fff';
                const stripeCount = 8;
                const stripeW1 = p1.w * 2 / stripeCount;
                const stripeW2 = p2.w * 2 / stripeCount;
                for (let s = 0; s < stripeCount; s++) {
                    if (s % 2 === 0) {
                        drawPoly(
                            p1.x - p1.w + s * stripeW1, p1.y,
                            p1.x - p1.w + (s + 1) * stripeW1, p1.y,
                            p2.x - p2.w + (s + 1) * stripeW2, p2.y,
                            p2.x - p2.w + s * stripeW2, p2.y,
                            '#fff'
                        );
                    }
                }
            }
            
            // Draw sprites
            if (segment.sprite) {
                const spriteScale = p1.scale * 3000;
                const spriteX = p1.x + (p1.w * segment.sprite.offset);
                drawSprite(segment, spriteX, Math.min(1.5, spriteScale));
            }
            
            // Draw item boxes on this segment
            const segZ = baseSegmentIndex * road.segmentLength + n * road.segmentLength;
            itemBoxes.forEach(box => {
                if (Math.abs(box.z - segZ) < road.segmentLength) {
                    const boxScale = p1.scale * 2500;
                    if (boxScale > 0.1 && boxScale < 2) {
                        const boxX = p1.x + (p1.w * box.x);
                        const boxSize = 25 * boxScale;
                        
                        // Rotating item box
                        ctx.save();
                        ctx.translate(boxX, p1.y - boxSize);
                        ctx.rotate(Date.now() * 0.003);
                        
                        // Rainbow glow
                        const hue = (Date.now() * 0.2) % 360;
                        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                        ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                        ctx.shadowBlur = 15 * boxScale;
                        ctx.fillRect(-boxSize/2, -boxSize/2, boxSize, boxSize);
                        
                        // Question mark
                        ctx.fillStyle = '#fff';
                        ctx.font = `${boxSize * 0.7}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.fillText('?', 0, boxSize * 0.25);
                        
                        ctx.restore();
                        ctx.shadowBlur = 0;
                    }
                }
            });
            
            // Draw bananas/traps on this segment
            activeItems.forEach(item => {
                if (item.type === 'banana' && Math.abs(item.z - segZ) < road.segmentLength) {
                    const itemScale = p1.scale * 2000;
                    if (itemScale > 0.1 && itemScale < 2) {
                        const itemX = p1.x + (p1.w * item.x);
                        ctx.font = `${24 * itemScale}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.fillText('🍌', itemX, p1.y);
                    }
                }
            });
        }
        
        // Draw other players
        for (let id in players) {
            const otherPlayer = players[id];
            const relZ = otherPlayer.z - player.z;
            if (relZ > 0 && relZ < road.length / 2) {
                const scale = camera.depth / (relZ / 15);
                if (scale > 0.05 && scale < 3) {
                    const screenX = canvas.width / 2 + (otherPlayer.x - player.x) * canvas.width * scale;
                    const screenY = canvas.height / 2 + canvas.height * 0.2 / scale;
                    
                    ctx.fillStyle = otherPlayer.color || '#ff0000';
                    const kartW = 60 * scale;
                    const kartH = 40 * scale;
                    ctx.fillRect(screenX - kartW / 2, screenY - kartH, kartW, kartH);
                }
            }
        }
        
        // Draw player kart
        drawPlayerKart();
    }
    
    function drawMenu() {
        // Animated background
        const time = Date.now() * 0.001;
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#0a0020');
        bgGrad.addColorStop(0.5, '#1a0a4e');
        bgGrad.addColorStop(1, '#0a0020');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Animated grid lines
        ctx.strokeStyle = 'rgba(255, 100, 0, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            const y = ((i * 40 + time * 50) % canvas.height);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Perspective road
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        ctx.lineTo(canvas.width / 2 - 250, canvas.height / 2 + 100);
        ctx.lineTo(canvas.width / 2 + 250, canvas.height / 2 + 100);
        ctx.lineTo(canvas.width, canvas.height);
        ctx.fill();
        
        // Racing stripes
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
            const offset = ((time * 100 + i * 60) % 300);
            const scale = offset / 300;
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2 - 5 * scale * 100, canvas.height / 2 + 100 + offset);
            ctx.lineTo(canvas.width / 2 + 5 * scale * 100, canvas.height / 2 + 100 + offset);
            ctx.stroke();
        }
        
        // Logo with rainbow glow
        const hue = (time * 50) % 360;
        ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
        ctx.shadowBlur = 40;
        ctx.fillStyle = '#fff';
        ctx.font = '48px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('NEON KART', canvas.width / 2, 100);
        ctx.shadowBlur = 0;
        
        // Subtitle
        ctx.fillStyle = '#ff6600';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText('ULTIMATE RACING', canvas.width / 2, 140);
        
        // Features
        ctx.fillStyle = '#888';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText('8 Characters • 6 Karts • Online Multiplayer • Items & Power-ups', canvas.width / 2, 180);
        
        // Animated characters preview
        for (let i = 0; i < 4; i++) {
            const charX = 150 + i * 130;
            const charY = 240 + Math.sin(time * 2 + i) * 10;
            const char = characters[i];
            
            ctx.fillStyle = char.color;
            ctx.shadowColor = char.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(charX, charY, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = '#fff';
            ctx.font = '8px "Press Start 2P"';
            ctx.fillText(char.name, charX, charY + 45);
        }
        
        // Start button
        const btnPulse = 1 + Math.sin(time * 3) * 0.05;
        ctx.save();
        ctx.translate(canvas.width / 2, 380);
        ctx.scale(btnPulse, btnPulse);
        ctx.fillStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 20;
        ctx.fillRect(-100, -30, 200, 60);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.font = '16px "Press Start 2P"';
        ctx.fillText('START', 0, 8);
        ctx.restore();
        
        // Controls hint
        ctx.fillStyle = '#666';
        ctx.font = '9px "Press Start 2P"';
        ctx.fillText('↑↓ Accelerate/Brake  ←→ Steer  SPACE Use Item  SHIFT Drift', canvas.width / 2, 480);
        ctx.fillText('Race solo, with friends, or against random players online!', canvas.width / 2, 510);
    }
    
    function drawCharacterSelect() {
        // Background
        ctx.fillStyle = '#0a0020';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Title
        ctx.fillStyle = '#ffff00';
        ctx.font = '28px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT CHARACTER', canvas.width / 2, 60);
        
        // Character grid (4x2)
        const gridX = 100, gridY = 100, cellW = 150, cellH = 120;
        for (let i = 0; i < characters.length; i++) {
            const char = characters[i];
            const col = i % 4;
            const row = Math.floor(i / 4);
            const cx = gridX + col * cellW;
            const cy = gridY + row * cellH;
            
            // Selection highlight
            if (i === selectedCharacter) {
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#ffff00';
                ctx.shadowBlur = 15;
                ctx.strokeRect(cx - 5, cy - 5, cellW, cellH);
                ctx.shadowBlur = 0;
            }
            
            // Character box
            ctx.fillStyle = '#1a1a3a';
            ctx.fillRect(cx, cy, cellW - 10, cellH - 10);
            
            // Character avatar
            ctx.fillStyle = char.color;
            ctx.shadowColor = char.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(cx + 70, cy + 40, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Face
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(cx + 60, cy + 35, 5, 0, Math.PI * 2);
            ctx.arc(cx + 80, cy + 35, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 70, cy + 48, 8, 0, Math.PI);
            ctx.stroke();
            
            // Name
            ctx.fillStyle = '#fff';
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(char.name, cx + 70, cy + 90);
        }
        
        // Selected character stats
        const selected = characters[selectedCharacter];
        ctx.fillStyle = '#222';
        ctx.fillRect(50, 350, 300, 100);
        ctx.fillStyle = selected.color;
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(selected.name, 70, 380);
        ctx.fillStyle = '#888';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText(selected.desc, 70, 405);
        
        // Stats bars
        const stats = [
            { name: 'SPD', val: selected.speed },
            { name: 'ACC', val: selected.accel },
            { name: 'HDL', val: selected.handling }
        ];
        stats.forEach((stat, i) => {
            ctx.fillStyle = '#666';
            ctx.fillText(stat.name, 70, 430 + i * 20);
            ctx.fillStyle = '#333';
            ctx.fillRect(120, 420 + i * 20, 100, 12);
            ctx.fillStyle = selected.color;
            ctx.fillRect(120, 420 + i * 20, stat.val * 20, 12);
        });
        
        // Preview on right
        ctx.fillStyle = '#111';
        ctx.fillRect(450, 350, 300, 140);
        ctx.fillStyle = selected.color;
        ctx.shadowColor = selected.color;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(600, 420, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Confirm button
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(300, 450, 200, 60);
        ctx.fillStyle = '#000';
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT KART →', 400, 488);
    }
    
    function drawKartSelect() {
        ctx.fillStyle = '#0a0020';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ffff';
        ctx.font = '28px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT KART', canvas.width / 2, 60);
        
        // Kart grid (3x2)
        const gridX = 100, gridY = 100, cellW = 200, cellH = 100;
        for (let i = 0; i < karts.length; i++) {
            const kart = karts[i];
            const col = i % 3;
            const row = Math.floor(i / 3);
            const cx = gridX + col * cellW;
            const cy = gridY + row * cellH;
            
            if (i === selectedKart) {
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 15;
                ctx.strokeRect(cx - 5, cy - 5, cellW, cellH);
                ctx.shadowBlur = 0;
            }
            
            ctx.fillStyle = '#1a1a3a';
            ctx.fillRect(cx, cy, cellW - 10, cellH - 10);
            
            // Kart preview
            const char = characters[selectedCharacter];
            drawMiniKart(cx + 50, cy + 40, char.color, kart.style);
            
            ctx.fillStyle = '#fff';
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(kart.name, cx + 95, cy + 80);
        }
        
        // Selected kart stats
        const selected = karts[selectedKart];
        ctx.fillStyle = '#222';
        ctx.fillRect(50, 320, 700, 80);
        
        const modifiers = [
            { name: 'SPEED', val: selected.speedMod, color: '#ff4444' },
            { name: 'ACCEL', val: selected.accelMod, color: '#44ff44' },
            { name: 'HANDLING', val: selected.handlingMod, color: '#4444ff' }
        ];
        
        modifiers.forEach((mod, i) => {
            const mx = 100 + i * 230;
            ctx.fillStyle = mod.color;
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'left';
            ctx.fillText(mod.name, mx, 350);
            ctx.fillStyle = '#333';
            ctx.fillRect(mx, 360, 150, 15);
            ctx.fillStyle = mod.color;
            ctx.fillRect(mx, 360, Math.min(150, mod.val * 115), 15);
        });
        
        // Confirm button
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(300, 420, 200, 60);
        ctx.fillStyle = '#000';
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('CHOOSE MODE →', 400, 458);
    }
    
    function drawMiniKart(x, y, color, style) {
        ctx.save();
        ctx.translate(x, y);
        
        // Different kart styles
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        
        if (style === 'sleek') {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(60, 10);
            ctx.lineTo(60, 25);
            ctx.lineTo(0, 30);
            ctx.closePath();
            ctx.fill();
        } else if (style === 'heavy') {
            ctx.fillRect(0, 0, 55, 35);
        } else if (style === 'rocket') {
            ctx.beginPath();
            ctx.moveTo(0, 15);
            ctx.lineTo(20, 0);
            ctx.lineTo(60, 5);
            ctx.lineTo(60, 25);
            ctx.lineTo(20, 30);
            ctx.closePath();
            ctx.fill();
        } else if (style === 'offroad') {
            ctx.fillRect(5, 5, 50, 25);
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(10, 30, 10, 0, Math.PI * 2);
            ctx.arc(50, 30, 10, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(5, 5, 50, 25);
        }
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#333';
        ctx.fillRect(40, 8, 15, 12);
        
        ctx.restore();
    }
    
    function drawModeSelect() {
        ctx.fillStyle = '#0a0020';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ff6600';
        ctx.font = '28px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT MODE', canvas.width / 2, 60);
        
        // Show selected character and kart
        const char = characters[selectedCharacter];
        const kart = karts[selectedKart];
        ctx.fillStyle = char.color;
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText(`${char.name} + ${kart.name}`, canvas.width / 2, 100);
        
        // Time Trial
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(100, 150, 200, 80);
        ctx.fillStyle = '#000';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('TIME TRIAL', 200, 180);
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('Race for best time', 200, 210);
        
        // Private Room
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(300, 150, 200, 80);
        ctx.fillStyle = '#000';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('HOST ROOM', 400, 180);
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('Play with friends', 400, 210);
        
        // Join Room
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(500, 150, 200, 80);
        ctx.fillStyle = '#000';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('JOIN ROOM', 600, 180);
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('Enter room code', 600, 210);
        
        // Quick Match
        ctx.fillStyle = '#ff00ff';
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 20;
        ctx.fillRect(250, 270, 300, 80);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText('QUICK MATCH', 400, 305);
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText('Race random players online!', 400, 330);
        
        // Track select (simplified)
        ctx.fillStyle = '#444';
        ctx.fillRect(150, 380, 500, 80);
        ctx.fillStyle = '#fff';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('TRACK: ' + tracks[selectedTrack].name, 400, 410);
        ctx.fillStyle = '#888';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText(tracks[selectedTrack].laps + ' Laps • ' + tracks[selectedTrack].difficulty, 400, 440);
        
        // Track arrows
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText('◀', 170, 425);
        ctx.fillText('▶', 620, 425);
        
        // Back hint
        ctx.fillStyle = '#666';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText('Press ESC to go back', canvas.width / 2, 520);
    }
    
    function drawJoinScreen() {
        ctx.fillStyle = '#1a0a3e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ffff';
        ctx.font = '24px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('ENTER ROOM CODE', canvas.width/2, 150);
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(200, 200, 300, 80);
        
        ctx.fillStyle = '#ffff00';
        ctx.font = '36px "Press Start 2P"';
        ctx.fillText(roomCode || '_____', canvas.width/2, 255);
        
        ctx.fillStyle = '#888';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('Type code and press ENTER', canvas.width/2, 330);
    }
    
    function drawWaitingScreen() {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ff00';
        ctx.font = '20px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('ROOM CODE:', canvas.width/2, 100);
        
        ctx.fillStyle = '#ffff00';
        ctx.font = '36px "Press Start 2P"';
        ctx.fillText(roomCode, canvas.width/2, 160);
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText('Share this code!', canvas.width/2, 210);
        
        const playerCount = Object.keys(players).length + 1;
        ctx.fillStyle = '#00ffff';
        ctx.fillText(`Players: ${playerCount}`, canvas.width/2, 280);
        
        if (isHost && playerCount > 1) {
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(250, 400, 200, 60);
            ctx.fillStyle = '#000';
            ctx.font = '14px "Press Start 2P"';
            ctx.fillText('START', canvas.width/2, 438);
        } else {
            ctx.fillStyle = '#888';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText(isHost ? 'Waiting for players...' : 'Waiting for host...', canvas.width/2, 350);
        }
    }
    
    function drawCountdown() {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.shadowColor = countdown > 0 ? '#ffff00' : '#00ff00';
        ctx.shadowBlur = 30;
        ctx.fillStyle = countdown > 0 ? '#ffff00' : '#00ff00';
        ctx.font = '72px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(countdown > 0 ? countdown : 'GO!', canvas.width/2, canvas.height/2);
        ctx.shadowBlur = 0;
    }
    
    function drawHUD() {
        if (!player) return;
        
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        
        // Lap counter (top left)
        ctx.fillStyle = '#fff';
        ctx.font = '18px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`LAP`, 15, 30);
        ctx.fillStyle = '#ffff00';
        ctx.font = '24px "Press Start 2P"';
        ctx.fillText(`${Math.min(player.lap + 1, totalLaps)}/${totalLaps}`, 15, 60);
        
        // Time (top center)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('TIME', canvas.width / 2, 25);
        const mins = Math.floor(raceTime / 60);
        const secs = Math.floor(raceTime % 60);
        const ms = Math.floor((raceTime % 1) * 100);
        ctx.font = '18px "Press Start 2P"';
        ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`, canvas.width / 2, 50);
        
        // Position (top right)
        const position = calculatePosition();
        ctx.textAlign = 'right';
        ctx.fillStyle = position === 1 ? '#ffd700' : '#fff';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('POS', canvas.width - 15, 25);
        ctx.font = '28px "Press Start 2P"';
        ctx.fillText(`${position}`, canvas.width - 15, 58);
        ctx.font = '12px "Press Start 2P"';
        ctx.fillStyle = '#888';
        ctx.fillText(`/${Object.keys(players).length + 1}`, canvas.width - 15, 75);
        
        // Item box (bottom left)
        ctx.fillStyle = '#222';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.fillRect(15, canvas.height - 85, 70, 70);
        ctx.strokeRect(15, canvas.height - 85, 70, 70);
        
        if (currentItem) {
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(currentItem.icon, 50, canvas.height - 38);
            ctx.fillStyle = '#fff';
            ctx.font = '8px "Press Start 2P"';
            ctx.fillText('SPACE', 50, canvas.height - 20);
        } else {
            ctx.fillStyle = '#444';
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('ITEM', 50, canvas.height - 45);
        }
        
        // Speed gauge (bottom center)
        const speedKmh = Math.floor(player.speed * 1.5);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.font = '24px "Press Start 2P"';
        ctx.fillText(`${speedKmh}`, canvas.width / 2, canvas.height - 40);
        ctx.font = '10px "Press Start 2P"';
        ctx.fillStyle = '#888';
        ctx.fillText('km/h', canvas.width / 2, canvas.height - 20);
        
        // Speed bar
        ctx.fillStyle = '#333';
        ctx.fillRect(canvas.width / 2 - 80, canvas.height - 75, 160, 12);
        const speedPercent = player.speed / player.maxSpeed;
        const speedColor = speedPercent > 0.8 ? '#ff0000' : (speedPercent > 0.5 ? '#ffff00' : '#00ff00');
        ctx.fillStyle = speedColor;
        ctx.fillRect(canvas.width / 2 - 78, canvas.height - 73, speedPercent * 156, 8);
        
        // Drift power (bottom right, only when drifting)
        if (player.drifting || player.driftPower > 0) {
            ctx.fillStyle = '#222';
            ctx.fillRect(canvas.width - 180, canvas.height - 50, 160, 25);
            
            const driftColor = player.driftPower > 60 ? '#ff00ff' : (player.driftPower > 30 ? '#ff6600' : '#ffff00');
            ctx.fillStyle = driftColor;
            ctx.fillRect(canvas.width - 178, canvas.height - 48, (player.driftPower / 100) * 156, 21);
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(canvas.width - 180, canvas.height - 50, 160, 25);
            
            ctx.fillStyle = '#fff';
            ctx.font = '8px "Press Start 2P"';
            ctx.textAlign = 'right';
            ctx.fillText('DRIFT', canvas.width - 25, canvas.height - 33);
        }
        
        // Character name (bottom right corner)
        ctx.fillStyle = player.character.color;
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'right';
        ctx.fillText(player.character.name, canvas.width - 15, canvas.height - 85);
        
        // Active power-up indicators
        if (player.boostTimer > 0) {
            ctx.fillStyle = '#ff6600';
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'left';
            ctx.fillText('🚀 BOOST!', 100, canvas.height - 55);
        }
        if (player.shieldTimer > 0) {
            ctx.fillStyle = '#00ffff';
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'left';
            ctx.fillText('🛡️ SHIELD', 100, canvas.height - 40);
        }
        if (player.starTimer > 0) {
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'left';
            ctx.fillText('⭐ STAR!', 100, canvas.height - 55);
        }
        
        ctx.shadowBlur = 0;
    }
    
    function calculatePosition() {
        let pos = 1;
        const myProgress = player.lap * road.length + player.z;
        
        for (let id in players) {
            const p = players[id];
            const theirProgress = (p.lap || 0) * road.length + (p.z || 0);
            if (theirProgress > myProgress) {
                pos++;
            }
        }
        return pos;
    }
    
    function drawFinishScreen() {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffd700';
        ctx.font = '32px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('FINISH!', canvas.width/2, 100);
        ctx.shadowBlur = 0;
        
        const mins = Math.floor(player.finishTime / 60);
        const secs = Math.floor(player.finishTime % 60);
        const ms = Math.floor((player.finishTime % 1) * 100);
        ctx.fillStyle = '#fff';
        ctx.font = '20px "Press Start 2P"';
        ctx.fillText(`TIME: ${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`, canvas.width/2, 200);
        
        ctx.fillStyle = '#00ffff';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText('CLICK TO RACE AGAIN', canvas.width/2, 350);
    }
    
    gameLoop = requestAnimationFrame(update);
}

// =============== TANK WARS ===============
function initTanks() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;
    
    const channel = new BroadcastChannel('tank_wars');
    const playerId = 'P' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const playerHue = Math.random() * 360;
    
    let player = {
        id: playerId,
        x: Math.random() * 600 + 100,
        y: Math.random() * 400 + 100,
        angle: 0,
        turretAngle: 0,
        health: 100,
        maxHealth: 100,
        score: 0,
        kills: 0,
        deaths: 0,
        shield: 0,
        speed: 0,
        hue: playerHue,
        lastShot: 0,
        reloadTime: 300
    };
    
    let bullets = [];
    let otherPlayers = {};
    let keys = {};
    let gameActive = true;
    let particles = [];
    let explosions = [];
    let powerUps = [];
    let trackMarks = [];
    let screenShake = 0;
    let mouseX = 400, mouseY = 300;
    let gameTime = 0;
    
    // Generate detailed map
    const walls = [];
    const wallTypes = ['bunker', 'crate', 'barrier'];
    for (let i = 0; i < 15; i++) {
        walls.push({
            x: Math.random() * 650 + 50,
            y: Math.random() * 450 + 75,
            w: 30 + Math.random() * 60,
            h: 30 + Math.random() * 60,
            type: wallTypes[Math.floor(Math.random() * wallTypes.length)],
            health: 100,
            destroyed: false
        });
    }
    
    // Spawn power-ups periodically
    function spawnPowerUp() {
        const types = ['health', 'shield', 'speed', 'damage'];
        powerUps.push({
            x: Math.random() * 700 + 50,
            y: Math.random() * 500 + 50,
            type: types[Math.floor(Math.random() * types.length)],
            pulse: 0
        });
    }
    
    setInterval(() => {
        if (powerUps.length < 3) spawnPowerUp();
    }, 5000);
    spawnPowerUp();
    
    channel.onmessage = (e) => {
        const data = e.data;
        if (data.type === 'update' && data.id !== playerId) {
            otherPlayers[data.id] = { ...data, lastSeen: Date.now() };
        } else if (data.type === 'bullet' && data.shooterId !== playerId) {
            bullets.push({ ...data, isEnemy: true, trail: [] });
        } else if (data.type === 'hit' && data.targetId === playerId) {
            const damage = player.shield > 0 ? 10 : 25;
            player.shield = Math.max(0, player.shield - 15);
            player.health -= damage;
            screenShake = 10;
            createExplosion(player.x, player.y, 15, player.hue);
            if (player.health <= 0) {
                player.deaths++;
                createExplosion(player.x, player.y, 40, player.hue);
                player.x = Math.random() * 600 + 100;
                player.y = Math.random() * 400 + 100;
                player.health = 100;
                player.shield = 0;
            }
        } else if (data.type === 'explosion') {
            createExplosion(data.x, data.y, data.size, data.hue);
        }
    };
    
    function createExplosion(x, y, size, hue) {
        for (let i = 0; i < size; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 20,
                maxLife: 50,
                size: 2 + Math.random() * 4,
                hue: hue + Math.random() * 30 - 15,
                type: 'spark'
            });
        }
        explosions.push({ x, y, radius: 0, maxRadius: size * 2, alpha: 1, hue });
    }
    
    function handleKeyDown(e) {
        keys[e.key.toLowerCase()] = true;
    }
    
    function handleKeyUp(e) {
        keys[e.key.toLowerCase()] = false;
    }
    
    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    }
    
    function handleMouseDown(e) {
        shoot();
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    
    function shoot() {
        const now = Date.now();
        if (now - player.lastShot < player.reloadTime) return;
        player.lastShot = now;
        
        const bullet = {
            type: 'bullet',
            shooterId: playerId,
            x: player.x + Math.cos(player.turretAngle) * 35,
            y: player.y + Math.sin(player.turretAngle) * 35,
            vx: Math.cos(player.turretAngle) * 12,
            vy: Math.sin(player.turretAngle) * 12,
            hue: player.hue,
            trail: []
        };
        bullets.push(bullet);
        channel.postMessage(bullet);
        
        // Muzzle flash
        for (let i = 0; i < 8; i++) {
            const angle = player.turretAngle + (Math.random() - 0.5) * 0.5;
            particles.push({
                x: bullet.x, y: bullet.y,
                vx: Math.cos(angle) * (3 + Math.random() * 3),
                vy: Math.sin(angle) * (3 + Math.random() * 3),
                life: 10, maxLife: 10,
                size: 3, hue: 45, type: 'flash'
            });
        }
        screenShake = 3;
    }
    
    function update() {
        if (!gameActive) return;
        gameTime++;
        
        // Remove old players
        const now = Date.now();
        for (let id in otherPlayers) {
            if (now - otherPlayers[id].lastSeen > 3000) {
                delete otherPlayers[id];
            }
        }
        
        // Movement
        let moving = false;
        if (keys['w'] || keys['arrowup']) {
            player.x += Math.cos(player.angle) * 3.5;
            player.y += Math.sin(player.angle) * 3.5;
            moving = true;
        }
        if (keys['s'] || keys['arrowdown']) {
            player.x -= Math.cos(player.angle) * 2;
            player.y -= Math.sin(player.angle) * 2;
            moving = true;
        }
        if (keys['a'] || keys['arrowleft']) player.angle -= 0.06;
        if (keys['d'] || keys['arrowright']) player.angle += 0.06;
        
        // Track marks
        if (moving && gameTime % 5 === 0) {
            trackMarks.push({
                x: player.x, y: player.y,
                angle: player.angle,
                alpha: 0.3
            });
            if (trackMarks.length > 100) trackMarks.shift();
        }
        
        // Turret follows mouse
        player.turretAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
        
        player.x = Math.max(30, Math.min(770, player.x));
        player.y = Math.max(30, Math.min(570, player.y));
        
        // Power-up collection
        powerUps = powerUps.filter(p => {
            p.pulse += 0.1;
            const dist = Math.hypot(player.x - p.x, player.y - p.y);
            if (dist < 30) {
                switch(p.type) {
                    case 'health': player.health = Math.min(player.maxHealth, player.health + 30); break;
                    case 'shield': player.shield = Math.min(50, player.shield + 25); break;
                    case 'speed': player.reloadTime = Math.max(150, player.reloadTime - 50); break;
                    case 'damage': break;
                }
                createExplosion(p.x, p.y, 10, 120);
                return false;
            }
            return true;
        });
        
        // Update bullets
        bullets = bullets.filter(b => {
            b.trail.push({ x: b.x, y: b.y });
            if (b.trail.length > 8) b.trail.shift();
            
            b.x += b.vx;
            b.y += b.vy;
            
            // Wall collision
            for (let wall of walls) {
                if (!wall.destroyed && b.x > wall.x && b.x < wall.x + wall.w &&
                    b.y > wall.y && b.y < wall.y + wall.h) {
                    wall.health -= 25;
                    if (wall.health <= 0) wall.destroyed = true;
                    createExplosion(b.x, b.y, 8, 30);
                    return false;
                }
            }
            
            // Player collision
            if (!b.isEnemy) {
                for (let id in otherPlayers) {
                    const other = otherPlayers[id];
                    const dist = Math.hypot(b.x - other.x, b.y - other.y);
                    if (dist < 28) {
                        channel.postMessage({ type: 'hit', targetId: id, shooterId: playerId });
                        channel.postMessage({ type: 'explosion', x: b.x, y: b.y, size: 20, hue: other.hue || 0 });
                        player.score += 25;
                        player.kills++;
                        createExplosion(b.x, b.y, 20, other.hue || 0);
                        return false;
                    }
                }
            }
            
            return b.x > 0 && b.x < 800 && b.y > 0 && b.y < 600;
        });
        
        // Update particles
        particles = particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life--;
            return p.life > 0;
        });
        
        // Update explosions
        explosions = explosions.filter(e => {
            e.radius += 3;
            e.alpha -= 0.05;
            return e.alpha > 0;
        });
        
        // Fade track marks
        trackMarks.forEach(t => t.alpha *= 0.995);
        trackMarks = trackMarks.filter(t => t.alpha > 0.01);
        
        if (screenShake > 0) screenShake *= 0.8;
        
        channel.postMessage({ type: 'update', ...player });
        
        draw();
        gameLoop = requestAnimationFrame(update);
    }
    
    function draw() {
        ctx.save();
        if (screenShake > 0.5) {
            ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        }
        
        // Advanced battlefield background
        const time = gameTime * 0.01;
        const bgGrad = ctx.createRadialGradient(400, 300, 0, 400, 300, 600);
        bgGrad.addColorStop(0, '#1a1a3e');
        bgGrad.addColorStop(0.4, '#0f0f2a');
        bgGrad.addColorStop(0.7, '#0a0a1a');
        bgGrad.addColorStop(1, '#000000');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 800, 600);
        
        // Animated smoke/dust clouds
        for (let i = 0; i < 4; i++) {
            const cloudX = ((time * 10 + i * 200) % 1000) - 100;
            const cloudY = 200 + Math.sin(time * 0.3 + i) * 150;
            const cloudGrad = ctx.createRadialGradient(cloudX, cloudY, 0, cloudX, cloudY, 120);
            cloudGrad.addColorStop(0, `rgba(${40 + i * 10}, ${30 + i * 5}, ${20 + i * 5}, 0.2)`);
            cloudGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = cloudGrad;
            ctx.fillRect(cloudX - 120, cloudY - 120, 240, 240);
        }
        
        // Enhanced animated grid with glow
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)';
        ctx.shadowColor = 'rgba(0, 255, 136, 0.3)';
        ctx.shadowBlur = 2;
        ctx.lineWidth = 1;
        const gridOffset = (gameTime * 0.5) % 50;
        for (let x = -50 + gridOffset; x < 850; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 600);
            ctx.stroke();
        }
        for (let y = 0; y < 600; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(800, y);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        
        // Track marks
        trackMarks.forEach(t => {
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(t.angle);
            ctx.fillStyle = `rgba(50, 40, 30, ${t.alpha})`;
            ctx.fillRect(-18, -12, 8, 3);
            ctx.fillRect(-18, 9, 8, 3);
            ctx.restore();
        });
        
        // Walls with detail
        walls.forEach(w => {
            if (w.destroyed) {
                ctx.fillStyle = 'rgba(50, 50, 50, 0.3)';
                ctx.fillRect(w.x, w.y, w.w, w.h);
                return;
            }
            
            const wallGrad = ctx.createLinearGradient(w.x, w.y, w.x + w.w, w.y + w.h);
            if (w.type === 'bunker') {
                wallGrad.addColorStop(0, '#4a4a5a');
                wallGrad.addColorStop(1, '#2a2a3a');
            } else if (w.type === 'crate') {
                wallGrad.addColorStop(0, '#8b7355');
                wallGrad.addColorStop(1, '#5c4a3a');
            } else {
                wallGrad.addColorStop(0, '#3a5a4a');
                wallGrad.addColorStop(1, '#2a3a2a');
            }
            ctx.fillStyle = wallGrad;
            ctx.fillRect(w.x, w.y, w.w, w.h);
            
            // Wall border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.strokeRect(w.x, w.y, w.w, w.h);
            
            // Damage cracks
            if (w.health < 75) {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.moveTo(w.x + w.w * 0.3, w.y);
                ctx.lineTo(w.x + w.w * 0.5, w.y + w.h * 0.6);
                ctx.stroke();
            }
        });
        
        // Power-ups with glow
        powerUps.forEach(p => {
            const glow = 10 + Math.sin(p.pulse) * 5;
            ctx.shadowBlur = glow;
            
            let color, icon;
            switch(p.type) {
                case 'health': color = '#00ff00'; icon = '+'; break;
                case 'shield': color = '#00ffff'; icon = '◊'; break;
                case 'speed': color = '#ffff00'; icon = '»'; break;
                case 'damage': color = '#ff0000'; icon = '★'; break;
            }
            
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(icon, p.x, p.y + 5);
            ctx.shadowBlur = 0;
        });
        
        // Enhanced explosions with multiple layers
        explosions.forEach(e => {
            // Outer ring
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${e.hue}, 100%, 60%, ${e.alpha})`;
            ctx.lineWidth = 4;
            ctx.shadowColor = `hsl(${e.hue}, 100%, 50%)`;
            ctx.shadowBlur = 15;
            ctx.stroke();
            
            // Middle ring
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius * 0.7, 0, Math.PI * 2);
            ctx.strokeStyle = `hsla(${e.hue + 20}, 100%, 70%, ${e.alpha * 0.8})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Inner core
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius * 0.4, 0, Math.PI * 2);
            const coreGrad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius * 0.4);
            coreGrad.addColorStop(0, `hsla(${e.hue + 40}, 100%, 90%, ${e.alpha})`);
            coreGrad.addColorStop(1, `hsla(${e.hue}, 100%, 50%, ${e.alpha * 0.3})`);
            ctx.fillStyle = coreGrad;
            ctx.fill();
            
            // Bright center
            ctx.fillStyle = `hsla(${e.hue + 60}, 100%, 100%, ${e.alpha})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        
        // Advanced particle system with trails
        particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            const size = p.size * (p.life / p.maxLife);
            
            // Particle trail
            if (p.type === 'spark') {
                ctx.fillStyle = `hsl(${p.hue}, 100%, ${50 + (1 - alpha) * 40}%)`;
                ctx.globalAlpha = alpha * 0.4;
                ctx.beginPath();
                ctx.arc(p.x, p.y, size * 0.6, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Main particle with glow
            ctx.shadowColor = `hsl(${p.hue}, 100%, 60%)`;
            ctx.shadowBlur = size * 2;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `hsl(${p.hue}, 100%, ${50 + (1 - alpha) * 30}%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Bright core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        
        // Other players
        for (let id in otherPlayers) {
            const other = otherPlayers[id];
            drawTank(other.x, other.y, other.angle, other.turretAngle || other.angle, other.hue || 180, other.id, other.health || 100, other.shield || 0);
        }
        
        // Player tank
        drawTank(player.x, player.y, player.angle, player.turretAngle, player.hue, player.id, player.health, player.shield);
        
        // Bullets with trails
        bullets.forEach(b => {
            // Trail
            ctx.beginPath();
            if (b.trail.length > 1) {
                ctx.moveTo(b.trail[0].x, b.trail[0].y);
                b.trail.forEach((t, i) => {
                    ctx.lineTo(t.x, t.y);
                });
            }
            ctx.strokeStyle = `hsla(${b.hue}, 100%, 70%, 0.5)`;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Bullet
            ctx.shadowBlur = 15;
            ctx.shadowColor = `hsl(${b.hue}, 100%, 60%)`;
            ctx.fillStyle = `hsl(${b.hue}, 100%, 70%)`;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        
        // HUD Panel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 220, 100);
        ctx.strokeStyle = `hsl(${player.hue}, 70%, 50%)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 220, 100);
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`ID: ${playerId}`, 20, 32);
        ctx.fillText(`SCORE: ${player.score}`, 20, 52);
        ctx.fillText(`K/D: ${player.kills}/${player.deaths}`, 20, 72);
        
        // Health bar
        ctx.fillStyle = '#222';
        ctx.fillRect(20, 82, 150, 12);
        const healthPct = player.health / player.maxHealth;
        ctx.fillStyle = healthPct > 0.5 ? '#00ff00' : healthPct > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(20, 82, 150 * healthPct, 12);
        
        // Shield bar
        if (player.shield > 0) {
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(20, 82, 150 * (player.shield / 50), 4);
        }
        
        // Mini radar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(740, 60, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Radar blips
        ctx.fillStyle = `hsl(${player.hue}, 100%, 60%)`;
        ctx.fillRect(740 + (player.x - 400) / 8 - 2, 60 + (player.y - 300) / 6 - 2, 4, 4);
        for (let id in otherPlayers) {
            const other = otherPlayers[id];
            ctx.fillStyle = '#f00';
            ctx.fillRect(740 + (other.x - 400) / 8 - 2, 60 + (other.y - 300) / 6 - 2, 4, 4);
        }
        
        // Player count
        ctx.fillStyle = '#fff';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(`${Object.keys(otherPlayers).length + 1} ONLINE`, 740, 120);
        
        ctx.restore();
    }
    
    function drawTank(x, y, angle, turretAngle, hue, id, health, shield) {
        ctx.save();
        ctx.translate(x, y);
        
        // Tank shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(3, 5, 28, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.rotate(angle);
        
        // Tracks
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-22, -18, 44, 8);
        ctx.fillRect(-22, 10, 44, 8);
        
        // Track details
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        for (let i = -20; i < 22; i += 6) {
            ctx.beginPath();
            ctx.moveTo(i, -18);
            ctx.lineTo(i, -10);
            ctx.moveTo(i, 10);
            ctx.lineTo(i, 18);
            ctx.stroke();
        }
        
        // Hull
        const hullGrad = ctx.createLinearGradient(-18, -14, 18, 14);
        hullGrad.addColorStop(0, `hsl(${hue}, 60%, 45%)`);
        hullGrad.addColorStop(0.5, `hsl(${hue}, 70%, 55%)`);
        hullGrad.addColorStop(1, `hsl(${hue}, 60%, 40%)`);
        ctx.fillStyle = hullGrad;
        ctx.fillRect(-18, -14, 36, 28);
        
        // Hull border
        ctx.strokeStyle = `hsl(${hue}, 50%, 30%)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(-18, -14, 36, 28);
        
        // Engine vents
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-16, -6, 8, 4);
        ctx.fillRect(-16, 2, 8, 4);
        
        ctx.rotate(-angle);
        ctx.rotate(turretAngle);
        
        // Turret base
        ctx.fillStyle = `hsl(${hue}, 50%, 40%)`;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `hsl(${hue}, 40%, 25%)`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Barrel
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(12, -4, 26, 8);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(12, -5, 4, 10);
        ctx.fillRect(32, -5, 6, 10);
        
        // Muzzle
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(36, -3, 4, 6);
        
        ctx.restore();
        
        // Name tag with background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 30, y - 45, 60, 14);
        ctx.fillStyle = `hsl(${hue}, 70%, 70%)`;
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(id, x, y - 35);
        
        // Health bar above tank
        const barWidth = 40;
        ctx.fillStyle = '#333';
        ctx.fillRect(x - barWidth/2, y - 28, barWidth, 5);
        ctx.fillStyle = health > 50 ? '#0f0' : health > 25 ? '#ff0' : '#f00';
        ctx.fillRect(x - barWidth/2, y - 28, barWidth * (health / 100), 5);
        
        // Shield indicator
        if (shield > 0) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 30, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    gameLoop = requestAnimationFrame(update);
    
    window.currentGameCleanup = () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mousedown', handleMouseDown);
        channel.close();
        gameActive = false;
    };
}

// =============== MINESWEEPER ===============
function initMinesweeper() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 650;
    
    const COLS = 16;
    const ROWS = 16;
    const MINES = 40;
    const CELL_SIZE = 35;
    const OFFSET_X = (600 - COLS * CELL_SIZE) / 2;
    const OFFSET_Y = 60;
    
    let grid = [];
    let revealed = [];
    let flagged = [];
    let gameOver = false;
    let won = false;
    let firstClick = true;
    let flagCount = 0;
    let startTime = 0;
    let timer = 0;
    
    function initGrid(safeX, safeY) {
        grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        revealed = Array(ROWS).fill().map(() => Array(COLS).fill(false));
        flagged = Array(ROWS).fill().map(() => Array(COLS).fill(false));
        
        let placed = 0;
        while (placed < MINES) {
            const x = Math.floor(Math.random() * COLS);
            const y = Math.floor(Math.random() * ROWS);
            if (grid[y][x] !== -1 && !(Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1)) {
                grid[y][x] = -1;
                placed++;
            }
        }
        
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (grid[y][x] === -1) continue;
                let count = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const ny = y + dy, nx = x + dx;
                        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS && grid[ny][nx] === -1) {
                            count++;
                        }
                    }
                }
                grid[y][x] = count;
            }
        }
        
        startTime = Date.now();
    }
    
    function reveal(x, y) {
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
        if (revealed[y][x] || flagged[y][x]) return;
        
        revealed[y][x] = true;
        
        if (grid[y][x] === -1) {
            gameOver = true;
            revealAll();
            return;
        }
        
        if (grid[y][x] === 0) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    reveal(x + dx, y + dy);
                }
            }
        }
        
        checkWin();
    }
    
    function revealAll() {
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                revealed[y][x] = true;
            }
        }
    }
    
    function checkWin() {
        let unrevealed = 0;
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (!revealed[y][x]) unrevealed++;
            }
        }
        if (unrevealed === MINES) {
            won = true;
            gameOver = true;
        }
    }
    
    function handleClick(e) {
        if (gameOver) {
            firstClick = true;
            gameOver = false;
            won = false;
            flagCount = 0;
            grid = [];
            draw();
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        
        const cellX = Math.floor((mx - OFFSET_X) / CELL_SIZE);
        const cellY = Math.floor((my - OFFSET_Y) / CELL_SIZE);
        
        if (cellX < 0 || cellX >= COLS || cellY < 0 || cellY >= ROWS) return;
        
        if (firstClick) {
            initGrid(cellX, cellY);
            firstClick = false;
        }
        
        reveal(cellX, cellY);
        draw();
    }
    
    function handleRightClick(e) {
        e.preventDefault();
        if (gameOver || firstClick) return;
        
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        
        const cellX = Math.floor((mx - OFFSET_X) / CELL_SIZE);
        const cellY = Math.floor((my - OFFSET_Y) / CELL_SIZE);
        
        if (cellX < 0 || cellX >= COLS || cellY < 0 || cellY >= ROWS) return;
        if (revealed[cellY][cellX]) return;
        
        flagged[cellY][cellX] = !flagged[cellY][cellX];
        flagCount += flagged[cellY][cellX] ? 1 : -1;
        draw();
    }
    
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('contextmenu', handleRightClick);
    
    const colors = ['', '#00f', '#080', '#f00', '#008', '#800', '#088', '#000', '#888'];
    
    function draw() {
        const time = Date.now() * 0.001;
        
        // Advanced background with danger theme
        const bgGrad = ctx.createRadialGradient(300, 325, 0, 300, 325, 500);
        bgGrad.addColorStop(0, '#1a0010');
        bgGrad.addColorStop(0.4, '#0a0005');
        bgGrad.addColorStop(0.7, '#050002');
        bgGrad.addColorStop(1, '#000000');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 600, 650);
        
        // Animated warning pulses
        for (let i = 0; i < 3; i++) {
            const pulse = ((time * 2 + i * 0.5) % 2);
            const alpha = Math.max(0, 0.1 - pulse * 0.05);
            ctx.strokeStyle = `rgba(255, 51, 102, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(10 + pulse * 20, 10 + pulse * 20, 580 - pulse * 40, 630 - pulse * 40);
        }
        
        // Title with glow
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff3366';
        ctx.font = '20px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('MINE SCAN', 300, 35);
        ctx.shadowBlur = 0;
        
        ctx.font = '14px "Press Start 2P"';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(`💣 ${MINES - flagCount}`, 30, 40);
        
        if (!firstClick && !gameOver) {
            timer = Math.floor((Date.now() - startTime) / 1000);
        }
        ctx.textAlign = 'right';
        ctx.fillText(`⏱️ ${timer}`, 570, 40);
        
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const px = OFFSET_X + x * CELL_SIZE;
                const py = OFFSET_Y + y * CELL_SIZE;
                
                if (!revealed[y] || !revealed[y][x]) {
                    // Enhanced unrevealed cell with gradient
                    const cellGrad = ctx.createLinearGradient(px, py, px + CELL_SIZE, py + CELL_SIZE);
                    cellGrad.addColorStop(0, '#4a3a5a');
                    cellGrad.addColorStop(0.5, '#3a3a5a');
                    cellGrad.addColorStop(1, '#2a2a4a');
                    ctx.fillStyle = cellGrad;
                    ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                    
                    // Border highlight
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                    
                    if (flagged[y] && flagged[y][x]) {
                        ctx.shadowColor = '#ff0';
                        ctx.shadowBlur = 10;
                        ctx.fillStyle = '#ff0';
                        ctx.font = '16px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('🚩', px + CELL_SIZE/2, py + CELL_SIZE/2 + 6);
                        ctx.shadowBlur = 0;
                    }
                } else {
                    // Enhanced revealed cell
                    const revealGrad = ctx.createLinearGradient(px, py, px + CELL_SIZE, py + CELL_SIZE);
                    revealGrad.addColorStop(0, '#2a2a4a');
                    revealGrad.addColorStop(1, '#1a1a3a');
                    ctx.fillStyle = revealGrad;
                    ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
                    
                    if (grid[y][x] === -1) {
                        // Enhanced mine with explosion effect
                        ctx.shadowColor = '#ff0000';
                        ctx.shadowBlur = 15;
                        ctx.fillStyle = '#f00';
                        ctx.font = '16px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('💣', px + CELL_SIZE/2, py + CELL_SIZE/2 + 6);
                        ctx.shadowBlur = 0;
                    } else if (grid[y][x] > 0) {
                        // Enhanced numbers with glow
                        ctx.shadowColor = colors[grid[y][x]];
                        ctx.shadowBlur = 8;
                        ctx.fillStyle = colors[grid[y][x]];
                        ctx.font = 'bold 18px "Press Start 2P"';
                        ctx.textAlign = 'center';
                        ctx.fillText(grid[y][x], px + CELL_SIZE/2, py + CELL_SIZE/2 + 7);
                        ctx.shadowBlur = 0;
                    }
                }
            }
        }
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, 600, 650);
            
            ctx.font = '28px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillStyle = won ? '#0f0' : '#f00';
            ctx.fillText(won ? 'YOU WIN!' : 'GAME OVER', 300, 300);
            
            ctx.fillStyle = '#fff';
            ctx.font = '14px "Press Start 2P"';
            ctx.fillText('CLICK TO PLAY AGAIN', 300, 350);
        }
        
        if (!gameOver) {
            gameLoop = requestAnimationFrame(draw);
        }
    }
    
    draw();
    
    window.currentGameCleanup = () => {
        canvas.removeEventListener('click', handleClick);
        canvas.removeEventListener('contextmenu', handleRightClick);
    };
}

// =============== CONNECT 4 ===============
function initConnect4() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 700;
    canvas.height = 650;
    
    const COLS = 7;
    const ROWS = 6;
    const CELL_SIZE = 80;
    const OFFSET_X = (700 - COLS * CELL_SIZE) / 2;
    const OFFSET_Y = 100;
    
    let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let currentPlayer = 1;
    let gameOver = false;
    let winner = 0;
    let hoverCol = -1;
    let aiMode = true;
    
    function dropPiece(col) {
        if (gameOver) return false;
        
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row][col] === 0) {
                board[row][col] = currentPlayer;
                if (checkWin(row, col)) {
                    winner = currentPlayer;
                    gameOver = true;
                } else if (board[0].every(c => c !== 0)) {
                    gameOver = true;
                }
                currentPlayer = currentPlayer === 1 ? 2 : 1;
                return true;
            }
        }
        return false;
    }
    
    function checkWin(row, col) {
        const player = board[row][col];
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        
        for (let [dr, dc] of directions) {
            let count = 1;
            for (let i = 1; i < 4; i++) {
                const r = row + dr * i, c = col + dc * i;
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) count++;
                else break;
            }
            for (let i = 1; i < 4; i++) {
                const r = row - dr * i, c = col - dc * i;
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) count++;
                else break;
            }
            if (count >= 4) return true;
        }
        return false;
    }
    
    function aiMove() {
        for (let col = 0; col < COLS; col++) {
            for (let row = ROWS - 1; row >= 0; row--) {
                if (board[row][col] === 0) {
                    board[row][col] = 2;
                    if (checkWin(row, col)) {
                        board[row][col] = 0;
                        return col;
                    }
                    board[row][col] = 0;
                    break;
                }
            }
        }
        
        for (let col = 0; col < COLS; col++) {
            for (let row = ROWS - 1; row >= 0; row--) {
                if (board[row][col] === 0) {
                    board[row][col] = 1;
                    if (checkWin(row, col)) {
                        board[row][col] = 0;
                        return col;
                    }
                    board[row][col] = 0;
                    break;
                }
            }
        }
        
        const validCols = [];
        for (let col = 0; col < COLS; col++) {
            if (board[0][col] === 0) validCols.push(col);
        }
        return validCols[Math.floor(Math.random() * validCols.length)];
    }
    
    function handleClick(e) {
        if (gameOver) {
            board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
            currentPlayer = 1;
            gameOver = false;
            winner = 0;
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const col = Math.floor((mx - OFFSET_X) / CELL_SIZE);
        
        if (col >= 0 && col < COLS && currentPlayer === 1) {
            if (dropPiece(col)) {
                if (!gameOver && aiMode) {
                    setTimeout(() => {
                        const aiCol = aiMove();
                        dropPiece(aiCol);
                    }, 500);
                }
            }
        }
    }
    
    function handleMove(e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        hoverCol = Math.floor((mx - OFFSET_X) / CELL_SIZE);
        if (hoverCol < 0 || hoverCol >= COLS) hoverCol = -1;
    }
    
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMove);
    
    function draw() {
        ctx.fillStyle = '#0a0a2a';
        ctx.fillRect(0, 0, 700, 650);
        
        ctx.fillStyle = '#00ffff';
        ctx.font = '24px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('CONNECT 4', 350, 40);
        
        ctx.font = '12px "Press Start 2P"';
        ctx.fillStyle = currentPlayer === 1 ? '#ff0066' : '#ffff00';
        ctx.fillText(gameOver ? '' : (currentPlayer === 1 ? 'YOUR TURN' : 'AI THINKING...'), 350, 70);
        
        ctx.fillStyle = '#0066cc';
        ctx.beginPath();
        ctx.roundRect(OFFSET_X - 10, OFFSET_Y - 10, COLS * CELL_SIZE + 20, ROWS * CELL_SIZE + 20, 10);
        ctx.fill();
        
        if (hoverCol >= 0 && !gameOver && currentPlayer === 1) {
            ctx.fillStyle = 'rgba(255, 0, 102, 0.5)';
            ctx.beginPath();
            ctx.arc(OFFSET_X + hoverCol * CELL_SIZE + CELL_SIZE/2, OFFSET_Y - 30, 25, 0, Math.PI * 2);
            ctx.fill();
        }
        
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cx = OFFSET_X + col * CELL_SIZE + CELL_SIZE/2;
                const cy = OFFSET_Y + row * CELL_SIZE + CELL_SIZE/2;
                
                ctx.fillStyle = '#001133';
                ctx.beginPath();
                ctx.arc(cx, cy, 32, 0, Math.PI * 2);
                ctx.fill();
                
                if (board[row][col] !== 0) {
                    ctx.fillStyle = board[row][col] === 1 ? '#ff0066' : '#ffff00';
                    ctx.shadowColor = board[row][col] === 1 ? '#ff0066' : '#ffff00';
                    ctx.shadowBlur = 15;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, 700, 650);
            
            ctx.font = '28px "Press Start 2P"';
            ctx.fillStyle = winner === 1 ? '#ff0066' : (winner === 2 ? '#ffff00' : '#fff');
            ctx.fillText(winner === 0 ? 'DRAW!' : (winner === 1 ? 'YOU WIN!' : 'AI WINS!'), 350, 300);
            
            ctx.fillStyle = '#fff';
            ctx.font = '14px "Press Start 2P"';
            ctx.fillText('CLICK TO PLAY AGAIN', 350, 350);
        }
        
        gameLoop = requestAnimationFrame(draw);
    }
    
    draw();
    
    window.currentGameCleanup = () => {
        canvas.removeEventListener('click', handleClick);
        canvas.removeEventListener('mousemove', handleMove);
    };
}

// =============== TOWER STACK ===============
function initTower() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 700;
    
    let blocks = [];
    let currentBlock = null;
    let direction = 1;
    let speed = 3;
    let score = 0;
    let gameOver = false;
    let perfectStreak = 0;
    
    const colors = ['#ff0066', '#00ffff', '#ffff00', '#ff6600', '#00ff66', '#ff00ff', '#6600ff'];
    
    function startGame() {
        blocks = [{ x: 200, y: 650, width: 200, height: 30, color: colors[0] }];
        spawnBlock();
        score = 0;
        gameOver = false;
        perfectStreak = 0;
        speed = 3;
    }
    
    function spawnBlock() {
        const lastBlock = blocks[blocks.length - 1];
        currentBlock = {
            x: 0,
            y: lastBlock.y - 35,
            width: lastBlock.width,
            height: 30,
            color: colors[blocks.length % colors.length]
        };
        direction = 1;
    }
    
    function placeBlock() {
        if (!currentBlock || gameOver) return;
        
        const lastBlock = blocks[blocks.length - 1];
        const overlap = Math.min(currentBlock.x + currentBlock.width, lastBlock.x + lastBlock.width) - 
                       Math.max(currentBlock.x, lastBlock.x);
        
        if (overlap <= 0) {
            gameOver = true;
            return;
        }
        
        const newX = Math.max(currentBlock.x, lastBlock.x);
        const perfectBonus = Math.abs(currentBlock.x - lastBlock.x) < 5;
        
        if (perfectBonus) {
            perfectStreak++;
            score += 10 + perfectStreak * 5;
        } else {
            perfectStreak = 0;
            score += 10;
        }
        
        blocks.push({
            x: newX,
            y: currentBlock.y,
            width: overlap,
            height: 30,
            color: currentBlock.color,
            perfect: perfectBonus
        });
        
        if (blocks.length > 15) {
            blocks.forEach(b => b.y += 35);
        }
        
        speed = Math.min(8, 3 + blocks.length * 0.15);
        spawnBlock();
    }
    
    function handleClick() {
        if (gameOver) {
            startGame();
        } else {
            placeBlock();
        }
    }
    
    canvas.addEventListener('click', handleClick);
    
    function draw() {
        const gradient = ctx.createLinearGradient(0, 0, 0, 700);
        gradient.addColorStop(0, '#1a0a2e');
        gradient.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 600, 700);
        
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 137) % 600;
            const y = (i * 89) % 400;
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 500 + i) * 0.2;
            ctx.fillRect(x, y, 2, 2);
        }
        ctx.globalAlpha = 1;
        
        ctx.fillStyle = '#ffcc00';
        ctx.font = '20px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('TOWER STACK', 300, 35);
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px "Press Start 2P"';
        ctx.fillText(`SCORE: ${score}`, 300, 65);
        
        if (perfectStreak > 1) {
            ctx.fillStyle = '#0f0';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText(`PERFECT x${perfectStreak}!`, 300, 90);
        }
        
        blocks.forEach((block, i) => {
            ctx.fillStyle = block.color;
            if (block.perfect) {
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 20;
            }
            ctx.fillRect(block.x, block.y, block.width, block.height);
            ctx.shadowBlur = 0;
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(block.x, block.y, block.width, block.height);
        });
        
        if (currentBlock && !gameOver) {
            currentBlock.x += speed * direction;
            if (currentBlock.x <= 0 || currentBlock.x + currentBlock.width >= 600) {
                direction *= -1;
            }
            
            ctx.fillStyle = currentBlock.color;
            ctx.shadowColor = currentBlock.color;
            ctx.shadowBlur = 15;
            ctx.fillRect(currentBlock.x, currentBlock.y, currentBlock.width, currentBlock.height);
            ctx.shadowBlur = 0;
        }
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, 600, 700);
            
            ctx.fillStyle = '#ff0066';
            ctx.font = '28px "Press Start 2P"';
            ctx.fillText('GAME OVER', 300, 300);
            
            ctx.fillStyle = '#fff';
            ctx.font = '16px "Press Start 2P"';
            ctx.fillText(`HEIGHT: ${blocks.length - 1}`, 300, 350);
            ctx.fillText(`SCORE: ${score}`, 300, 380);
            
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('CLICK TO RESTART', 300, 430);
        }
        
        gameLoop = requestAnimationFrame(draw);
    }
    
    startGame();
    draw();
    
    window.currentGameCleanup = () => {
        canvas.removeEventListener('click', handleClick);
    };
}

// =============== ASTEROIDS ===============
function initAsteroids() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;
    
    let ship = { x: 400, y: 300, angle: 0, vx: 0, vy: 0, thrust: false };
    let bullets = [];
    let asteroids = [];
    let particles = [];
    let score = 0;
    let lives = 3;
    let gameOver = false;
    let level = 1;
    let invincible = 0;
    let keys = {};
    
    function spawnAsteroids(count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            asteroids.push({
                x: Math.random() * 800,
                y: Math.random() < 0.5 ? 0 : 600,
                vx: Math.cos(angle) * (1 + Math.random()),
                vy: Math.sin(angle) * (1 + Math.random()),
                size: 40,
                points: generateAsteroidShape()
            });
        }
    }
    
    function generateAsteroidShape() {
        const points = [];
        const numPoints = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const radius = 0.7 + Math.random() * 0.3;
            points.push({ angle, radius });
        }
        return points;
    }
    
    function handleKeyDown(e) {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ') {
            e.preventDefault();
            if (!gameOver) shoot();
            else restart();
        }
    }
    
    function handleKeyUp(e) {
        keys[e.key.toLowerCase()] = false;
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    function shoot() {
        bullets.push({
            x: ship.x + Math.cos(ship.angle) * 20,
            y: ship.y + Math.sin(ship.angle) * 20,
            vx: Math.cos(ship.angle) * 10,
            vy: Math.sin(ship.angle) * 10,
            life: 50
        });
    }
    
    function restart() {
        ship = { x: 400, y: 300, angle: 0, vx: 0, vy: 0, thrust: false };
        bullets = [];
        asteroids = [];
        particles = [];
        score = 0;
        lives = 3;
        gameOver = false;
        level = 1;
        invincible = 60;
        spawnAsteroids(4);
    }
    
    function explode(x, y, color) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            particles.push({
                x, y,
                vx: Math.cos(angle) * (2 + Math.random() * 3),
                vy: Math.sin(angle) * (2 + Math.random() * 3),
                life: 30,
                color
            });
        }
    }
    
    function update() {
        if (gameOver) {
            draw();
            gameLoop = requestAnimationFrame(update);
            return;
        }
        
        if (keys['a'] || keys['arrowleft']) ship.angle -= 0.08;
        if (keys['d'] || keys['arrowright']) ship.angle += 0.08;
        if (keys['w'] || keys['arrowup']) {
            ship.vx += Math.cos(ship.angle) * 0.15;
            ship.vy += Math.sin(ship.angle) * 0.15;
            ship.thrust = true;
        } else {
            ship.thrust = false;
        }
        
        ship.vx *= 0.99;
        ship.vy *= 0.99;
        ship.x += ship.vx;
        ship.y += ship.vy;
        
        if (ship.x < 0) ship.x = 800;
        if (ship.x > 800) ship.x = 0;
        if (ship.y < 0) ship.y = 600;
        if (ship.y > 600) ship.y = 0;
        
        if (invincible > 0) invincible--;
        
        bullets = bullets.filter(b => {
            b.x += b.vx;
            b.y += b.vy;
            b.life--;
            
            if (b.x < 0) b.x = 800;
            if (b.x > 800) b.x = 0;
            if (b.y < 0) b.y = 600;
            if (b.y > 600) b.y = 0;
            
            return b.life > 0;
        });
        
        asteroids.forEach(a => {
            a.x += a.vx;
            a.y += a.vy;
            if (a.x < -50) a.x = 850;
            if (a.x > 850) a.x = -50;
            if (a.y < -50) a.y = 650;
            if (a.y > 650) a.y = -50;
        });
        
        particles = particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            return p.life > 0;
        });
        
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const a = asteroids[i];
            
            for (let j = bullets.length - 1; j >= 0; j--) {
                const b = bullets[j];
                const dist = Math.hypot(a.x - b.x, a.y - b.y);
                if (dist < a.size) {
                    bullets.splice(j, 1);
                    explode(a.x, a.y, '#fff');
                    
                    if (a.size > 15) {
                        for (let k = 0; k < 2; k++) {
                            const angle = Math.random() * Math.PI * 2;
                            asteroids.push({
                                x: a.x, y: a.y,
                                vx: Math.cos(angle) * (2 + Math.random()),
                                vy: Math.sin(angle) * (2 + Math.random()),
                                size: a.size / 2,
                                points: generateAsteroidShape()
                            });
                        }
                    }
                    
                    asteroids.splice(i, 1);
                    score += Math.floor(100 / (a.size / 10));
                    break;
                }
            }
            
            if (invincible === 0) {
                const dist = Math.hypot(a.x - ship.x, a.y - ship.y);
                if (dist < a.size + 15) {
                    lives--;
                    invincible = 120;
                    explode(ship.x, ship.y, '#ff0');
                    ship.x = 400;
                    ship.y = 300;
                    ship.vx = 0;
                    ship.vy = 0;
                    if (lives <= 0) gameOver = true;
                }
            }
        }
        
        if (asteroids.length === 0) {
            level++;
            spawnAsteroids(3 + level);
        }
        
        draw();
        gameLoop = requestAnimationFrame(update);
    }
    
    function draw() {
        const time = Date.now() * 0.001;
        
        // Advanced deep space background with nebula
        const bgGrad = ctx.createRadialGradient(400, 300, 0, 400, 300, 600);
        bgGrad.addColorStop(0, '#0a0a1a');
        bgGrad.addColorStop(0.3, '#050510');
        bgGrad.addColorStop(0.6, '#000510');
        bgGrad.addColorStop(1, '#000000');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 800, 600);
        
        // Animated nebula clouds
        for (let i = 0; i < 3; i++) {
            const nebX = 200 + (time * 10 + i * 200) % 400;
            const nebY = 150 + Math.sin(time * 0.5 + i) * 100;
            const nebGrad = ctx.createRadialGradient(nebX, nebY, 0, nebX, nebY, 150);
            nebGrad.addColorStop(0, `rgba(${50 + i * 30}, ${20 + i * 20}, ${100 + i * 50}, 0.3)`);
            nebGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = nebGrad;
            ctx.fillRect(nebX - 150, nebY - 150, 300, 300);
        }
        
        // Advanced starfield with varying sizes and brightness
        for (let i = 0; i < 200; i++) {
            const starX = (i * 137.508) % 800;
            const starY = (i * 197.508) % 600;
            const brightness = (Math.sin(time * 2 + i * 0.1) + 1) / 2;
            const size = 1 + Math.floor((i % 3));
            const starColor = `rgba(255, 255, 255, ${brightness * (0.5 + size * 0.2)})`;
            ctx.fillStyle = starColor;
            ctx.shadowColor = starColor;
            ctx.shadowBlur = size * 2;
            ctx.fillRect(starX - size/2, starY - size/2, size, size);
        }
        ctx.shadowBlur = 0;
        
        // Moving stars (shooting stars effect)
        for (let i = 0; i < 5; i++) {
            const trailX = ((time * 50 + i * 100) % 1000) - 100;
            const trailY = 100 + (i * 100);
            const trailGrad = ctx.createLinearGradient(trailX, trailY, trailX + 30, trailY);
            trailGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            trailGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = trailGrad;
            ctx.fillRect(trailX, trailY, 30, 2);
        }
        
        ctx.fillStyle = '#fff';
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${score}`, 20, 30);
        ctx.fillText(`LEVEL: ${level}`, 20, 55);
        ctx.textAlign = 'right';
        ctx.fillText(`LIVES: ${'▲'.repeat(lives)}`, 780, 30);
        
        // Advanced particle system with trails and glow
        particles.forEach(p => {
            const alpha = p.life / 30;
            const size = 2 + (30 - p.life) / 10;
            
            // Particle trail
            ctx.fillStyle = p.color + Math.floor(alpha * 0.3 * 255).toString(16).padStart(2, '0');
            ctx.fillRect(p.x - size * 0.5, p.y - size * 0.5, size, size);
            
            // Main particle with glow
            ctx.shadowColor = p.color;
            ctx.shadowBlur = size * 3;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        ctx.globalAlpha = 1;
        
        // Enhanced asteroids with 3D effect and glow
        asteroids.forEach(a => {
            // Outer glow
            ctx.shadowColor = '#888';
            ctx.shadowBlur = a.size;
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i <= a.points.length; i++) {
                const p = a.points[i % a.points.length];
                const x = a.x + Math.cos(p.angle) * a.size * p.radius;
                const y = a.y + Math.sin(p.angle) * a.size * p.radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            
            // Main asteroid with gradient fill
            const astGrad = ctx.createRadialGradient(
                a.x - a.size * 0.3, a.y - a.size * 0.3, 0,
                a.x, a.y, a.size
            );
            astGrad.addColorStop(0, '#ddd');
            astGrad.addColorStop(0.5, '#888');
            astGrad.addColorStop(1, '#444');
            ctx.fillStyle = astGrad;
            ctx.fill();
            
            // Inner highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            for (let i = 0; i <= a.points.length; i++) {
                const p = a.points[i % a.points.length];
                const x = a.x - a.size * 0.2 + Math.cos(p.angle) * a.size * 0.3 * p.radius;
                const y = a.y - a.size * 0.2 + Math.sin(p.angle) * a.size * 0.3 * p.radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            
            // Edge highlight
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.shadowBlur = 0;
            ctx.stroke();
        });
        
        if (invincible === 0 || Math.floor(invincible / 5) % 2 === 0) {
            ctx.save();
            ctx.translate(ship.x, ship.y);
            ctx.rotate(ship.angle);
            
            // Ship glow
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur = 15;
            
            // Ship body with gradient
            const shipGrad = ctx.createLinearGradient(20, 0, -15, 0);
            shipGrad.addColorStop(0, '#0ff');
            shipGrad.addColorStop(0.5, '#0aa');
            shipGrad.addColorStop(1, '#055');
            ctx.fillStyle = shipGrad;
            ctx.strokeStyle = '#0ff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(20, 0);
            ctx.lineTo(-15, -12);
            ctx.lineTo(-10, 0);
            ctx.lineTo(-15, 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Ship highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(-12, -8);
            ctx.lineTo(-8, 0);
            ctx.lineTo(-12, 8);
            ctx.closePath();
            ctx.fill();
            
            // Enhanced thrust effect
            if (ship.thrust) {
                const thrustLength = 20 + Math.random() * 15;
                const thrustGrad = ctx.createLinearGradient(-10, 0, -thrustLength, 0);
                thrustGrad.addColorStop(0, '#ff8800');
                thrustGrad.addColorStop(0.5, '#ff4400');
                thrustGrad.addColorStop(1, 'transparent');
                ctx.strokeStyle = thrustGrad;
                ctx.lineWidth = 4;
                ctx.shadowColor = '#ff4400';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(-10, -5);
                ctx.lineTo(-thrustLength, 0);
                ctx.lineTo(-10, 5);
                ctx.stroke();
                
                // Thrust particles
                for (let i = 0; i < 3; i++) {
                    const partX = -15 - Math.random() * thrustLength;
                    const partY = -3 + Math.random() * 6;
                    ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, 0.8)`;
                    ctx.beginPath();
                    ctx.arc(partX, partY, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            ctx.shadowBlur = 0;
            ctx.restore();
        }
        
        // Enhanced bullets with glow and trail
        bullets.forEach(b => {
            // Bullet trail
            const trailGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 8);
            trailGrad.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
            trailGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = trailGrad;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Main bullet
            ctx.shadowColor = '#ff0';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ff0';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, 800, 600);
            
            ctx.fillStyle = '#ff0066';
            ctx.font = '32px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', 400, 280);
            
            ctx.fillStyle = '#fff';
            ctx.font = '16px "Press Start 2P"';
            ctx.fillText(`FINAL SCORE: ${score}`, 400, 330);
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('PRESS SPACE TO RESTART', 400, 380);
        }
    }
    
    restart();
    gameLoop = requestAnimationFrame(update);
    
    window.currentGameCleanup = () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
    };
}

// =============== DRAW BATTLE (Multiplayer) ===============
function initDrawing() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;
    
    const channel = new BroadcastChannel('draw_battle');
    const playerId = 'P' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const playerHue = Math.random() * 360;
    
    const words = [
        'CAT', 'DOG', 'HOUSE', 'TREE', 'CAR', 'SUN', 'MOON', 'STAR', 'FISH', 'BIRD',
        'APPLE', 'PIZZA', 'ROBOT', 'ROCKET', 'FLOWER', 'RAINBOW', 'MOUNTAIN', 'OCEAN',
        'GUITAR', 'PIANO', 'CASTLE', 'DRAGON', 'SWORD', 'CROWN', 'DIAMOND', 'HEART',
        'CLOCK', 'BOAT', 'PLANE', 'TRAIN', 'SNAKE', 'BUTTERFLY', 'ELEPHANT', 'PENGUIN',
        'HAMBURGER', 'ICE CREAM', 'BASKETBALL', 'FOOTBALL', 'FIREWORK', 'LIGHTNING'
    ];
    
    const categories = {
        'Animals': ['CAT', 'DOG', 'FISH', 'BIRD', 'SNAKE', 'BUTTERFLY', 'ELEPHANT', 'PENGUIN'],
        'Food': ['APPLE', 'PIZZA', 'HAMBURGER', 'ICE CREAM'],
        'Nature': ['TREE', 'FLOWER', 'RAINBOW', 'MOUNTAIN', 'OCEAN', 'SUN', 'MOON', 'STAR', 'LIGHTNING'],
        'Objects': ['HOUSE', 'CAR', 'GUITAR', 'PIANO', 'CLOCK', 'BOAT', 'PLANE', 'TRAIN', 'SWORD', 'CROWN'],
        'Fantasy': ['ROBOT', 'ROCKET', 'CASTLE', 'DRAGON', 'DIAMOND', 'HEART', 'FIREWORK']
    };
    
    let gameState = 'waiting';
    let currentWord = '';
    let currentCategory = '';
    let isDrawer = false;
    let drawing = [];
    let currentPath = [];
    let isDrawing = false;
    let color = '#000000';
    let brushSize = 5;
    let brushType = 'round';
    let players = {};
    let guesses = [];
    let timer = 80;
    let round = 0;
    let maxRounds = 3;
    let confetti = [];
    let hints = [];
    let hintRevealed = 0;
    let gameTime = 0;
    let cursorX = 0, cursorY = 0;
    
    const colors = [
        '#000000', '#ffffff', '#ff0000', '#ff6600', '#ffff00', '#00ff00', 
        '#00ffff', '#0066ff', '#9900ff', '#ff00ff', '#8b4513', '#808080'
    ];
    
    const brushSizes = [2, 5, 10, 20, 35];
    
    channel.onmessage = (e) => {
        const data = e.data;
        if (data.type === 'join') {
            players[data.id] = { name: data.id, score: 0, hue: data.hue, avatar: data.avatar };
            channel.postMessage({ type: 'sync', id: playerId, hue: playerHue, players, isDrawer });
        } else if (data.type === 'sync' && data.id !== playerId) {
            players[data.id] = { name: data.id, score: 0, hue: data.hue };
            if (data.isDrawer && gameState === 'waiting') {
                gameState = 'guessing';
            }
        } else if (data.type === 'draw' && data.id !== playerId) {
            drawing = data.drawing;
        } else if (data.type === 'cursor' && data.id !== playerId) {
            if (players[data.id]) {
                players[data.id].cursorX = data.x;
                players[data.id].cursorY = data.y;
            }
        } else if (data.type === 'guess' && data.id !== playerId) {
            guesses.push({ player: data.id, text: data.text, hue: data.hue, time: Date.now() });
            if (guesses.length > 10) guesses.shift();
        } else if (data.type === 'correct' && data.id !== playerId) {
            guesses.push({ player: data.id, text: '✓ CORRECT!', correct: true, hue: data.hue, time: Date.now() });
            players[data.id].score += data.points;
            createConfetti(695, 300);
        } else if (data.type === 'scoreUpdate') {
            if (players[data.id]) {
                players[data.id].score = data.score;
            }
        } else if (data.type === 'newRound') {
            if (data.drawerId === playerId) {
                isDrawer = true;
                currentWord = data.word;
                currentCategory = data.category;
                gameState = 'drawing';
            } else {
                isDrawer = false;
                currentWord = '';
                currentCategory = data.category;
                gameState = 'guessing';
            }
            drawing = [];
            guesses = [];
            timer = 80;
            round = data.round;
            hintRevealed = 0;
            hints = data.word ? data.word.split('').map(() => '_') : [];
        } else if (data.type === 'hint') {
            hints = data.hints;
            hintRevealed = data.revealed;
        } else if (data.type === 'roundEnd') {
            currentWord = data.word;
            gameState = 'roundEnd';
        }
    };
    
    channel.postMessage({ type: 'join', id: playerId, hue: playerHue });
    players[playerId] = { name: playerId, score: 0, hue: playerHue };
    
    function createConfetti(x, y) {
        for (let i = 0; i < 30; i++) {
            confetti.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: -Math.random() * 10 - 5,
                size: 5 + Math.random() * 5,
                hue: Math.random() * 360,
                life: 60 + Math.random() * 30,
                rotation: Math.random() * Math.PI * 2
            });
        }
    }
    
    function startRound() {
        const categoryNames = Object.keys(categories);
        const category = categoryNames[Math.floor(Math.random() * categoryNames.length)];
        const categoryWords = categories[category];
        const word = categoryWords[Math.floor(Math.random() * categoryWords.length)];
        const playerIds = Object.keys(players);
        const drawerId = playerIds[(round) % playerIds.length];
        
        round++;
        channel.postMessage({ type: 'newRound', word, drawerId, round, category });
        
        if (drawerId === playerId) {
            isDrawer = true;
            currentWord = word;
            currentCategory = category;
            gameState = 'drawing';
        } else {
            isDrawer = false;
            currentWord = '';
            currentCategory = category;
            gameState = 'guessing';
        }
        drawing = [];
        guesses = [];
        timer = 80;
        hintRevealed = 0;
        hints = word.split('').map(() => '_');
    }
    
    function revealHint() {
        if (!currentWord || hintRevealed >= currentWord.length - 1) return;
        const indices = [];
        for (let i = 0; i < currentWord.length; i++) {
            if (hints[i] === '_' && currentWord[i] !== ' ') indices.push(i);
        }
        if (indices.length > 0) {
            const idx = indices[Math.floor(Math.random() * indices.length)];
            hints[idx] = currentWord[idx];
            hintRevealed++;
            channel.postMessage({ type: 'hint', hints, revealed: hintRevealed });
        }
    }
    
    function handleMouseDown(e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        
        if (!isDrawer || gameState !== 'drawing') return;
        if (mx < 10 || mx > 590 || my < 80 || my > 520) return;
        
        isDrawing = true;
        currentPath = [{ x: mx, y: my, color, size: brushSize }];
    }
    
    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        cursorX = e.clientX - rect.left;
        cursorY = e.clientY - rect.top;
        
        if (isDrawer) {
            channel.postMessage({ type: 'cursor', id: playerId, x: cursorX, y: cursorY });
        }
        
        if (!isDrawing || !isDrawer) return;
        if (cursorX < 10 || cursorX > 590 || cursorY < 80 || cursorY > 520) return;
        
        currentPath.push({ x: cursorX, y: cursorY, color, size: brushSize });
        drawing = [...drawing.filter(p => p !== currentPath), currentPath];
        channel.postMessage({ type: 'draw', id: playerId, drawing });
    }
    
    function handleMouseUp() {
        if (isDrawing && currentPath.length > 0) {
            drawing.push([...currentPath]);
            channel.postMessage({ type: 'draw', id: playerId, drawing });
        }
        isDrawing = false;
        currentPath = [];
    }
    
    let guessInput = '';
    function handleKeyDown(e) {
        if (gameState === 'waiting' && e.key === ' ') {
            e.preventDefault();
            startRound();
        } else if (gameState === 'roundEnd' && e.key === ' ') {
            e.preventDefault();
            if (round >= maxRounds) {
                gameState = 'waiting';
                round = 0;
            } else {
                startRound();
            }
        } else if (!isDrawer && gameState === 'guessing') {
            if (e.key === 'Enter' && guessInput.length > 0) {
                const guess = guessInput.toUpperCase();
                if (guess === currentWord) {
                    const points = Math.ceil(timer / 10) * 10 + 20;
                    players[playerId].score += points;
                    channel.postMessage({ type: 'correct', id: playerId, hue: playerHue, points });
                    channel.postMessage({ type: 'scoreUpdate', id: playerId, score: players[playerId].score });
                    guesses.push({ player: playerId, text: '✓ CORRECT!', correct: true, hue: playerHue, time: Date.now() });
                    createConfetti(300, 300);
                } else {
                    channel.postMessage({ type: 'guess', id: playerId, text: guess, hue: playerHue });
                    guesses.push({ player: playerId, text: guess, hue: playerHue, time: Date.now() });
                }
                guessInput = '';
            } else if (e.key === 'Backspace') {
                guessInput = guessInput.slice(0, -1);
            } else if (e.key.length === 1 && /[a-zA-Z ]/.test(e.key) && guessInput.length < 20) {
                guessInput += e.key.toUpperCase();
            }
        }
    }
    
    function handleClick(e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        
        if (isDrawer && gameState === 'drawing') {
            // Color palette
            colors.forEach((c, i) => {
                const row = Math.floor(i / 6);
                const col = i % 6;
                const px = 15 + col * 32;
                const py = 530 + row * 28;
                if (mx >= px && mx < px + 28 && my >= py && my < py + 24) {
                    color = c;
                }
            });
            
            // Brush sizes
            brushSizes.forEach((s, i) => {
                const px = 220 + i * 45;
                if (mx >= px && mx < px + 40 && my >= 530 && my < 585) {
                    brushSize = s;
                }
            });
            
            // Clear button
            if (mx >= 470 && mx < 540 && my >= 540 && my < 575) {
                drawing = [];
                channel.postMessage({ type: 'draw', id: playerId, drawing: [] });
            }
            
            // Undo button
            if (mx >= 545 && mx < 590 && my >= 540 && my < 575) {
                if (drawing.length > 0) {
                    drawing.pop();
                    channel.postMessage({ type: 'draw', id: playerId, drawing });
                }
            }
        }
        
        // Start button in waiting screen
        if (gameState === 'waiting' && mx >= 300 && mx < 500 && my >= 340 && my < 390) {
            startRound();
        }
    }
    
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    let lastTime = Date.now();
    function update() {
        gameTime++;
        const now = Date.now();
        
        if (now - lastTime >= 1000 && (gameState === 'drawing' || gameState === 'guessing')) {
            timer--;
            lastTime = now;
            
            // Auto hints
            if (timer === 50 || timer === 30 || timer === 15) {
                if (isDrawer) revealHint();
            }
            
            if (timer <= 0) {
                channel.postMessage({ type: 'roundEnd', word: currentWord });
                gameState = 'roundEnd';
            }
        }
        
        // Update confetti
        confetti = confetti.filter(c => {
            c.x += c.vx;
            c.y += c.vy;
            c.vy += 0.3;
            c.rotation += 0.1;
            c.life--;
            return c.life > 0;
        });
        
        draw();
        gameLoop = requestAnimationFrame(update);
    }
    
    function draw() {
        // Background with gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 600);
        bgGrad.addColorStop(0, '#1a1a3e');
        bgGrad.addColorStop(1, '#0d0d1a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 800, 600);
        
        // Decorative pattern
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let i = 0; i < 20; i++) {
            const x = (i * 50 + gameTime * 0.2) % 850 - 50;
            ctx.beginPath();
            ctx.arc(x, 100 + Math.sin(i + gameTime * 0.02) * 20, 30, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Header bar
        const headerGrad = ctx.createLinearGradient(0, 0, 800, 0);
        headerGrad.addColorStop(0, '#ff0066');
        headerGrad.addColorStop(0.5, '#ff00ff');
        headerGrad.addColorStop(1, '#00ffff');
        ctx.fillStyle = headerGrad;
        ctx.fillRect(0, 0, 800, 70);
        
        // Title with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('🎨 DRAW BATTLE', 300, 40);
        ctx.shadowBlur = 0;
        
        // Round info
        ctx.fillStyle = '#fff';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText(`ROUND ${round}/${maxRounds}`, 300, 60);
        
        // Timer with visual indicator
        const timerColor = timer <= 10 ? '#ff0000' : timer <= 30 ? '#ffff00' : '#00ff00';
        ctx.fillStyle = timerColor;
        ctx.font = 'bold 20px "Press Start 2P"';
        ctx.textAlign = 'right';
        ctx.fillText(`${timer}`, 780, 45);
        
        // Timer bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(650, 50, 130, 10);
        ctx.fillStyle = timerColor;
        ctx.fillRect(650, 50, 130 * (timer / 80), 10);
        
        // Category badge
        if (currentCategory) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(10, 50, 120, 18);
            ctx.fillStyle = '#fff';
            ctx.font = '8px "Press Start 2P"';
            ctx.textAlign = 'left';
            ctx.fillText(currentCategory.toUpperCase(), 15, 62);
        }
        
        // Drawing canvas with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 5;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, 80, 580, 440);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        
        // Canvas border
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 80, 580, 440);
        
        // Draw paths
        ctx.save();
        ctx.beginPath();
        ctx.rect(10, 80, 580, 440);
        ctx.clip();
        
        drawing.forEach(path => {
            if (path.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = path[0].color;
            ctx.lineWidth = path[0].size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.stroke();
        });
        
        if (currentPath.length >= 2) {
            ctx.beginPath();
            ctx.strokeStyle = currentPath[0].color;
            ctx.lineWidth = currentPath[0].size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(currentPath[i].x, currentPath[i].y);
            }
            ctx.stroke();
        }
        
        // Draw other players' cursors
        for (let id in players) {
            if (id !== playerId && players[id].cursorX) {
                ctx.fillStyle = `hsl(${players[id].hue}, 70%, 50%)`;
                ctx.beginPath();
                ctx.arc(players[id].cursorX, players[id].cursorY, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = '8px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(id, players[id].cursorX, players[id].cursorY - 12);
            }
        }
        
        ctx.restore();
        
        // Word hint / drawer word
        if (isDrawer && currentWord) {
            ctx.fillStyle = 'rgba(0, 200, 0, 0.9)';
            ctx.fillRect(150, 82, 300, 30);
            ctx.fillStyle = '#fff';
            ctx.font = '12px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(`DRAW: ${currentWord}`, 300, 102);
        } else if (gameState === 'guessing' && hints.length > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(150, 82, 300, 30);
            ctx.fillStyle = '#ffff00';
            ctx.font = '14px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(hints.join(' '), 300, 102);
        }
        
        // Tools panel (for drawer)
        if (isDrawer && gameState === 'drawing') {
            ctx.fillStyle = 'rgba(30, 30, 50, 0.95)';
            ctx.fillRect(10, 525, 580, 70);
            
            // Color palette
            colors.forEach((c, i) => {
                const row = Math.floor(i / 6);
                const col = i % 6;
                const px = 15 + col * 32;
                const py = 530 + row * 28;
                
                ctx.fillStyle = c;
                ctx.fillRect(px, py, 28, 24);
                
                if (c === color) {
                    ctx.strokeStyle = c === '#ffffff' ? '#000' : '#fff';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(px - 2, py - 2, 32, 28);
                }
            });
            
            // Brush sizes
            ctx.fillStyle = '#666';
            ctx.font = '8px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('SIZE', 330, 542);
            
            brushSizes.forEach((s, i) => {
                const px = 220 + i * 45;
                ctx.fillStyle = brushSize === s ? '#00ffff' : '#444';
                ctx.fillRect(px, 548, 40, 40);
                
                ctx.fillStyle = brushSize === s ? '#000' : '#888';
                ctx.beginPath();
                ctx.arc(px + 20, 568, Math.min(s, 15), 0, Math.PI * 2);
                ctx.fill();
            });
            
            // Clear button
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(470, 540, 70, 35);
            ctx.fillStyle = '#fff';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('CLEAR', 505, 562);
            
            // Undo button
            ctx.fillStyle = '#666';
            ctx.fillRect(545, 540, 40, 35);
            ctx.fillStyle = '#fff';
            ctx.font = '14px Arial';
            ctx.fillText('↩', 565, 563);
        }
        
        // Guess input (for guessers)
        if (!isDrawer && gameState === 'guessing') {
            ctx.fillStyle = 'rgba(30, 30, 50, 0.95)';
            ctx.fillRect(10, 525, 580, 70);
            
            ctx.fillStyle = '#333';
            ctx.fillRect(20, 540, 450, 40);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(20, 540, 450, 40);
            
            ctx.fillStyle = '#fff';
            ctx.font = '14px "Press Start 2P"';
            ctx.textAlign = 'left';
            ctx.fillText(guessInput + (gameTime % 30 < 15 ? '|' : ''), 30, 567);
            
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(480, 540, 100, 40);
            ctx.fillStyle = '#000';
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GUESS', 530, 565);
        }
        
        // Players panel
        ctx.fillStyle = 'rgba(20, 20, 40, 0.95)';
        ctx.fillRect(595, 80, 200, 515);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(595, 80, 200, 515);
        
        // Players header
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('👥 PLAYERS', 695, 105);
        
        // Player list
        let py = 130;
        const sortedPlayers = Object.entries(players).sort((a, b) => b[1].score - a[1].score);
        sortedPlayers.forEach(([id, p], idx) => {
            const isMe = id === playerId;
            const isDrawerPlayer = isDrawer && id === playerId;
            
            ctx.fillStyle = isMe ? 'rgba(255, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(600, py - 15, 190, 35);
            
            // Rank
            ctx.fillStyle = idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#666';
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'left';
            ctx.fillText(`${idx + 1}.`, 608, py + 5);
            
            // Avatar circle
            ctx.fillStyle = `hsl(${p.hue}, 70%, 50%)`;
            ctx.beginPath();
            ctx.arc(650, py, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(id[0], 650, py + 4);
            
            // Name
            ctx.fillStyle = isMe ? '#ffff00' : '#fff';
            ctx.font = '9px "Press Start 2P"';
            ctx.textAlign = 'left';
            ctx.fillText(id, 670, py);
            
            // Score
            ctx.fillStyle = '#00ff00';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText(`${p.score}`, 670, py + 14);
            
            // Drawing indicator
            if (isDrawerPlayer || (!isDrawer && currentWord === '' && idx === round % sortedPlayers.length)) {
                ctx.fillStyle = '#ff0066';
                ctx.font = '8px Arial';
                ctx.fillText('✏️', 770, py);
            }
            
            py += 40;
        });
        
        // Chat section
        ctx.fillStyle = '#ff0066';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('💬 GUESSES', 695, 350);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(600, 360, 190, 230);
        
        guesses.slice(-8).forEach((g, i) => {
            const age = Date.now() - g.time;
            const alpha = Math.max(0.5, 1 - age / 10000);
            
            ctx.fillStyle = g.correct ? `rgba(0, 255, 0, ${alpha})` : `hsla(${g.hue}, 70%, 70%, ${alpha})`;
            ctx.font = '8px "Press Start 2P"';
            ctx.textAlign = 'left';
            ctx.fillText(`${g.player}:`, 605, 380 + i * 28);
            ctx.fillStyle = g.correct ? `rgba(0, 255, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
            ctx.fillText(g.text.substring(0, 12), 605, 395 + i * 28);
        });
        
        // Confetti
        confetti.forEach(c => {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rotation);
            ctx.fillStyle = `hsla(${c.hue}, 100%, 60%, ${c.life / 60})`;
            ctx.fillRect(-c.size/2, -c.size/4, c.size, c.size/2);
            ctx.restore();
        });
        
        // Waiting screen
        if (gameState === 'waiting') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            ctx.fillRect(0, 0, 800, 600);
            
            // Animated title
            ctx.save();
            ctx.translate(400, 200);
            ctx.rotate(Math.sin(gameTime * 0.05) * 0.05);
            
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 30;
            ctx.fillStyle = '#fff';
            ctx.font = '32px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('🎨 DRAW BATTLE 🎨', 0, 0);
            ctx.shadowBlur = 0;
            ctx.restore();
            
            ctx.fillStyle = '#aaa';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('Draw and guess with friends!', 400, 260);
            
            ctx.fillStyle = '#fff';
            ctx.font = '14px "Press Start 2P"';
            ctx.fillText(`${Object.keys(players).length} PLAYER(S) CONNECTED`, 400, 310);
            
            // Start button
            const btnGlow = Math.sin(gameTime * 0.1) * 10 + 20;
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = btnGlow;
            ctx.fillStyle = '#00aa00';
            ctx.fillRect(300, 340, 200, 50);
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = '#fff';
            ctx.font = '14px "Press Start 2P"';
            ctx.fillText('START GAME', 400, 372);
            
            ctx.fillStyle = '#888';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('or press SPACE', 400, 420);
        }
        
        // Round end screen
        if (gameState === 'roundEnd') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, 800, 600);
            
            ctx.fillStyle = '#ff0066';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('TIME\'S UP!', 400, 200);
            
            ctx.fillStyle = '#fff';
            ctx.font = '14px "Press Start 2P"';
            ctx.fillText('The word was:', 400, 260);
            
            ctx.fillStyle = '#00ffff';
            ctx.font = '28px "Press Start 2P"';
            ctx.fillText(currentWord, 400, 310);
            
            ctx.fillStyle = '#888';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText(round >= maxRounds ? 'GAME OVER - Press SPACE' : 'Press SPACE for next round', 400, 400);
        }
    }
    
    update();
    
    window.currentGameCleanup = () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('click', handleClick);
        document.removeEventListener('keydown', handleKeyDown);
        channel.close();
    };
}

// =============== ZOMBIE WAVE ===============
function initZombies() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;
    
    let player = { x: 400, y: 300, angle: 0, health: 100 };
    let zombies = [];
    let bullets = [];
    let particles = [];
    let score = 0;
    let wave = 1;
    let gameOver = false;
    let kills = 0;
    let keys = {};
    let mouseX = 400, mouseY = 300;
    let lastShot = 0;
    const fireRate = 150;
    
    function spawnWave() {
        const count = 5 + wave * 3;
        for (let i = 0; i < count; i++) {
            const side = Math.floor(Math.random() * 4);
            let x, y;
            switch (side) {
                case 0: x = Math.random() * 800; y = -30; break;
                case 1: x = 830; y = Math.random() * 600; break;
                case 2: x = Math.random() * 800; y = 630; break;
                case 3: x = -30; y = Math.random() * 600; break;
            }
            zombies.push({
                x, y,
                health: 30 + wave * 5,
                maxHealth: 30 + wave * 5,
                speed: 0.8 + Math.random() * 0.5 + wave * 0.1,
                type: Math.random() < 0.2 ? 'big' : 'normal'
            });
        }
    }
    
    function handleKeyDown(e) {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ' && gameOver) restart();
    }
    
    function handleKeyUp(e) {
        keys[e.key.toLowerCase()] = false;
    }
    
    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    }
    
    function handleMouseDown(e) {
        keys['mouse'] = true;
    }
    
    function handleMouseUp(e) {
        keys['mouse'] = false;
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    function shoot() {
        const now = Date.now();
        if (now - lastShot < fireRate) return;
        lastShot = now;
        
        bullets.push({
            x: player.x + Math.cos(player.angle) * 20,
            y: player.y + Math.sin(player.angle) * 20,
            vx: Math.cos(player.angle) * 15,
            vy: Math.sin(player.angle) * 15
        });
    }
    
    function restart() {
        player = { x: 400, y: 300, angle: 0, health: 100 };
        zombies = [];
        bullets = [];
        particles = [];
        score = 0;
        wave = 1;
        kills = 0;
        gameOver = false;
        spawnWave();
    }
    
    function explode(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            particles.push({
                x, y,
                vx: Math.cos(angle) * (2 + Math.random() * 4),
                vy: Math.sin(angle) * (2 + Math.random() * 4),
                life: 20 + Math.random() * 10,
                color, size: 3 + Math.random() * 3
            });
        }
    }
    
    function update() {
        if (gameOver) {
            draw();
            gameLoop = requestAnimationFrame(update);
            return;
        }
        
        let dx = 0, dy = 0;
        if (keys['w'] || keys['arrowup']) dy -= 4;
        if (keys['s'] || keys['arrowdown']) dy += 4;
        if (keys['a'] || keys['arrowleft']) dx -= 4;
        if (keys['d'] || keys['arrowright']) dx += 4;
        
        player.x = Math.max(20, Math.min(780, player.x + dx));
        player.y = Math.max(20, Math.min(580, player.y + dy));
        player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
        
        if (keys['mouse']) shoot();
        
        bullets = bullets.filter(b => {
            b.x += b.vx;
            b.y += b.vy;
            return b.x > 0 && b.x < 800 && b.y > 0 && b.y < 600;
        });
        
        zombies.forEach(z => {
            const angle = Math.atan2(player.y - z.y, player.x - z.x);
            z.x += Math.cos(angle) * z.speed;
            z.y += Math.sin(angle) * z.speed;
            
            const dist = Math.hypot(player.x - z.x, player.y - z.y);
            if (dist < 30) {
                player.health -= 0.5;
                if (player.health <= 0) gameOver = true;
            }
        });
        
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            for (let j = zombies.length - 1; j >= 0; j--) {
                const z = zombies[j];
                const dist = Math.hypot(b.x - z.x, b.y - z.y);
                const hitRadius = z.type === 'big' ? 30 : 20;
                
                if (dist < hitRadius) {
                    bullets.splice(i, 1);
                    z.health -= 20;
                    explode(b.x, b.y, '#8f0', 3);
                    
                    if (z.health <= 0) {
                        zombies.splice(j, 1);
                        explode(z.x, z.y, '#0f0', 15);
                        score += z.type === 'big' ? 50 : 20;
                        kills++;
                    }
                    break;
                }
            }
        }
        
        particles = particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.life--;
            return p.life > 0;
        });
        
        if (zombies.length === 0) {
            wave++;
            player.health = Math.min(100, player.health + 20);
            spawnWave();
        }
        
        draw();
        gameLoop = requestAnimationFrame(update);
    }
    
    function draw() {
        const time = Date.now() * 0.001;
        
        // Advanced post-apocalyptic background
        const bgGrad = ctx.createRadialGradient(400, 300, 0, 400, 300, 600);
        bgGrad.addColorStop(0, '#2a0a0a');
        bgGrad.addColorStop(0.4, '#1a0505');
        bgGrad.addColorStop(0.7, '#0a0000');
        bgGrad.addColorStop(1, '#000000');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 800, 600);
        
        // Animated fog/mist effect
        for (let i = 0; i < 5; i++) {
            const fogX = ((time * 20 + i * 150) % 1000) - 100;
            const fogY = 200 + Math.sin(time * 0.3 + i) * 100;
            const fogGrad = ctx.createRadialGradient(fogX, fogY, 0, fogX, fogY, 200);
            fogGrad.addColorStop(0, `rgba(${50 + i * 10}, ${20 + i * 5}, ${20 + i * 5}, 0.15)`);
            fogGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = fogGrad;
            ctx.fillRect(fogX - 200, fogY - 200, 400, 400);
        }
        
        // Enhanced grid with glow
        ctx.strokeStyle = 'rgba(100, 20, 20, 0.2)';
        ctx.shadowColor = 'rgba(255, 0, 0, 0.1)';
        ctx.shadowBlur = 2;
        ctx.lineWidth = 1;
        for (let x = 0; x < 800; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 600);
            ctx.stroke();
        }
        for (let y = 0; y < 600; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(800, y);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        
        // Blood splatter effects (subtle)
        for (let i = 0; i < 10; i++) {
            const splatX = (i * 137.508) % 800;
            const splatY = (i * 197.508) % 600;
            const splatGrad = ctx.createRadialGradient(splatX, splatY, 0, splatX, splatY, 15);
            splatGrad.addColorStop(0, 'rgba(100, 0, 0, 0.3)');
            splatGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = splatGrad;
            ctx.beginPath();
            ctx.arc(splatX, splatY, 15, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Advanced particle system with trails
        particles.forEach(p => {
            const alpha = p.life / 30;
            const size = p.size || 3;
            
            // Particle trail
            ctx.fillStyle = p.color + Math.floor(alpha * 0.4 * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(p.x, p.y, size * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
            // Main particle with glow
            ctx.shadowColor = p.color;
            ctx.shadowBlur = size * 2;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Bright core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        
        // Enhanced zombies with 3D effect and glow
        zombies.forEach(z => {
            const size = z.type === 'big' ? 25 : 18;
            const pulse = 1 + Math.sin(time * 5 + z.x * 0.1) * 0.1;
            
            // Outer glow (toxic green)
            ctx.shadowColor = '#88ff44';
            ctx.shadowBlur = size * 1.5;
            ctx.fillStyle = z.type === 'big' ? '#6a0' : '#4a0';
            ctx.beginPath();
            ctx.arc(z.x, z.y, size * pulse, 0, Math.PI * 2);
            ctx.fill();
            
            // Main zombie body with gradient
            const zombieGrad = ctx.createRadialGradient(
                z.x - size * 0.3, z.y - size * 0.3, 0,
                z.x, z.y, size
            );
            zombieGrad.addColorStop(0, z.type === 'big' ? '#8a0' : '#6a0');
            zombieGrad.addColorStop(0.5, z.type === 'big' ? '#6a0' : '#4a0');
            zombieGrad.addColorStop(1, z.type === 'big' ? '#3a0' : '#2a0');
            ctx.fillStyle = zombieGrad;
            ctx.shadowBlur = size;
            ctx.beginPath();
            ctx.arc(z.x, z.y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Eyes (glowing)
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(z.x - size * 0.3, z.y - size * 0.2, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(z.x + size * 0.3, z.y - size * 0.2, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
            
            // Health bar with glow
            const barWidth = size * 2;
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#300';
            ctx.fillRect(z.x - barWidth/2, z.y - size - 12, barWidth, 6);
            ctx.fillStyle = '#0f0';
            ctx.shadowColor = '#0f0';
            ctx.shadowBlur = 3;
            ctx.fillRect(z.x - barWidth/2, z.y - size - 12, barWidth * (z.health / z.maxHealth), 6);
            ctx.shadowBlur = 0;
        });
        
        // Enhanced bullets with glow and trail
        bullets.forEach(b => {
            // Bullet trail
            const trailGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 10);
            trailGrad.addColorStop(0, 'rgba(255, 255, 0, 0.6)');
            trailGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = trailGrad;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Main bullet
            ctx.shadowColor = '#ff0';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#ff0';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        
        // Enhanced player with glow
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        
        // Player glow
        ctx.shadowColor = '#0088ff';
        ctx.shadowBlur = 20;
        
        // Player body with gradient
        const playerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
        playerGrad.addColorStop(0, '#00aaff');
        playerGrad.addColorStop(0.5, '#0088ff');
        playerGrad.addColorStop(1, '#0066aa');
        ctx.fillStyle = playerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(-5, -5, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Gun
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#333';
        ctx.fillRect(10, -4, 20, 8);
        ctx.fillStyle = '#666';
        ctx.fillRect(12, -2, 16, 4);
        
        ctx.restore();
        
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mouseX - 15, mouseY);
        ctx.lineTo(mouseX + 15, mouseY);
        ctx.moveTo(mouseX, mouseY - 15);
        ctx.lineTo(mouseX, mouseY + 15);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`WAVE: ${wave}`, 20, 30);
        ctx.fillText(`SCORE: ${score}`, 20, 55);
        ctx.fillText(`KILLS: ${kills}`, 20, 80);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(600, 20, 180, 20);
        ctx.fillStyle = player.health > 50 ? '#0f0' : player.health > 25 ? '#ff0' : '#f00';
        ctx.fillRect(600, 20, 180 * (player.health / 100), 20);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(600, 20, 180, 20);
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, 800, 600);
            
            ctx.fillStyle = '#f00';
            ctx.font = '32px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', 400, 250);
            
            ctx.fillStyle = '#fff';
            ctx.font = '16px "Press Start 2P"';
            ctx.fillText(`WAVES SURVIVED: ${wave - 1}`, 400, 310);
            ctx.fillText(`ZOMBIES KILLED: ${kills}`, 400, 345);
            ctx.fillText(`SCORE: ${score}`, 400, 380);
            
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('PRESS SPACE TO RESTART', 400, 430);
        }
    }
    
    restart();
    gameLoop = requestAnimationFrame(update);
    
    window.currentGameCleanup = () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mouseup', handleMouseUp);
    };
}

// =============== NEON RUN (Endless Runner) ===============
function initRunner() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 400;
    
    let player = { x: 100, y: 300, vy: 0, jumping: false, ducking: false };
    let obstacles = [];
    let coins = [];
    let particles = [];
    let score = 0;
    let distance = 0;
    let speed = 8;
    let gameOver = false;
    let groundY = 320;
    
    function handleKeyDown(e) {
        if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && !player.jumping) {
            player.vy = -18;
            player.jumping = true;
        }
        if (e.key === 'ArrowDown' || e.key === 's') {
            player.ducking = true;
        }
        if (gameOver && e.key === ' ') restart();
    }
    
    function handleKeyUp(e) {
        if (e.key === 'ArrowDown' || e.key === 's') {
            player.ducking = false;
        }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    function restart() {
        player = { x: 100, y: 300, vy: 0, jumping: false, ducking: false };
        obstacles = [];
        coins = [];
        particles = [];
        score = 0;
        distance = 0;
        speed = 8;
        gameOver = false;
    }
    
    function spawnObstacle() {
        const types = ['low', 'high', 'double'];
        const type = types[Math.floor(Math.random() * types.length)];
        obstacles.push({
            x: 850,
            type,
            height: type === 'low' ? 40 : type === 'high' ? 30 : 60,
            y: type === 'high' ? groundY - 80 : groundY
        });
    }
    
    function spawnCoin() {
        coins.push({
            x: 850,
            y: groundY - 60 - Math.random() * 80,
            collected: false
        });
    }
    
    let lastObstacle = 0;
    let lastCoin = 0;
    
    function update() {
        if (gameOver) {
            draw();
            gameLoop = requestAnimationFrame(update);
            return;
        }
        
        distance += speed;
        speed = 8 + Math.floor(distance / 2000) * 0.5;
        
        if (distance - lastObstacle > 400 + Math.random() * 300) {
            spawnObstacle();
            lastObstacle = distance;
        }
        
        if (distance - lastCoin > 200 + Math.random() * 200) {
            spawnCoin();
            lastCoin = distance;
        }
        
        player.vy += 1;
        player.y += player.vy;
        
        if (player.y >= groundY) {
            player.y = groundY;
            player.vy = 0;
            player.jumping = false;
        }
        
        obstacles = obstacles.filter(o => {
            o.x -= speed;
            
            const playerHeight = player.ducking ? 25 : 50;
            const playerY = player.ducking ? groundY - 25 : player.y - 50;
            
            if (o.x < player.x + 30 && o.x + 30 > player.x - 15) {
                if (o.type === 'high') {
                    if (playerY < o.y + o.height && !player.ducking) {
                        gameOver = true;
                    }
                } else {
                    if (player.y > o.y - o.height) {
                        gameOver = true;
                    }
                }
            }
            
            return o.x > -50;
        });
        
        coins = coins.filter(c => {
            c.x -= speed;
            
            if (!c.collected && Math.hypot(c.x - player.x, c.y - (player.y - 25)) < 30) {
                c.collected = true;
                score += 10;
                for (let i = 0; i < 5; i++) {
                    particles.push({
                        x: c.x, y: c.y,
                        vx: (Math.random() - 0.5) * 5,
                        vy: (Math.random() - 0.5) * 5,
                        life: 20, color: '#ff0'
                    });
                }
                return false;
            }
            
            return c.x > -20;
        });
        
        particles = particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            return p.life > 0;
        });
        
        draw();
        gameLoop = requestAnimationFrame(update);
    }
    
    function draw() {
        const time = Date.now() * 0.001;
        
        // Advanced synthwave background
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        const hueShift = (time * 20) % 360;
        gradient.addColorStop(0, `hsl(${(hueShift + 280) % 360}, 80%, 10%)`);
        gradient.addColorStop(0.3, `hsl(${(hueShift + 300) % 360}, 70%, 15%)`);
        gradient.addColorStop(0.6, `hsl(${(hueShift + 320) % 360}, 60%, 12%)`);
        gradient.addColorStop(1, `hsl(${(hueShift + 340) % 360}, 50%, 8%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 400);
        
        // Animated grid lines (synthwave effect)
        ctx.strokeStyle = `rgba(255, 0, 255, 0.2)`;
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 3;
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            const y = ((distance * 0.5 + i * 40) % 400);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(800, y);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        
        // Neon sun
        const sunGrad = ctx.createRadialGradient(400, 50, 0, 400, 50, 150);
        sunGrad.addColorStop(0, `rgba(255, 0, 255, 0.3)`);
        sunGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(250, -50, 300, 200);
        
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 53 + distance * 0.1) % 800;
            const y = (i * 97) % 200;
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 500 + i) * 0.2;
            ctx.fillRect(x, y, 2, 2);
        }
        ctx.globalAlpha = 1;
        
        // Enhanced neon ground with glow
        const groundGrad = ctx.createLinearGradient(0, groundY, 0, 400);
        groundGrad.addColorStop(0, '#00ff00');
        groundGrad.addColorStop(0.3, '#00aa00');
        groundGrad.addColorStop(1, '#005500');
        ctx.fillStyle = groundGrad;
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 15;
        ctx.fillRect(0, groundY, 800, 80);
        ctx.shadowBlur = 0;
        
        // Enhanced perspective lines with glow
        ctx.strokeStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 5;
        ctx.lineWidth = 2;
        for (let x = -distance % 50; x < 800; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, groundY + 3);
            ctx.lineTo(x + 100, 400);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        
        particles.forEach(p => {
            ctx.globalAlpha = p.life / 20;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        // Enhanced coins with rotation and glow
        coins.forEach(c => {
            const coinGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 12);
            coinGrad.addColorStop(0, '#ffff00');
            coinGrad.addColorStop(0.5, '#ffaa00');
            coinGrad.addColorStop(1, '#ff6600');
            ctx.fillStyle = coinGrad;
            ctx.shadowColor = '#ff0';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(c.x, c.y, 12, 0, Math.PI * 2);
            ctx.fill();
            // Inner highlight
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(c.x - 3, c.y - 3, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        
        // Enhanced obstacles with gradient
        obstacles.forEach(o => {
            const obsGrad = ctx.createLinearGradient(o.x - 15, o.y, o.x + 15, o.y);
            obsGrad.addColorStop(0, '#ff0000');
            obsGrad.addColorStop(0.5, '#cc0000');
            obsGrad.addColorStop(1, '#990000');
            ctx.fillStyle = obsGrad;
            ctx.shadowColor = '#f00';
            ctx.shadowBlur = 12;
            if (o.type === 'high') {
                ctx.fillRect(o.x - 15, o.y, 30, o.height);
            } else {
                ctx.fillRect(o.x - 15, o.y - o.height, 30, o.height);
            }
            // Border
            ctx.strokeStyle = '#ff6666';
            ctx.lineWidth = 2;
            ctx.strokeRect(o.x - 15, o.type === 'high' ? o.y : o.y - o.height, 30, o.height);
        });
        ctx.shadowBlur = 0;
        
        // Enhanced player with gradient and glow
        const playerHeight = player.ducking ? 25 : 50;
        const playerGrad = ctx.createLinearGradient(player.x - 15, player.y - playerHeight, player.x + 15, player.y);
        playerGrad.addColorStop(0, '#00ffff');
        playerGrad.addColorStop(0.5, '#00aaff');
        playerGrad.addColorStop(1, '#0088ff');
        ctx.fillStyle = playerGrad;
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 20;
        ctx.fillRect(player.x - 15, player.y - playerHeight, 30, playerHeight);
        
        // Player highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(player.x - 10, player.y - playerHeight + 5, 20, 10);
        ctx.shadowBlur = 0;
        
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(player.x + 5, player.y - playerHeight + 10, 8, 8);
        ctx.fillRect(player.x - 13, player.y - playerHeight + 10, 8, 8);
        
        ctx.fillStyle = '#fff';
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${score}`, 20, 30);
        ctx.fillText(`DISTANCE: ${Math.floor(distance / 10)}m`, 20, 55);
        ctx.textAlign = 'right';
        ctx.fillText(`SPEED: ${speed.toFixed(1)}`, 780, 30);
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, 800, 400);
            
            ctx.fillStyle = '#ff0066';
            ctx.font = '28px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', 400, 160);
            
            ctx.fillStyle = '#fff';
            ctx.font = '14px "Press Start 2P"';
            ctx.fillText(`DISTANCE: ${Math.floor(distance / 10)}m`, 400, 210);
            ctx.fillText(`SCORE: ${score}`, 400, 240);
            
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('PRESS SPACE TO RESTART', 400, 290);
        }
    }
    
    restart();
    gameLoop = requestAnimationFrame(update);
    
    window.currentGameCleanup = () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
    };
}

// =============== WORD GUESS (Wordle-style) ===============
function initWordle() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 500;
    canvas.height = 600;
    
    const words = ['PIXEL', 'GAMES', 'NEONS', 'CODER', 'STORM', 'BLADE', 'QUEST', 'POWER', 
                   'FLAME', 'GHOST', 'DREAM', 'LASER', 'TURBO', 'CYBER', 'ULTRA'];
    
    let targetWord = words[Math.floor(Math.random() * words.length)];
    let guesses = [];
    let currentGuess = '';
    let gameOver = false;
    let won = false;
    let shake = 0;
    let message = '';
    
    function handleKeyDown(e) {
        if (gameOver) {
            if (e.key === ' ') restart();
            return;
        }
        
        if (e.key === 'Enter' && currentGuess.length === 5) {
            submitGuess();
        } else if (e.key === 'Backspace') {
            currentGuess = currentGuess.slice(0, -1);
        } else if (/^[a-zA-Z]$/.test(e.key) && currentGuess.length < 5) {
            currentGuess += e.key.toUpperCase();
        }
    }
    
    function submitGuess() {
        const result = [];
        const targetArr = targetWord.split('');
        const guessArr = currentGuess.split('');
        
        for (let i = 0; i < 5; i++) {
            if (guessArr[i] === targetArr[i]) {
                result[i] = 'correct';
                targetArr[i] = null;
                guessArr[i] = null;
            }
        }
        
        for (let i = 0; i < 5; i++) {
            if (guessArr[i] !== null) {
                const idx = targetArr.indexOf(guessArr[i]);
                if (idx !== -1) {
                    result[i] = 'present';
                    targetArr[idx] = null;
                } else {
                    result[i] = 'absent';
                }
            }
        }
        
        guesses.push({ word: currentGuess, result });
        
        if (currentGuess === targetWord) {
            won = true;
            gameOver = true;
            message = 'GENIUS!';
        } else if (guesses.length >= 6) {
            gameOver = true;
            message = targetWord;
        }
        
        currentGuess = '';
    }
    
    function restart() {
        targetWord = words[Math.floor(Math.random() * words.length)];
        guesses = [];
        currentGuess = '';
        gameOver = false;
        won = false;
        message = '';
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    function draw() {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 500, 600);
        
        ctx.fillStyle = '#00ffff';
        ctx.font = '24px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('WORD GUESS', 250, 45);
        
        const boxSize = 60;
        const gap = 10;
        const startX = (500 - (5 * boxSize + 4 * gap)) / 2;
        const startY = 80;
        
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 5; col++) {
                const x = startX + col * (boxSize + gap);
                const y = startY + row * (boxSize + gap);
                
                let bgColor = '#333';
                let letter = '';
                
                if (row < guesses.length) {
                    const guess = guesses[row];
                    letter = guess.word[col];
                    switch (guess.result[col]) {
                        case 'correct': bgColor = '#538d4e'; break;
                        case 'present': bgColor = '#b59f3b'; break;
                        case 'absent': bgColor = '#3a3a3c'; break;
                    }
                } else if (row === guesses.length) {
                    letter = currentGuess[col] || '';
                    if (letter) bgColor = '#555';
                }
                
                ctx.fillStyle = bgColor;
                ctx.fillRect(x, y, boxSize, boxSize);
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, boxSize, boxSize);
                
                if (letter) {
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 28px "Press Start 2P"';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(letter, x + boxSize/2, y + boxSize/2 + 2);
                }
            }
        }
        
        ctx.fillStyle = '#888';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('TYPE YOUR GUESS AND PRESS ENTER', 250, 540);
        
        if (message) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(100, 250, 300, 100);
            
            ctx.fillStyle = won ? '#0f0' : '#fff';
            ctx.font = '20px "Press Start 2P"';
            ctx.fillText(message, 250, 290);
            
            ctx.fillStyle = '#888';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('PRESS SPACE TO PLAY AGAIN', 250, 330);
        }
        
        gameLoop = requestAnimationFrame(draw);
    }
    
    draw();
    
    window.currentGameCleanup = () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
}

// =============== PIXEL ROYALE (Battle Royale) ===============
function initRoyale() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;
    
    const channel = new BroadcastChannel('pixel_royale');
    const playerId = 'P' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    // Character skins
    const skins = [
        { name: 'Soldier', bodyColor: '#2d5a27', helmetColor: '#1a3a17', visorColor: '#4af' },
        { name: 'Medic', bodyColor: '#fff', helmetColor: '#f44', visorColor: '#4ff' },
        { name: 'Scout', bodyColor: '#5a4a2a', helmetColor: '#3a2a1a', visorColor: '#ff4' },
        { name: 'Ghost', bodyColor: '#333', helmetColor: '#111', visorColor: '#f4f' },
        { name: 'Toxic', bodyColor: '#2a5a2a', helmetColor: '#1a4a1a', visorColor: '#4f4' }
    ];
    const playerSkin = skins[Math.floor(Math.random() * skins.length)];
    
    // Weapons
    const weapons = [
        { name: 'Pistol', damage: 20, fireRate: 300, bulletSpeed: 14, ammoMax: 60, spread: 0.05 },
        { name: 'Assault Rifle', damage: 15, fireRate: 100, bulletSpeed: 16, ammoMax: 90, spread: 0.1 },
        { name: 'Shotgun', damage: 35, fireRate: 800, bulletSpeed: 12, ammoMax: 24, pellets: 5, spread: 0.3 },
        { name: 'Sniper', damage: 75, fireRate: 1200, bulletSpeed: 25, ammoMax: 15, spread: 0 }
    ];
    
    let player = {
        id: playerId,
        x: Math.random() * 700 + 50,
        y: Math.random() * 500 + 50,
        health: 100,
        shield: 0,
        weapon: 0,
        ammo: weapons[0].ammoMax,
        kills: 0,
        skin: playerSkin,
        angle: 0,
        lastShot: 0,
        isMoving: false,
        footstepTimer: 0
    };
    
    let otherPlayers = {};
    let bullets = [];
    let lootBoxes = [];
    let particles = [];
    let damageNumbers = [];
    let zone = { x: 400, y: 300, radius: 380, targetRadius: 380, shrinking: false };
    let gameTime = 0;
    let keys = {};
    let mouseX = 400, mouseY = 300;
    let mouseDown = false;
    let gameOver = false;
    let playersAlive = 1;
    let screenShake = 0;
    let zoneWarning = 0;
    
    // Generate environment
    const trees = [];
    const rocks = [];
    const buildings = [];
    const grass = [];
    const footprints = [];
    
    // Trees
    for (let i = 0; i < 25; i++) {
        trees.push({
            x: Math.random() * 800,
            y: Math.random() * 600,
            size: 20 + Math.random() * 15,
            type: Math.floor(Math.random() * 3)
        });
    }
    
    // Rocks
    for (let i = 0; i < 15; i++) {
        rocks.push({
            x: Math.random() * 800,
            y: Math.random() * 600,
            size: 10 + Math.random() * 20,
            rotation: Math.random() * Math.PI * 2
        });
    }
    
    // Buildings (cover)
    for (let i = 0; i < 6; i++) {
        buildings.push({
            x: 100 + Math.random() * 600,
            y: 100 + Math.random() * 400,
            w: 60 + Math.random() * 40,
            h: 40 + Math.random() * 30,
            color: `hsl(${30 + Math.random() * 20}, 30%, ${20 + Math.random() * 15}%)`
        });
    }
    
    // Grass patches
    for (let i = 0; i < 100; i++) {
        grass.push({
            x: Math.random() * 800,
            y: Math.random() * 600,
            size: 3 + Math.random() * 5,
            angle: Math.random() * 0.5 - 0.25
        });
    }
    
    // Generate loot
    function generateLoot() {
        lootBoxes = [];
        const lootTypes = ['health', 'shield', 'ammo', 'weapon'];
        for (let i = 0; i < 20; i++) {
            lootBoxes.push({
                x: Math.random() * 700 + 50,
                y: Math.random() * 500 + 50,
                type: lootTypes[Math.floor(Math.random() * lootTypes.length)],
                weaponType: Math.floor(Math.random() * weapons.length),
                bobOffset: Math.random() * Math.PI * 2,
                glowIntensity: 0
            });
        }
    }
    generateLoot();
    
    channel.onmessage = (e) => {
        const data = e.data;
        if (data.type === 'update' && data.id !== playerId) {
            otherPlayers[data.id] = { ...data, lastSeen: Date.now() };
        } else if (data.type === 'bullet' && data.shooterId !== playerId) {
            bullets.push({ ...data, isEnemy: true, trail: [] });
        } else if (data.type === 'hit' && data.targetId === playerId) {
            const damage = data.damage || 25;
            if (player.shield > 0) {
                const shieldDamage = Math.min(player.shield, damage);
                player.shield -= shieldDamage;
                const remaining = damage - shieldDamage;
                if (remaining > 0) player.health -= remaining;
            } else {
                player.health -= damage;
            }
            screenShake = 10;
            spawnParticles(player.x, player.y, '#f44', 10);
            if (player.health <= 0) {
                gameOver = true;
                channel.postMessage({ type: 'death', id: playerId });
            }
        } else if (data.type === 'death' && data.id !== playerId) {
            delete otherPlayers[data.id];
        }
    };
    
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30 + Math.random() * 20,
                color,
                size: 2 + Math.random() * 3
            });
        }
    }
    
    function addDamageNumber(x, y, damage, isShield) {
        damageNumbers.push({
            x, y,
            text: `-${damage}`,
            color: isShield ? '#4af' : '#f44',
            life: 40,
            vy: -2
        });
    }
    
    function handleKeyDown(e) {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ' && gameOver) restart();
        // Weapon switch with number keys
        if (e.key >= '1' && e.key <= '4') {
            const weaponIndex = parseInt(e.key) - 1;
            if (weaponIndex < weapons.length) {
                player.weapon = weaponIndex;
                player.ammo = weapons[weaponIndex].ammoMax;
            }
        }
    }
    
    function handleKeyUp(e) {
        keys[e.key.toLowerCase()] = false;
    }
    
    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    }
    
    function handleMouseDown(e) {
        mouseDown = true;
        shoot();
    }
    
    function handleMouseUp(e) {
        mouseDown = false;
    }
    
    function shoot() {
        const now = Date.now();
        const weapon = weapons[player.weapon];
        if (gameOver || player.ammo <= 0 || now - player.lastShot < weapon.fireRate) return;
        
        player.lastShot = now;
        player.ammo--;
        screenShake = 3;
        
        const pellets = weapon.pellets || 1;
        for (let i = 0; i < pellets; i++) {
            const spread = (Math.random() - 0.5) * weapon.spread;
            const angle = player.angle + spread;
            const bullet = {
                type: 'bullet',
                shooterId: playerId,
                x: player.x + Math.cos(player.angle) * 25,
                y: player.y + Math.sin(player.angle) * 25,
                vx: Math.cos(angle) * weapon.bulletSpeed,
                vy: Math.sin(angle) * weapon.bulletSpeed,
                damage: weapon.damage,
                trail: []
            };
            bullets.push(bullet);
            channel.postMessage(bullet);
        }
        
        // Muzzle flash particles
        spawnParticles(
            player.x + Math.cos(player.angle) * 30,
            player.y + Math.sin(player.angle) * 30,
            '#ff4', 5
        );
    }
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    function restart() {
        player = {
            id: playerId,
            x: Math.random() * 700 + 50,
            y: Math.random() * 500 + 50,
            health: 100,
            shield: 0,
            weapon: 0,
            ammo: weapons[0].ammoMax,
            kills: 0,
            skin: playerSkin,
            angle: 0,
            lastShot: 0,
            isMoving: false,
            footstepTimer: 0
        };
        gameOver = false;
        zone = { x: 400, y: 300, radius: 380, targetRadius: 380, shrinking: false };
        bullets = [];
        particles = [];
        damageNumbers = [];
        otherPlayers = {};
        generateLoot();
    }
    
    function checkBuildingCollision(x, y, radius) {
        for (const b of buildings) {
            if (x + radius > b.x && x - radius < b.x + b.w &&
                y + radius > b.y && y - radius < b.y + b.h) {
                return true;
            }
        }
        return false;
    }
    
    function update() {
        gameTime++;
        
        // Zone shrinking logic
        if (gameTime % 600 === 0 && zone.targetRadius > 80) {
            zone.targetRadius -= 40;
            zone.shrinking = true;
            zoneWarning = 180;
        }
        
        if (zone.shrinking && zone.radius > zone.targetRadius) {
            zone.radius -= 0.5;
            if (zone.radius <= zone.targetRadius) {
                zone.shrinking = false;
            }
        }
        
        if (zoneWarning > 0) zoneWarning--;
        
        const now = Date.now();
        for (let id in otherPlayers) {
            if (now - otherPlayers[id].lastSeen > 3000) {
                delete otherPlayers[id];
            }
        }
        playersAlive = 1 + Object.keys(otherPlayers).length;
        
        // Update particles
        particles = particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.life--;
            return p.life > 0;
        });
        
        // Update damage numbers
        damageNumbers = damageNumbers.filter(d => {
            d.y += d.vy;
            d.life--;
            return d.life > 0;
        });
        
        // Screen shake decay
        if (screenShake > 0) screenShake *= 0.9;
        
        if (!gameOver) {
            let dx = 0, dy = 0;
            if (keys['w'] || keys['arrowup']) dy -= 4;
            if (keys['s'] || keys['arrowdown']) dy += 4;
            if (keys['a'] || keys['arrowleft']) dx -= 4;
            if (keys['d'] || keys['arrowright']) dx += 4;
            
            // Normalize diagonal movement
            if (dx !== 0 && dy !== 0) {
                dx *= 0.707;
                dy *= 0.707;
            }
            
            const newX = Math.max(20, Math.min(780, player.x + dx));
            const newY = Math.max(20, Math.min(580, player.y + dy));
            
            // Check building collision
            if (!checkBuildingCollision(newX, player.y, 15)) player.x = newX;
            if (!checkBuildingCollision(player.x, newY, 15)) player.y = newY;
            
            player.isMoving = dx !== 0 || dy !== 0;
            player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
            
            // Footprints
            if (player.isMoving) {
                player.footstepTimer++;
                if (player.footstepTimer % 15 === 0) {
                    footprints.push({
                        x: player.x,
                        y: player.y,
                        life: 120,
                        angle: player.angle + Math.PI
                    });
                    if (footprints.length > 30) footprints.shift();
                }
            }
            
            // Zone damage
            const distToCenter = Math.hypot(player.x - zone.x, player.y - zone.y);
            if (distToCenter > zone.radius) {
                player.health -= 0.5;
                if (gameTime % 10 === 0) {
                    spawnParticles(player.x, player.y, '#48f', 3);
                }
                if (player.health <= 0) {
                    gameOver = true;
                    channel.postMessage({ type: 'death', id: playerId });
                }
            }
            
            // Loot collection
            lootBoxes = lootBoxes.filter(box => {
                const dist = Math.hypot(player.x - box.x, player.y - box.y);
                if (dist < 35) {
                    spawnParticles(box.x, box.y, '#fff', 10);
                    if (box.type === 'health') {
                        player.health = Math.min(100, player.health + 30);
                        addDamageNumber(box.x, box.y - 20, '+30 HP', false);
                    } else if (box.type === 'shield') {
                        player.shield = Math.min(100, player.shield + 50);
                        addDamageNumber(box.x, box.y - 20, '+50 Shield', true);
                    } else if (box.type === 'ammo') {
                        player.ammo = Math.min(weapons[player.weapon].ammoMax, player.ammo + 30);
                        addDamageNumber(box.x, box.y - 20, '+30 Ammo', false);
                    } else if (box.type === 'weapon') {
                        player.weapon = box.weaponType;
                        player.ammo = weapons[player.weapon].ammoMax;
                        addDamageNumber(box.x, box.y - 20, weapons[player.weapon].name, false);
                    }
                    return false;
                }
                return true;
            });
            
            // Auto-fire for assault rifle
            if (mouseDown && player.weapon === 1) {
                shoot();
            }
            
            channel.postMessage({ type: 'update', ...player, skinName: playerSkin.name });
        }
        
        // Update bullets
        bullets = bullets.filter(b => {
            // Store trail
            b.trail.push({ x: b.x, y: b.y });
            if (b.trail.length > 8) b.trail.shift();
            
            b.x += b.vx;
            b.y += b.vy;
            
            // Building collision
            if (checkBuildingCollision(b.x, b.y, 3)) {
                spawnParticles(b.x, b.y, '#888', 5);
                return false;
            }
            
            if (!b.isEnemy) {
                for (let id in otherPlayers) {
                    const other = otherPlayers[id];
                    if (Math.hypot(b.x - other.x, b.y - other.y) < 20) {
                        channel.postMessage({ type: 'hit', targetId: id, shooterId: playerId, damage: b.damage });
                        player.kills++;
                        spawnParticles(other.x, other.y, '#f44', 15);
                        return false;
                    }
                }
            } else {
                if (Math.hypot(b.x - player.x, b.y - player.y) < 20) {
                    const damage = b.damage || 25;
                    if (player.shield > 0) {
                        const shieldDamage = Math.min(player.shield, damage);
                        player.shield -= shieldDamage;
                        addDamageNumber(player.x, player.y - 30, shieldDamage, true);
                        const remaining = damage - shieldDamage;
                        if (remaining > 0) {
                            player.health -= remaining;
                            addDamageNumber(player.x, player.y - 50, remaining, false);
                        }
                    } else {
                        player.health -= damage;
                        addDamageNumber(player.x, player.y - 30, damage, false);
                    }
                    screenShake = 8;
                    spawnParticles(player.x, player.y, '#f44', 10);
                    if (player.health <= 0) {
                        gameOver = true;
                        channel.postMessage({ type: 'death', id: playerId });
                    }
                    return false;
                }
            }
            
            return b.x > 0 && b.x < 800 && b.y > 0 && b.y < 600;
        });
        
        draw();
        gameLoop = requestAnimationFrame(update);
    }
    
    function drawPlayer(x, y, angle, skin, id, health, shield, isLocal) {
        ctx.save();
        ctx.translate(x, y);
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 5, 18, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.rotate(angle);
        
        // Body
        ctx.fillStyle = skin.bodyColor;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Helmet/head
        ctx.fillStyle = skin.helmetColor;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Visor
        ctx.fillStyle = skin.visorColor;
        ctx.beginPath();
        ctx.ellipse(5, 0, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Gun
        const weapon = weapons[player.weapon];
        ctx.fillStyle = '#444';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.fillRect(12, -4, 20, 8);
        ctx.strokeRect(12, -4, 20, 8);
        
        // Gun detail
        ctx.fillStyle = '#333';
        ctx.fillRect(28, -3, 6, 6);
        
        ctx.restore();
        
        // Health bar background
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 25, y - 35, 50, 8);
        
        // Shield bar
        if (shield > 0) {
            ctx.fillStyle = '#4af';
            ctx.fillRect(x - 24, y - 34, 48 * (shield / 100), 3);
        }
        
        // Health bar
        ctx.fillStyle = health > 50 ? '#4f4' : health > 25 ? '#ff4' : '#f44';
        ctx.fillRect(x - 24, y - 31, 48 * (health / 100), 3);
        
        // Name tag
        ctx.fillStyle = isLocal ? '#fff' : '#ccc';
        ctx.font = 'bold 10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(id, x, y - 42);
    }
    
    function draw() {
        // Apply screen shake
        ctx.save();
        if (screenShake > 0.5) {
            ctx.translate(
                (Math.random() - 0.5) * screenShake,
                (Math.random() - 0.5) * screenShake
            );
        }
        
        // Background gradient
        const bgGrad = ctx.createRadialGradient(400, 300, 0, 400, 300, 500);
        bgGrad.addColorStop(0, '#2a4a2a');
        bgGrad.addColorStop(1, '#1a2a1a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 800, 600);
        
        // Ground texture
        ctx.strokeStyle = '#1a3a1a';
        ctx.lineWidth = 1;
        for (let x = 0; x < 800; x += 30) {
            for (let y = 0; y < 600; y += 30) {
                const offset = (x + y) % 60 === 0 ? 5 : 0;
                ctx.beginPath();
                ctx.moveTo(x + offset, y);
                ctx.lineTo(x + 15 + offset, y + 15);
                ctx.stroke();
            }
        }
        
        // Grass
        grass.forEach(g => {
            ctx.strokeStyle = '#3a6a3a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(g.x, g.y);
            ctx.lineTo(g.x + Math.sin(gameTime * 0.02 + g.angle) * 3, g.y - g.size);
            ctx.stroke();
        });
        
        // Footprints
        footprints.forEach(fp => {
            ctx.globalAlpha = fp.life / 120 * 0.3;
            ctx.fillStyle = '#1a2a1a';
            ctx.beginPath();
            ctx.ellipse(fp.x, fp.y, 4, 6, fp.angle, 0, Math.PI * 2);
            ctx.fill();
            fp.life--;
        });
        ctx.globalAlpha = 1;
        
        // Buildings (cover)
        buildings.forEach(b => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(b.x + 5, b.y + 5, b.w, b.h);
            
            // Building
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);
            
            // Roof line
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(b.x, b.y, b.w, 5);
            
            // Door
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(b.x + b.w/2 - 8, b.y + b.h - 20, 16, 20);
            
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x, b.y, b.w, b.h);
        });
        
        // Rocks
        rocks.forEach(r => {
            ctx.save();
            ctx.translate(r.x, r.y);
            ctx.rotate(r.rotation);
            
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.moveTo(-r.size, 0);
            ctx.lineTo(-r.size * 0.5, -r.size * 0.8);
            ctx.lineTo(r.size * 0.5, -r.size * 0.6);
            ctx.lineTo(r.size, 0);
            ctx.lineTo(r.size * 0.6, r.size * 0.5);
            ctx.lineTo(-r.size * 0.6, r.size * 0.4);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.moveTo(-r.size * 0.5, -r.size * 0.8);
            ctx.lineTo(0, -r.size * 0.6);
            ctx.lineTo(-r.size * 0.2, 0);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        });
        
        // Zone outside area
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, 800, 600);
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2, true);
        
        // Animated zone effect
        const zoneGrad = ctx.createRadialGradient(zone.x, zone.y, zone.radius - 20, zone.x, zone.y, zone.radius + 50);
        zoneGrad.addColorStop(0, 'rgba(0, 100, 255, 0)');
        zoneGrad.addColorStop(0.5, 'rgba(0, 150, 255, 0.4)');
        zoneGrad.addColorStop(1, 'rgba(0, 50, 200, 0.6)');
        ctx.fillStyle = zoneGrad;
        ctx.fill();
        ctx.restore();
        
        // Zone border with electric effect
        ctx.strokeStyle = `hsl(200, 100%, ${50 + Math.sin(gameTime * 0.1) * 20}%)`;
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.lineDashOffset = -gameTime * 0.5;
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Trees (on top of zone)
        trees.forEach(t => {
            // Trunk
            ctx.fillStyle = '#4a3020';
            ctx.fillRect(t.x - 4, t.y - 5, 8, 15);
            
            // Foliage layers
            const colors = ['#1a4a1a', '#2a5a2a', '#3a7a3a'];
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = colors[i];
                ctx.beginPath();
                ctx.arc(t.x, t.y - 10 - i * 8, t.size - i * 5, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Loot boxes with glow effect
        lootBoxes.forEach(box => {
            const bob = Math.sin(gameTime * 0.1 + box.bobOffset) * 3;
            
            // Glow
            const glowColors = {
                health: 'rgba(0, 255, 100, 0.4)',
                shield: 'rgba(100, 150, 255, 0.4)',
                ammo: 'rgba(255, 200, 0, 0.4)',
                weapon: 'rgba(255, 100, 255, 0.4)'
            };
            ctx.shadowColor = glowColors[box.type];
            ctx.shadowBlur = 15 + Math.sin(gameTime * 0.15) * 5;
            
            // Box
            const boxColors = {
                health: '#0f0',
                shield: '#48f',
                ammo: '#fc0',
                weapon: '#f4f'
            };
            ctx.fillStyle = boxColors[box.type];
            ctx.fillRect(box.x - 12, box.y - 12 + bob, 24, 24);
            
            ctx.shadowBlur = 0;
            
            // Icon
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            const icons = { health: '+', shield: '◆', ammo: '•••', weapon: '⚔' };
            ctx.fillText(icons[box.type], box.x, box.y + 5 + bob);
        });
        
        // Draw bullet trails and bullets
        bullets.forEach(b => {
            // Trail
            if (b.trail.length > 1) {
                ctx.strokeStyle = b.isEnemy ? 'rgba(255, 100, 100, 0.5)' : 'rgba(255, 255, 100, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(b.trail[0].x, b.trail[0].y);
                for (let i = 1; i < b.trail.length; i++) {
                    ctx.lineTo(b.trail[i].x, b.trail[i].y);
                }
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
            
            // Bullet
            ctx.fillStyle = b.isEnemy ? '#f88' : '#ff4';
            ctx.shadowColor = b.isEnemy ? '#f00' : '#ff0';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        
        // Draw other players
        for (let id in otherPlayers) {
            const other = otherPlayers[id];
            const otherSkin = skins.find(s => s.name === other.skinName) || skins[0];
            drawPlayer(other.x, other.y, other.angle || 0, otherSkin, other.id, 100, 0, false);
        }
        
        // Draw local player
        if (!gameOver) {
            drawPlayer(player.x, player.y, player.angle, player.skin, player.id, player.health, player.shield, true);
        }
        
        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life / 50;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        
        // Damage numbers
        damageNumbers.forEach(d => {
            ctx.globalAlpha = d.life / 40;
            ctx.fillStyle = d.color;
            ctx.font = 'bold 14px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(d.text, d.x, d.y);
        });
        ctx.globalAlpha = 1;
        
        ctx.restore(); // End screen shake
        
        // UI Panel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 180, 130);
        ctx.strokeStyle = '#4a4';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 180, 130);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(playerId, 20, 30);
        
        // Health bar
        ctx.fillStyle = '#333';
        ctx.fillRect(20, 40, 160, 12);
        ctx.fillStyle = player.health > 50 ? '#4f4' : player.health > 25 ? '#fc4' : '#f44';
        ctx.fillRect(20, 40, 160 * (player.health / 100), 12);
        ctx.strokeStyle = '#666';
        ctx.strokeRect(20, 40, 160, 12);
        
        // Shield bar
        ctx.fillStyle = '#333';
        ctx.fillRect(20, 55, 160, 8);
        ctx.fillStyle = '#48f';
        ctx.fillRect(20, 55, 160 * (player.shield / 100), 8);
        ctx.strokeStyle = '#666';
        ctx.strokeRect(20, 55, 160, 8);
        
        ctx.font = '10px "Press Start 2P"';
        ctx.fillStyle = '#ccc';
        ctx.fillText(`WEAPON: ${weapons[player.weapon].name}`, 20, 80);
        ctx.fillText(`AMMO: ${player.ammo}/${weapons[player.weapon].ammoMax}`, 20, 95);
        ctx.fillText(`KILLS: ${player.kills}`, 20, 110);
        ctx.fillText(`ALIVE: ${playersAlive}`, 20, 125);
        
        // Minimap
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(680, 10, 110, 110);
        ctx.strokeStyle = '#4a4';
        ctx.strokeRect(680, 10, 110, 110);
        
        // Minimap zone
        ctx.strokeStyle = '#48f';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(735 + (zone.x - 400) * 0.125, 65 + (zone.y - 300) * 0.166, zone.radius * 0.125, 0, Math.PI * 2);
        ctx.stroke();
        
        // Minimap buildings
        ctx.fillStyle = '#555';
        buildings.forEach(b => {
            ctx.fillRect(680 + b.x * 0.125, 10 + b.y * 0.166, b.w * 0.125, b.h * 0.166);
        });
        
        // Minimap player
        ctx.fillStyle = '#4f4';
        ctx.beginPath();
        ctx.arc(680 + player.x * 0.125, 10 + player.y * 0.166, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Minimap other players
        ctx.fillStyle = '#f44';
        for (let id in otherPlayers) {
            const other = otherPlayers[id];
            ctx.beginPath();
            ctx.arc(680 + other.x * 0.125, 10 + other.y * 0.166, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Zone warning
        if (zoneWarning > 0) {
            ctx.fillStyle = `rgba(0, 150, 255, ${0.3 + Math.sin(gameTime * 0.3) * 0.2})`;
            ctx.font = 'bold 16px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('⚠ ZONE SHRINKING ⚠', 400, 550);
        }
        
        // Game over overlay
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(0, 0, 800, 600);
            
            if (playersAlive === 1) {
                // Victory
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 36px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.shadowColor = '#ffa500';
                ctx.shadowBlur = 20;
                ctx.fillText('VICTORY ROYALE!', 400, 220);
                ctx.shadowBlur = 0;
                
                // Crown
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.moveTo(360, 280);
                ctx.lineTo(370, 260);
                ctx.lineTo(385, 280);
                ctx.lineTo(400, 250);
                ctx.lineTo(415, 280);
                ctx.lineTo(430, 260);
                ctx.lineTo(440, 280);
                ctx.closePath();
                ctx.fill();
            } else {
                // Eliminated
                ctx.fillStyle = '#f44';
                ctx.font = 'bold 36px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.shadowColor = '#f00';
                ctx.shadowBlur = 15;
                ctx.fillText('ELIMINATED', 400, 220);
                ctx.shadowBlur = 0;
                
                // Skull
                ctx.fillStyle = '#888';
                ctx.beginPath();
                ctx.arc(400, 280, 25, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#222';
                ctx.beginPath();
                ctx.arc(390, 275, 6, 0, Math.PI * 2);
                ctx.arc(410, 275, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillRect(395, 295, 10, 15);
            }
            
            ctx.fillStyle = '#fff';
            ctx.font = '16px "Press Start 2P"';
            ctx.fillText(`KILLS: ${player.kills}`, 400, 350);
            ctx.fillText(`PLAYERS REMAINING: ${playersAlive}`, 400, 380);
            
            ctx.fillStyle = '#888';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('PRESS SPACE TO RESPAWN', 400, 430);
        }
        
        // Controls hint
        if (!gameOver && gameTime < 300) {
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('WASD: Move | Mouse: Aim | Click: Shoot | 1-4: Switch Weapon', 400, 585);
        }
    }
    
    gameLoop = requestAnimationFrame(update);
    
    window.currentGameCleanup = () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mouseup', handleMouseUp);
        channel.close();
    };
}

// Game Creator System Removed for Security

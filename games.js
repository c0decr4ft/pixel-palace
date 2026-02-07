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

// Prevent arrow keys and game keys from scrolling/selecting text when a game is active (stops phone from "copy" popup)
const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'];
function preventGameKeyDefault(e) {
    if (gameContainer && gameContainer.classList.contains('active') && GAME_KEYS.includes(e.key)) {
        e.preventDefault();
    }
}
document.addEventListener('keydown', preventGameKeyDefault, { capture: true, passive: false });

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
    
    if (canvas) canvas.oncontextmenu = (e) => e.preventDefault();
    
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
        canvas.oncontextmenu = null;
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
        
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize/2,
            food.y * gridSize + gridSize/2,
            gridSize/2 - 2,
            0, Math.PI * 2
        );
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
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
            ctx.shadowBlur = index === 0 ? 6 : 2;
            ctx.fillRect(
                segment.x * gridSize + 1,
                segment.y * gridSize + 1,
                gridSize - 2,
                gridSize - 2
            );
        });
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
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
const PONG_W = 600;
const PONG_H = 400;
const PADDLE_W = 15;
const PADDLE_H = 80;
const BALL_SIZE = 15;
const PADDLE_SPEED = 280;
const BALL_SPEED_BASE = 300;
const PONG_SCORE_TO_WIN = 11;

function randomRoomCode() {
    /* Exclude A,S,D,W so they aren't captured by game controls when typing the code */
    const chars = 'BCEFGHJKLMNPQRTVXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

function initPong() {
    currentGameTitle.textContent = 'PONG';
    gameControls.innerHTML = 'Choose AI or Online, then play. W/S or ↑/↓ to move.';
    
    canvas.width = PONG_W;
    canvas.height = PONG_H;
    
    const keys = {};
    handleKeyDown = (e) => { keys[e.key] = true; };
    handleKeyUp = (e) => { keys[e.key] = false; };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    const touchKeys = {};
    addTouchDpad({
        onUp: (p) => { touchKeys['ArrowUp'] = p; },
        onDown: (p) => { touchKeys['ArrowDown'] = p; }
    });
    
    const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
    const isPortrait = () => window.innerWidth < window.innerHeight;
    let pongGameStarted = !isTouchDevice || !isPortrait();
    
    const rotateOverlay = document.createElement('div');
    rotateOverlay.className = 'pong-rotate-overlay';
    rotateOverlay.innerHTML = '<div class="pong-rotate-message"><span class="pong-rotate-icon">📱</span><p>Turn your phone 90° to play Pong</p><p class="pong-rotate-hint">Landscape mode</p></div>';
    rotateOverlay.style.display = pongGameStarted ? 'none' : 'flex';
    gameContainer.appendChild(rotateOverlay);
    
    const pongGameArea = document.createElement('div');
    pongGameArea.className = 'pong-game-area';
    pongGameArea.appendChild(canvas);
    pongGameArea.appendChild(touchControls);
    gameContainer.insertBefore(pongGameArea, gameControls);
    
    function checkPongOrientation() {
        if (!isTouchDevice) return;
        const portrait = isPortrait();
        if (portrait && !pongGameStarted) rotateOverlay.style.display = 'flex';
        else {
            rotateOverlay.style.display = 'none';
            if (!pongGameStarted) {
                pongGameStarted = true;
                gameContainer.classList.add('pong-landscape-layout');
            }
        }
    }
    window.addEventListener('orientationchange', checkPongOrientation);
    window.addEventListener('resize', checkPongOrientation);
    checkPongOrientation();
    
    const modeOverlay = document.createElement('div');
    modeOverlay.className = 'pong-mode-overlay';
    modeOverlay.innerHTML = '<h3>Choose mode</h3><div class="pong-mode-btns"></div>';
    const modeBtns = modeOverlay.querySelector('.pong-mode-btns');
    
    const btnAI = document.createElement('button');
    btnAI.type = 'button';
    btnAI.className = 'pong-mode-btn ai';
    btnAI.textContent = 'AI Play';
    btnAI.addEventListener('click', () => {
        modeOverlay.remove();
        startPongAI();
    });
    
    const btnOnline = document.createElement('button');
    btnOnline.type = 'button';
    btnOnline.className = 'pong-mode-btn online';
    btnOnline.textContent = 'Online Play';
    btnOnline.addEventListener('click', () => {
        modeOverlay.remove();
        showPongOnlineLobby();
    });
    
    modeBtns.appendChild(btnAI);
    modeBtns.appendChild(btnOnline);
    gameContainer.appendChild(modeOverlay);
    
    function showPongOnlineLobby() {
        const hasPeer = typeof Peer !== 'undefined';
        const overlay = document.createElement('div');
        overlay.className = 'pong-online-overlay';
        overlay.innerHTML = '<h3>Play vs someone online</h3><div class="pong-online-btns"></div>';
        const btns = overlay.querySelector('.pong-online-btns');
        
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'pong-online-btn back';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => {
            overlay.remove();
            gameContainer.appendChild(modeOverlay);
        });
        
        if (!hasPeer) {
            overlay.querySelector('h3').textContent = 'Online play requires PeerJS (check connection).';
            btns.appendChild(backBtn);
            gameContainer.appendChild(overlay);
            return;
        }
        
        const createBtn = document.createElement('button');
        createBtn.type = 'button';
        createBtn.className = 'pong-online-btn';
        createBtn.textContent = 'Create Game';
        createBtn.addEventListener('click', () => {
            const roomCode = randomRoomCode();
            const peer = new Peer(roomCode, { debug: 0 });
            const codeEl = document.createElement('div');
            codeEl.className = 'pong-room-code';
            codeEl.textContent = roomCode;
            const waitEl = document.createElement('p');
            waitEl.className = 'pong-waiting-msg';
            waitEl.textContent = 'Share this code. When someone joins, the game starts.';
            overlay.querySelector('h3').textContent = 'Your game code';
            btns.innerHTML = '';
            overlay.insertBefore(codeEl, btns);
            overlay.insertBefore(waitEl, btns);
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'pong-online-btn back';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => {
                overlay.remove();
                try { peer.destroy(); } catch (e) {}
                gameContainer.appendChild(modeOverlay);
            });
            btns.appendChild(cancelBtn);
            peer.on('open', () => {});
            peer.on('connection', (conn) => {
                conn.on('open', () => {
                    overlay.remove();
                    startPongOnline(conn, true, peer);
                });
            });
            peer.on('error', (err) => {
                waitEl.textContent = 'Error: ' + (err.message || 'Could not create game. Try again.');
            });
            cleanupFunctions.push(() => { try { peer.destroy(); } catch (e) {} });
        });
        
        const joinBtn = document.createElement('button');
        joinBtn.type = 'button';
        joinBtn.className = 'pong-online-btn';
        joinBtn.textContent = 'Join Game';
        joinBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'pong-join-input';
            input.placeholder = 'e.g. AB3XY9';
            input.maxLength = 6;
            input.autocomplete = 'off';
            input.setAttribute('inputmode', 'text');
            input.setAttribute('autocapitalize', 'characters');
            input.setAttribute('spellcheck', 'false');
            const goBtn = document.createElement('button');
            goBtn.type = 'button';
            goBtn.className = 'pong-online-btn';
            goBtn.textContent = 'Connect';
            overlay.querySelector('h3').textContent = 'Enter game code';
            btns.innerHTML = '';
            btns.appendChild(input);
            btns.appendChild(goBtn);
            btns.appendChild(backBtn);
            input.focus();
            goBtn.addEventListener('click', () => {
                const code = String(input.value).trim().toUpperCase().slice(0, 6);
                if (!code || code.length < 4) return;
                const peer = new Peer(undefined, { debug: 0 });
                peer.on('open', () => {
                    const conn = peer.connect(code);
                    if (!conn) {
                        overlay.querySelector('h3').textContent = 'Could not connect. Check code.';
                        return;
                    }
                    conn.on('open', () => {
                        overlay.remove();
                        startPongOnline(conn, false, peer);
                    });
                    conn.on('error', () => {
                        overlay.querySelector('h3').textContent = 'Connection failed. Check code.';
                    });
                });
                peer.on('error', (err) => {
                    overlay.querySelector('h3').textContent = 'Error: ' + (err.message || 'Try again.');
                });
                cleanupFunctions.push(() => { try { peer.destroy(); } catch (e) {} });
            });
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') goBtn.click(); });
        });
        
        btns.appendChild(createBtn);
        btns.appendChild(joinBtn);
        btns.appendChild(backBtn);
        gameContainer.appendChild(overlay);
    }
    
    function startPongAI() {
        let playerY = PONG_H / 2 - PADDLE_H / 2;
        let aiY = PONG_H / 2 - PADDLE_H / 2;
        let ballX = PONG_W / 2;
        let ballY = PONG_H / 2;
        let ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * (BALL_SPEED_BASE / 60);
        let ballSpeedY = (Math.random() - 0.5) * (360 / 60);
        let playerScore = 0;
        let aiScore = 0;
        
        function resetBall() {
            ballX = PONG_W / 2;
            ballY = PONG_H / 2;
            ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * (BALL_SPEED_BASE / 60);
            ballSpeedY = (Math.random() - 0.5) * (360 / 60);
        }
        
        let lastTime = performance.now();
        
        function update(now) {
            gameLoop = requestAnimationFrame(update);
            let dt = (now - lastTime) / 1000;
            lastTime = now;
            if (dt > 0.1) dt = 1/60;
            const scale = Math.min(dt * 60, 3);
            
            if (!pongGameStarted) {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, PONG_W, PONG_H);
                ctx.fillStyle = '#333';
                ctx.font = '14px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText('Rotate device to play', PONG_W / 2, PONG_H / 2);
                return;
            }
            
            if (keys['w'] || keys['W'] || keys['ArrowUp'] || touchKeys['ArrowUp']) {
                playerY = Math.max(0, playerY - PADDLE_SPEED * dt);
            }
            if (keys['s'] || keys['S'] || keys['ArrowDown'] || touchKeys['ArrowDown']) {
                playerY = Math.min(PONG_H - PADDLE_H, playerY + PADDLE_SPEED * dt);
            }
            
            const totalScore = playerScore + aiScore;
            const aiSpeedBase = 180 + Math.min(120, totalScore * 12);
            const aiReaction = 0.92 + Math.min(0.06, totalScore * 0.006);
            if (ballSpeedX > 0) {
                const dist = (PONG_W - PADDLE_W - 20 - BALL_SIZE) - ballX;
                if (dist > 0) {
                    const t = dist / (Math.abs(ballSpeedX) * 60);
                    let targetY = ballY + ballSpeedY * 60 * t;
                    targetY = targetY + (Math.random() - 0.5) * 30;
                    targetY = Math.max(0, Math.min(PONG_H - PADDLE_H, targetY));
                    const aiCenter = aiY + PADDLE_H / 2;
                    const diff = (targetY + PADDLE_H / 2 - aiCenter) * aiReaction;
                    const move = Math.max(-aiSpeedBase * dt, Math.min(aiSpeedBase * dt, diff));
                    aiY = Math.max(0, Math.min(PONG_H - PADDLE_H, aiY + move));
                }
            } else {
                const aiCenter = aiY + PADDLE_H / 2;
                if (aiCenter < ballY - 15) aiY = Math.min(PONG_H - PADDLE_H, aiY + aiSpeedBase * dt);
                else if (aiCenter > ballY + 15) aiY = Math.max(0, aiY - aiSpeedBase * dt);
            }
            
            ballX += ballSpeedX * scale;
            ballY += ballSpeedY * scale;
            
            if (ballY <= 0 || ballY >= PONG_H - BALL_SIZE) {
                ballSpeedY = -ballSpeedY;
                playSound(300, 0.05);
            }
            
            if (ballX <= PADDLE_W + 20 && ballY + BALL_SIZE >= playerY && ballY <= playerY + PADDLE_H && ballSpeedX < 0) {
                ballSpeedX = -ballSpeedX * 1.05;
                ballSpeedY = (ballY - playerY) / PADDLE_H * (600 / 60) - 300 / 60;
                playSound(500, 0.1);
            }
            if (ballX >= PONG_W - PADDLE_W - 20 - BALL_SIZE && ballY + BALL_SIZE >= aiY && ballY <= aiY + PADDLE_H && ballSpeedX > 0) {
                ballSpeedX = -ballSpeedX * 1.05;
                ballSpeedY = (ballY - aiY) / PADDLE_H * (600 / 60) - 300 / 60;
                playSound(500, 0.1);
            }
            
            if (ballX < 0) {
                aiScore++;
                resetBall();
                playSound(200, 0.3);
            }
            if (ballX > PONG_W) {
                playerScore++;
                updateScore(playerScore);
                resetBall();
                playSound(800, 0.2);
            }
            
            ballSpeedX = Math.max(-15, Math.min(15, ballSpeedX));
            ballSpeedY = Math.max(-10, Math.min(10, ballSpeedY));
            
            drawPongField(ctx, PONG_W, PONG_H, PADDLE_W, PADDLE_H, BALL_SIZE);
            ctx.fillStyle = '#00ffff';
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 8;
            ctx.fillRect(20, playerY, PADDLE_W, PADDLE_H);
            ctx.fillStyle = '#ff00ff';
            ctx.shadowColor = '#ff00ff';
            ctx.fillRect(PONG_W - PADDLE_W - 20, aiY, PADDLE_W, PADDLE_H);
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(ballX + BALL_SIZE/2, ballY + BALL_SIZE/2, BALL_SIZE/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.font = '48px "Press Start 2P"';
            ctx.fillStyle = '#00ffff';
            ctx.textAlign = 'center';
            ctx.fillText(playerScore, PONG_W / 4, 60);
            ctx.fillStyle = '#ff00ff';
            ctx.fillText(aiScore, 3 * PONG_W / 4, 60);
        }
        
        gameLoop = requestAnimationFrame(update);
    }
    
    function drawPongField(ctx, w, h, pw, ph, ballSize) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    function startPongOnline(conn, isHost, peerRef) {
        let paddle1Y = PONG_H / 2 - PADDLE_H / 2;
        let paddle2Y = PONG_H / 2 - PADDLE_H / 2;
        let ballX = PONG_W / 2;
        let ballY = PONG_H / 2;
        let ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * (BALL_SPEED_BASE / 60);
        let ballSpeedY = (Math.random() - 0.5) * (360 / 60);
        let score1 = 0;
        let score2 = 0;
        let remotePaddle = PONG_H / 2 - PADDLE_H / 2;
        let gameOver = false;
        
        cleanupFunctions.push(() => {
            try { conn.close(); } catch (e) {}
            try { if (peerRef) peerRef.destroy(); } catch (e) {}
        });
        
        conn.on('data', (data) => {
            if (data.t === 'paddle') remotePaddle = data.y;
            if (data.t === 'state') {
                ballX = data.ballX;
                ballY = data.ballY;
                ballSpeedX = data.ballSpeedX;
                ballSpeedY = data.ballSpeedY;
                score1 = data.score1;
                score2 = data.score2;
                paddle1Y = data.paddle1Y;
                if (isHost) paddle2Y = remotePaddle;
            }
        });
        conn.on('close', () => { gameOver = true; });
        conn.on('error', () => { gameOver = true; });
        
        function resetBall() {
            ballX = PONG_W / 2;
            ballY = PONG_H / 2;
            ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * (BALL_SPEED_BASE / 60);
            ballSpeedY = (Math.random() - 0.5) * (360 / 60);
        }
        
        let lastTime = performance.now();
        const SEND_INTERVAL = 1/25;
        let sendAcc = 0;
        
        function update(now) {
            gameLoop = requestAnimationFrame(update);
            let dt = (now - lastTime) / 1000;
            lastTime = now;
            if (dt > 0.1) dt = 1/60;
            const scale = Math.min(dt * 60, 3);
            
            if (gameOver) {
                drawPongField(ctx, PONG_W, PONG_H, PADDLE_W, PADDLE_H, BALL_SIZE);
                ctx.fillStyle = '#ff4444';
                ctx.font = '16px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText('Opponent disconnected', PONG_W / 2, PONG_H / 2);
                return;
            }
            
            const myPaddle = isHost ? paddle1Y : paddle2Y;
            const otherPaddle = isHost ? paddle2Y : paddle1Y;
            
            if (keys['w'] || keys['W'] || keys['ArrowUp'] || touchKeys['ArrowUp']) {
                if (isHost) paddle1Y = Math.max(0, paddle1Y - PADDLE_SPEED * dt);
                else paddle2Y = Math.max(0, paddle2Y - PADDLE_SPEED * dt);
            }
            if (keys['s'] || keys['S'] || keys['ArrowDown'] || touchKeys['ArrowDown']) {
                if (isHost) paddle1Y = Math.min(PONG_H - PADDLE_H, paddle1Y + PADDLE_SPEED * dt);
                else paddle2Y = Math.min(PONG_H - PADDLE_H, paddle2Y + PADDLE_SPEED * dt);
            }
            
            if (isHost) {
                paddle2Y = remotePaddle;
                ballX += ballSpeedX * scale;
                ballY += ballSpeedY * scale;
                
                if (ballY <= 0 || ballY >= PONG_H - BALL_SIZE) {
                    ballSpeedY = -ballSpeedY;
                    playSound(300, 0.05);
                }
                const px = 20;
                const ox = PONG_W - PADDLE_W - 20 - BALL_SIZE;
                if (ballX <= px + PADDLE_W && ballY + BALL_SIZE >= paddle1Y && ballY <= paddle1Y + PADDLE_H && ballSpeedX < 0) {
                    ballSpeedX = -ballSpeedX * 1.05;
                    ballSpeedY = (ballY - paddle1Y) / PADDLE_H * (600/60) - 300/60;
                    playSound(500, 0.1);
                }
                if (ballX >= ox && ballY + BALL_SIZE >= paddle2Y && ballY <= paddle2Y + PADDLE_H && ballSpeedX > 0) {
                    ballSpeedX = -ballSpeedX * 1.05;
                    ballSpeedY = (ballY - paddle2Y) / PADDLE_H * (600/60) - 300/60;
                    playSound(500, 0.1);
                }
                if (ballX < 0) {
                    score2++;
                    resetBall();
                    playSound(200, 0.3);
                }
                if (ballX > PONG_W) {
                    score1++;
                    updateScore(score1);
                    resetBall();
                    playSound(800, 0.2);
                }
                ballSpeedX = Math.max(-15, Math.min(15, ballSpeedX));
                ballSpeedY = Math.max(-10, Math.min(10, ballSpeedY));
                
                sendAcc += dt;
                if (sendAcc >= SEND_INTERVAL) {
                    sendAcc = 0;
                    conn.send({ t: 'state', ballX, ballY, ballSpeedX, ballSpeedY, score1, score2, paddle1Y, paddle2Y });
                }
            } else {
                paddle2Y = remotePaddle;
                sendAcc += dt;
                if (sendAcc >= SEND_INTERVAL) {
                    sendAcc = 0;
                    conn.send({ t: 'paddle', y: paddle2Y });
                }
            }
            
            drawPongField(ctx, PONG_W, PONG_H, PADDLE_W, PADDLE_H, BALL_SIZE);
            ctx.fillStyle = '#00ffff';
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 8;
            ctx.fillRect(20, paddle1Y, PADDLE_W, PADDLE_H);
            ctx.fillStyle = '#ff00ff';
            ctx.shadowColor = '#ff00ff';
            ctx.fillRect(PONG_W - PADDLE_W - 20, paddle2Y, PADDLE_W, PADDLE_H);
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(ballX + BALL_SIZE/2, ballY + BALL_SIZE/2, BALL_SIZE/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.font = '48px "Press Start 2P"';
            ctx.fillStyle = '#00ffff';
            ctx.textAlign = 'center';
            ctx.fillText(score1, PONG_W / 4, 60);
            ctx.fillStyle = '#ff00ff';
            ctx.fillText(score2, 3 * PONG_W / 4, 60);
        }
        
        gameLoop = requestAnimationFrame(update);
    }
    
    cleanupFunctions.push(() => {
        gameContainer.classList.remove('pong-landscape-layout');
        modeOverlay.remove();
        rotateOverlay.remove();
        pongGameArea.remove();
        gameContainer.insertBefore(canvas, gameControls);
        gameContainer.insertBefore(touchControls, gameControls);
        window.removeEventListener('orientationchange', checkPongOrientation);
        window.removeEventListener('resize', checkPongOrientation);
    });
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
    
    let lastTime = performance.now();
    const PADDLE_SPEED = 480;
    const BALL_SPEED_SCALE = 60;
    
    function update(now) {
        gameLoop = requestAnimationFrame(update);
        
        let dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = 1/60;
        const scale = Math.min(dt * 60, 3);
        
        if (keys['ArrowLeft']) paddleX = Math.max(0, paddleX - PADDLE_SPEED * dt);
        if (keys['ArrowRight']) paddleX = Math.min(canvas.width - paddleWidth, paddleX + PADDLE_SPEED * dt);
        
        if (!gameOver && !win) {
            ballX += ballSpeedX * scale;
            ballY += ballSpeedY * scale;
            
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
                    ctx.shadowBlur = 4;
                    ctx.fillRect(brickX, brickY, brickWidth, brickHeight);
                }
            }
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 6;
        ctx.fillRect(paddleX, canvas.height - paddleHeight - 20, paddleWidth, paddleHeight);
        
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
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
    let lastTime = performance.now();
    const PLAYER_SPEED = 360;
    const BULLET_SPEED = 480;
    const ENEMY_BULLET_SPEED = 300;
    
    function update(currentTime) {
        gameLoop = requestAnimationFrame(update);
        
        let dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        if (dt > 0.1) dt = 1/60;
        const scale = Math.min(dt * 60, 3);
        
        if (!gameOver && !win) {
            // Player movement (delta-time)
            if (keys['ArrowLeft'] || touchKeys['ArrowLeft']) playerX = Math.max(0, playerX - PLAYER_SPEED * dt);
            if (keys['ArrowRight'] || touchKeys['ArrowRight']) playerX = Math.min(canvas.width - playerWidth, playerX + PLAYER_SPEED * dt);
            
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
                const invaderMove = invaderSpeed * scale;
                for (let inv of invaders) {
                    inv.x += invaderDirection * invaderMove;
                }
            }
            
            // Move bullets (delta-time)
            const bulletMove = BULLET_SPEED * dt;
            bullets = bullets.filter(b => {
                b.y -= bulletMove;
                return b.y > 0;
            });
            
            // Enemy shooting
            if (currentTime - lastEnemyShot > 1500 && aliveInvaders.length > 0) {
                const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
                enemyBullets.push({ x: shooter.x + invaderWidth / 2, y: shooter.y + invaderHeight });
                lastEnemyShot = currentTime;
            }
            
            const enemyBulletMove = ENEMY_BULLET_SPEED * dt;
            enemyBullets = enemyBullets.filter(b => {
                b.y += enemyBulletMove;
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
                ctx.shadowBlur = 4;
                ctx.fillRect(inv.x + 5, inv.y, invaderWidth - 10, invaderHeight - 10);
                ctx.fillRect(inv.x, inv.y + 10, invaderWidth, invaderHeight - 15);
                ctx.fillRect(inv.x + 5, inv.y + invaderHeight - 10, 10, 10);
                ctx.fillRect(inv.x + invaderWidth - 15, inv.y + invaderHeight - 10, 10, 10);
            }
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(playerX + playerWidth / 2, canvas.height - 50);
        ctx.lineTo(playerX, canvas.height - 20);
        ctx.lineTo(playerX + playerWidth, canvas.height - 20);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ffff00';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#ffff00';
        for (let bullet of bullets) {
            ctx.fillRect(bullet.x - 2, bullet.y, 4, 15);
        }
        
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        for (let bullet of enemyBullets) {
            ctx.fillRect(bullet.x - 2, bullet.y, 4, 15);
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
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
    
    let lastTime = performance.now();
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#001133');
    bgGradient.addColorStop(1, '#003366');
    
    function update(now) {
        gameLoop = requestAnimationFrame(update);
        
        const currentTime = now;
        let dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        if (dt > 0.1) dt = 1/60;
        const scale = Math.min(dt * 60, 3);
        
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff33';
        for (let i = 0; i < 30; i++) {
            ctx.fillRect((i * 47) % canvas.width, (i * 83) % canvas.height, 2, 2);
        }
        
        if (started && !gameOver) {
            // Bird physics (delta-time for consistent speed on all devices)
            birdVelocity += gravity * scale;
            birdY += birdVelocity * scale;
            
            // Spawn pipes using proper time tracking
            if (currentTime - lastPipeSpawnTime > pipeSpawnInterval) {
                spawnPipe();
                lastPipeSpawnTime = currentTime;
            }
            
            // Move pipes (delta-time: ~180 px/s)
            const pipeSpeed = 180 * dt;
            pipes = pipes.filter(pipe => {
                pipe.x -= pipeSpeed;
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
        
        for (let pipe of pipes) {
            ctx.fillStyle = '#00cc00';
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 4;
            ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
            ctx.fillRect(pipe.x - 5, pipe.topHeight - 30, pipeWidth + 10, 30);
            const bottomY = pipe.topHeight + pipeGap;
            ctx.fillRect(pipe.x, bottomY, pipeWidth, canvas.height - bottomY);
            ctx.fillRect(pipe.x - 5, bottomY, pipeWidth + 10, 30);
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 6;
        
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

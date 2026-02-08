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
let audioCtx = null;
try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
    console.warn('PIXEL PALACE: Web Audio not available.', e);
}

// SFX and Music toggles (persisted in localStorage)
const STORAGE_SFX = 'pixelpalace_sfx';
const STORAGE_MUSIC = 'pixelpalace_music';
let soundEffectsEnabled = true;
let arcadeMusicEnabled = true;
try {
    if (localStorage.getItem(STORAGE_SFX) === '0') soundEffectsEnabled = false;
    if (localStorage.getItem(STORAGE_MUSIC) === '0') arcadeMusicEnabled = false;
} catch (e) {}

// Arcade background music: multiple segments that rotate (different beats)
let arcadeMusicOsc = null;
let arcadeMusicGain = null;
let arcadeMusicTimeout = null;

const ARCADE_TRACKS = [
    // Track 1: upbeat arpeggio
    [
        [262, 0.15], [330, 0.15], [392, 0.15], [523, 0.2],
        [392, 0.15], [523, 0.25], [0, 0.1],
        [262, 0.15], [330, 0.15], [392, 0.15], [523, 0.2],
        [392, 0.15], [330, 0.25], [0, 0.1],
        [349, 0.15], [440, 0.15], [523, 0.15], [698, 0.2],
        [523, 0.15], [440, 0.25], [0, 0.1],
        [262, 0.15], [330, 0.15], [392, 0.15], [523, 0.2],
        [392, 0.15], [330, 0.2], [262, 0.4]
    ],
    // Track 2: lower, chiller groove
    [
        [196, 0.2], [247, 0.2], [294, 0.2], [247, 0.2],
        [196, 0.25], [0, 0.08], [262, 0.2], [330, 0.2],
        [392, 0.25], [330, 0.2], [262, 0.3], [0, 0.1],
        [220, 0.2], [262, 0.2], [330, 0.2], [262, 0.2],
        [220, 0.3], [0, 0.08], [196, 0.2], [247, 0.25],
        [196, 0.35]
    ],
    // Track 3: higher, bouncy
    [
        [523, 0.12], [659, 0.12], [784, 0.12], [659, 0.12],
        [523, 0.18], [0, 0.06], [587, 0.12], [740, 0.12],
        [523, 0.18], [0, 0.06], [392, 0.15], [494, 0.15],
        [587, 0.15], [494, 0.15], [392, 0.22], [0, 0.08],
        [440, 0.12], [554, 0.12], [659, 0.12], [554, 0.12],
        [440, 0.2], [523, 0.25]
    ]
];

function stopArcadeMusic() {
    if (arcadeMusicTimeout) clearTimeout(arcadeMusicTimeout);
    arcadeMusicTimeout = null;
    if (arcadeMusicOsc) {
        try { arcadeMusicOsc.stop(); } catch (e) {}
        arcadeMusicOsc = null;
    }
    arcadeMusicGain = null;
}

function scheduleArcadeMusicStep(stepIndex, trackIndex) {
    if (!arcadeMusicGain || !gameContainer || !gameContainer.classList.contains('active')) return;
    if (!arcadeMusicEnabled || !audioCtx || audioCtx.state === 'closed') return;
    const track = ARCADE_TRACKS[trackIndex % ARCADE_TRACKS.length];
    const [freq, dur] = track[stepIndex % track.length];
    const nextStep = stepIndex + 1;
    const nextTrackIndex = nextStep >= track.length ? (trackIndex + 1) % ARCADE_TRACKS.length : trackIndex;
    const nextStepIndex = nextStep >= track.length ? 0 : nextStep;
    arcadeMusicTimeout = setTimeout(() => {
        scheduleArcadeMusicStep(nextStepIndex, nextTrackIndex);
    }, (dur + 0.02) * 1000);
    if (freq > 0 && arcadeMusicOsc) {
        try {
            const t = audioCtx.currentTime;
            arcadeMusicOsc.frequency.setValueAtTime(freq, t);
            arcadeMusicGain.gain.setValueAtTime(0.06, t);
            arcadeMusicGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        } catch (e) {}
    }
}

function startArcadeMusic() {
    stopArcadeMusic();
    if (!arcadeMusicEnabled || !audioCtx || audioCtx.state === 'suspended' || audioCtx.state === 'closed') return;
    arcadeMusicOsc = audioCtx.createOscillator();
    arcadeMusicOsc.type = 'square';
    arcadeMusicGain = audioCtx.createGain();
    arcadeMusicGain.gain.value = 0;
    arcadeMusicOsc.connect(arcadeMusicGain);
    arcadeMusicGain.connect(audioCtx.destination);
    arcadeMusicOsc.start(audioCtx.currentTime);
    scheduleArcadeMusicStep(0, 0);
}

function playSound(frequency, duration, type = 'square') {
    if (!soundEffectsEnabled || !audioCtx || audioCtx.state === 'closed') return;
    try {
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
    } catch (err) {}
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
        if (!e.target || !e.target.classList || !e.target.classList.contains('play-btn')) {
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

// Footer SFX and Music toggles (under credits on main homepage)
const sfxToggle = document.getElementById('sfxToggle');
const musicToggle = document.getElementById('musicToggle');
function updateAudioToggleUI() {
    if (sfxToggle) {
        sfxToggle.classList.toggle('muted', !soundEffectsEnabled);
        sfxToggle.title = soundEffectsEnabled ? 'Sound effects: ON (click to turn off)' : 'Sound effects: OFF (click to turn on)';
    }
    if (musicToggle) {
        musicToggle.classList.toggle('muted', !arcadeMusicEnabled);
        musicToggle.title = arcadeMusicEnabled ? 'Arcade music: ON (click to turn off)' : 'Arcade music: OFF (click to turn on)';
    }
}
if (sfxToggle) {
    sfxToggle.addEventListener('click', () => {
        soundEffectsEnabled = !soundEffectsEnabled;
        try { localStorage.setItem(STORAGE_SFX, soundEffectsEnabled ? '1' : '0'); } catch (e) {}
        updateAudioToggleUI();
    });
}
if (musicToggle) {
    musicToggle.addEventListener('click', () => {
        arcadeMusicEnabled = !arcadeMusicEnabled;
        try { localStorage.setItem(STORAGE_MUSIC, arcadeMusicEnabled ? '1' : '0'); } catch (e) {}
        updateAudioToggleUI();
        if (!arcadeMusicEnabled) {
            stopArcadeMusic();
        } else if (gameContainer && gameContainer.classList.contains('active')) {
            if (audioCtx && (audioCtx.state === 'suspended' || audioCtx.state === 'running')) {
                if (audioCtx.state === 'suspended') audioCtx.resume().then(() => startArcadeMusic()).catch(() => {});
                else startArcadeMusic();
            }
        }
    });
}
updateAudioToggleUI();

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
    tron: 'TRON',
    breakout: 'BREAKOUT',
    spaceinvaders: 'SPACE INVADERS',
    memory: 'MEMORY',
    flappy: 'FLAPPY PIXEL',
    '2048': '2048',
    simonsays: 'SIMON SAYS',
    pacman: 'PAC-MAN',
    frogger: 'FROGGER'
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
    
    if (audioCtx && arcadeMusicEnabled) {
        if (audioCtx.state === 'suspended') audioCtx.resume().then(() => startArcadeMusic()).catch(() => {});
        else startArcadeMusic();
    }
    
    // Show the name of the game you're playing in the header
    if (currentGameTitle) {
        currentGameTitle.textContent = GAME_DISPLAY_NAMES[gameName] || gameName.toUpperCase();
    }
    
    const playArea = gameContainer.querySelector('.game-play-area');
    if (playArea && canvas && touchControls) {
        if (!playArea.contains(canvas)) playArea.insertBefore(canvas, playArea.firstChild);
        if (!playArea.contains(touchControls)) playArea.appendChild(touchControls);
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
        case 'tron':
            initTron();
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
        case 'simonsays':
            initSimonSays();
            break;
        case 'pacman':
            initPacman();
            break;
        case 'frogger':
            initFrogger();
            break;
        default:
            console.warn('PIXEL PALACE: Unknown game "' + gameName + '".');
            lobby.style.display = 'block';
            gameContainer.classList.remove('active');
            stopArcadeMusic();
            return;
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
    clearTouchControls();
    stopArcadeMusic();
}

let handleKeyUp = null;

function updateScore(newScore) {
    score = newScore;
    if (scoreValue) scoreValue.textContent = score;
}

let handleKeyDown = null;

// --- Touch support helpers ---
let touchHandlerMap = {};
function handleTouchEnd(e) {
    if (!e.changedTouches || !e.changedTouches.length) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const id = e.changedTouches[i].identifier;
        const fn = touchHandlerMap[id];
        if (fn) {
            try { fn(false); } catch (err) {}
            delete touchHandlerMap[id];
        }
    }
}
function setupGlobalTouchRelease() {
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true });
}
if (typeof document !== 'undefined') setupGlobalTouchRelease();

function getEventCanvasCoords(e) {
    const t = e.touches && e.touches.length ? e.touches[0] : e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : e;
    if (!t || !canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
}

function clearTouchControls() {
    touchHandlerMap = {};
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

    const makeBtn = (label, handler) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'touch-btn';
        btn.innerHTML = label;
        btn.setAttribute('aria-label', label);
        const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
        const onTouchStart = (e) => {
            prevent(e);
            if (e.changedTouches && e.changedTouches.length) {
                touchHandlerMap[e.changedTouches[0].identifier] = handler;
            }
            handler(true);
        };
        const onTouchEnd = (e) => {
            prevent(e);
            if (e.changedTouches && e.changedTouches.length) {
                delete touchHandlerMap[e.changedTouches[0].identifier];
            }
            handler(false);
        };
        btn.addEventListener('touchstart', onTouchStart, { passive: false });
        btn.addEventListener('touchend', onTouchEnd, { passive: false });
        btn.addEventListener('touchcancel', onTouchEnd, { passive: false });
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
    
    canvas.width = 360;
    canvas.height = 360;
    
    const gridSize = 20;
    const tileCount = canvas.width / gridSize;
    
    let snake = [{x: 9, y: 9}];
    let direction = {x: 0, y: 0};
    let food = spawnFood();
    let gameOver = false;
    
    function spawnFood() {
        let x, y;
        for (let tries = 0; tries < 50; tries++) {
            x = Math.floor(Math.random() * tileCount);
            y = Math.floor(Math.random() * tileCount);
            if (!snake.some(s => s.x === x && s.y === y)) return { x, y };
        }
        for (let yy = 0; yy < tileCount; yy++)
            for (let xx = 0; xx < tileCount; xx++)
                if (!snake.some(s => s.x === xx && s.y === yy)) return { x: xx, y: yy };
        return { x: 0, y: 0 };
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
    const gameSpeed = 150;
    
    function update(currentTime) {
        gameLoop = requestAnimationFrame(update);
        
        if (currentTime - lastTime < gameSpeed) return;
        lastTime += gameSpeed;
        
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

// === PONG GAME ===
const PONG_W = 1080;
const PONG_H = 720;
const PADDLE_W = 18;
const PADDLE_H = 100;
const BALL_SIZE = 18;
const PADDLE_SPEED = 320;
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
    
    function clearPongKeys() {
        keys['ArrowUp'] = false; keys['ArrowDown'] = false;
        keys['w'] = false; keys['W'] = false; keys['s'] = false; keys['S'] = false;
        touchKeys['ArrowUp'] = false; touchKeys['ArrowDown'] = false;
    }
    window.addEventListener('blur', clearPongKeys);
    
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
        let aiTargetY = aiY;
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
        let ballAccum = 0;
        const BALL_DT = 1/60;
        const MAX_BALL_STEPS = 5;
        
        function update(now) {
            gameLoop = requestAnimationFrame(update);
            let dt = (now - lastTime) / 1000;
            lastTime = now;
            if (dt > 0.1) dt = BALL_DT;
            
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
            const aiSpeedMax = 220 + Math.min(80, totalScore * 10);
            const aiSmooth = 3.5;
            if (ballSpeedX > 0) {
                const dist = (PONG_W - PADDLE_W - 20 - BALL_SIZE) - ballX;
                if (dist > 0) {
                    const t = dist / (Math.abs(ballSpeedX) * 60);
                    let targetY = ballY + ballSpeedY * 60 * t - PADDLE_H / 2;
                    targetY = Math.max(0, Math.min(PONG_H - PADDLE_H, targetY));
                    aiTargetY += (targetY - aiTargetY) * Math.min(1, 8 * dt);
                }
            } else {
                const centerY = ballY - PADDLE_H / 2;
                aiTargetY += (Math.max(0, Math.min(PONG_H - PADDLE_H, centerY)) - aiTargetY) * Math.min(1, 4 * dt);
            }
            const aiCenter = aiY + PADDLE_H / 2;
            const targetCenter = aiTargetY + PADDLE_H / 2;
            const diff = targetCenter - aiCenter;
            const move = Math.max(-aiSpeedMax * dt, Math.min(aiSpeedMax * dt, diff * aiSmooth * dt));
            aiY = Math.max(0, Math.min(PONG_H - PADDLE_H, aiY + move));
            
            ballAccum += dt;
            let steps = 0;
            while (ballAccum >= BALL_DT && steps < MAX_BALL_STEPS) {
                ballAccum -= BALL_DT;
                steps++;
                ballX += ballSpeedX;
                ballY += ballSpeedY;
                
                if (ballY <= 0 || ballY >= PONG_H - BALL_SIZE) {
                    ballSpeedY = -ballSpeedY;
                    playSound(300, 0.05);
                }
                
                if (ballX <= PADDLE_W + 20 && ballY + BALL_SIZE >= playerY && ballY <= playerY + PADDLE_H && ballSpeedX < 0) {
                    ballSpeedX = -ballSpeedX;
                    ballSpeedY = (ballY - playerY) / PADDLE_H * (600 / 60) - 300 / 60;
                    playSound(500, 0.1);
                }
                if (ballX >= PONG_W - PADDLE_W - 20 - BALL_SIZE && ballY + BALL_SIZE >= aiY && ballY <= aiY + PADDLE_H && ballSpeedX > 0) {
                    ballSpeedX = -ballSpeedX;
                    ballSpeedY = (ballY - aiY) / PADDLE_H * (600 / 60) - 300 / 60;
                    playSound(500, 0.1);
                }
                
                if (ballX < 0) {
                    aiScore++;
                    resetBall();
                    ballAccum = 0;
                    playSound(200, 0.3);
                }
                if (ballX > PONG_W) {
                    playerScore++;
                    updateScore(playerScore);
                    resetBall();
                    ballAccum = 0;
                    playSound(800, 0.2);
                }
            }
            
            ballSpeedX = Math.max(-12, Math.min(12, ballSpeedX));
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
        let ballAccum = 0;
        const BALL_DT = 1/60;
        const MAX_BALL_STEPS = 5;
        
        function update(now) {
            gameLoop = requestAnimationFrame(update);
            let dt = (now - lastTime) / 1000;
            lastTime = now;
            if (dt > 0.1) dt = BALL_DT;
            
            if (gameOver) {
                drawPongField(ctx, PONG_W, PONG_H, PADDLE_W, PADDLE_H, BALL_SIZE);
                ctx.fillStyle = '#ff4444';
                ctx.font = '16px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText('Opponent disconnected', PONG_W / 2, PONG_H / 2);
                return;
            }
            
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
                ballAccum += dt;
                let steps = 0;
                while (ballAccum >= BALL_DT && steps < MAX_BALL_STEPS) {
                    ballAccum -= BALL_DT;
                    steps++;
                    ballX += ballSpeedX;
                    ballY += ballSpeedY;
                    
                    if (ballY <= 0 || ballY >= PONG_H - BALL_SIZE) {
                        ballSpeedY = -ballSpeedY;
                        playSound(300, 0.05);
                    }
                    const px = 20;
                    const ox = PONG_W - PADDLE_W - 20 - BALL_SIZE;
                    if (ballX <= px + PADDLE_W && ballY + BALL_SIZE >= paddle1Y && ballY <= paddle1Y + PADDLE_H && ballSpeedX < 0) {
                        ballSpeedX = -ballSpeedX;
                        ballSpeedY = (ballY - paddle1Y) / PADDLE_H * (600/60) - 300/60;
                        playSound(500, 0.1);
                    }
                    if (ballX >= ox && ballY + BALL_SIZE >= paddle2Y && ballY <= paddle2Y + PADDLE_H && ballSpeedX > 0) {
                        ballSpeedX = -ballSpeedX;
                        ballSpeedY = (ballY - paddle2Y) / PADDLE_H * (600/60) - 300/60;
                        playSound(500, 0.1);
                    }
                    if (ballX < 0) {
                        score2++;
                        resetBall();
                        ballAccum = 0;
                        playSound(200, 0.3);
                    }
                    if (ballX > PONG_W) {
                        score1++;
                        updateScore(score1);
                        resetBall();
                        ballAccum = 0;
                        playSound(800, 0.2);
                    }
                }
                ballSpeedX = Math.max(-12, Math.min(12, ballSpeedX));
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
        window.removeEventListener('blur', clearPongKeys);
        gameContainer.classList.remove('pong-landscape-layout');
        modeOverlay.remove();
        rotateOverlay.remove();
        pongGameArea.remove();
        const playArea = gameContainer.querySelector('.game-play-area');
        if (playArea) {
            playArea.appendChild(canvas);
            playArea.appendChild(touchControls);
        } else {
            gameContainer.insertBefore(canvas, gameControls);
            gameContainer.insertBefore(touchControls, gameControls);
        }
        window.removeEventListener('orientationchange', checkPongOrientation);
        window.removeEventListener('resize', checkPongOrientation);
    });
}

// === TRON LIGHT CYCLES ===
const TRON_COLS = 90;
const TRON_ROWS = 60;
const TRON_CELL = 10;
const TRON_W = TRON_COLS * TRON_CELL;
const TRON_H = TRON_ROWS * TRON_CELL;
const TRON_TRAIL_PAD = 3;
const TRON_BIKE_PAD = 1;
const TRON_MOVE_MS = 80;
const TRON_MOVE_MS_BOOST = 55;  // when holding Shift
const TRON_LINE_WIDTH = 2;
const TRON_DX = [0, 1, 0, -1];
const TRON_DY = [-1, 0, 1, 0];

function initTron() {
    currentGameTitle.textContent = 'TRON';
    gameControls.innerHTML = 'Arrow keys or touch to turn. Hold Shift to speed up. Don\'t hit walls or trails.';
    if (!canvas || !ctx) return;
    canvas.width = TRON_W;
    canvas.height = TRON_H;
    const keys = {};
    let nextDir = null;
    handleKeyDown = (e) => {
        keys[e.key] = true;
        const k = e.key;
        if (k === 'ArrowUp' || k === 'w' || k === 'W') nextDir = 0;
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') nextDir = 1;
        else if (k === 'ArrowDown' || k === 's' || k === 'S') nextDir = 2;
        else if (k === 'ArrowLeft' || k === 'a' || k === 'A') nextDir = 3;
    };
    handleKeyUp = (e) => { keys[e.key] = false; };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    addTouchDpad({
        onUp: (p) => { if (p) nextDir = 0; },
        onDown: (p) => { if (p) nextDir = 2; },
        onLeft: (p) => { if (p) nextDir = 3; },
        onRight: (p) => { if (p) nextDir = 1; }
    });
    function clearTronKeys() {
        keys['ArrowUp'] = keys['ArrowDown'] = keys['ArrowLeft'] = keys['ArrowRight'] = false;
        keys['Shift'] = keys['w'] = keys['W'] = keys['a'] = keys['A'] = keys['s'] = keys['S'] = keys['d'] = keys['D'] = false;
    }
    window.addEventListener('blur', clearTronKeys);
    gameContainer.querySelectorAll('.pong-mode-overlay').forEach(el => el.remove());
    const modeOverlay = document.createElement('div');
    modeOverlay.className = 'pong-mode-overlay';
    modeOverlay.setAttribute('role', 'dialog');
    modeOverlay.setAttribute('aria-label', 'Choose Tron mode');
    modeOverlay.innerHTML = '<h3>Choose mode</h3><div class="pong-mode-btns"></div>';
    const modeBtns = modeOverlay.querySelector('.pong-mode-btns');
    const btnAI = document.createElement('button');
    btnAI.type = 'button';
    btnAI.className = 'pong-mode-btn ai';
    btnAI.textContent = 'AI Play';
    btnAI.addEventListener('click', () => { modeOverlay.remove(); startTronAI(); });
    const btnOnline = document.createElement('button');
    btnOnline.type = 'button';
    btnOnline.className = 'pong-mode-btn online';
    btnOnline.textContent = 'Online Play';
    btnOnline.addEventListener('click', () => { modeOverlay.remove(); showTronOnlineLobby(); });
    modeBtns.appendChild(btnAI);
    modeBtns.appendChild(btnOnline);
    gameContainer.appendChild(modeOverlay);
    cleanupFunctions.push(() => { modeOverlay.remove(); window.removeEventListener('blur', clearTronKeys); });

    function startTronAI() {
        let grid = Array(TRON_ROWS).fill(0).map(() => Array(TRON_COLS).fill(0));
        const midY = Math.floor(TRON_ROWS/2);
        let p1 = { x: 2, y: midY, dir: 1, alive: true, path: [[2, midY]] };
        let p2 = { x: TRON_COLS - 3, y: midY, dir: 3, alive: true, path: [[TRON_COLS - 3, midY]] };
        grid[p1.y][p1.x] = 1;
        grid[p2.y][p2.x] = 2;
        let playerDir = 1;
        let lastMove = performance.now();
        let gameOver = false;
        let winner = 0;

        function canTurn(currentDir, newDir) {
            if (currentDir === newDir) return true;
            return (currentDir + 2) % 4 !== newDir;
        }
        function nextCell(x, y, dir) {
            return { x: x + TRON_DX[dir], y: y + TRON_DY[dir] };
        }
        function valid(c) {
            return c.x >= 0 && c.x < TRON_COLS && c.y >= 0 && c.y < TRON_ROWS && grid[c.y][c.x] === 0;
        }
        function stepsUntilCrash(cx, cy, dir) {
            let x = cx, y = cy, steps = 0;
            while (true) {
                const n = nextCell(x, y, dir);
                if (!valid(n)) return steps;
                x = n.x; y = n.y;
                steps++;
                if (steps > TRON_COLS + TRON_ROWS) return steps;
            }
        }
        function aiChooseDir(cycle) {
            const perp = [(cycle.dir + 1) % 4, (cycle.dir + 3) % 4];
            const options = [cycle.dir, perp[0], perp[1]];
            const validDirs = options.filter(d => valid(nextCell(cycle.x, cycle.y, d)));
            if (validDirs.length === 0) return cycle.dir;
            const withSpace = validDirs.map(d => ({ d, space: stepsUntilCrash(cycle.x, cycle.y, d) }));
            withSpace.sort((a, b) => b.space - a.space);
            const best = withSpace[0].space;
            const good = withSpace.filter(w => w.space >= Math.max(1, best - 8));
            const pick = good[Math.floor(Math.random() * good.length)];
            return pick.d;
        }

        function update(now) {
            gameLoop = requestAnimationFrame(update);
            if (gameOver) {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, TRON_W, TRON_H);
                ctx.fillStyle = winner === 1 ? '#00ffff' : '#ff00ff';
                ctx.font = '20px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText(winner === 1 ? 'YOU WIN' : 'AI WINS', TRON_W/2, TRON_H/2 - 10);
                ctx.fillStyle = '#fff';
                ctx.font = '10px "Press Start 2P"';
                ctx.fillText('Back to lobby to replay', TRON_W/2, TRON_H/2 + 25);
                return;
            }
            if (nextDir !== null && canTurn(playerDir, nextDir)) playerDir = nextDir;
            const moveMs = keys['Shift'] ? TRON_MOVE_MS_BOOST : TRON_MOVE_MS;
            const MAX_MOVES_PER_FRAME = 3;
            let moveSteps = 0;
            while (!gameOver && (now - lastMove) >= moveMs && moveSteps < MAX_MOVES_PER_FRAME) {
                lastMove += moveMs;
                moveSteps++;
                p1.dir = playerDir;
                p2.dir = aiChooseDir(p2);
                const moveOrder = p1.y < p2.y ? [p1, p2] : [p2, p1];
                for (const cycle of moveOrder) {
                    if (!cycle.alive) continue;
                    const n = nextCell(cycle.x, cycle.y, cycle.dir);
                    if (!valid(n)) {
                        cycle.alive = false;
                        continue;
                    }
                    cycle.path.push([cycle.x, cycle.y]);
                    grid[cycle.y][cycle.x] = cycle === p1 ? 1 : 2;
                    cycle.x = n.x;
                    cycle.y = n.y;
                }
                if (!p1.alive || !p2.alive) {
                    gameOver = true;
                    winner = p1.alive ? 1 : 2;
                    if (winner === 1) updateScore(1);
                    playSound(winner === 1 ? 800 : 200, 0.2);
                }
            }
            const interp = Math.min(1, (now - lastMove) / moveMs);
            drawTronGrid(grid, p1, p2, 1, 2, interp);
        }
        function drawTronGrid(grid, c1, c2, trail1, trail2, interp) {
            interp = interp || 0;
            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, TRON_W, TRON_H);
            const bikeSize = TRON_CELL - TRON_BIKE_PAD * 2;
            const cx = TRON_CELL / 2;
            function drawTrailLine(path, color, headX, headY) {
                if (path.length === 0) return;
                ctx.strokeStyle = color;
                ctx.lineWidth = TRON_LINE_WIDTH;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(path[0][0] * TRON_CELL + cx, path[0][1] * TRON_CELL + cx);
                for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0] * TRON_CELL + cx, path[i][1] * TRON_CELL + cx);
                ctx.lineTo(headX * TRON_CELL + cx, headY * TRON_CELL + cx);
                ctx.stroke();
            }
            const h1x = c1.x + TRON_DX[c1.dir] * interp;
            const h1y = c1.y + TRON_DY[c1.dir] * interp;
            const h2x = c2.x + TRON_DX[c2.dir] * interp;
            const h2y = c2.y + TRON_DY[c2.dir] * interp;
            if (c1.alive && c1.path) drawTrailLine(c1.path, '#00ffff', h1x, h1y);
            if (c2.alive && c2.path) drawTrailLine(c2.path, '#ff00ff', h2x, h2y);
            if (c1.alive) {
                const dx = h1x * TRON_CELL + TRON_BIKE_PAD;
                const dy = h1y * TRON_CELL + TRON_BIKE_PAD;
                ctx.fillStyle = '#00ffff';
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 8;
                ctx.fillRect(dx, dy, bikeSize, bikeSize);
                ctx.shadowBlur = 0;
            }
            if (c2.alive) {
                const dx = h2x * TRON_CELL + TRON_BIKE_PAD;
                const dy = h2y * TRON_CELL + TRON_BIKE_PAD;
                ctx.fillStyle = '#ff00ff';
                ctx.shadowColor = '#ff00ff';
                ctx.shadowBlur = 8;
                ctx.fillRect(dx, dy, bikeSize, bikeSize);
                ctx.shadowBlur = 0;
            }
        }
        gameLoop = requestAnimationFrame(update);
    }

    function showTronOnlineLobby() {
        const hasPeer = typeof Peer !== 'undefined';
        const overlay = document.createElement('div');
        overlay.className = 'pong-online-overlay';
        overlay.innerHTML = '<h3>Play vs someone online</h3><div class="pong-online-btns"></div>';
        const btns = overlay.querySelector('.pong-online-btns');
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'pong-online-btn back';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', () => { overlay.remove(); gameContainer.appendChild(modeOverlay); });
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
            cancelBtn.addEventListener('click', () => { overlay.remove(); try { peer.destroy(); } catch(e){} gameContainer.appendChild(modeOverlay); });
            btns.appendChild(cancelBtn);
            peer.on('open', () => {});
            peer.on('connection', (conn) => {
                conn.on('open', () => { overlay.remove(); startTronOnline(conn, true, peer); });
            });
            peer.on('error', (err) => { waitEl.textContent = 'Error: ' + (err.message || 'Could not create game.'); });
            cleanupFunctions.push(() => { try { peer.destroy(); } catch(e) {} });
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
                    if (!conn) { overlay.querySelector('h3').textContent = 'Could not connect.'; return; }
                    conn.on('open', () => { overlay.remove(); startTronOnline(conn, false, peer); });
                    conn.on('error', () => { overlay.querySelector('h3').textContent = 'Connection failed. Check code.'; });
                });
                peer.on('error', (err) => { overlay.querySelector('h3').textContent = 'Error: ' + (err.message || 'Try again.'); });
                cleanupFunctions.push(() => { try { peer.destroy(); } catch(e) {} });
            });
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') goBtn.click(); });
        });
        btns.appendChild(createBtn);
        btns.appendChild(joinBtn);
        btns.appendChild(backBtn);
        gameContainer.appendChild(overlay);
    }

    function startTronOnline(conn, isHost, peerRef) {
        let grid = Array(TRON_ROWS).fill(0).map(() => Array(TRON_COLS).fill(0));
        const midY = Math.floor(TRON_ROWS/2);
        let p1 = { x: 2, y: midY, dir: 1, alive: true, path: [[2, midY]] };
        let p2 = { x: TRON_COLS - 3, y: midY, dir: 3, alive: true, path: [[TRON_COLS - 3, midY]] };
        grid[p1.y][p1.x] = 1;
        grid[p2.y][p2.x] = 2;
        let myDir = isHost ? 1 : 3;
        let remoteDir = isHost ? 3 : 1;
        let lastMove = performance.now();
        let lastSend = 0;
        let lastFrame = performance.now();
        let gameOver = false;
        let winner = 0;
        let disconnected = false;
        cleanupFunctions.push(() => { try { conn.close(); } catch(e){} try { if (peerRef) peerRef.destroy(); } catch(e){} });
        conn.on('data', (data) => {
            if (data.t === 'dir') remoteDir = data.d;
            if (data.t === 'state') {
                p1.x = data.p1x; p1.y = data.p1y; p1.dir = data.p1d; p1.alive = data.p1a;
                p2.x = data.p2x; p2.y = data.p2y; p2.dir = data.p2d; p2.alive = data.p2a;
                if (data.p1path) p1.path = data.p1path;
                if (data.p2path) p2.path = data.p2path;
                for (let r = 0; r < TRON_ROWS; r++) for (let c = 0; c < TRON_COLS; c++) grid[r][c] = data.g[r][c];
                gameOver = data.go;
                winner = data.win || 0;
            }
        });
        conn.on('close', () => { disconnected = true; });
        conn.on('error', () => { disconnected = true; });
        function canTurn(cur, newD) { return cur === newD || (cur + 2) % 4 !== newD; }
        function nextCell(x, y, d) { return { x: x + TRON_DX[d], y: y + TRON_DY[d] }; }
        function valid(c) { return c.x >= 0 && c.x < TRON_COLS && c.y >= 0 && c.y < TRON_ROWS && grid[c.y][c.x] === 0; }
        const SEND_INTERVAL_MS = 66;
        function update(now) {
            gameLoop = requestAnimationFrame(update);
            const dt = (now - lastFrame) / 1000;
            lastFrame = now;
            if (disconnected) {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, TRON_W, TRON_H);
                ctx.fillStyle = '#f44';
                ctx.font = '14px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText('Opponent disconnected', TRON_W/2, TRON_H/2);
                return;
            }
            if (nextDir !== null && canTurn(myDir, nextDir)) { myDir = nextDir; nextDir = null; }
            if (isHost) {
                const cycle1 = p1;
                const cycle2 = p2;
                const MAX_MOVES_PER_FRAME = 3;
                let moveSteps = 0;
                while (!gameOver && (now - lastMove) >= TRON_MOVE_MS && moveSteps < MAX_MOVES_PER_FRAME) {
                    lastMove += TRON_MOVE_MS;
                    moveSteps++;
                    cycle1.dir = myDir;
                    cycle2.dir = remoteDir;
                    for (const cycle of [cycle1, cycle2]) {
                        if (!cycle.alive) continue;
                        const n = nextCell(cycle.x, cycle.y, cycle.dir);
                        if (!valid(n)) { cycle.alive = false; continue; }
                        cycle.path.push([cycle.x, cycle.y]);
                        grid[cycle.y][cycle.x] = cycle === cycle1 ? 1 : 2;
                        cycle.x = n.x;
                        cycle.y = n.y;
                    }
                    if (!cycle1.alive || !cycle2.alive) {
                        gameOver = true;
                        winner = cycle1.alive ? 1 : 2;
                        if (winner === 1) updateScore(1);
                        playSound(winner === 1 ? 800 : 200, 0.2);
                    }
                }
                if (now - lastSend >= SEND_INTERVAL_MS) {
                    lastSend = now;
                    conn.send({ t: 'state', p1x: p1.x, p1y: p1.y, p1d: p1.dir, p1a: p1.alive, p2x: p2.x, p2y: p2.y, p2d: p2.dir, p2a: p2.alive, p1path: p1.path, p2path: p2.path, g: grid, go: gameOver, win: winner });
                }
            } else {
                if (now - lastSend >= SEND_INTERVAL_MS) {
                    lastSend = now;
                    conn.send({ t: 'dir', d: myDir });
                }
            }
            if (gameOver) {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, TRON_W, TRON_H);
                const me = isHost ? 1 : 2;
                ctx.fillStyle = winner === me ? '#00ff00' : '#ff4444';
                ctx.font = '20px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText(winner === me ? 'YOU WIN' : 'YOU LOSE', TRON_W/2, TRON_H/2 - 10);
                return;
            }
            const interp = isHost ? Math.min(1, (now - lastMove) / TRON_MOVE_MS) : 0;
            const bikeSize = TRON_CELL - TRON_BIKE_PAD * 2;
            const cx = TRON_CELL / 2;
            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, TRON_W, TRON_H);
            function drawTrailLine(path, color, headX, headY) {
                if (!path || path.length === 0) return;
                ctx.strokeStyle = color;
                ctx.lineWidth = TRON_LINE_WIDTH;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(path[0][0] * TRON_CELL + cx, path[0][1] * TRON_CELL + cx);
                for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0] * TRON_CELL + cx, path[i][1] * TRON_CELL + cx);
                ctx.lineTo(headX * TRON_CELL + cx, headY * TRON_CELL + cx);
                ctx.stroke();
            }
            const h1x = p1.x + TRON_DX[p1.dir] * interp;
            const h1y = p1.y + TRON_DY[p1.dir] * interp;
            const h2x = p2.x + TRON_DX[p2.dir] * interp;
            const h2y = p2.y + TRON_DY[p2.dir] * interp;
            if (p1.alive && p1.path) drawTrailLine(p1.path, '#00ffff', h1x, h1y);
            if (p2.alive && p2.path) drawTrailLine(p2.path, '#ff00ff', h2x, h2y);
            if (p1.alive) {
                ctx.fillStyle = '#00ffff';
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 6;
                ctx.fillRect(h1x * TRON_CELL + TRON_BIKE_PAD, h1y * TRON_CELL + TRON_BIKE_PAD, bikeSize, bikeSize);
                ctx.shadowBlur = 0;
            }
            if (p2.alive) {
                ctx.fillStyle = '#ff00ff';
                ctx.shadowColor = '#ff00ff';
                ctx.shadowBlur = 6;
                ctx.fillRect(h2x * TRON_CELL + TRON_BIKE_PAD, h2y * TRON_CELL + TRON_BIKE_PAD, bikeSize, bikeSize);
                ctx.shadowBlur = 0;
            }
        }
        gameLoop = requestAnimationFrame(update);
    }

    cleanupFunctions.push(() => { modeOverlay.remove(); });
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
    function clearBreakoutKeys() { keys['ArrowLeft'] = false; keys['ArrowRight'] = false; }
    window.addEventListener('blur', clearBreakoutKeys);
    
    function setPaddleFromClientX(clientX) {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width) return;
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
        if (e.touches.length) {
            e.preventDefault();
            setPaddleFromClientX(e.touches[0].clientX);
        }
    }, { passive: false });
    
    let lastTime = performance.now();
    const PADDLE_SPEED = 480;
    const BALL_DT = 1/60;
    const MAX_BALL_STEPS = 5;
    let ballAccum = 0;
    
    function update(now) {
        gameLoop = requestAnimationFrame(update);
        
        let dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = BALL_DT;
        
        if (keys['ArrowLeft']) paddleX = Math.max(0, paddleX - PADDLE_SPEED * dt);
        if (keys['ArrowRight']) paddleX = Math.min(canvas.width - paddleWidth, paddleX + PADDLE_SPEED * dt);
        
        if (!gameOver && !win) {
            ballAccum += dt;
            let steps = 0;
            while (ballAccum >= BALL_DT && steps < MAX_BALL_STEPS) {
                ballAccum -= BALL_DT;
                steps++;
                ballX += ballSpeedX;
                ballY += ballSpeedY;
                
                // Wall collisions
                if (ballX <= 0 || ballX >= canvas.width - ballSize) {
                    ballSpeedX = -ballSpeedX;
                    ballX = Math.max(ballSize, Math.min(canvas.width - ballSize * 2, ballX));
                    playSound(300, 0.05);
                }
                if (ballY <= 0) {
                    ballSpeedY = -ballSpeedY;
                    ballY = ballSize + 1;
                    playSound(300, 0.05);
                }
                
                // Paddle collision
                if (ballY >= canvas.height - paddleHeight - 20 - ballSize &&
                    ballX >= paddleX && ballX <= paddleX + paddleWidth) {
                    ballSpeedY = -Math.abs(ballSpeedY);
                    const hitPos = (ballX - paddleX) / paddleWidth;
                    ballSpeedX = (hitPos - 0.5) * 10;
                    ballY = canvas.height - paddleHeight - 20 - ballSize - 1;
                    playSound(500, 0.1);
                }
                
                // Bottom - game over
                if (ballY > canvas.height) {
                    gameOver = true;
                    playSound(100, 0.5);
                }
                
                // Brick collision (first hit only per step, then nudge ball out so it doesn't re-hit)
                let brickHit = false;
                for (let r = 0; r < brickRows && !brickHit; r++) {
                    for (let c = 0; c < brickCols && !brickHit; c++) {
                        const brick = bricks[r][c];
                        if (brick.status === 1) {
                            const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                            const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                            brick.x = brickX;
                            brick.y = brickY;
                            if (ballX >= brickX && ballX <= brickX + brickWidth &&
                                ballY >= brickY && ballY <= brickY + brickHeight) {
                                ballSpeedY = -ballSpeedY;
                                brick.status = 0;
                                brickHit = true;
                                if (ballSpeedY > 0) ballY = brickY + brickHeight + ballSize + 1;
                                else ballY = brickY - ballSize - 1;
                                updateScore(score + 10);
                                playSound(600 + r * 100, 0.1);
                            }
                        }
                    }
                }
            }
            if (!gameOver && !win) {
                let bricksLeft = 0;
                for (let r = 0; r < brickRows; r++)
                    for (let c = 0; c < brickCols; c++)
                        if (bricks[r][c].status === 1) bricksLeft++;
                if (bricksLeft === 0) {
                    win = true;
                    playSound(1000, 0.5);
                }
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
    cleanupFunctions.push(() => { window.removeEventListener('blur', clearBreakoutKeys); });
}

// === SPACE INVADERS ===
function initSpaceInvaders() {
    currentGameTitle.textContent = 'SPACE INVADERS';
    gameControls.innerHTML = '← → Move | SPACE Shoot';
    
    canvas.width = 560;
    canvas.height = 440;
    
    const playerWidth = 44;
    const playerHeight = 26;
    let playerX = canvas.width / 2 - playerWidth / 2;
    
    const invaderRows = 4;
    const invaderCols = 8;
    const invaderWidth = 36;
    const invaderHeight = 26;
    const invaderPadding = 12;
    
    let invaders = [];
    let invaderDirection = 1;
    let invaderSpeed = 1;
    let bullets = [];
    let enemyBullets = [];
    let gameOver = false;
    let win = false;
    
    const INVADER_COLORS = ['#ff4444', '#ffaa00', '#00ff88', '#00ccff'];
    
    for (let r = 0; r < invaderRows; r++) {
        for (let c = 0; c < invaderCols; c++) {
            invaders.push({
                x: c * (invaderWidth + invaderPadding) + 44,
                y: r * (invaderHeight + invaderPadding) + 40,
                alive: true,
                row: r
            });
        }
    }
    
    const keys = {};
    
    function doFire() {
        if (!gameOver && !win) {
            bullets.push({ x: playerX + playerWidth / 2, y: canvas.height - 52 });
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
    function clearSpaceKeys() {
        keys['ArrowLeft'] = keys['ArrowRight'] = keys[' '] = false;
        touchKeys['ArrowLeft'] = touchKeys['ArrowRight'] = false;
    }
    window.addEventListener('blur', clearSpaceKeys);
    
    let lastEnemyShot = 0;
    let lastTime = performance.now();
    const PLAYER_SPEED = 360;
    const BULLET_SPEED = 480;
    const ENEMY_BULLET_SPEED = 300;
    const STEP_DT = 1/60;
    const MAX_STEPS = 5;
    let accum = 0;
    let enemyShotAccum = 0;
    
    function update(currentTime) {
        gameLoop = requestAnimationFrame(update);
        
        let dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        if (dt > 0.1) dt = STEP_DT;
        
        if (!gameOver && !win) {
            // Player movement (delta-time for responsiveness)
            if (keys['ArrowLeft'] || touchKeys['ArrowLeft']) playerX = Math.max(0, playerX - PLAYER_SPEED * dt);
            if (keys['ArrowRight'] || touchKeys['ArrowRight']) playerX = Math.min(canvas.width - playerWidth, playerX + PLAYER_SPEED * dt);
            
            let aliveInvaders = invaders.filter(inv => inv.alive);
            if (aliveInvaders.length === 0) {
                win = true;
                playSound(1000, 0.5);
            }
            
            // Fixed timestep for invaders, bullets, enemy bullets (smooth speed)
            accum += dt;
            enemyShotAccum += dt;
            let steps = 0;
            while (accum >= STEP_DT && steps < MAX_STEPS) {
                accum -= STEP_DT;
                steps++;
                
                // Move invaders one fixed step
                let moveDown = false;
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
                        if (inv.alive && inv.y > canvas.height - 88) {
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
                const bulletMove = BULLET_SPEED * STEP_DT;
                bullets = bullets.filter(b => {
                    b.y -= bulletMove;
                    return b.y > 0;
                });
                
                const enemyBulletMove = ENEMY_BULLET_SPEED * STEP_DT;
                enemyBullets = enemyBullets.filter(b => {
                    b.y += enemyBulletMove;
                    return b.y < canvas.height;
                });
            }
            
            // Enemy shooting (fixed interval)
            if (enemyShotAccum >= 1.5 && aliveInvaders.length > 0) {
                enemyShotAccum = 0;
                const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
                enemyBullets.push({ x: shooter.x + invaderWidth / 2, y: shooter.y + invaderHeight });
            }
            
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
                    bullet.y >= canvas.height - 46 && bullet.y <= canvas.height - 18) {
                    gameOver = true;
                    playSound(100, 0.5);
                }
            }
        }
        
        // Draw
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#050510');
        bgGrad.addColorStop(0.6, '#0a0a1a');
        bgGrad.addColorStop(1, '#0d0d25');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Starfield - two layers
        const t = currentTime * 0.002;
        for (let i = 0; i < 60; i++) {
            const x = (i * 73) % canvas.width;
            const y = (i * 97 + Math.floor(t + i) % 100) % (canvas.height - 50);
            const bright = 0.2 + (i % 4) * 0.2;
            ctx.fillStyle = `rgba(200,220,255,${bright})`;
            ctx.fillRect(x, y, 1, 1);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 25; i++) {
            ctx.fillRect((i * 113) % canvas.width, (i * 67) % (canvas.height - 50), 2, 2);
        }
        
        // Ground line (base)
        const baseY = canvas.height - 22;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        ctx.lineTo(canvas.width, baseY);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Draw invaders - classic pixel look with row colors
        for (let inv of invaders) {
            if (inv.alive) {
                const color = INVADER_COLORS[inv.row % INVADER_COLORS.length];
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = 8;
                const w = invaderWidth - 8;
                const h = invaderHeight - 8;
                const cx = inv.x + invaderWidth / 2;
                ctx.fillRect(inv.x + 4, inv.y + 4, w, h);
                ctx.fillRect(inv.x, inv.y + 12, 6, 10);
                ctx.fillRect(inv.x + invaderWidth - 6, inv.y + 12, 6, 10);
                ctx.fillRect(inv.x + 10, inv.y + invaderHeight - 6, 8, 4);
                ctx.fillRect(inv.x + invaderWidth - 18, inv.y + invaderHeight - 6, 8, 4);
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fillRect(inv.x + 8, inv.y + 6, 6, 4);
            }
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        // Player ship - neon style
        const shipY = canvas.height - 24;
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(playerX + playerWidth / 2, shipY - 22);
        ctx.lineTo(playerX + 4, shipY);
        ctx.lineTo(playerX + playerWidth / 2 - 6, shipY - 8);
        ctx.lineTo(playerX + playerWidth / 2, shipY);
        ctx.lineTo(playerX + playerWidth / 2 + 6, shipY - 8);
        ctx.lineTo(playerX + playerWidth - 4, shipY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.moveTo(playerX + playerWidth / 2 - 4, shipY - 14);
        ctx.lineTo(playerX + playerWidth / 2, shipY - 18);
        ctx.lineTo(playerX + playerWidth / 2 + 4, shipY - 14);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ffff00';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ffff00';
        for (let bullet of bullets) {
            ctx.fillRect(bullet.x - 2, bullet.y, 4, 12);
        }
        
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff4444';
        for (let bullet of enemyBullets) {
            ctx.fillRect(bullet.x - 2, bullet.y, 4, 12);
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 32);
        }
        
        if (win) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff00';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('YOU WIN!', canvas.width/2, canvas.height/2);
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Press SPACE to play again', canvas.width/2, canvas.height/2 + 32);
        }
    }
    
    gameLoop = requestAnimationFrame(update);
    cleanupFunctions.push(() => { window.removeEventListener('blur', clearSpaceKeys); });
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
            if (!rect.width || !rect.height) return null;
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
    
    canvas.width = 320;
    canvas.height = 480;
    
    const birdSize = 24;
    let birdY = canvas.height / 2;
    let birdVelocity = 0;
    const gravity = 0.5;
    const flapStrength = -10;
    
    const pipeWidth = 48;
    const pipeGap = 180;
    let pipes = [];
    let gameOver = false;
    let started = false;
    
    let pipeSpawnAccum = 0;
    const pipeSpawnIntervalSec = 2;
    
    function spawnPipe() {
        const minHeight = 60;
        const maxHeight = canvas.height - pipeGap - minHeight;
        const height = Math.random() * (maxHeight - minHeight) + minHeight;
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
        if (!started) started = true;
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
    bgGradient.addColorStop(0, '#0a0630');
    bgGradient.addColorStop(0.4, '#001533');
    bgGradient.addColorStop(1, '#002244');
    
    const STEP_DT = 1/60;
    const MAX_STEPS = 5;
    const PIPE_SPEED_PER_STEP = 180 * STEP_DT;
    let accum = 0;
    let gameOverSoundPlayed = false;
    
    function update(now) {
        gameLoop = requestAnimationFrame(update);
        
        let dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = STEP_DT;
        
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Stars (two layers)
        for (let i = 0; i < 45; i++) {
            const x = (i * 47) % canvas.width;
            const y = (i * 83) % canvas.height;
            const a = 0.15 + (i % 3) * 0.15;
            ctx.fillStyle = `rgba(255,255,255,${a})`;
            ctx.fillRect(x, y, 1, 1);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (let i = 0; i < 20; i++) {
            ctx.fillRect((i * 61) % canvas.width, (i * 97) % canvas.height, 2, 2);
        }
        
        if (started && !gameOver) {
            accum += dt;
            let steps = 0;
            while (accum >= STEP_DT && steps < MAX_STEPS) {
                accum -= STEP_DT;
                steps++;
                birdVelocity += gravity;
                birdY += birdVelocity;
                
                // Spawn pipes every N seconds (fixed step)
                pipeSpawnAccum += STEP_DT;
                if (pipeSpawnAccum >= pipeSpawnIntervalSec) {
                    pipeSpawnAccum = 0;
                    spawnPipe();
                }
                
                // Move pipes (fixed speed per step)
                pipes = pipes.filter(pipe => {
                    pipe.x -= PIPE_SPEED_PER_STEP;
                    return pipe.x > -pipeWidth;
                });
                
                const birdX = 64;
                
                // Ground/ceiling - clamp and game over
                if (birdY < 0) {
                    birdY = 0;
                    gameOver = true;
                    if (!gameOverSoundPlayed) { gameOverSoundPlayed = true; playSound(100, 0.5); }
                }
                if (birdY > canvas.height - birdSize) {
                    birdY = canvas.height - birdSize;
                    gameOver = true;
                    if (!gameOverSoundPlayed) { gameOverSoundPlayed = true; playSound(100, 0.5); }
                }
                
                // Pipes - one collision per step, then stop so we don't re-trigger
                if (!gameOver) {
                    for (let pipe of pipes) {
                        if (birdX + birdSize > pipe.x && birdX < pipe.x + pipeWidth) {
                            if (birdY < pipe.topHeight || birdY + birdSize > pipe.topHeight + pipeGap) {
                                gameOver = true;
                                if (!gameOverSoundPlayed) { gameOverSoundPlayed = true; playSound(100, 0.5); }
                                break;
                            }
                        }
                        if (!pipe.passed && pipe.x + pipeWidth < birdX) {
                            pipe.passed = true;
                            updateScore(score + 1);
                            playSound(600, 0.1);
                        }
                    }
                }
            }
        }
        
        // Ground strip
        const groundY = canvas.height - 28;
        ctx.fillStyle = '#1a4d1a';
        ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
        ctx.fillStyle = '#2d6b2d';
        for (let i = 0; i < canvas.width; i += 24) ctx.fillRect(i, groundY, 12, 4);
        
        for (let pipe of pipes) {
            const capH = 24;
            const rim = 4;
            const bottomY = pipe.topHeight + pipeGap;
            // Pipe body - darker base
            ctx.fillStyle = '#0d5c0d';
            ctx.fillRect(pipe.x + rim, 0, pipeWidth - rim * 2, pipe.topHeight);
            ctx.fillRect(pipe.x + rim, bottomY, pipeWidth - rim * 2, canvas.height - bottomY);
            // Pipe fill with highlight
            ctx.fillStyle = '#00aa00';
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 6;
            ctx.fillRect(pipe.x + rim, 0, pipeWidth - rim * 2, pipe.topHeight - capH);
            ctx.fillRect(pipe.x + rim, bottomY + capH, pipeWidth - rim * 2, canvas.height - bottomY - capH);
            // Top cap
            ctx.fillStyle = '#008800';
            ctx.fillRect(pipe.x - 4, pipe.topHeight - capH, pipeWidth + 8, capH);
            ctx.fillStyle = '#00cc00';
            ctx.fillRect(pipe.x, pipe.topHeight - capH + 4, pipeWidth, capH - 6);
            // Bottom cap
            ctx.fillStyle = '#008800';
            ctx.fillRect(pipe.x - 4, bottomY, pipeWidth + 8, capH);
            ctx.fillStyle = '#00cc00';
            ctx.fillRect(pipe.x, bottomY + 4, pipeWidth, capH - 6);
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        ctx.fillStyle = '#ffdd00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 8;
        
        const birdX = 64;
        const rotation = Math.min(Math.max(birdVelocity * 3, -30), 90);
        
        ctx.save();
        ctx.translate(birdX + birdSize/2, birdY + birdSize/2);
        ctx.rotate(rotation * Math.PI / 180);
        
        // Bird body
        ctx.beginPath();
        ctx.arc(0, 0, birdSize/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,200,0.4)';
        ctx.beginPath();
        ctx.arc(-4, 4, birdSize/4, 0, Math.PI * 2);
        ctx.fill();
        // Wing
        ctx.fillStyle = '#e6c200';
        ctx.beginPath();
        ctx.ellipse(-6, 2, 6, 10, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(6, -4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(7, -5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(20, 0);
        ctx.lineTo(12, 6);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        ctx.shadowBlur = 0;
        
        // Instructions
        if (!started) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('TAP TO START', canvas.width/2, canvas.height/2 + 50);
        }
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '18px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
            ctx.font = '11px "Press Start 2P"';
            ctx.fillStyle = '#fff';
            ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 8);
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 36);
        }
    }
    
    gameLoop = requestAnimationFrame(update);
}

// === 2048 GAME ===
function init2048() {
    currentGameTitle.textContent = '2048';
    gameControls.innerHTML = 'Arrow Keys or D-pad to move tiles';
    
    canvas.width = 320;
    canvas.height = 320;
    
    const gridSize = 4;
    const tileSize = 70;
    const padding = 8;
    
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

    addTouchDpad({
        onLeft: (p) => { if (p) tryMove(moveLeft); },
        onRight: (p) => { if (p) tryMove(moveRight); },
        onUp: (p) => { if (p) tryMove(moveUp); },
        onDown: (p) => { if (p) tryMove(moveDown); }
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
                    ctx.shadowBlur = 10;
                }
                ctx.fillRect(x, y, tileSize, tileSize);
                ctx.shadowBlur = 0;
                
                if (value > 0) {
                    ctx.fillStyle = textColors[value] || '#f9f6f2';
                    const fontSize = value >= 1024 ? 20 : value >= 128 ? 24 : 28;
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

// === SIMON SAYS ===
function initSimonSays() {
    currentGameTitle.textContent = 'SIMON SAYS';
    gameControls.innerHTML = 'Repeat the sequence. Arrow keys or tap the colored pads.';
    if (!canvas || !ctx) return;
    canvas.width = 320;
    canvas.height = 320;
    const PAD_COLORS = ['#00ff00', '#ff0066', '#ffff00', '#00ffff'];
    const PAD_FREQS = [262, 330, 392, 494];
    const PAD_NAMES = ['Up', 'Right', 'Down', 'Left'];
    let sequence = [];
    let playerIndex = 0;
    let state = 'idle';
    let gameOver = false;
    let flashUntil = 0;
    let flashPad = -1;
    let playStepIndex = 0;
    let playStepTimeout = null;
    const PAD_MARGIN = 12;
    const PAD_GAP = 8;
    const padW = (canvas.width - PAD_MARGIN * 2 - PAD_GAP) / 2;
    const padH = (canvas.height - PAD_MARGIN * 2 - PAD_GAP) / 2;
    const padRects = [
        { x: PAD_MARGIN, y: PAD_MARGIN, w: padW, h: padH },
        { x: PAD_MARGIN + padW + PAD_GAP, y: PAD_MARGIN, w: padW, h: padH },
        { x: PAD_MARGIN, y: PAD_MARGIN + padH + PAD_GAP, w: padW, h: padH },
        { x: PAD_MARGIN + padW + PAD_GAP, y: PAD_MARGIN + padH + PAD_GAP, w: padW, h: padH }
    ];
    function padAt(x, y) {
        for (let i = 0; i < 4; i++) {
            const r = padRects[i];
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
        }
        return -1;
    }
    function startRound() {
        sequence.push(Math.floor(Math.random() * 4));
        updateScore(sequence.length - 1);
        state = 'playing';
        playStepIndex = 0;
        schedulePlayStep();
    }
    function schedulePlayStep() {
        if (playStepTimeout) clearTimeout(playStepTimeout);
        if (state !== 'playing' || playStepIndex >= sequence.length) {
            state = 'input';
            playerIndex = 0;
            return;
        }
        flashPad = sequence[playStepIndex];
        flashUntil = performance.now() + 280;
        if (soundEffectsEnabled && audioCtx) {
            try {
                const osc = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                osc.connect(g);
                g.connect(audioCtx.destination);
                osc.frequency.value = PAD_FREQS[flashPad];
                osc.type = 'square';
                g.gain.setValueAtTime(0.12, audioCtx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.25);
            } catch (e) {}
        }
        playStepIndex++;
        playStepTimeout = setTimeout(schedulePlayStep, 380);
    }
    function onPadPress(pad) {
        if (gameOver || pad < 0 || pad > 3) return;
        if (state === 'idle' && sequence.length === 0) {
            startRound();
            return;
        }
        if (state !== 'input') return;
        flashPad = pad;
        flashUntil = performance.now() + 180;
        playSound(PAD_FREQS[pad], 0.15);
        if (sequence[playerIndex] !== pad) {
            gameOver = true;
            if (playStepTimeout) clearTimeout(playStepTimeout);
            playStepTimeout = null;
            playSound(80, 0.4);
            return;
        }
        playerIndex++;
        if (playerIndex >= sequence.length) {
            state = 'idle';
            setTimeout(startRound, 600);
        }
    }
    handleKeyDown = (e) => {
        if (gameOver && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('simonsays');
            return;
        }
        const keyToPad = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
        const pad = keyToPad[e.key];
        if (pad !== undefined) {
            e.preventDefault();
            onPadPress(pad);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    canvas.onclick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        onPadPress(padAt(x, y));
    };
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const co = getEventCanvasCoords(e);
        if (co) onPadPress(padAt(co.x, co.y));
    }, { passive: false });
    addTouchDpad({
        onUp: (p) => { if (p) onPadPress(0); },
        onRight: (p) => { if (p) onPadPress(1); },
        onDown: (p) => { if (p) onPadPress(2); },
        onLeft: (p) => { if (p) onPadPress(3); }
    });
    function draw() {
        gameLoop = requestAnimationFrame(draw);
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const now = performance.now();
        const flashing = flashPad >= 0 && now < flashUntil;
        for (let i = 0; i < 4; i++) {
            const r = padRects[i];
            const col = PAD_COLORS[i];
            ctx.fillStyle = col;
            ctx.shadowColor = col;
            ctx.shadowBlur = (flashing && flashPad === i) ? 25 : 8;
            ctx.fillRect(r.x, r.y, r.w, r.h);
            if (!(flashing && flashPad === i)) {
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.fillRect(r.x, r.y, r.w, r.h);
            }
        }
        ctx.shadowBlur = 0;
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff0066';
            ctx.font = '18px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 10);
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Score: ' + (sequence.length - 1), canvas.width/2, canvas.height/2 + 18);
            ctx.fillText('SPACE to restart', canvas.width/2, canvas.height/2 + 42);
            return;
        }
        if (state === 'idle' && sequence.length === 0) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('PRESS ANY PAD TO START', canvas.width/2, canvas.height/2 + 6);
        }
    }
    gameLoop = requestAnimationFrame(draw);
    cleanupFunctions.push(() => { if (playStepTimeout) clearTimeout(playStepTimeout); });
}

// === FROGGER ===
function initFrogger() {
    currentGameTitle.textContent = 'FROGGER';
    gameControls.innerHTML = 'Arrow keys or D-pad: reach the goals at the top.';
    if (!canvas || !ctx) return;
    const COLS = 9;
    const ROWS = 11;
    const CELL = 32;
    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;
    let frog = { x: Math.floor(COLS / 2), y: ROWS - 1 };
    let lives = 3;
    let gameOver = false;
    let score = 0;
    const goals = [2, 4, 6];
    const goalFilled = [false, false, false];
    const STEP_MS = 400;
    let lastMove = 0;
    const cars = [];
    const LANES = [
        { y: 8, dir: 1, speed: 0.6, len: 2 },
        { y: 7, dir: -1, speed: 0.5, len: 2 },
        { y: 6, dir: 1, speed: 0.7, len: 3 },
        { y: 5, dir: -1, speed: 0.5, len: 2 },
        { y: 4, dir: 1, speed: 0.6, len: 2 }
    ];
    LANES.forEach((lane, i) => {
        for (let n = 0; n < 3; n++) {
            cars.push({
                x: (n * (COLS + lane.len) / 3 + (i % 2) * 2) % (COLS + lane.len) - lane.len,
                y: lane.y,
                dir: lane.dir,
                speed: lane.speed,
                len: lane.len
            });
        }
    });
    let carAccum = 0;
    handleKeyDown = (e) => {
        if (gameOver && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('frogger');
            return;
        }
        if (gameOver) return;
        const keyDir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
        const d = keyDir[e.key];
        if (d) {
            e.preventDefault();
            const nx = frog.x + d[0];
            const ny = frog.y + d[1];
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
                frog.x = nx;
                frog.y = ny;
                lastMove = performance.now();
                if (ny === 0) {
                    const g = goals.indexOf(frog.x);
                    if (g >= 0 && !goalFilled[g]) {
                        goalFilled[g] = true;
                        score += 10;
                        updateScore(score);
                        playSound(600, 0.15);
                        if (goalFilled.every(Boolean)) {
                            goalFilled[0] = goalFilled[1] = goalFilled[2] = false;
                        }
                        frog = { x: Math.floor(COLS / 2), y: ROWS - 1 };
                    }
                }
            }
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    addTouchDpad({
        onUp: (p) => {
            if (!p || gameOver) return;
            const ny = frog.y - 1;
            if (ny >= 0) { frog.y = ny; lastMove = performance.now(); }
            if (frog.y === 0) {
                const g = goals.indexOf(frog.x);
                if (g >= 0 && !goalFilled[g]) {
                    goalFilled[g] = true;
                    score += 10;
                    updateScore(score);
                    playSound(600, 0.15);
                    if (goalFilled.every(Boolean)) goalFilled[0] = goalFilled[1] = goalFilled[2] = false;
                    frog = { x: Math.floor(COLS / 2), y: ROWS - 1 };
                }
            }
        },
        onDown: (p) => { if (p && !gameOver && frog.y < ROWS - 1) { frog.y++; lastMove = performance.now(); } },
        onLeft: (p) => { if (p && !gameOver && frog.x > 0) { frog.x--; lastMove = performance.now(); } },
        onRight: (p) => { if (p && !gameOver && frog.x < COLS - 1) { frog.x++; lastMove = performance.now(); } }
    });
    function draw(now) {
        gameLoop = requestAnimationFrame(draw);
        if (!gameOver) {
            carAccum += 0.016;
            while (carAccum >= 0.05) {
                carAccum -= 0.05;
                cars.forEach(c => {
                    c.x += c.dir * c.speed;
                    if (c.dir > 0 && c.x >= COLS) c.x = -c.len;
                    if (c.dir < 0 && c.x < -c.len) c.x = COLS;
                });
            }
            for (const c of cars) {
                const cx = Math.floor(c.x);
                if (frog.y === c.y && frog.x >= cx && frog.x < cx + c.len) {
                    gameOver = true;
                    playSound(100, 0.4);
                }
            }
        }
        ctx.fillStyle = '#0d0d20';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1a1a30';
        for (let r = 0; r < ROWS; r++) ctx.fillRect(0, r * CELL, canvas.width, CELL);
        for (let g of goals) {
            ctx.fillStyle = '#00aa44';
            ctx.fillRect(g * CELL + 4, 0, CELL - 8, CELL - 4);
        }
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 3 * CELL, canvas.width, (ROWS - 4) * CELL);
        cars.forEach(c => {
            ctx.fillStyle = '#ff0066';
            ctx.shadowColor = '#ff0066';
            ctx.shadowBlur = 6;
            ctx.fillRect(Math.round(c.x) * CELL + 2, c.y * CELL + 2, c.len * CELL - 4, CELL - 4);
            ctx.shadowBlur = 0;
        });
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(frog.x * CELL + CELL/2, frog.y * CELL + CELL/2, CELL/2 - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff0066';
            ctx.font = '16px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 8);
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('SPACE to restart', canvas.width/2, canvas.height/2 + 22);
        }
    }
    gameLoop = requestAnimationFrame(draw);
}

// === PAC-MAN ===
function initPacman() {
    currentGameTitle.textContent = 'PAC-MAN';
    gameControls.innerHTML = 'Arrow keys or D-pad: eat dots, avoid ghosts.';
    if (!canvas || !ctx) return;
    const TILE = 16;
    const MW = 19;
    const MH = 21;
    canvas.width = MW * TILE;
    canvas.height = MH * TILE;
    const WALL = 1;
    const DOT = 2;
    const POWER = 3;
    const maze = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
        [1,3,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,3,1],
        [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
        [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
        [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
        [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
        [1,1,1,1,2,1,0,1,1,0,1,1,0,1,2,1,1,1,1],
        [1,2,2,2,2,0,0,1,0,0,0,1,0,0,2,2,2,2,1],
        [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
        [0,0,0,0,2,1,0,0,0,0,0,0,0,1,2,0,0,0,0],
        [1,1,1,1,2,1,0,1,1,0,1,1,0,1,2,1,1,1,1],
        [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
        [1,2,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,2,1],
        [1,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,3,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    for (let r = maze.length; r < MH; r++) maze.push([1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1]);
    let pac = { x: 9, y: 15, dir: [0, 0], nextDir: [0, 0] };
    let ghosts = [
        { x: 9, y: 9, dir: [0, 0], color: '#ff0000' },
        { x: 8, y: 9, dir: [0, 0], color: '#ffb8ff' }
    ];
    let gameOver = false;
    let powerUntil = 0;
    const POWER_DUR = 8;
    let dotsLeft = 0;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (maze[y][x] === DOT || maze[y][x] === POWER) dotsLeft++;
    const STEP_MS = 120;
    let lastStep = 0;
    let anim = 0;
    function canGo(x, y) {
        if (x < 0 || x >= MW || y < 0 || y >= MH) return false;
        const t = maze[y][x];
        return t !== WALL;
    }
    function movePac() {
        const [dx, dy] = pac.nextDir;
        if (dx !== 0 || dy !== 0) {
            const nx = pac.x + dx;
            const ny = pac.y + dy;
            if (canGo(nx, ny)) {
                pac.dir = [dx, dy];
                pac.x = nx;
                pac.y = ny;
                if (maze[ny][nx] === DOT) {
                    maze[ny][nx] = 0;
                    dotsLeft--;
                    updateScore(score + 10);
                    playSound(400, 0.06);
                } else if (maze[ny][nx] === POWER) {
                    maze[ny][nx] = 0;
                    dotsLeft--;
                    powerUntil = performance.now() / 1000 + POWER_DUR;
                    playSound(600, 0.15);
                }
                return;
            }
        }
        const [dx2, dy2] = pac.dir;
        const nx2 = pac.x + dx2;
        const ny2 = pac.y + dy2;
        if (canGo(nx2, ny2)) {
            pac.x = nx2;
            pac.y = ny2;
            if (maze[ny2][nx2] === DOT) {
                maze[ny2][nx2] = 0;
                dotsLeft--;
                updateScore(score + 10);
                playSound(400, 0.06);
            } else if (maze[ny2][nx2] === POWER) {
                maze[ny2][nx2] = 0;
                dotsLeft--;
                powerUntil = performance.now() / 1000 + POWER_DUR;
                playSound(600, 0.15);
            }
        }
    }
    function moveGhost(g) {
        const now = performance.now() / 1000;
        const edible = now < powerUntil;
        const choices = [];
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            const nx = g.x + dx;
            const ny = g.y + dy;
            if (canGo(nx, ny) && (g.dir[0] !== -dx || g.dir[1] !== -dy)) {
                const dist = (nx - pac.x) ** 2 + (ny - pac.y) ** 2;
                choices.push({ dx, dy, dist: edible ? dist : -dist });
            }
        }
        if (choices.length === 0) return;
        choices.sort((a, b) => edible ? a.dist - b.dist : a.dist - b.dist);
        const pick = edible ? choices[choices.length - 1] : choices[0];
        g.dir = [pick.dx, pick.dy];
        g.x += pick.dx;
        g.y += pick.dy;
    }
    handleKeyDown = (e) => {
        if (gameOver && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('pacman');
            return;
        }
        const keyDir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
        const d = keyDir[e.key];
        if (d) { e.preventDefault(); pac.nextDir = d; }
    };
    document.addEventListener('keydown', handleKeyDown);
    addTouchDpad({
        onUp: (p) => { if (p) pac.nextDir = [0, -1]; },
        onDown: (p) => { if (p) pac.nextDir = [0, 1]; },
        onLeft: (p) => { if (p) pac.nextDir = [-1, 0]; },
        onRight: (p) => { if (p) pac.nextDir = [1, 0]; }
    });
    function draw(now) {
        gameLoop = requestAnimationFrame(draw);
        if (!gameOver) {
            if (now - lastStep >= STEP_MS) {
                lastStep += STEP_MS;
                movePac();
                ghosts.forEach(moveGhost);
                if (dotsLeft === 0) {
                    updateScore(score + 100);
                    playSound(800, 0.3);
                    gameOver = true;
                }
                ghosts.forEach(g => {
                    if (Math.abs(g.x - pac.x) < 0.5 && Math.abs(g.y - pac.y) < 0.5) {
                        if (now / 1000 < powerUntil) {
                            g.x = 9;
                            g.y = 9;
                            updateScore(score + 200);
                            playSound(1000, 0.2);
                        } else {
                            gameOver = true;
                            playSound(100, 0.4);
                        }
                    }
                });
            }
            anim = (anim + 0.2) % 1;
        }
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let y = 0; y < MH; y++) {
            for (let x = 0; x < MW; x++) {
                const t = maze[y][x];
                if (t === WALL) {
                    ctx.fillStyle = '#2222aa';
                    ctx.strokeStyle = '#00ffff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
                    ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
                } else if (t === DOT) {
                    ctx.fillStyle = '#ffff88';
                    ctx.beginPath();
                    ctx.arc(x * TILE + TILE/2, y * TILE + TILE/2, 3, 0, Math.PI * 2);
                    ctx.fill();
                } else if (t === POWER) {
                    ctx.fillStyle = '#ffff88';
                    ctx.beginPath();
                    ctx.arc(x * TILE + TILE/2, y * TILE + TILE/2, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        const edible = now / 1000 < powerUntil;
        ghosts.forEach(g => {
            ctx.fillStyle = edible ? '#8888ff' : g.color;
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(g.x * TILE + TILE/2, g.y * TILE + TILE/2, TILE/2 - 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 8;
        const mouth = 0.3 + Math.sin(anim * Math.PI * 2) * 0.25;
        ctx.beginPath();
        ctx.moveTo(pac.x * TILE + TILE/2, pac.y * TILE + TILE/2);
        ctx.arc(pac.x * TILE + TILE/2, pac.y * TILE + TILE/2, TILE/2 - 2, mouth * Math.PI, (2 - mouth) * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = dotsLeft === 0 ? '#00ff00' : '#ff0066';
            ctx.font = '14px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(dotsLeft === 0 ? 'YOU WIN!' : 'GAME OVER', canvas.width/2, canvas.height/2 - 6);
            ctx.fillStyle = '#ffff00';
            ctx.font = '8px "Press Start 2P"';
            ctx.fillText('SPACE to restart', canvas.width/2, canvas.height/2 + 18);
        }
    }
    gameLoop = requestAnimationFrame(draw);
}

// Game Creator System Removed for Security

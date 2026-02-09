// === PIXEL PALACE - CORE (shared globals, lobby, start/stop game, audio, touch) ===

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

// === PAUSE SYSTEM ===
let gamePaused = false;
let _pauseStart = 0;
let _totalPaused = 0;
let _lastRAFCallback = null;
let _pausedRAFCallback = null;

const _origPerfNow = performance.now.bind(performance);
const _origRAF = window.requestAnimationFrame.bind(window);
const _origCAF = window.cancelAnimationFrame.bind(window);

/* Patch performance.now() so paused time is invisible to game loops.
   This prevents a massive dt spike when resuming. */
performance.now = function() { return _origPerfNow() - _totalPaused; };

/* Patch requestAnimationFrame so we can freeze / resume the game loop. */
window.requestAnimationFrame = function(cb) {
    _lastRAFCallback = cb;
    if (gamePaused) { _pausedRAFCallback = cb; return -1; }
    return _origRAF(cb);
};
window.cancelAnimationFrame = function(id) { return _origCAF(id); };

const pauseOverlay = document.getElementById('pauseOverlay');
const pauseBtn = document.getElementById('pauseBtn');

function togglePause() {
    if (!gameContainer || !gameContainer.classList.contains('active')) return;
    if (gamePaused) resumeGame(); else pauseGame();
}

function pauseGame() {
    if (gamePaused) return;
    gamePaused = true;
    _pauseStart = _origPerfNow();
    _pausedRAFCallback = _lastRAFCallback;
    if (gameLoop) { _origCAF(gameLoop); }
    if (pauseOverlay) pauseOverlay.classList.add('visible');
}

function resumeGame() {
    if (!gamePaused) return;
    _totalPaused += _origPerfNow() - _pauseStart;
    gamePaused = false;
    if (pauseOverlay) pauseOverlay.classList.remove('visible');
    if (_pausedRAFCallback) {
        const cb = _pausedRAFCallback;
        _pausedRAFCallback = null;
        gameLoop = _origRAF(cb);
    }
}

/* Escape key toggles pause */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && gameContainer && gameContainer.classList.contains('active')) {
        e.preventDefault();
        togglePause();
    }
});

/* Pause button in game header */
if (pauseBtn) pauseBtn.addEventListener('click', togglePause);

/* Tap the overlay to resume */
if (pauseOverlay) pauseOverlay.addEventListener('click', function() {
    if (gamePaused) resumeGame();
});

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
    [
        [196, 0.2], [247, 0.2], [294, 0.2], [247, 0.2],
        [196, 0.25], [0, 0.08], [262, 0.2], [330, 0.2],
        [392, 0.25], [330, 0.2], [262, 0.3], [0, 0.1],
        [220, 0.2], [262, 0.2], [330, 0.2], [262, 0.2],
        [220, 0.3], [0, 0.08], [196, 0.2], [247, 0.25],
        [196, 0.35]
    ],
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
        e.stopPropagation();
        e.preventDefault();
        const cabinet = btn.closest('.game-cabinet');
        const gameName = cabinet.dataset.game;
        startGame(gameName);
    });
});

document.querySelectorAll('.game-cabinet').forEach(cabinet => {
    cabinet.addEventListener('click', (e) => {
        if (!e.target || !e.target.classList || !e.target.classList.contains('play-btn')) {
            e.stopPropagation();
        }
    });
});

if (backBtn) {
    backBtn.addEventListener('click', () => {
        stopGame();
        if (gameContainer) gameContainer.classList.remove('active');
        if (lobby) lobby.style.display = 'block';
    });
}

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

const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'];
function preventGameKeyDefault(e) {
    if (gameContainer && gameContainer.classList.contains('active') && GAME_KEYS.includes(e.key)) {
        e.preventDefault();
    }
}
document.addEventListener('keydown', preventGameKeyDefault, { capture: true, passive: false });

const GAME_DISPLAY_NAMES = {
    snake: 'SNAKE',
    tetris: 'TETRIS',
    pong: 'PONG',
    tron: 'TRON',
    breakout: 'BREAKOUT',
    spaceinvaders: 'SPACE INVADERS',
    memory: 'MEMORY',
    '2048': '2048',
};

function startGame(gameName) {
    if (!lobby || !gameContainer || !canvas || !ctx) {
        console.error('PIXEL PALACE: Cannot start game — required elements missing.');
        return;
    }
    lobby.style.display = 'none';
    gameContainer.classList.add('active');
    document.body.classList.add('game-active');
    score = 0;
    updateScore(0);
    if (canvas) canvas.oncontextmenu = (e) => e.preventDefault();
    if (audioCtx && arcadeMusicEnabled) {
        if (audioCtx.state === 'suspended') audioCtx.resume().then(() => startArcadeMusic()).catch(() => {});
        else startArcadeMusic();
    }
    if (currentGameTitle) {
        currentGameTitle.textContent = GAME_DISPLAY_NAMES[gameName] || gameName.toUpperCase();
    }
    const playArea = gameContainer.querySelector('.game-play-area');
    if (playArea && canvas && touchControls) {
        if (!playArea.contains(canvas)) playArea.insertBefore(canvas, playArea.firstChild);
        if (!playArea.contains(touchControls)) playArea.appendChild(touchControls);
    }
    switch (gameName) {
        case 'snake': initSnake(); break;
        case 'tetris': initTetris(); break;
        case 'pong': initPong(); break;
        case 'tron': initTron(); break;
        case 'breakout': initBreakout(); break;
        case 'spaceinvaders': initSpaceInvaders(); break;
        case 'memory': initMemory2(); break;
        case '2048': init2048(); break;
        default:
            console.warn('PIXEL PALACE: Unknown game "' + gameName + '".');
            lobby.style.display = 'block';
            gameContainer.classList.remove('active');
            stopArcadeMusic();
            return;
    }
    /* Lock CSS aspect-ratio to the canvas buffer so the border
       always matches the gameplay area on every screen orientation. */
    canvas.style.aspectRatio = canvas.width + ' / ' + canvas.height;
}

function stopGame() {
    /* Clear pause state if active */
    if (gamePaused) {
        _totalPaused += _origPerfNow() - _pauseStart;
        gamePaused = false;
        _pausedRAFCallback = null;
    }
    if (pauseOverlay) pauseOverlay.classList.remove('visible');
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    if (lobby) lobby.style.display = 'block';
    if (gameContainer) gameContainer.classList.remove('active');
    document.body.classList.remove('game-active');
    currentGame = null;
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions = [];
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (handleKeyDown) document.removeEventListener('keydown', handleKeyDown);
    if (handleKeyUp) document.removeEventListener('keyup', handleKeyUp);
    if (canvas) {
        canvas.onclick = null;
        canvas.onmousemove = null;
        canvas.ontouchstart = null;
        canvas.ontouchend = null;
        canvas.ontouchmove = null;
        canvas.oncontextmenu = null;
        canvas.style.aspectRatio = '';
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

let _joystickCleanup = null;

function clearTouchControls() {
    touchHandlerMap = {};
    if (_joystickCleanup) { _joystickCleanup(); _joystickCleanup = null; }
    if (touchControls) {
        touchControls.innerHTML = '';
        touchControls.classList.remove('has-buttons');
    }
}

function addTouchDpad(options) {
    if (!touchControls) return;
    const { onLeft, onRight, onUp, onDown, onAction, onActionEnd, actionLabel } = options;
    /* Clean up previous joystick listeners if any */
    if (_joystickCleanup) { _joystickCleanup(); _joystickCleanup = null; }
    touchControls.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'touch-joystick-wrap';

    /* ---- Joystick ---- */
    const base = document.createElement('div');
    base.className = 'touch-joystick-base';
    const thumb = document.createElement('div');
    thumb.className = 'touch-joystick-thumb';
    base.appendChild(thumb);
    wrap.appendChild(base);

    /* ---- Optional action button ---- */
    if (onAction && actionLabel) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'touch-btn action-btn';
        btn.innerHTML = actionLabel;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); onAction(); }, { passive: false });
        if (onActionEnd) {
            btn.addEventListener('touchend', (e) => { e.preventDefault(); onActionEnd(); }, { passive: false });
            btn.addEventListener('touchcancel', (e) => { onActionEnd(); }, { passive: false });
        }
        wrap.appendChild(btn);
    }

    touchControls.appendChild(wrap);
    touchControls.classList.add('has-buttons');

    /* ---- Joystick touch handling ---- */
    let activeId = null;
    let cx = 0, cy = 0;
    const dirs = { up: false, down: false, left: false, right: false };
    const DEAD = 12;
    const MAX = 38;

    function fire(key, handler, val) {
        if (dirs[key] !== val) { dirs[key] = val; if (handler) handler(val); }
    }

    function update(dx, dy) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < DEAD) {
            thumb.style.transform = 'translate(-50%,-50%)';
            fire('up', onUp, false); fire('down', onDown, false);
            fire('left', onLeft, false); fire('right', onRight, false);
            return;
        }
        const c = Math.min(dist, MAX);
        const a = Math.atan2(dy, dx);
        const tx = Math.cos(a) * c;
        const ty = Math.sin(a) * c;
        thumb.style.transform = 'translate(calc(-50% + ' + tx + 'px),calc(-50% + ' + ty + 'px))';
        const deg = a * 180 / Math.PI;
        fire('right', onRight, deg > -67.5 && deg < 67.5);
        fire('down', onDown, deg > 22.5 && deg < 157.5);
        fire('left', onLeft, deg > 112.5 || deg < -112.5);
        fire('up', onUp, deg > -157.5 && deg < -22.5);
    }

    function onTS(e) {
        e.preventDefault();
        if (activeId !== null) return;
        const t = e.changedTouches[0];
        activeId = t.identifier;
        const r = base.getBoundingClientRect();
        cx = r.left + r.width / 2;
        cy = r.top + r.height / 2;
        update(t.clientX - cx, t.clientY - cy);
    }
    function onTM(e) {
        if (activeId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === activeId) {
                e.preventDefault();
                update(e.changedTouches[i].clientX - cx, e.changedTouches[i].clientY - cy);
                return;
            }
        }
    }
    function onTE(e) {
        if (activeId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === activeId) {
                activeId = null;
                update(0, 0);
                return;
            }
        }
    }

    base.addEventListener('touchstart', onTS, { passive: false });
    document.addEventListener('touchmove', onTM, { passive: false });
    document.addEventListener('touchend', onTE, { passive: false });
    document.addEventListener('touchcancel', onTE, { passive: false });

    _joystickCleanup = () => {
        document.removeEventListener('touchmove', onTM);
        document.removeEventListener('touchend', onTE);
        document.removeEventListener('touchcancel', onTE);
    };
    cleanupFunctions.push(() => {
        if (_joystickCleanup) { _joystickCleanup(); _joystickCleanup = null; }
    });
}

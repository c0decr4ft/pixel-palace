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
    flappy: 'FLAPPY PIXEL',
    '2048': '2048',
    simonsays: 'SIMON SAYS',
    pacman: 'PAC-MAN',
    frogger: 'FROGGER'
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
        case 'memory': initMemory(); break;
        case 'flappy': initFlappy(); break;
        case '2048': init2048(); break;
        case 'simonsays': initSimonSays(); break;
        case 'pacman': initPacman(); break;
        case 'frogger': initFrogger(); break;
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

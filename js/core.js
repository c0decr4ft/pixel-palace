// === PIXEL PALACE - CORE (shared globals, lobby, start/stop game, audio, touch) ===

// === SECURITY HARDENING ===
(function securityInit() {
    'use strict';

    // 1. Anti-clickjacking: break out of iframes
    if (window.top !== window.self) {
        try { window.top.location = window.self.location; } catch (e) {
            // CSP may block this; hide content as fallback
            document.documentElement.style.display = 'none';
        }
    }

    // 2. Protect against prototype pollution — lock down __proto__ setter
    //    This blocks the most common prototype-pollution attack vector
    //    without breaking third-party libraries
    try {
        Object.defineProperty(Object.prototype, '__proto__', {
            get() { return Object.getPrototypeOf(this); },
            set() { /* silently block __proto__ assignment */ },
            configurable: false
        });
    } catch (e) { /* already locked or env restricts this */ }

    // 3. Disable dangerous globals that should never be used in our app
    try {
        Object.defineProperty(window, 'eval', { value: function() {
            throw new Error('eval() is disabled for security');
        }, writable: false, configurable: false });
    } catch (e) {}
    try {
        // Block document.write (XSS injection vector)
        Document.prototype.write = function() {
            throw new Error('document.write() is disabled for security');
        };
        Document.prototype.writeln = function() {
            throw new Error('document.writeln() is disabled for security');
        };
    } catch (e) {}
})();

// === SAFE DATA HELPERS ===
// Sanitize data received over PeerJS — only allow known safe types/values
function sanitizePeerData(data) {
    if (data === null || data === undefined) return null;
    // Must be a plain object
    if (typeof data !== 'object' || Array.isArray(data)) return null;
    // Strip any __proto__ or constructor attacks
    const clean = Object.create(null);
    for (const key of Object.keys(data)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        const val = data[key];
        // Only allow primitives (string, number, boolean, null) — no nested objects or functions
        if (val === null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
            clean[key] = val;
        }
    }
    return clean;
}

// Safely read a string from localStorage (returns fallback on any issue)
function safeStorageGet(key, fallback) {
    try {
        const val = localStorage.getItem(key);
        if (val === null) return fallback;
        if (typeof val !== 'string') return fallback;
        // Limit length to prevent storage-bombing
        if (val.length > 1024) return fallback;
        return val;
    } catch (e) {
        return fallback;
    }
}

// Returns true if the touch event originated from a UI element (header buttons, overlays)
// Game touch handlers should bail out when this returns true so buttons remain tappable
function isTouchOnUI(e) {
    const t = e.target;
    if (!t) return false;
    if (t.closest('.game-header') || t.closest('.pause-overlay') ||
        t.closest('.pong-mode-overlay') || t.closest('.pong-online-overlay') ||
        t.closest('.ttt-mode-overlay') || t.closest('[class*="-mode-overlay"]') ||
        t.tagName === 'BUTTON' || t.tagName === 'INPUT' || t.tagName === 'A') {
        return true;
    }
    return false;
}

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
    stopArcadeMusic();
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
    if (currentGame && arcadeMusicEnabled && audioCtx && audioCtx.state === 'running') {
        startArcadeMusic(currentGame);
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
if (safeStorageGet(STORAGE_SFX, '1') === '0') soundEffectsEnabled = false;
if (safeStorageGet(STORAGE_MUSIC, '1') === '0') arcadeMusicEnabled = false;

// Per-game background music — each game gets its own melody, wave type, and feel
let arcadeMusicOsc = null;
let arcadeMusicGain = null;
let arcadeMusicTimeout = null;
let currentMusicGame = null;

/*
 * GAME_MUSIC: { gameName: { wave, vol, tracks: [ [ [freq, dur], ... ], ... ] } }
 * - wave: oscillator type (square, sawtooth, triangle, sine)
 * - vol: peak gain (default 0.06)
 * - tracks: array of note-sequence arrays that loop/rotate
 */
const GAME_MUSIC = {
    /* Pong — classic 70s minimal arcade blips, bouncy and clean */
    pong: { wave: 'square', vol: 0.05, tracks: [
        [
            [330, 0.12], [0, 0.06], [330, 0.12], [0, 0.18],
            [440, 0.12], [0, 0.06], [440, 0.12], [0, 0.18],
            [392, 0.12], [0, 0.06], [330, 0.12], [0, 0.06],
            [294, 0.12], [0, 0.06], [262, 0.2], [0, 0.2],
            [262, 0.12], [0, 0.06], [294, 0.12], [0, 0.06],
            [330, 0.12], [0, 0.06], [392, 0.15], [0, 0.06],
            [440, 0.2], [0, 0.1], [392, 0.15], [0, 0.06],
            [330, 0.25], [0, 0.3]
        ]
    ]},
    /* Snake — hypnotic minor key loop, slightly eerie */
    snake: { wave: 'triangle', vol: 0.07, tracks: [
        [
            [220, 0.2], [262, 0.2], [247, 0.2], [220, 0.2],
            [196, 0.25], [0, 0.08], [220, 0.2], [262, 0.2],
            [294, 0.25], [262, 0.2], [247, 0.3], [0, 0.1],
            [220, 0.2], [208, 0.2], [196, 0.2], [185, 0.2],
            [196, 0.3], [0, 0.08], [220, 0.15], [247, 0.15],
            [262, 0.15], [247, 0.15], [220, 0.4], [0, 0.15]
        ],
        [
            [165, 0.25], [196, 0.25], [220, 0.2], [196, 0.2],
            [175, 0.3], [0, 0.1], [165, 0.2], [196, 0.2],
            [220, 0.2], [262, 0.25], [247, 0.2], [220, 0.35],
            [0, 0.15]
        ]
    ]},
    /* Tetris — Korobeiniki-inspired Russian folk melody, upbeat */
    tetris: { wave: 'square', vol: 0.05, tracks: [
        [
            [659, 0.15], [494, 0.08], [523, 0.08], [587, 0.15],
            [523, 0.08], [494, 0.08], [440, 0.15], [0, 0.03],
            [440, 0.08], [523, 0.08], [659, 0.15], [587, 0.08],
            [523, 0.08], [494, 0.2], [0, 0.03], [523, 0.08],
            [587, 0.15], [659, 0.15], [523, 0.15], [440, 0.15],
            [440, 0.15], [0, 0.08]
        ],
        [
            [587, 0.15], [0, 0.03], [698, 0.08], [880, 0.15],
            [784, 0.08], [698, 0.08], [659, 0.2], [0, 0.03],
            [523, 0.08], [659, 0.15], [587, 0.08], [523, 0.08],
            [494, 0.15], [0, 0.03], [494, 0.08], [523, 0.08],
            [587, 0.15], [659, 0.15], [523, 0.15], [440, 0.15],
            [440, 0.2], [0, 0.1]
        ]
    ]},
    /* Tron — dark synthwave, brooding sawtooth, Daft-Punk-inspired */
    tron: { wave: 'sawtooth', vol: 0.04, tracks: [
        [
            [110, 0.25], [0, 0.05], [110, 0.12], [131, 0.12],
            [110, 0.25], [0, 0.05], [147, 0.12], [131, 0.12],
            [110, 0.3], [0, 0.1], [165, 0.12], [147, 0.12],
            [131, 0.12], [110, 0.12], [98, 0.35], [0, 0.15]
        ],
        [
            [131, 0.2], [0, 0.05], [165, 0.15], [147, 0.15],
            [131, 0.2], [0, 0.05], [110, 0.15], [131, 0.2],
            [165, 0.25], [0, 0.08], [196, 0.12], [165, 0.12],
            [147, 0.12], [131, 0.12], [110, 0.4], [0, 0.2]
        ],
        [
            [82, 0.3], [0, 0.05], [98, 0.15], [110, 0.15],
            [131, 0.2], [110, 0.15], [98, 0.25], [0, 0.1],
            [82, 0.15], [98, 0.15], [110, 0.2], [131, 0.15],
            [110, 0.15], [98, 0.15], [82, 0.4], [0, 0.2]
        ]
    ]},
    /* Breakout — upbeat bouncy arcade, major key energy */
    breakout: { wave: 'square', vol: 0.05, tracks: [
        [
            [523, 0.12], [0, 0.03], [523, 0.08], [659, 0.12],
            [784, 0.15], [0, 0.05], [659, 0.1], [523, 0.12],
            [0, 0.03], [587, 0.12], [698, 0.12], [587, 0.15],
            [0, 0.08], [523, 0.12], [659, 0.15], [784, 0.2],
            [0, 0.1]
        ],
        [
            [440, 0.12], [523, 0.12], [659, 0.15], [523, 0.1],
            [440, 0.12], [0, 0.05], [392, 0.12], [440, 0.12],
            [523, 0.15], [0, 0.05], [587, 0.12], [523, 0.12],
            [440, 0.12], [392, 0.12], [440, 0.25], [0, 0.15]
        ]
    ]},
    /* Space Invaders — ominous marching, descending tension */
    spaceinvaders: { wave: 'square', vol: 0.05, tracks: [
        [
            [131, 0.3], [0, 0.2], [123, 0.3], [0, 0.2],
            [117, 0.3], [0, 0.2], [110, 0.4], [0, 0.3]
        ],
        [
            [110, 0.2], [0, 0.1], [131, 0.15], [0, 0.05],
            [110, 0.2], [0, 0.1], [98, 0.2], [0, 0.1],
            [110, 0.15], [0, 0.05], [131, 0.15], [0, 0.05],
            [165, 0.15], [0, 0.05], [131, 0.3], [0, 0.15],
            [110, 0.4], [0, 0.3]
        ],
        [
            [82, 0.35], [0, 0.15], [98, 0.25], [0, 0.1],
            [110, 0.25], [0, 0.1], [98, 0.25], [0, 0.1],
            [82, 0.5], [0, 0.3]
        ]
    ]},
    /* Memory — calm gentle puzzle music, soft sine tones */
    memory: { wave: 'sine', vol: 0.07, tracks: [
        [
            [523, 0.3], [0, 0.08], [659, 0.3], [0, 0.08],
            [784, 0.35], [0, 0.1], [659, 0.25], [0, 0.08],
            [523, 0.4], [0, 0.15],
            [587, 0.3], [0, 0.08], [698, 0.3], [0, 0.08],
            [784, 0.35], [0, 0.1], [698, 0.25], [0, 0.08],
            [587, 0.4], [0, 0.2]
        ],
        [
            [440, 0.35], [0, 0.1], [523, 0.3], [0, 0.08],
            [587, 0.3], [0, 0.08], [523, 0.25], [0, 0.08],
            [440, 0.4], [0, 0.12],
            [392, 0.3], [0, 0.08], [440, 0.3], [0, 0.08],
            [523, 0.35], [0, 0.1], [440, 0.3], [0, 0.08],
            [392, 0.45], [0, 0.25]
        ]
    ]},
    /* 2048 — zen minimalist ambient, triangle wave, spacious */
    '2048': { wave: 'triangle', vol: 0.06, tracks: [
        [
            [262, 0.4], [0, 0.2], [330, 0.35], [0, 0.15],
            [392, 0.5], [0, 0.25], [330, 0.35], [0, 0.2],
            [262, 0.5], [0, 0.3]
        ],
        [
            [196, 0.45], [0, 0.2], [262, 0.4], [0, 0.15],
            [330, 0.45], [0, 0.2], [294, 0.35], [0, 0.15],
            [262, 0.4], [0, 0.15], [196, 0.55], [0, 0.3]
        ],
        [
            [349, 0.4], [0, 0.15], [330, 0.35], [0, 0.15],
            [294, 0.4], [0, 0.2], [262, 0.45], [0, 0.2],
            [294, 0.35], [0, 0.15], [262, 0.55], [0, 0.35]
        ]
    ]}
};

/* Fallback generic track if game has no custom music */
const FALLBACK_MUSIC = { wave: 'square', vol: 0.05, tracks: [
    [
        [262, 0.15], [330, 0.15], [392, 0.15], [523, 0.2],
        [392, 0.15], [523, 0.25], [0, 0.1],
        [262, 0.15], [330, 0.15], [392, 0.15], [523, 0.2],
        [392, 0.15], [330, 0.2], [262, 0.4]
    ]
]};

/* Tic Tac Toe — playful, quirky chip-tune */
GAME_MUSIC.tictactoe = { wave: 'square', vol: 0.04, tracks: [
    [
        [523, 0.12], [587, 0.12], [659, 0.12], [523, 0.12],
        [0, 0.06],
        [494, 0.12], [440, 0.12], [392, 0.18],
        [0, 0.1],
        [330, 0.12], [392, 0.12], [440, 0.15], [494, 0.12],
        [0, 0.06],
        [523, 0.12], [659, 0.15], [587, 0.25],
        [0, 0.15],
    ]
]};

function stopArcadeMusic() {
    if (arcadeMusicTimeout) clearTimeout(arcadeMusicTimeout);
    arcadeMusicTimeout = null;
    if (arcadeMusicOsc) {
        try { arcadeMusicOsc.stop(); } catch (e) {}
        arcadeMusicOsc = null;
    }
    arcadeMusicGain = null;
    currentMusicGame = null;
}

function scheduleArcadeMusicStep(stepIndex, trackIndex, music) {
    if (!arcadeMusicGain || !gameContainer || !gameContainer.classList.contains('active')) return;
    if (!arcadeMusicEnabled || !audioCtx || audioCtx.state === 'closed') return;
    const tracks = music.tracks;
    const track = tracks[trackIndex % tracks.length];
    const [freq, dur] = track[stepIndex % track.length];
    const nextStep = stepIndex + 1;
    const nextTrackIndex = nextStep >= track.length ? (trackIndex + 1) % tracks.length : trackIndex;
    const nextStepIndex = nextStep >= track.length ? 0 : nextStep;
    arcadeMusicTimeout = setTimeout(() => {
        scheduleArcadeMusicStep(nextStepIndex, nextTrackIndex, music);
    }, (dur + 0.02) * 1000);
    if (freq > 0 && arcadeMusicOsc) {
        try {
            const t = audioCtx.currentTime;
            arcadeMusicOsc.frequency.setValueAtTime(freq, t);
            arcadeMusicGain.gain.setValueAtTime(music.vol, t);
            arcadeMusicGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        } catch (e) {}
    }
}

function startArcadeMusic(gameName) {
    stopArcadeMusic();
    if (!arcadeMusicEnabled || !audioCtx || audioCtx.state === 'suspended' || audioCtx.state === 'closed') return;
    const music = GAME_MUSIC[gameName] || FALLBACK_MUSIC;
    currentMusicGame = gameName || null;
    arcadeMusicOsc = audioCtx.createOscillator();
    arcadeMusicOsc.type = music.wave;
    arcadeMusicGain = audioCtx.createGain();
    arcadeMusicGain.gain.value = 0;
    arcadeMusicOsc.connect(arcadeMusicGain);
    arcadeMusicGain.connect(audioCtx.destination);
    arcadeMusicOsc.start(audioCtx.currentTime);
    scheduleArcadeMusicStep(0, 0, music);
}

/* Game Over jingle — Mario-inspired descending melody */
function playGameOverJingle() {
    stopArcadeMusic();
    if ((!arcadeMusicEnabled && !soundEffectsEnabled) || !audioCtx || audioCtx.state === 'closed') return;
    // Notes: [frequency, startTime (s), duration (s)]
    const notes = [
        [494, 0.00, 0.15],   // B4
        [466, 0.18, 0.15],   // Bb4
        [440, 0.36, 0.18],   // A4
        [0,   0.56, 0.08],   // rest
        [392, 0.64, 0.12],   // G4
        [370, 0.78, 0.12],   // F#4
        [330, 0.92, 0.12],   // E4
        [0,   1.06, 0.06],   // rest
        [262, 1.12, 0.15],   // C4
        [294, 1.30, 0.12],   // D4
        [220, 1.44, 0.12],   // A3
        [196, 1.58, 0.18],   // G3
        [0,   1.78, 0.1],    // rest
        [165, 1.88, 0.22],   // E3
        [147, 2.12, 0.25],   // D3
        [131, 2.40, 0.5],    // C3 (long final)
    ];
    const t0 = audioCtx.currentTime + 0.05;
    try {
        for (const [freq, start, dur] of notes) {
            if (freq === 0) continue;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            gain.gain.setValueAtTime(0.08, t0 + start);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + start + dur);
            osc.start(t0 + start);
            osc.stop(t0 + start + dur + 0.05);
        }
    } catch (e) {}
}

// === SECURE ROOM CODES & HANDSHAKE ===
// Cryptographically random room code — 12 chars from a safe alphabet
// Generate a short secure game code: 4-char room ID + 4-char secret = 8 chars total
// Format shown to user: "ABCD1234" — first 4 are the PeerJS room, last 4 are the secret
function generateGameCode() {
    const ALPHABET = 'BCEFGHJKLMNPQRTVXYZ23456789';
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    let code = '';
    for (let i = 0; i < 8; i++) code += ALPHABET[arr[i] % ALPHABET.length];
    // First 4 = peerId, last 4 = secret
    return { full: code, peerId: code.slice(0, 4), secret: code.slice(4) };
}

// Parse a game code entered by a joiner
function parseGameCode(input) {
    const clean = String(input).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 8) return null;
    return { peerId: clean.slice(0, 4), secret: clean.slice(4, 8) };
}

// Host: wrap peer.on('connection') with secret verification
// Returns a cleanup function. onVerified(conn) is called only if the joiner sends the right secret.
function hostVerifyConnection(peerInstance, secret, onVerified, onReject) {
    function handler(conn) {
        conn.on('open', () => {
            // Wait for the joiner to send the secret
            let verified = false;
            const timeout = setTimeout(() => {
                if (!verified) { try { conn.close(); } catch(e){} }
            }, 8000); // 8 second timeout
            conn.on('data', function authHandler(raw) {
                if (verified) return;
                const data = sanitizePeerData(raw);
                if (data && data.type === '__auth' && typeof data.secret === 'string' && data.secret === secret) {
                    verified = true;
                    clearTimeout(timeout);
                    try { conn.send({ type: '__auth_ok' }); } catch(e){}
                    conn.off('data', authHandler);
                    onVerified(conn);
                } else {
                    clearTimeout(timeout);
                    try { conn.send({ type: '__auth_fail' }); } catch(e){}
                    setTimeout(() => { try { conn.close(); } catch(e){} }, 200);
                    if (onReject) onReject();
                }
            });
        });
    }
    peerInstance.on('connection', handler);
}

// Joiner: after connection opens, send secret and wait for OK
function joinerAuthenticate(conn, secret, onSuccess, onFail) {
    let done = false;
    const timeout = setTimeout(() => {
        if (!done) { done = true; onFail('Timed out waiting for host.'); }
    }, 8000);
    conn.on('open', () => {
        try { conn.send({ type: '__auth', secret }); } catch(e){}
    });
    conn.on('data', function authHandler(raw) {
        if (done) return;
        const data = sanitizePeerData(raw);
        if (!data) return;
        if (data.type === '__auth_ok') {
            done = true;
            clearTimeout(timeout);
            conn.off('data', authHandler);
            onSuccess();
        } else if (data.type === '__auth_fail') {
            done = true;
            clearTimeout(timeout);
            conn.off('data', authHandler);
            onFail('Wrong code or connection rejected.');
        }
    });
    conn.on('error', () => {
        if (!done) { done = true; clearTimeout(timeout); onFail('Connection error.'); }
    });
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
        } else if (gameContainer && gameContainer.classList.contains('active') && currentGame) {
            if (audioCtx && (audioCtx.state === 'suspended' || audioCtx.state === 'running')) {
                if (audioCtx.state === 'suspended') audioCtx.resume().then(() => startArcadeMusic(currentGame)).catch(() => {});
                else startArcadeMusic(currentGame);
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
    tictactoe: 'TIC TAC TOE',
};

// === GAME INSTRUCTIONS ===
const _isTouch = matchMedia('(pointer: coarse)').matches;

const GAME_INSTRUCTIONS = {
    snake: {
        desktop: ['Arrow keys or WASD to steer', 'Eat food to grow — avoid walls & yourself', 'Scissors power-up chops your tail'],
        mobile:  ['Swipe in any direction to steer', 'Eat food to grow — avoid walls & yourself', 'Scissors power-up chops your tail']
    },
    tetris: {
        desktop: ['← → to move | ↑ to rotate | ↓ to drop', 'Complete rows to clear them', 'Speed increases every 10 lines'],
        mobile:  ['Swipe left/right to move, down to drop', 'Tap to rotate the piece', 'Speed increases every 10 lines']
    },
    pong: {
        desktop: ['W/S or ↑/↓ to move your paddle', 'First to 11 points wins', 'Choose AI or play online vs a friend'],
        mobile:  ['Touch & drag to move your paddle', 'First to 11 points wins', 'Choose AI or play online vs a friend']
    },
    tron: {
        desktop: ['Arrow keys to turn — don\'t hit walls or trails', 'Hold Shift to speed up', 'Choose AI or play online vs a friend'],
        mobile:  ['Swipe up/down/left/right to turn', 'Don\'t hit walls or light trails', 'Choose AI or play online vs a friend']
    },
    breakout: {
        desktop: ['← → or mouse to move the paddle', 'Space to launch the ball', 'Break all bricks to advance — ball speeds up each level'],
        mobile:  ['Touch & drag to move the paddle', 'Tap to launch the ball', 'Break all bricks to advance — ball speeds up each level']
    },
    spaceinvaders: {
        desktop: ['← → to move | Space to shoot', 'Destroy all invaders before they reach the bottom', 'Waves get harder — faster enemies, more bullets'],
        mobile:  ['Touch left/right side to move', 'Auto-fire while touching', 'Waves get harder — faster enemies, more bullets']
    },
    memory: {
        desktop: ['Click tiles to reveal them', 'Match pairs of symbols to clear the board', 'Try to remember where each symbol is'],
        mobile:  ['Tap tiles to reveal them', 'Match pairs of symbols to clear the board', 'Try to remember where each symbol is']
    },
    '2048': {
        desktop: ['Arrow keys to slide all tiles', 'Matching numbers merge and double', 'Reach 2048 to win — don\'t fill the board'],
        mobile:  ['Swipe in any direction to slide tiles', 'Matching numbers merge and double', 'Reach 2048 to win — don\'t fill the board']
    },
    tictactoe: {
        desktop: ['Click a cell to place your mark', 'Get 3 in a row to win', 'Play VS AI or online with a friend'],
        mobile:  ['Tap a cell to place your mark', 'Get 3 in a row to win', 'Play VS AI or online with a friend']
    }
};

const INSTRUCTION_DURATION = 6000; // 6 seconds

function showGameInstructions(gameName, onDone) {
    const info = GAME_INSTRUCTIONS[gameName];
    if (!info) { onDone(); return; }
    const lines = _isTouch ? info.mobile : info.desktop;

    const overlay = document.createElement('div');
    overlay.className = 'game-instructions-overlay';

    const title = document.createElement('h2');
    title.className = 'gi-title';
    title.textContent = GAME_DISPLAY_NAMES[gameName] || gameName.toUpperCase();
    overlay.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'gi-subtitle';
    subtitle.textContent = _isTouch ? 'TOUCH CONTROLS' : 'KEYBOARD CONTROLS';
    overlay.appendChild(subtitle);

    const list = document.createElement('ul');
    list.className = 'gi-list';
    for (const line of lines) {
        const li = document.createElement('li');
        li.textContent = line;
        list.appendChild(li);
    }
    overlay.appendChild(list);

    const countdown = document.createElement('div');
    countdown.className = 'gi-countdown';
    overlay.appendChild(countdown);

    const skipHint = document.createElement('p');
    skipHint.className = 'gi-skip';
    skipHint.textContent = _isTouch ? 'Tap to skip' : 'Press any key or click to skip';
    overlay.appendChild(skipHint);

    gameContainer.appendChild(overlay);

    let remaining = Math.ceil(INSTRUCTION_DURATION / 1000);
    countdown.textContent = remaining;
    const countInterval = setInterval(() => {
        remaining--;
        if (remaining > 0) countdown.textContent = remaining;
    }, 1000);

    let dismissed = false;
    function dismiss() {
        if (dismissed) return;
        dismissed = true;
        clearInterval(countInterval);
        clearTimeout(autoTimer);
        overlay.remove();
        onDone();
    }

    const autoTimer = setTimeout(dismiss, INSTRUCTION_DURATION);

    // Skip on tap/click/keypress
    overlay.addEventListener('click', dismiss);
    overlay.addEventListener('touchstart', (e) => { e.preventDefault(); dismiss(); });
    function onKey(e) { dismiss(); document.removeEventListener('keydown', onKey); }
    document.addEventListener('keydown', onKey);
    cleanupFunctions.push(() => {
        dismissed = true;
        clearInterval(countInterval);
        clearTimeout(autoTimer);
        try { overlay.remove(); } catch(e){}
        document.removeEventListener('keydown', onKey);
    });
}

function startGame(gameName) {
    if (!lobby || !gameContainer || !canvas || !ctx) {
        console.error('PIXEL PALACE: Cannot start game — required elements missing.');
        return;
    }
    lobby.style.display = 'none';
    gameContainer.classList.add('active');
    document.body.classList.add('game-active');
    currentGame = gameName;
    score = 0;
    updateScore(0);
    if (canvas) canvas.oncontextmenu = (e) => e.preventDefault();
    clearTouchControls();
    if (currentGameTitle) {
        currentGameTitle.textContent = GAME_DISPLAY_NAMES[gameName] || gameName.toUpperCase();
    }
    const playArea = gameContainer.querySelector('.game-play-area');
    if (playArea && canvas && touchControls) {
        if (!playArea.contains(canvas)) playArea.insertBefore(canvas, playArea.firstChild);
        if (!playArea.contains(touchControls)) playArea.appendChild(touchControls);
    }

    // Show instructions first, then init the game
    showGameInstructions(gameName, () => {
        if (audioCtx && arcadeMusicEnabled) {
            if (audioCtx.state === 'suspended') audioCtx.resume().then(() => startArcadeMusic(gameName)).catch(() => {});
            else startArcadeMusic(gameName);
        }
        _launchGame(gameName);
    });
}

function _launchGame(gameName) {
    switch (gameName) {
        case 'snake': initSnake(); break;
        case 'tetris': initTetris(); break;
        case 'pong': initPong(); break;
        case 'tron': initTron(); break;
        case 'breakout': initBreakout(); break;
        case 'spaceinvaders': initSpaceInvaders(); break;
        case 'memory': initMemory2(); break;
        case '2048': init2048(); break;
        case 'tictactoe': initTicTacToe(); break;
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
    /* Subtract CSS borders to get the content box */
    const style = getComputedStyle(canvas);
    const bL = parseFloat(style.borderLeftWidth) || 0;
    const bT = parseFloat(style.borderTopWidth) || 0;
    const bR = parseFloat(style.borderRightWidth) || 0;
    const bB = parseFloat(style.borderBottomWidth) || 0;
    const contentW = rect.width - bL - bR;
    const contentH = rect.height - bT - bB;
    if (contentW <= 0 || contentH <= 0) return null;
    /* Account for object-fit: contain — content may be letter/pillarboxed */
    const canvasAR = canvas.width / canvas.height;
    const boxAR = contentW / contentH;
    let renderW, renderH, offX, offY;
    if (canvasAR > boxAR) {
        renderW = contentW;
        renderH = contentW / canvasAR;
        offX = 0;
        offY = (contentH - renderH) / 2;
    } else {
        renderH = contentH;
        renderW = contentH * canvasAR;
        offX = (contentW - renderW) / 2;
        offY = 0;
    }
    const x = (t.clientX - rect.left - bL - offX) * (canvas.width / renderW);
    const y = (t.clientY - rect.top - bT - offY) * (canvas.height / renderH);
    return { x, y };
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
    const { onLeft, onRight, onUp, onDown, onAction, onActionEnd, actionLabel, snapCardinal } = options;
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
        if (snapCardinal) {
            /* For grid games (Snake, 2048): only fire the single dominant
               cardinal direction so diagonals never confuse input. */
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);
            let dom;
            if (absX >= absY) dom = dx > 0 ? 'right' : 'left';
            else              dom = dy > 0 ? 'down'  : 'up';
            fire('right', onRight, dom === 'right');
            fire('down',  onDown,  dom === 'down');
            fire('left',  onLeft,  dom === 'left');
            fire('up',    onUp,    dom === 'up');
        } else {
            const deg = a * 180 / Math.PI;
            fire('right', onRight, deg > -67.5 && deg < 67.5);
            fire('down', onDown, deg > 22.5 && deg < 157.5);
            fire('left', onLeft, deg > 112.5 || deg < -112.5);
            fire('up', onUp, deg > -157.5 && deg < -22.5);
        }
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

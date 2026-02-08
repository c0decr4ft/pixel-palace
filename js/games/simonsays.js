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


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


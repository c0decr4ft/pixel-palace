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


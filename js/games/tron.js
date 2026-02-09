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
            /* Bike heads: layered rects for glow (no shadowBlur — expensive) */
            if (c1.alive) {
                const dx = h1x * TRON_CELL + TRON_BIKE_PAD;
                const dy = h1y * TRON_CELL + TRON_BIKE_PAD;
                ctx.globalAlpha = 0.15;
                ctx.fillStyle = '#00ffff';
                ctx.fillRect(dx - 2, dy - 2, bikeSize + 4, bikeSize + 4);
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#00ffff';
                ctx.fillRect(dx, dy, bikeSize, bikeSize);
            }
            if (c2.alive) {
                const dx = h2x * TRON_CELL + TRON_BIKE_PAD;
                const dy = h2y * TRON_CELL + TRON_BIKE_PAD;
                ctx.globalAlpha = 0.15;
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(dx - 2, dy - 2, bikeSize + 4, bikeSize + 4);
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(dx, dy, bikeSize, bikeSize);
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
        /* Delta tracking: how many path points already sent */
        let sentP1Idx = p1.path.length;
        let sentP2Idx = p2.path.length;
        /* Joiner interpolation: timestamp of the last actual position change
           (NOT every network message — the host sends every 50ms but bikes move
            every 80ms, so many messages carry the same position). */
        let lastMoveTime = performance.now();
        /* Track whether the host has sent any data different from last send */
        let hostLastSentDir1 = p1.dir;
        let hostLastSentDir2 = p2.dir;
        cleanupFunctions.push(() => { try { conn.close(); } catch(e){} try { if (peerRef) peerRef.destroy(); } catch(e){} });
        conn.on('data', (data) => {
            if (data.t === 'dir') remoteDir = data.d;
            if (data.t === 'u') {
                /* Detect whether the head position actually moved */
                const moved = (p1.x !== data.p1x || p1.y !== data.p1y ||
                               p2.x !== data.p2x || p2.y !== data.p2y);
                /* Compact delta update */
                p1.x = data.p1x; p1.y = data.p1y; p1.dir = data.p1d; p1.alive = data.p1a;
                p2.x = data.p2x; p2.y = data.p2y; p2.dir = data.p2d; p2.alive = data.p2a;
                /* Append new path points and update grid */
                if (data.n1) {
                    for (let i = 0; i < data.n1.length; i++) {
                        const pt = data.n1[i];
                        p1.path.push(pt);
                        if (pt[1] >= 0 && pt[1] < TRON_ROWS && pt[0] >= 0 && pt[0] < TRON_COLS)
                            grid[pt[1]][pt[0]] = 1;
                    }
                }
                if (data.n2) {
                    for (let i = 0; i < data.n2.length; i++) {
                        const pt = data.n2[i];
                        p2.path.push(pt);
                        if (pt[1] >= 0 && pt[1] < TRON_ROWS && pt[0] >= 0 && pt[0] < TRON_COLS)
                            grid[pt[1]][pt[0]] = 2;
                    }
                }
                gameOver = data.go;
                winner = data.win || 0;
                /* Only reset interpolation timer when heads actually moved,
                   so the smooth projection isn't interrupted by redundant updates */
                if (moved) lastMoveTime = performance.now();
            }
        });
        conn.on('close', () => { disconnected = true; });
        conn.on('error', () => { disconnected = true; });
        function canTurn(cur, newD) { return cur === newD || (cur + 2) % 4 !== newD; }
        function nextCell(x, y, d) { return { x: x + TRON_DX[d], y: y + TRON_DY[d] }; }
        function valid(c) { return c.x >= 0 && c.x < TRON_COLS && c.y >= 0 && c.y < TRON_ROWS && grid[c.y][c.x] === 0; }
        const SEND_INTERVAL_MS = 50;
        function update(now) {
            gameLoop = requestAnimationFrame(update);
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
                /* Send compact delta: only new path points since last send.
                   Skip sending if nothing changed (same positions, same dirs,
                   no new path points) to reduce network/GC overhead. */
                if (now - lastSend >= SEND_INTERVAL_MS) {
                    const n1 = sentP1Idx < p1.path.length ? p1.path.slice(sentP1Idx) : null;
                    const n2 = sentP2Idx < p2.path.length ? p2.path.slice(sentP2Idx) : null;
                    const dirsChanged = (p1.dir !== hostLastSentDir1 || p2.dir !== hostLastSentDir2);
                    if (n1 || n2 || dirsChanged || gameOver) {
                        lastSend = now;
                        sentP1Idx = p1.path.length;
                        sentP2Idx = p2.path.length;
                        hostLastSentDir1 = p1.dir;
                        hostLastSentDir2 = p2.dir;
                        conn.send({ t: 'u',
                            p1x: p1.x, p1y: p1.y, p1d: p1.dir, p1a: p1.alive,
                            p2x: p2.x, p2y: p2.y, p2d: p2.dir, p2a: p2.alive,
                            n1: n1, n2: n2, go: gameOver, win: winner
                        });
                    } else {
                        lastSend = now;
                    }
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
            /* Interpolation: host uses local move timer,
               joiner uses time since the last actual position change. */
            const interp = isHost
                ? Math.min(1, (now - lastMove) / TRON_MOVE_MS)
                : Math.min(1, (now - lastMoveTime) / TRON_MOVE_MS);
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
            /* Bike heads: no shadowBlur, use layered rects for glow */
            if (p1.alive) {
                const bx = h1x * TRON_CELL + TRON_BIKE_PAD;
                const by = h1y * TRON_CELL + TRON_BIKE_PAD;
                ctx.globalAlpha = 0.15;
                ctx.fillStyle = '#00ffff';
                ctx.fillRect(bx - 2, by - 2, bikeSize + 4, bikeSize + 4);
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#00ffff';
                ctx.fillRect(bx, by, bikeSize, bikeSize);
            }
            if (p2.alive) {
                const bx = h2x * TRON_CELL + TRON_BIKE_PAD;
                const by = h2y * TRON_CELL + TRON_BIKE_PAD;
                ctx.globalAlpha = 0.15;
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(bx - 2, by - 2, bikeSize + 4, bikeSize + 4);
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(bx, by, bikeSize, bikeSize);
            }
        }
        gameLoop = requestAnimationFrame(update);
    }

    cleanupFunctions.push(() => { modeOverlay.remove(); });
}


// === DOTS & TRIANGLES ===

function initTriangles() {
    currentGameTitle.textContent = 'DOTS & TRIANGLES';
    gameControls.innerHTML = 'Draw lines between dots to close triangles. Claim the most to win!';

    const SIZE = 480;
    canvas.width = SIZE;
    canvas.height = SIZE;

    const NEON_CYAN = '#0ff0fc';
    const NEON_PINK = '#ff3c7f';
    const NEON_GOLD = '#ffd700';
    const DIM = 'rgba(255,255,255,0.18)';
    const BG = '#0d0021';
    const isTouch = matchMedia('(pointer: coarse)').matches;
    const DOT_R = 6;
    const LINE_W = 3;
    const HIT_R = isTouch ? 32 : 18;

    // Grid: 5 rows of dots forming a triangular mesh
    // Rows alternate between N and N-1 dots (offset pattern)
    const ROWS = 5;
    const COLS = 6;
    const PAD = 50;

    // Build dot positions
    const dots = [];
    const rowH = (SIZE - PAD * 2) / (ROWS - 1);
    const colW = (SIZE - PAD * 2) / (COLS - 1);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            dots.push({ r, c, x: PAD + c * colW, y: PAD + r * rowH });
        }
    }

    function dotIdx(r, c) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return -1;
        return r * COLS + c;
    }
    function getDot(r, c) {
        const i = dotIdx(r, c);
        return i >= 0 ? dots[i] : null;
    }

    // Build all possible edges
    const allEdges = [];
    const edgeMap = {};
    function edgeKey(i, j) {
        return Math.min(i, j) + ',' + Math.max(i, j);
    }
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const i = dotIdx(r, c);
            // Right
            if (c + 1 < COLS) {
                const j = dotIdx(r, c + 1);
                const k = edgeKey(i, j);
                if (!edgeMap[k]) { edgeMap[k] = true; allEdges.push([i, j]); }
            }
            // Down
            if (r + 1 < ROWS) {
                const j = dotIdx(r + 1, c);
                const k = edgeKey(i, j);
                if (!edgeMap[k]) { edgeMap[k] = true; allEdges.push([i, j]); }
            }
            // Diagonal (down-right for even rows, down-left for odd rows)
            // Create both diagonals for a richer grid
            if (r + 1 < ROWS && c + 1 < COLS) {
                const j = dotIdx(r + 1, c + 1);
                const k = edgeKey(i, j);
                if (!edgeMap[k]) { edgeMap[k] = true; allEdges.push([i, j]); }
            }
            if (r + 1 < ROWS && c - 1 >= 0) {
                const j = dotIdx(r + 1, c - 1);
                const k = edgeKey(i, j);
                if (!edgeMap[k]) { edgeMap[k] = true; allEdges.push([i, j]); }
            }
        }
    }

    // Build all possible triangles (sets of 3 dots where all 3 edges exist)
    const allTriangles = [];
    const edgeSet = new Set(allEdges.map(([a, b]) => edgeKey(a, b)));
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const i = dotIdx(r, c);
            // Check triangles formed by right+down+diagonal
            // Right-Down-DiagDR: (r,c)-(r,c+1)-(r+1,c) and (r,c)-(r,c+1)-(r+1,c+1)
            const neighbors = [];
            for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1],[-1,0],[0,-1],[-1,-1],[-1,1]]) {
                const ni = dotIdx(r + dr, c + dc);
                if (ni >= 0 && edgeSet.has(edgeKey(i, ni))) neighbors.push(ni);
            }
            for (let a = 0; a < neighbors.length; a++) {
                for (let b = a + 1; b < neighbors.length; b++) {
                    if (edgeSet.has(edgeKey(neighbors[a], neighbors[b]))) {
                        const tri = [i, neighbors[a], neighbors[b]].sort((x, y) => x - y);
                        allTriangles.push(tri);
                    }
                }
            }
        }
    }
    // Deduplicate triangles
    const triSet = new Set();
    const triangles = [];
    for (const tri of allTriangles) {
        const k = tri.join(',');
        if (!triSet.has(k)) { triSet.add(k); triangles.push(tri); }
    }

    // For each edge, which triangles contain it?
    const edgeToTris = {};
    for (let t = 0; t < triangles.length; t++) {
        const [a, b, c] = triangles[t];
        for (const ek of [edgeKey(a, b), edgeKey(a, c), edgeKey(b, c)]) {
            if (!edgeToTris[ek]) edgeToTris[ek] = [];
            edgeToTris[ek].push(t);
        }
    }

    // Game state
    let drawnEdges;       // Set of edge keys
    let claimedTris;      // Map tri-index → 1 or 2
    let scores;           // [0, p1, p2]
    let currentPlayer;    // 1 or 2
    let gameOver;
    let vsAI;
    let isOnline;
    let myPlayer;         // 1 or 2
    let conn, peer;
    let aiThinking;
    let gameActive;
    let hoveredEdge;      // edge key being hovered

    // ── Mode selection overlay ──
    const modeOverlay = document.createElement('div');
    modeOverlay.className = 'ttt-mode-overlay';
    modeOverlay.innerHTML = '<h3>Choose mode</h3><div class="ttt-mode-btns"></div>';
    const modeBtns = modeOverlay.querySelector('.ttt-mode-btns');

    const btnAI = document.createElement('button');
    btnAI.type = 'button';
    btnAI.className = 'ttt-mode-btn';
    btnAI.textContent = 'VS AI';
    btnAI.addEventListener('click', () => { modeOverlay.remove(); startAIGame(); });

    const btnOnline = document.createElement('button');
    btnOnline.type = 'button';
    btnOnline.className = 'ttt-mode-btn';
    btnOnline.textContent = '2 Players';
    btnOnline.addEventListener('click', () => { modeOverlay.remove(); showOnlineLobby(); });

    modeBtns.appendChild(btnAI);
    modeBtns.appendChild(btnOnline);
    gameContainer.appendChild(modeOverlay);

    resetState();
    draw();

    // ── State management ──
    function resetState() {
        drawnEdges = new Set();
        claimedTris = {};
        scores = [0, 0, 0];
        currentPlayer = 1;
        gameOver = false;
        aiThinking = false;
        hoveredEdge = null;
    }

    function startAIGame() {
        vsAI = true;
        isOnline = false;
        myPlayer = 1;
        resetState();
        gameActive = true;
        startArcadeMusic('triangles');
        draw();
    }

    function startOnlineGame(connection, isHost, peerInstance) {
        conn = connection;
        peer = peerInstance;
        vsAI = false;
        isOnline = true;
        myPlayer = isHost ? 1 : 2;
        canvas.width = SIZE;
        canvas.height = SIZE;
        resetState();
        gameActive = true;
        startArcadeMusic('triangles');
        requestAnimationFrame(() => draw());

        conn.on('data', (raw) => {
            const data = sanitizePeerData(raw);
            if (!data) return;
            if (data.type === 'move') {
                const ek = data.edge;
                if (typeof ek !== 'string') return;
                if (drawnEdges.has(ek)) return;
                // Validate edge exists
                const parts = ek.split(',');
                if (parts.length !== 2) return;
                const ei = parseInt(parts[0]), ej = parseInt(parts[1]);
                if (!isFinite(ei) || !isFinite(ej)) return;
                if (!edgeSet.has(ek)) return;
                applyMove(ek);
                draw();
            }
        });
        conn.on('close', () => { gameOver = true; draw(); playGameOverJingle(); });
        conn.on('error', () => { gameOver = true; draw(); playGameOverJingle(); });
    }

    // ── Apply a move ──
    function applyMove(ek) {
        drawnEdges.add(ek);
        const trisForEdge = edgeToTris[ek] || [];
        let claimed = 0;
        for (const ti of trisForEdge) {
            if (claimedTris[ti] != null) continue;
            const [a, b, c] = triangles[ti];
            if (drawnEdges.has(edgeKey(a, b)) &&
                drawnEdges.has(edgeKey(a, c)) &&
                drawnEdges.has(edgeKey(b, c))) {
                claimedTris[ti] = currentPlayer;
                scores[currentPlayer]++;
                claimed++;
            }
        }
        if (claimed > 0) {
            playSound(currentPlayer === 1 ? 600 : 500, 0.1);
        }

        // Check game over
        const totalClaimed = scores[1] + scores[2];
        if (totalClaimed === triangles.length || drawnEdges.size === allEdges.length) {
            gameOver = true;
            if (scores[1] > scores[2]) playSound(800, 0.3);
            else if (scores[2] > scores[1]) playGameOverJingle();
            else playSound(440, 0.3);
            return;
        }

        if (claimed === 0) {
            currentPlayer = currentPlayer === 1 ? 2 : 1;
        }
        // If claimed > 0, same player goes again
    }

    // ── AI ──
    let lastAIEdge = null;
    let aiFlashTimer = null;

    function doAIMove() {
        if (gameOver || currentPlayer !== 2 || !vsAI) return;
        aiThinking = true;
        setTimeout(() => {
            if (gameOver) { aiThinking = false; return; }
            const move = aiBestEdge();
            if (move) {
                lastAIEdge = move;
                applyMove(move);
                draw();
                // Clear the AI highlight after a moment
                if (aiFlashTimer) clearTimeout(aiFlashTimer);
                aiFlashTimer = setTimeout(() => { lastAIEdge = null; draw(); }, 600);
                // AI gets another turn if it claimed a triangle
                if (!gameOver && currentPlayer === 2) {
                    doAIMove();
                    return;
                }
            }
            aiThinking = false;
            draw();
        }, 500);
    }

    function aiBestEdge() {
        const available = allEdges.filter(([a, b]) => !drawnEdges.has(edgeKey(a, b)));
        if (available.length === 0) return null;

        // Count how many triangles an edge would complete (claim for the AI)
        function countCompletions(ek) {
            const tris = edgeToTris[ek] || [];
            let count = 0;
            for (const ti of tris) {
                if (claimedTris[ti] != null) continue;
                const [ta, tb, tc] = triangles[ti];
                const edges = [edgeKey(ta, tb), edgeKey(ta, tc), edgeKey(tb, tc)];
                const drawn = edges.filter(e => drawnEdges.has(e) || e === ek).length;
                if (drawn === 3) count++;
            }
            return count;
        }

        // Priority 1: pick the edge that completes the most triangles
        let bestComplete = 0;
        let completingEdges = [];
        for (const [a, b] of available) {
            const ek = edgeKey(a, b);
            const c = countCompletions(ek);
            if (c > bestComplete) { bestComplete = c; completingEdges = [ek]; }
            else if (c === bestComplete && c > 0) completingEdges.push(ek);
        }
        if (bestComplete > 0) {
            return completingEdges[Math.floor(Math.random() * completingEdges.length)];
        }

        // Count how many NEW "2-of-3" situations this move creates for the opponent.
        // Only count triangles that go from <2 drawn edges to exactly 2 after drawing ek.
        function countNewGiveaways(ek) {
            let count = 0;
            const tris = edgeToTris[ek] || [];
            for (const ti of tris) {
                if (claimedTris[ti] != null) continue;
                const [ta, tb, tc] = triangles[ti];
                const edges = [edgeKey(ta, tb), edgeKey(ta, tc), edgeKey(tb, tc)];
                const drawnBefore = edges.filter(e => drawnEdges.has(e)).length;
                // ek is one of these edges and is not yet drawn, so after drawing:
                // drawnAfter = drawnBefore + 1
                if (drawnBefore + 1 === 2) count++;
            }
            return count;
        }

        // Priority 2: pick the edge that creates the fewest new giveaways
        let bestGiveaway = Infinity;
        for (const [a, b] of available) {
            const ek = edgeKey(a, b);
            const g = countNewGiveaways(ek);
            if (g < bestGiveaway) bestGiveaway = g;
        }
        const safe = available.filter(([a, b]) => countNewGiveaways(edgeKey(a, b)) === bestGiveaway);
        const pick = safe[Math.floor(Math.random() * safe.length)];
        return edgeKey(pick[0], pick[1]);
    }

    // ── Online lobby ──
    function showOnlineLobby() {
        const hasPeer = typeof Peer !== 'undefined';
        const overlay = document.createElement('div');
        overlay.className = 'ttt-mode-overlay';
        overlay.innerHTML = '<h3>Play vs someone online</h3><div class="ttt-mode-btns"></div>';
        const btns = overlay.querySelector('.ttt-mode-btns');

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'ttt-mode-btn ttt-back-btn';
        backBtn.textContent = '\u2190 Back';
        backBtn.addEventListener('click', () => { overlay.remove(); gameContainer.appendChild(modeOverlay); });

        if (!hasPeer) {
            overlay.querySelector('h3').textContent = 'Online play requires PeerJS (check connection).';
            btns.appendChild(backBtn);
            gameContainer.appendChild(overlay);
            return;
        }

        const createBtn = document.createElement('button');
        createBtn.type = 'button';
        createBtn.className = 'ttt-mode-btn';
        createBtn.textContent = 'Create Game';
        createBtn.addEventListener('click', () => {
            const gc = generateGameCode();
            const p = new Peer(gc.peerId, { debug: 0 });
            const codeEl = document.createElement('div');
            codeEl.className = 'pong-room-code';
            codeEl.textContent = gc.full;
            const waitEl = document.createElement('p');
            waitEl.className = 'pong-waiting-msg';
            waitEl.textContent = 'Share this code. When someone joins, the game starts.';
            overlay.querySelector('h3').textContent = 'Your game code';
            btns.innerHTML = '';
            overlay.insertBefore(codeEl, btns);
            overlay.insertBefore(waitEl, btns);
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'ttt-mode-btn ttt-back-btn';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => {
                overlay.remove();
                try { p.destroy(); } catch (e) {}
                gameContainer.appendChild(modeOverlay);
            });
            btns.appendChild(cancelBtn);
            hostVerifyConnection(p, gc.secret, (c) => {
                overlay.remove();
                startOnlineGame(c, true, p);
            }, () => { waitEl.textContent = 'Unauthorized connection rejected.'; });
            p.on('error', (err) => {
                waitEl.textContent = 'Error: ' + (err.message || 'Could not create game. Try again.');
            });
            cleanupFunctions.push(() => { try { p.destroy(); } catch (e) {} });
        });

        const joinBtn = document.createElement('button');
        joinBtn.type = 'button';
        joinBtn.className = 'ttt-mode-btn';
        joinBtn.textContent = 'Join Game';
        joinBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'pong-join-input';
            input.placeholder = 'e.g. ABCD1234';
            input.maxLength = 8;
            input.autocomplete = 'off';
            input.setAttribute('inputmode', 'text');
            input.setAttribute('autocapitalize', 'characters');
            input.setAttribute('spellcheck', 'false');
            const goBtn = document.createElement('button');
            goBtn.type = 'button';
            goBtn.className = 'ttt-mode-btn';
            goBtn.textContent = 'Connect';
            overlay.querySelector('h3').textContent = 'Enter game code';
            btns.innerHTML = '';
            btns.appendChild(input);
            btns.appendChild(goBtn);
            btns.appendChild(backBtn);
            input.focus();
            goBtn.addEventListener('click', () => {
                const parsed = parseGameCode(input.value);
                if (!parsed) return;
                const p = new Peer(undefined, { debug: 0 });
                p.on('open', () => {
                    const c = p.connect(parsed.peerId);
                    if (!c) { overlay.querySelector('h3').textContent = 'Could not connect.'; return; }
                    joinerAuthenticate(c, parsed.secret, () => {
                        overlay.remove();
                        startOnlineGame(c, false, p);
                    }, (msg) => { overlay.querySelector('h3').textContent = msg || 'Auth failed.'; });
                    c.on('error', () => { overlay.querySelector('h3').textContent = 'Connection failed.'; });
                });
                p.on('error', (err) => {
                    overlay.querySelector('h3').textContent = 'Error: ' + (err.message || 'Try again.');
                });
                cleanupFunctions.push(() => { try { p.destroy(); } catch (e) {} });
            });
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') goBtn.click(); });
        });

        btns.appendChild(createBtn);
        btns.appendChild(joinBtn);
        btns.appendChild(backBtn);
        gameContainer.appendChild(overlay);
    }

    // ── Find closest available edge to a point ──
    function findClosestEdge(px, py) {
        let bestDist = HIT_R;
        let bestKey = null;
        for (const [i, j] of allEdges) {
            const ek = edgeKey(i, j);
            if (drawnEdges.has(ek)) continue;
            const d1 = dots[i], d2 = dots[j];
            const dist = pointToSegDist(px, py, d1.x, d1.y, d2.x, d2.y);
            if (dist < bestDist) { bestDist = dist; bestKey = ek; }
        }
        return bestKey;
    }

    function pointToSegDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }

    // ── Input handling ──
    function handlePointer(e) {
        if (!gameActive || gameOver || aiThinking) return;
        if (isOnline && currentPlayer !== myPlayer) return;
        if (vsAI && currentPlayer !== 1) return;

        const coords = getEventCanvasCoords(e);
        if (!coords) return;
        const ek = findClosestEdge(coords.x, coords.y);
        if (!ek) return;

        applyMove(ek);
        playSound(350, 0.06);

        if (isOnline && conn) {
            try { conn.send({ type: 'move', edge: ek }); } catch (e2) {}
        }

        draw();

        if (!gameOver && vsAI && currentPlayer === 2) {
            doAIMove();
        }
    }

    function handleHover(e) {
        if (!gameActive || gameOver || aiThinking) return;
        if (isOnline && currentPlayer !== myPlayer) return;
        if (vsAI && currentPlayer !== 1) return;
        const coords = getEventCanvasCoords(e);
        if (!coords) { hoveredEdge = null; draw(); return; }
        const ek = findClosestEdge(coords.x, coords.y);
        if (ek !== hoveredEdge) { hoveredEdge = ek; draw(); }
    }

    function onPointerDown(e) {
        if (e.type === 'touchstart') {
            if (typeof isTouchOnUI === 'function' && isTouchOnUI(e)) return;
            e.preventDefault();
        }
        handlePointer(e);
    }

    // On touch devices, also highlight on touchmove so the user can see what they'll select
    function onTouchMove(e) {
        if (!gameActive || gameOver) return;
        e.preventDefault();
        handleHover(e);
    }
    function onTouchEnd(e) {
        hoveredEdge = null;
        draw();
    }

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('mousemove', handleHover);
    canvas.addEventListener('mouseleave', () => { hoveredEdge = null; draw(); });
    if (isTouch) {
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    }
    cleanupFunctions.push(() => {
        canvas.removeEventListener('mousedown', onPointerDown);
        canvas.removeEventListener('touchstart', onPointerDown);
        canvas.removeEventListener('mousemove', handleHover);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);
    });

    // ── Drawing ──
    function draw() {
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Draw available edges as dim lines
        const dimLineW = isTouch ? 2.5 : 1;
        for (const [i, j] of allEdges) {
            const ek = edgeKey(i, j);
            if (drawnEdges.has(ek)) continue;
            const d1 = dots[i], d2 = dots[j];
            ctx.strokeStyle = (ek === hoveredEdge)
                ? (currentPlayer === 1 ? 'rgba(0,255,252,0.4)' : 'rgba(255,60,127,0.4)')
                : DIM;
            ctx.lineWidth = (ek === hoveredEdge) ? LINE_W + 2 : dimLineW;
            ctx.beginPath();
            ctx.moveTo(d1.x, d1.y);
            ctx.lineTo(d2.x, d2.y);
            ctx.stroke();
        }

        // Draw claimed triangles (filled)
        for (let ti = 0; ti < triangles.length; ti++) {
            const owner = claimedTris[ti];
            if (owner == null) continue;
            const [a, b, c] = triangles[ti];
            const da = dots[a], db = dots[b], dc = dots[c];
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = owner === 1 ? NEON_CYAN : NEON_PINK;
            ctx.beginPath();
            ctx.moveTo(da.x, da.y);
            ctx.lineTo(db.x, db.y);
            ctx.lineTo(dc.x, dc.y);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;

            // Small marker in center
            const cx = (da.x + db.x + dc.x) / 3;
            const cy = (da.y + db.y + dc.y) / 3;
            ctx.fillStyle = owner === 1 ? NEON_CYAN : NEON_PINK;
            ctx.font = '10px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(owner === 1 ? '◆' : '●', cx, cy);
        }

        // Draw placed edges
        for (const ek of drawnEdges) {
            const [si, sj] = ek.split(',').map(Number);
            const d1 = dots[si], d2 = dots[sj];
            const isAIFlash = (ek === lastAIEdge);
            ctx.strokeStyle = isAIFlash ? NEON_PINK : '#ffffff';
            ctx.lineWidth = isAIFlash ? LINE_W + 3 : LINE_W;
            ctx.beginPath();
            ctx.moveTo(d1.x, d1.y);
            ctx.lineTo(d2.x, d2.y);
            ctx.stroke();
        }

        // Draw dots
        for (const d of dots) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(d.x, d.y, DOT_R, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            ctx.arc(d.x, d.y, DOT_R + 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Scoreboard
        ctx.textAlign = 'left';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillStyle = NEON_CYAN;
        ctx.fillText('◆ ' + scores[1], 10, 22);
        ctx.textAlign = 'right';
        ctx.fillStyle = NEON_PINK;
        ctx.fillText(scores[2] + ' ●', SIZE - 10, 22);

        // Turn / status
        ctx.textAlign = 'center';
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, SIZE / 2 - 46, SIZE, 92);
            ctx.font = '22px "Press Start 2P"';
            if (scores[1] > scores[2]) {
                ctx.fillStyle = NEON_CYAN;
                if (vsAI) ctx.fillText('YOU WIN!', SIZE / 2, SIZE / 2 - 8);
                else if (isOnline) ctx.fillText(myPlayer === 1 ? 'YOU WIN!' : 'OPPONENT WINS!', SIZE / 2, SIZE / 2 - 8);
                else ctx.fillText('PLAYER 1 WINS!', SIZE / 2, SIZE / 2 - 8);
            } else if (scores[2] > scores[1]) {
                ctx.fillStyle = NEON_PINK;
                if (vsAI) ctx.fillText('AI WINS!', SIZE / 2, SIZE / 2 - 8);
                else if (isOnline) ctx.fillText(myPlayer === 2 ? 'YOU WIN!' : 'OPPONENT WINS!', SIZE / 2, SIZE / 2 - 8);
                else ctx.fillText('PLAYER 2 WINS!', SIZE / 2, SIZE / 2 - 8);
            } else {
                ctx.fillStyle = NEON_GOLD;
                ctx.fillText("IT'S A DRAW!", SIZE / 2, SIZE / 2 - 8);
            }
            ctx.font = '10px "Press Start 2P"';
            ctx.fillStyle = '#aaa';
            ctx.fillText(scores[1] + ' - ' + scores[2], SIZE / 2, SIZE / 2 + 20);
        } else if (gameActive) {
            ctx.font = '10px "Press Start 2P"';
            ctx.fillStyle = currentPlayer === 1 ? NEON_CYAN : NEON_PINK;
            let label;
            if (vsAI) {
                label = currentPlayer === 1 ? 'YOUR TURN' : 'AI THINKING...';
            } else if (isOnline) {
                label = currentPlayer === myPlayer ? 'YOUR TURN' : "OPPONENT'S TURN";
            } else {
                label = 'PLAYER ' + currentPlayer + "'S TURN";
            }
            ctx.fillText(label, SIZE / 2, SIZE - 12);
        }
    }

    // ── Cleanup ──
    cleanupFunctions.push(() => {
        modeOverlay.remove();
        if (aiFlashTimer) clearTimeout(aiFlashTimer);
        if (peer) { try { peer.destroy(); } catch (e) {} }
    });
}

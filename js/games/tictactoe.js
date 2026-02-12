// === TIC TAC TOE ===
// Room code generation moved to core.js: generateRoomCode()

function initTicTacToe() {
    currentGameTitle.textContent = 'TIC TAC TOE';
    gameControls.innerHTML = 'Click a cell to place your mark. Get 3 in a row to win!';

    const SIZE = 480;
    canvas.width = SIZE;
    canvas.height = SIZE;

    const CELL = SIZE / 3;
    const LINE_W = 6;
    const MARK_PAD = 28;
    const NEON_CYAN = '#0ff0fc';
    const NEON_PINK = '#ff3c7f';
    const NEON_GOLD = '#ffd700';
    const DIM = 'rgba(255,255,255,0.12)';
    const BG = '#0d0021';

    let board;
    let turn;
    let winner;
    let winLine;
    let vsAI;
    let isOnline = false;
    let myMark = null;      // 'X' or 'O' — which mark does this player control
    let conn = null;         // PeerJS DataConnection
    let peer = null;         // PeerJS Peer instance
    let aiThinking;
    let gameActive;

    // ── Mode selection overlay ──
    const modeOverlay = document.createElement('div');
    modeOverlay.className = 'ttt-mode-overlay';
    modeOverlay.innerHTML = '<h3>Choose mode</h3><div class="ttt-mode-btns"></div>';
    const modeBtns = modeOverlay.querySelector('.ttt-mode-btns');

    const btnAI = document.createElement('button');
    btnAI.type = 'button';
    btnAI.className = 'ttt-mode-btn';
    btnAI.textContent = 'VS AI';
    btnAI.addEventListener('click', () => { modeOverlay.remove(); startTTTAI(); });

    const btnOnline = document.createElement('button');
    btnOnline.type = 'button';
    btnOnline.className = 'ttt-mode-btn';
    btnOnline.textContent = '2 Players';
    btnOnline.addEventListener('click', () => { modeOverlay.remove(); showOnlineLobby(); });

    modeBtns.appendChild(btnAI);
    modeBtns.appendChild(btnOnline);
    gameContainer.appendChild(modeOverlay);

    // Draw an empty board while overlay is visible
    drawBoard();

    // ── Start AI game ──
    function startTTTAI() {
        vsAI = true;
        isOnline = false;
        myMark = 'X';
        resetBoard();
        gameActive = true;
        startArcadeMusic('tictactoe');
    }

    // ── Start Online game ──
    function startTTTOnline(connection, isHost, peerInstance) {
        conn = connection;
        peer = peerInstance;
        vsAI = false;
        isOnline = true;
        myMark = isHost ? 'X' : 'O';
        resetBoard();
        gameActive = true;
        startArcadeMusic('tictactoe');

        conn.on('data', (raw) => {
            const data = sanitizePeerData(raw);
            if (!data) return;
            if (data.type === 'move') {
                const r = typeof data.r === 'number' ? Math.floor(data.r) : -1;
                const c = typeof data.c === 'number' ? Math.floor(data.c) : -1;
                if (r < 0 || r > 2 || c < 0 || c > 2) return;
                const remoteMark = myMark === 'X' ? 'O' : 'X';
                if (board[r][c] || turn !== remoteMark || winner) return;
                board[r][c] = remoteMark;
                playSound(remoteMark === 'X' ? 440 : 330, 0.08);
                const result = checkWin(board);
                if (result) {
                    winner = result.winner;
                    winLine = result.line;
                    handleOnlineGameEnd();
                } else {
                    turn = turn === 'X' ? 'O' : 'X';
                }
                drawBoard();
            }
            if (data.type === 'restart') {
                resetBoard();
                drawBoard();
            }
        });
        conn.on('close', () => {
            if (!winner) { winner = 'dc'; drawBoard(); }
            playGameOverJingle();
        });
        conn.on('error', () => {
            if (!winner) { winner = 'dc'; drawBoard(); }
            playGameOverJingle();
        });
    }

    function handleOnlineGameEnd() {
        if (winner === myMark) playSound(800, 0.3);
        else if (winner === 'draw') playSound(440, 0.3);
        else playGameOverJingle();
    }

    // ── Online lobby (Create / Join) ──
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

        // Create Game
        const createBtn = document.createElement('button');
        createBtn.type = 'button';
        createBtn.className = 'ttt-mode-btn';
        createBtn.textContent = 'Create Game';
        createBtn.addEventListener('click', () => {
            const roomCode = generateRoomCode('X');
            const secret = generateSecret().slice(0, 8);
            const fullCode = roomCode + '-' + secret;
            const p = new Peer(roomCode, { debug: 0 });
            const codeEl = document.createElement('div');
            codeEl.className = 'pong-room-code';
            codeEl.textContent = fullCode;
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
            p.on('open', () => {});
            hostVerifyConnection(p, secret, (c) => {
                overlay.remove();
                startTTTOnline(c, true, p);
            }, () => {
                waitEl.textContent = 'Unauthorized connection rejected.';
            });
            p.on('error', (err) => {
                waitEl.textContent = 'Error: ' + (err.message || 'Could not create game. Try again.');
            });
            cleanupFunctions.push(() => { try { p.destroy(); } catch (e) {} });
        });

        // Join Game
        const joinBtn = document.createElement('button');
        joinBtn.type = 'button';
        joinBtn.className = 'ttt-mode-btn';
        joinBtn.textContent = 'Join Game';
        joinBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'pong-join-input';
            input.placeholder = 'Paste full code';
            input.maxLength = 30;
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
                const raw = String(input.value).trim().toUpperCase();
                const dashIdx = raw.indexOf('-');
                const peerId = dashIdx > 0 ? raw.slice(0, dashIdx) : raw;
                const secret = dashIdx > 0 ? raw.slice(dashIdx + 1) : '';
                if (!peerId || peerId.length < 4) return;
                const p = new Peer(undefined, { debug: 0 });
                p.on('open', () => {
                    const c = p.connect(peerId);
                    if (!c) {
                        overlay.querySelector('h3').textContent = 'Could not connect. Check code.';
                        return;
                    }
                    joinerAuthenticate(c, secret, () => {
                        overlay.remove();
                        startTTTOnline(c, false, p);
                    }, (msg) => {
                        overlay.querySelector('h3').textContent = msg || 'Authentication failed.';
                    });
                    c.on('error', () => {
                        overlay.querySelector('h3').textContent = 'Connection failed. Check code.';
                    });
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

    function resetBoard() {
        board = [[null,null,null],[null,null,null],[null,null,null]];
        turn = 'X';
        winner = null;
        winLine = null;
        aiThinking = false;
        drawBoard();
    }

    // ── AI (minimax with alpha-beta pruning) ──
    function checkWin(b) {
        const lines = [
            [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
            [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
            [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]]
        ];
        for (const line of lines) {
            const [a, b2, c] = line;
            if (b[a[0]][a[1]] && b[a[0]][a[1]] === b[b2[0]][b2[1]] && b[a[0]][a[1]] === b[c[0]][c[1]]) {
                return { winner: b[a[0]][a[1]], line };
            }
        }
        let full = true;
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (!b[r][c]) full = false;
        if (full) return { winner: 'draw', line: null };
        return null;
    }

    function minimax(b, depth, isMaximizing, alpha, beta) {
        const result = checkWin(b);
        if (result) {
            if (result.winner === 'O') return 10 - depth;
            if (result.winner === 'X') return depth - 10;
            return 0;
        }
        if (isMaximizing) {
            let best = -Infinity;
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    if (!b[r][c]) {
                        b[r][c] = 'O';
                        best = Math.max(best, minimax(b, depth + 1, false, alpha, beta));
                        b[r][c] = null;
                        alpha = Math.max(alpha, best);
                        if (beta <= alpha) break;
                    }
                }
                if (beta <= alpha) break;
            }
            return best;
        } else {
            let best = Infinity;
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    if (!b[r][c]) {
                        b[r][c] = 'X';
                        best = Math.min(best, minimax(b, depth + 1, true, alpha, beta));
                        b[r][c] = null;
                        beta = Math.min(beta, best);
                        if (beta <= alpha) break;
                    }
                }
                if (beta <= alpha) break;
            }
            return best;
        }
    }

    function aiBestMove() {
        let bestScore = -Infinity;
        let move = null;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (!board[r][c]) {
                    board[r][c] = 'O';
                    const score = minimax(board, 0, false, -Infinity, Infinity);
                    board[r][c] = null;
                    if (score > bestScore) { bestScore = score; move = [r, c]; }
                }
            }
        }
        return move;
    }

    function doAIMove() {
        if (winner || turn !== 'O' || !vsAI) return;
        aiThinking = true;
        setTimeout(() => {
            if (winner || turn !== 'O') { aiThinking = false; return; }
            const move = aiBestMove();
            if (move) {
                board[move[0]][move[1]] = 'O';
                playSound(330, 0.08);
                const result = checkWin(board);
                if (result) {
                    winner = result.winner;
                    winLine = result.line;
                    if (winner === 'O') playGameOverJingle();
                    else if (winner === 'draw') playSound(440, 0.3);
                } else {
                    turn = 'X';
                }
            }
            aiThinking = false;
            drawBoard();
        }, 350);
    }

    // ── Handle clicks ──
    function handleClick(r, c) {
        if (!gameActive || winner || aiThinking) return;
        if (board[r][c]) return;

        // In AI mode, player is always X
        if (vsAI && turn !== 'X') return;

        // In online mode, only allow placing your own mark on your turn
        if (isOnline && turn !== myMark) return;

        board[r][c] = turn;
        playSound(turn === 'X' ? 440 : 330, 0.08);

        // Send the move to the remote player
        if (isOnline && conn) {
            try { conn.send({ type: 'move', r, c }); } catch (e) {}
        }

        const result = checkWin(board);
        if (result) {
            winner = result.winner;
            winLine = result.line;
            if (isOnline) {
                handleOnlineGameEnd();
            } else {
                // AI mode
                if (winner === 'X') playSound(800, 0.3);
                else if (winner === 'draw') playSound(440, 0.3);
            }
            drawBoard();
            return;
        }

        turn = turn === 'X' ? 'O' : 'X';
        drawBoard();

        if (vsAI && turn === 'O') doAIMove();
    }

    // ── Mouse / touch input ──
    function getCellFromEvent(e) {
        const coords = getEventCanvasCoords(e);
        if (!coords) return null;
        const col = Math.floor(coords.x / CELL);
        const row = Math.floor(coords.y / CELL);
        if (row < 0 || row > 2 || col < 0 || col > 2) return null;
        return { r: row, c: col };
    }

    function onPointerDown(e) {
        if (e.type === 'touchstart') e.preventDefault();
        const cell = getCellFromEvent(e);
        if (cell) handleClick(cell.r, cell.c);
    }

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    cleanupFunctions.push(() => {
        canvas.removeEventListener('mousedown', onPointerDown);
        canvas.removeEventListener('touchstart', onPointerDown);
    });

    // ── Restart on Space or tap after game over ──
    handleKeyDown = (e) => {
        if (winner && e.key === ' ') {
            e.preventDefault();
            doRestart();
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    function onRestartTap(e) {
        if (!winner) return;
        e.preventDefault();
        doRestart();
    }
    canvas.addEventListener('touchstart', onRestartTap, { passive: false });
    cleanupFunctions.push(() => {
        canvas.removeEventListener('touchstart', onRestartTap);
    });

    function doRestart() {
        if (isOnline && conn) {
            try { conn.send({ type: 'restart' }); } catch (e) {}
        }
        resetBoard();
        drawBoard();
    }

    // ── Drawing ──
    function drawBoard() {
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Grid lines
        ctx.strokeStyle = DIM;
        ctx.lineWidth = LINE_W;
        ctx.lineCap = 'round';
        for (let i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL, 12);
            ctx.lineTo(i * CELL, SIZE - 12);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(12, i * CELL);
            ctx.lineTo(SIZE - 12, i * CELL);
            ctx.stroke();
        }

        // Draw marks
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const cx = c * CELL + CELL / 2;
                const cy = r * CELL + CELL / 2;
                const mark = board ? board[r][c] : null;
                if (!mark) continue;

                const isWinCell = winLine && winLine.some(([wr, wc]) => wr === r && wc === c);
                const alpha = winner && !isWinCell ? 0.3 : 1;

                if (mark === 'X') drawX(cx, cy, alpha);
                else drawO(cx, cy, alpha);
            }
        }

        // Win line glow
        if (winLine) {
            const [a, , b] = winLine;
            const x1 = a[1] * CELL + CELL / 2;
            const y1 = a[0] * CELL + CELL / 2;
            const x2 = b[1] * CELL + CELL / 2;
            const y2 = b[0] * CELL + CELL / 2;

            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.strokeStyle = NEON_GOLD;
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = NEON_GOLD;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.restore();
        }

        // Status text
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (winner) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, SIZE / 2 - 46, SIZE, 92);
            ctx.font = '26px "Press Start 2P"';
            if (winner === 'dc') {
                ctx.fillStyle = '#ff4444';
                ctx.fillText('DISCONNECTED', SIZE / 2, SIZE / 2 - 12);
            } else if (winner === 'draw') {
                ctx.fillStyle = '#ffffff';
                ctx.fillText("IT'S A DRAW!", SIZE / 2, SIZE / 2 - 12);
            } else {
                ctx.fillStyle = winner === 'X' ? NEON_CYAN : NEON_PINK;
                let label;
                if (vsAI) {
                    label = winner === 'X' ? 'YOU WIN!' : 'AI WINS!';
                } else if (isOnline) {
                    label = winner === myMark ? 'YOU WIN!' : 'OPPONENT WINS!';
                } else {
                    label = winner + ' WINS!';
                }
                ctx.fillText(label, SIZE / 2, SIZE / 2 - 12);
            }
            ctx.font = '11px "Press Start 2P"';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText('SPACE / TAP TO REPLAY', SIZE / 2, SIZE / 2 + 22);
        } else if (gameActive) {
            ctx.font = '11px "Press Start 2P"';
            ctx.fillStyle = turn === 'X' ? NEON_CYAN : NEON_PINK;
            let turnLabel;
            if (vsAI) {
                turnLabel = turn === 'X' ? 'YOUR TURN (X)' : 'AI THINKING...';
            } else if (isOnline) {
                turnLabel = turn === myMark
                    ? 'YOUR TURN (' + myMark + ')'
                    : 'OPPONENT\'S TURN';
            } else {
                turnLabel = turn + "'S TURN";
            }
            ctx.fillText(turnLabel, SIZE / 2, 18);
        }
    }

    function drawX(cx, cy, alpha) {
        const half = CELL / 2 - MARK_PAD;
        ctx.save();
        ctx.globalAlpha = alpha * 0.2;
        ctx.strokeStyle = NEON_CYAN;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - half, cy - half);
        ctx.lineTo(cx + half, cy + half);
        ctx.moveTo(cx + half, cy - half);
        ctx.lineTo(cx - half, cy + half);
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(cx - half, cy - half);
        ctx.lineTo(cx + half, cy + half);
        ctx.moveTo(cx + half, cy - half);
        ctx.lineTo(cx - half, cy + half);
        ctx.stroke();
        ctx.restore();
    }

    function drawO(cx, cy, alpha) {
        const radius = CELL / 2 - MARK_PAD;
        ctx.save();
        ctx.globalAlpha = alpha * 0.2;
        ctx.strokeStyle = NEON_PINK;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // ── Cleanup ──
    cleanupFunctions.push(() => {
        modeOverlay.remove();
        document.removeEventListener('keydown', handleKeyDown);
        if (peer) { try { peer.destroy(); } catch (e) {} }
    });
}

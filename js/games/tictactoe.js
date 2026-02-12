// === TIC TAC TOE ===
function initTicTacToe() {
    currentGameTitle.textContent = 'TIC TAC TOE';
    gameControls.innerHTML = 'Click a cell to place your mark. Get 3 in a row to win!';

    const SIZE = 480;
    canvas.width = SIZE;
    canvas.height = SIZE;

    const CELL = SIZE / 3;
    const LINE_W = 6;
    const MARK_PAD = 28;          // padding inside each cell for X/O marks
    const NEON_CYAN = '#0ff0fc';
    const NEON_PINK = '#ff3c7f';
    const NEON_GOLD = '#ffd700';
    const DIM = 'rgba(255,255,255,0.12)';
    const BG = '#0d0021';

    let board;       // 3x3 array: null, 'X', 'O'
    let turn;        // 'X' or 'O'  (player is always X)
    let winner;      // null, 'X', 'O', 'draw'
    let winLine;     // [[r,c],[r,c],[r,c]] or null
    let vsAI;        // true = vs AI, false = 2-player local
    let aiThinking;  // true while AI is "thinking"
    let gameActive;  // false until a mode is chosen

    // ── Mode selection overlay ──
    const modeOverlay = document.createElement('div');
    modeOverlay.className = 'ttt-mode-overlay';
    modeOverlay.innerHTML = '<h3>Choose mode</h3><div class="ttt-mode-btns"></div>';
    const modeBtns = modeOverlay.querySelector('.ttt-mode-btns');

    const btnAI = document.createElement('button');
    btnAI.type = 'button';
    btnAI.className = 'ttt-mode-btn';
    btnAI.textContent = 'VS AI';
    btnAI.addEventListener('click', () => { modeOverlay.remove(); startTTT(true); });

    const btn2P = document.createElement('button');
    btn2P.type = 'button';
    btn2P.className = 'ttt-mode-btn';
    btn2P.textContent = '2 Players';
    btn2P.addEventListener('click', () => { modeOverlay.remove(); startTTT(false); });

    modeBtns.appendChild(btnAI);
    modeBtns.appendChild(btn2P);
    gameContainer.appendChild(modeOverlay);

    // Draw an empty board while overlay is visible
    drawBoard();

    // ── Start game ──
    function startTTT(ai) {
        vsAI = ai;
        resetBoard();
        gameActive = true;
        startArcadeMusic('tictactoe');
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
    function getAvailableMoves() {
        const moves = [];
        for (let r = 0; r < 3; r++)
            for (let c = 0; c < 3; c++)
                if (!board[r][c]) moves.push([r, c]);
        return moves;
    }

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
        // Check draw
        let full = true;
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (!b[r][c]) full = false;
        if (full) return { winner: 'draw', line: null };
        return null;
    }

    function minimax(b, depth, isMaximizing, alpha, beta) {
        const result = checkWin(b);
        if (result) {
            if (result.winner === 'O') return 10 - depth;     // AI wins
            if (result.winner === 'X') return depth - 10;     // Player wins
            return 0;                                          // Draw
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
        // Small delay so it feels natural
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
        if (vsAI && turn !== 'X') return;

        board[r][c] = turn;
        playSound(turn === 'X' ? 440 : 330, 0.08);

        const result = checkWin(board);
        if (result) {
            winner = result.winner;
            winLine = result.line;
            if (winner === 'X' && vsAI) playSound(800, 0.3);
            else if (winner === 'draw') playSound(440, 0.3);
            else if (winner !== 'draw' && !vsAI) playSound(800, 0.3);
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
            resetBoard();
            if (vsAI) drawBoard();
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    function onRestartTap(e) {
        if (!winner) return;
        e.preventDefault();
        resetBoard();
        drawBoard();
    }
    canvas.addEventListener('touchstart', onRestartTap, { passive: false });
    cleanupFunctions.push(() => {
        canvas.removeEventListener('touchstart', onRestartTap);
    });

    // ── Drawing ──
    function drawBoard() {
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Grid lines
        ctx.strokeStyle = DIM;
        ctx.lineWidth = LINE_W;
        ctx.lineCap = 'round';
        for (let i = 1; i < 3; i++) {
            // Vertical
            ctx.beginPath();
            ctx.moveTo(i * CELL, 12);
            ctx.lineTo(i * CELL, SIZE - 12);
            ctx.stroke();
            // Horizontal
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

                if (mark === 'X') {
                    drawX(cx, cy, alpha);
                } else {
                    drawO(cx, cy, alpha);
                }
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
            if (winner === 'draw') {
                ctx.fillStyle = '#ffffff';
                ctx.fillText("IT'S A DRAW!", SIZE / 2, SIZE / 2 - 12);
            } else {
                ctx.fillStyle = winner === 'X' ? NEON_CYAN : NEON_PINK;
                const label = vsAI ? (winner === 'X' ? 'YOU WIN!' : 'AI WINS!') : winner + ' WINS!';
                ctx.fillText(label, SIZE / 2, SIZE / 2 - 12);
            }
            ctx.font = '11px "Press Start 2P"';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText('SPACE / TAP TO REPLAY', SIZE / 2, SIZE / 2 + 22);
        } else if (gameActive) {
            // Turn indicator — small text at top
            ctx.font = '11px "Press Start 2P"';
            ctx.fillStyle = turn === 'X' ? NEON_CYAN : NEON_PINK;
            const turnLabel = vsAI
                ? (turn === 'X' ? 'YOUR TURN (X)' : 'AI THINKING...')
                : (turn + "'S TURN");
            ctx.fillText(turnLabel, SIZE / 2, 18);
        }
    }

    function drawX(cx, cy, alpha) {
        const half = CELL / 2 - MARK_PAD;
        ctx.save();
        ctx.globalAlpha = alpha;

        // Glow layer
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

        // Core line
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = NEON_CYAN;
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
        ctx.globalAlpha = alpha;

        // Glow layer
        ctx.globalAlpha = alpha * 0.2;
        ctx.strokeStyle = NEON_PINK;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Core line
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = NEON_PINK;
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
    });
}

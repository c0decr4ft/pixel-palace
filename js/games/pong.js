// === PONG GAME ===
const PONG_W = 1080;
const PONG_H = 720;
const PADDLE_W = 18;
const PADDLE_H = 100;
const BALL_SIZE = 18;
const PADDLE_SPEED = 500;
const BALL_SPEED_BASE = 480;
const PONG_SCORE_TO_WIN = 11;
const PONG_DASH = [10, 10];
const PONG_NO_DASH = [];
const PONG_SCORE_FONT = '48px "Press Start 2P"';

function randomRoomCode() {
    /* Exclude A,S,D,W so they aren't captured by game controls when typing the code */
    const chars = 'BCEFGHJKLMNPQRTVXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

function initPong() {
    currentGameTitle.textContent = 'PONG';
    gameControls.innerHTML = 'Choose AI or Online, then play. W/S or ↑/↓ to move.';
    
    canvas.width = PONG_W;
    canvas.height = PONG_H;
    
    const keys = {};
    handleKeyDown = (e) => {
        keys[e.key] = true;
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
    };
    handleKeyUp = (e) => { keys[e.key] = false; };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    const touchKeys = {};

    /* ---- Direct touch tracking: paddle follows finger Y position ---- */
    let touchPaddleY = null;  // null = not touching, otherwise target Y in canvas coords
    let pongGameActive = false; // only track touches once actual gameplay starts

    function onPongTouchStart(e) {
        if (!pongGameActive || e.touches.length < 1) return;
        e.preventDefault();
        updateTouchPaddle(e.touches[0]);
    }
    function onPongTouchMove(e) {
        if (!pongGameActive || touchPaddleY === null) return;
        e.preventDefault();
        if (e.touches.length) updateTouchPaddle(e.touches[0]);
    }
    function onPongTouchEnd(e) {
        if (e.touches.length === 0) touchPaddleY = null;
    }
    function updateTouchPaddle(touch) {
        /* Map the finger's screen Y to a paddle position in canvas coords */
        const coords = getEventCanvasCoords({ touches: [touch] });
        if (coords) touchPaddleY = coords.y;
    }

    const pongTouchTarget = gameContainer || canvas;
    pongTouchTarget.addEventListener('touchstart', onPongTouchStart, { passive: false });
    pongTouchTarget.addEventListener('touchmove', onPongTouchMove, { passive: false });
    pongTouchTarget.addEventListener('touchend', onPongTouchEnd, { passive: false });
    pongTouchTarget.addEventListener('touchcancel', onPongTouchEnd, { passive: false });

    cleanupFunctions.push(() => {
        pongTouchTarget.removeEventListener('touchstart', onPongTouchStart);
        pongTouchTarget.removeEventListener('touchmove', onPongTouchMove);
        pongTouchTarget.removeEventListener('touchend', onPongTouchEnd);
        pongTouchTarget.removeEventListener('touchcancel', onPongTouchEnd);
    });

    function clearPongKeys() {
        keys['ArrowUp'] = false; keys['ArrowDown'] = false;
        keys['w'] = false; keys['W'] = false; keys['s'] = false; keys['S'] = false;
        touchPaddleY = null;
    }
    window.addEventListener('blur', clearPongKeys);
    
    const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
    const isPortrait = () => window.innerWidth < window.innerHeight;
    let pongGameStarted = !isTouchDevice || !isPortrait();
    
    const rotateOverlay = document.createElement('div');
    rotateOverlay.className = 'pong-rotate-overlay';
    rotateOverlay.innerHTML = '<div class="pong-rotate-message"><span class="pong-rotate-icon">📱</span><p>Turn your phone 90° to play Pong</p><p class="pong-rotate-hint">Landscape mode</p></div>';
    rotateOverlay.style.display = pongGameStarted ? 'none' : 'flex';
    gameContainer.appendChild(rotateOverlay);
    
    const pongGameArea = document.createElement('div');
    pongGameArea.className = 'pong-game-area';
    pongGameArea.appendChild(canvas);
    pongGameArea.appendChild(touchControls);
    gameContainer.insertBefore(pongGameArea, gameControls);
    
    function checkPongOrientation() {
        if (!isTouchDevice) return;
        const portrait = isPortrait();
        if (portrait && !pongGameStarted) rotateOverlay.style.display = 'flex';
        else {
            rotateOverlay.style.display = 'none';
            if (!pongGameStarted) {
                pongGameStarted = true;
                gameContainer.classList.add('pong-landscape-layout');
            }
        }
    }
    window.addEventListener('orientationchange', checkPongOrientation);
    window.addEventListener('resize', checkPongOrientation);
    checkPongOrientation();
    
    const modeOverlay = document.createElement('div');
    modeOverlay.className = 'pong-mode-overlay';
    modeOverlay.innerHTML = '<h3>Choose mode</h3><div class="pong-mode-btns"></div>';
    const modeBtns = modeOverlay.querySelector('.pong-mode-btns');
    
    const btnAI = document.createElement('button');
    btnAI.type = 'button';
    btnAI.className = 'pong-mode-btn ai';
    btnAI.textContent = 'AI Play';
    btnAI.addEventListener('click', () => {
        modeOverlay.remove();
        startPongAI();
    });
    
    const btnOnline = document.createElement('button');
    btnOnline.type = 'button';
    btnOnline.className = 'pong-mode-btn online';
    btnOnline.textContent = 'Online Play';
    btnOnline.addEventListener('click', () => {
        modeOverlay.remove();
        showPongOnlineLobby();
    });
    
    modeBtns.appendChild(btnAI);
    modeBtns.appendChild(btnOnline);
    gameContainer.appendChild(modeOverlay);
    
    function showPongOnlineLobby() {
        const hasPeer = typeof Peer !== 'undefined';
        const overlay = document.createElement('div');
        overlay.className = 'pong-online-overlay';
        overlay.innerHTML = '<h3>Play vs someone online</h3><div class="pong-online-btns"></div>';
        const btns = overlay.querySelector('.pong-online-btns');
        
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'pong-online-btn back';
        backBtn.textContent = '← Back';
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
            cancelBtn.addEventListener('click', () => {
                overlay.remove();
                try { peer.destroy(); } catch (e) {}
                gameContainer.appendChild(modeOverlay);
            });
            btns.appendChild(cancelBtn);
            peer.on('open', () => {});
            peer.on('connection', (conn) => {
                conn.on('open', () => {
                    overlay.remove();
                    startPongOnline(conn, true, peer);
                });
            });
            peer.on('error', (err) => {
                waitEl.textContent = 'Error: ' + (err.message || 'Could not create game. Try again.');
            });
            cleanupFunctions.push(() => { try { peer.destroy(); } catch (e) {} });
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
                    if (!conn) {
                        overlay.querySelector('h3').textContent = 'Could not connect. Check code.';
                        return;
                    }
                    conn.on('open', () => {
                        overlay.remove();
                        startPongOnline(conn, false, peer);
                    });
                    conn.on('error', () => {
                        overlay.querySelector('h3').textContent = 'Connection failed. Check code.';
                    });
                });
                peer.on('error', (err) => {
                    overlay.querySelector('h3').textContent = 'Error: ' + (err.message || 'Try again.');
                });
                cleanupFunctions.push(() => { try { peer.destroy(); } catch (e) {} });
            });
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') goBtn.click(); });
        });
        
        btns.appendChild(createBtn);
        btns.appendChild(joinBtn);
        btns.appendChild(backBtn);
        gameContainer.appendChild(overlay);
    }
    
        function startPongAI() {
        pongGameActive = true;
        let playerY = PONG_H / 2 - PADDLE_H / 2;
        let aiY = PONG_H / 2 - PADDLE_H / 2;
        let aiTargetY = aiY;
        let ballX = PONG_W / 2;
        let ballY = PONG_H / 2;
        let ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * (BALL_SPEED_BASE / 60);
        let ballSpeedY = (Math.random() - 0.5) * (360 / 60);
        let playerScore = 0;
        let aiScore = 0;
        let pongAIOver = false;
        let pongAIWinner = '';
        
        function resetBall() {
            ballX = PONG_W / 2;
            ballY = PONG_H / 2;
            ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * (BALL_SPEED_BASE / 60);
            ballSpeedY = (Math.random() - 0.5) * (360 / 60);
        }
        
        let lastTime = performance.now();
        let ballAccum = 0;
        const BALL_DT = 1/60;
        const MAX_BALL_STEPS = 5;
        
        function update(now) {
            gameLoop = requestAnimationFrame(update);
            let dt = (now - lastTime) / 1000;
            lastTime = now;
            if (dt > 0.1) dt = BALL_DT;
            
            if (!pongGameStarted) {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, PONG_W, PONG_H);
                ctx.fillStyle = '#333';
                ctx.font = '14px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText('Rotate device to play', PONG_W / 2, PONG_H / 2);
                return;
            }
            
            if (pongAIOver) {
                drawPongField(ctx, PONG_W, PONG_H);
                ctx.font = PONG_SCORE_FONT;
                ctx.textAlign = 'center';
                ctx.fillStyle = pongAIWinner === 'YOU' ? '#00ffff' : '#ff00ff';
                ctx.fillText(pongAIWinner === 'YOU' ? 'YOU WIN!' : 'AI WINS!', PONG_W / 2, PONG_H / 2 - 30);
                ctx.font = '16px Orbitron';
                ctx.fillStyle = '#aaa';
                ctx.fillText(playerScore + ' - ' + aiScore, PONG_W / 2, PONG_H / 2 + 30);
                return;
            }
            
            if (keys['w'] || keys['W'] || keys['ArrowUp']) {
                playerY = Math.max(0, playerY - PADDLE_SPEED * dt);
            }
            if (keys['s'] || keys['S'] || keys['ArrowDown']) {
                playerY = Math.min(PONG_H - PADDLE_H, playerY + PADDLE_SPEED * dt);
            }
            /* Touch: paddle smoothly tracks finger Y */
            if (touchPaddleY !== null) {
                const target = Math.max(0, Math.min(PONG_H - PADDLE_H, touchPaddleY - PADDLE_H / 2));
                const diff = target - playerY;
                const maxMove = PADDLE_SPEED * 1.5 * dt;
                playerY += Math.max(-maxMove, Math.min(maxMove, diff));
            }
            
            const totalScore = playerScore + aiScore;
            const aiSpeedMax = 220 + Math.min(80, totalScore * 10);
            const aiSmooth = 3.5;
            if (ballSpeedX > 0) {
                const dist = (PONG_W - PADDLE_W - 20 - BALL_SIZE) - ballX;
                if (dist > 0) {
                    const t = dist / (Math.abs(ballSpeedX) * 60);
                    let targetY = ballY + ballSpeedY * 60 * t - PADDLE_H / 2;
                    targetY = Math.max(0, Math.min(PONG_H - PADDLE_H, targetY));
                    aiTargetY += (targetY - aiTargetY) * Math.min(1, 8 * dt);
                }
            } else {
                const centerY = ballY - PADDLE_H / 2;
                aiTargetY += (Math.max(0, Math.min(PONG_H - PADDLE_H, centerY)) - aiTargetY) * Math.min(1, 4 * dt);
            }
            const aiCenter = aiY + PADDLE_H / 2;
            const targetCenter = aiTargetY + PADDLE_H / 2;
            const diff = targetCenter - aiCenter;
            const move = Math.max(-aiSpeedMax * dt, Math.min(aiSpeedMax * dt, diff * aiSmooth * dt));
            aiY = Math.max(0, Math.min(PONG_H - PADDLE_H, aiY + move));
            
            ballAccum += dt;
            let steps = 0;
            let sfxWall = false, sfxPaddle = false, sfxScoreP = false, sfxScoreAI = false;
            while (ballAccum >= BALL_DT && steps < MAX_BALL_STEPS) {
                ballAccum -= BALL_DT;
                steps++;
                ballX += ballSpeedX;
                ballY += ballSpeedY;
                
                if (ballY <= 0 || ballY >= PONG_H - BALL_SIZE) {
                    ballSpeedY = -ballSpeedY;
                    sfxWall = true;
                }
                
                if (ballX <= PADDLE_W + 20 && ballY + BALL_SIZE >= playerY && ballY <= playerY + PADDLE_H && ballSpeedX < 0) {
                    ballSpeedX = -ballSpeedX;
                    ballSpeedY = (ballY - playerY) / PADDLE_H * (600 / 60) - 300 / 60;
                    sfxPaddle = true;
                }
                if (ballX >= PONG_W - PADDLE_W - 20 - BALL_SIZE && ballY + BALL_SIZE >= aiY && ballY <= aiY + PADDLE_H && ballSpeedX > 0) {
                    ballSpeedX = -ballSpeedX;
                    ballSpeedY = (ballY - aiY) / PADDLE_H * (600 / 60) - 300 / 60;
                    sfxPaddle = true;
                }
                
                if (ballX < 0) {
                    aiScore++;
                    if (aiScore >= PONG_SCORE_TO_WIN) { pongAIOver = true; pongAIWinner = 'AI'; }
                    resetBall();
                    ballAccum = 0;
                    sfxScoreAI = true;
                }
                if (ballX > PONG_W) {
                    playerScore++;
                    updateScore(playerScore);
                    if (playerScore >= PONG_SCORE_TO_WIN) { pongAIOver = true; pongAIWinner = 'YOU'; }
                    resetBall();
                    ballAccum = 0;
                    sfxScoreP = true;
                }
            }
            if (steps >= MAX_BALL_STEPS) ballAccum = 0;
            
            if (sfxWall) playSound(300, 0.05);
            if (sfxPaddle) playSound(500, 0.1);
            if (sfxScoreAI) playSound(200, 0.3);
            if (sfxScoreP) playSound(800, 0.2);
            
            ballSpeedX = Math.max(-12, Math.min(12, ballSpeedX));
            ballSpeedY = Math.max(-10, Math.min(10, ballSpeedY));
            
            drawPongField(ctx, PONG_W, PONG_H);
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(20, playerY, PADDLE_W, PADDLE_H);
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(PONG_W - PADDLE_W - 20, aiY, PADDLE_W, PADDLE_H);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ballX + BALL_SIZE/2, ballY + BALL_SIZE/2, BALL_SIZE/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = PONG_SCORE_FONT;
            ctx.fillStyle = '#00ffff';
            ctx.textAlign = 'center';
            ctx.fillText(playerScore, PONG_W / 4, 60);
            ctx.fillStyle = '#ff00ff';
            ctx.fillText(aiScore, 3 * PONG_W / 4, 60);
        }
        
        gameLoop = requestAnimationFrame(update);
    }
    
    function drawPongField(ctx, w, h) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.setLineDash(PONG_DASH);
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.setLineDash(PONG_NO_DASH);
    }
    
    function startPongOnline(conn, isHost, peerRef) {
        pongGameActive = true;
        let paddle1Y = PONG_H / 2 - PADDLE_H / 2;
        let paddle2Y = PONG_H / 2 - PADDLE_H / 2;
        let ballX = PONG_W / 2;
        let ballY = PONG_H / 2;
        let ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * (BALL_SPEED_BASE / 60);
        let ballSpeedY = (Math.random() - 0.5) * (360 / 60);
        let score1 = 0;
        let score2 = 0;
        let remotePaddle = PONG_H / 2 - PADDLE_H / 2;
        let gameOver = false;
        let winner = '';
        
        cleanupFunctions.push(() => {
            try { conn.close(); } catch (e) {}
            try { if (peerRef) peerRef.destroy(); } catch (e) {}
        });
        
        conn.on('data', (data) => {
            if (data.t === 'paddle') remotePaddle = data.y;
            if (data.t === 'state') {
                ballX = data.ballX;
                ballY = data.ballY;
                ballSpeedX = data.ballSpeedX;
                ballSpeedY = data.ballSpeedY;
                score1 = data.score1;
                score2 = data.score2;
                paddle1Y = data.paddle1Y;
                if (isHost) paddle2Y = remotePaddle;
                if (data.winner && !winner) {
                    gameOver = true;
                    winner = data.winner;
                }
            }
        });
        conn.on('close', () => { gameOver = true; });
        conn.on('error', () => { gameOver = true; });
        
        function resetBall() {
            ballX = PONG_W / 2;
            ballY = PONG_H / 2;
            ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * (BALL_SPEED_BASE / 60);
            ballSpeedY = (Math.random() - 0.5) * (360 / 60);
        }
        
        let lastTime = performance.now();
        const SEND_INTERVAL = 1/25;
        let sendAcc = 0;
        let ballAccum = 0;
        const BALL_DT = 1/60;
        const MAX_BALL_STEPS = 5;
        
        function update(now) {
            gameLoop = requestAnimationFrame(update);
            let dt = (now - lastTime) / 1000;
            lastTime = now;
            if (dt > 0.1) dt = BALL_DT;
            
            if (gameOver) {
                drawPongField(ctx, PONG_W, PONG_H);
                ctx.textAlign = 'center';
                if (winner) {
                    const iWin = (isHost && winner === 'p1') || (!isHost && winner === 'p2');
                    ctx.font = PONG_SCORE_FONT;
                    ctx.fillStyle = iWin ? '#00ffff' : '#ff00ff';
                    ctx.fillText(iWin ? 'YOU WIN!' : 'YOU LOSE!', PONG_W / 2, PONG_H / 2 - 30);
                    ctx.font = '16px Orbitron';
                    ctx.fillStyle = '#aaa';
                    ctx.fillText(score1 + ' - ' + score2, PONG_W / 2, PONG_H / 2 + 30);
                } else {
                    ctx.fillStyle = '#ff4444';
                    ctx.font = '16px Orbitron';
                    ctx.fillText('Opponent disconnected', PONG_W / 2, PONG_H / 2);
                }
                return;
            }
            
            if (keys['w'] || keys['W'] || keys['ArrowUp']) {
                if (isHost) paddle1Y = Math.max(0, paddle1Y - PADDLE_SPEED * dt);
                else paddle2Y = Math.max(0, paddle2Y - PADDLE_SPEED * dt);
            }
            if (keys['s'] || keys['S'] || keys['ArrowDown']) {
                if (isHost) paddle1Y = Math.min(PONG_H - PADDLE_H, paddle1Y + PADDLE_SPEED * dt);
                else paddle2Y = Math.min(PONG_H - PADDLE_H, paddle2Y + PADDLE_SPEED * dt);
            }
            /* Touch: paddle smoothly tracks finger Y */
            if (touchPaddleY !== null) {
                const target = Math.max(0, Math.min(PONG_H - PADDLE_H, touchPaddleY - PADDLE_H / 2));
                const maxMove = PADDLE_SPEED * 1.5 * dt;
                if (isHost) {
                    const diff = target - paddle1Y;
                    paddle1Y += Math.max(-maxMove, Math.min(maxMove, diff));
                } else {
                    const diff = target - paddle2Y;
                    paddle2Y += Math.max(-maxMove, Math.min(maxMove, diff));
                }
            }
            
            if (isHost) {
                paddle2Y = remotePaddle;
                ballAccum += dt;
                let steps = 0;
                let sfxWall = false, sfxPaddle = false, sfxScore1 = false, sfxScore2 = false;
                while (ballAccum >= BALL_DT && steps < MAX_BALL_STEPS) {
                    ballAccum -= BALL_DT;
                    steps++;
                    ballX += ballSpeedX;
                    ballY += ballSpeedY;
                    
                    if (ballY <= 0 || ballY >= PONG_H - BALL_SIZE) {
                        ballSpeedY = -ballSpeedY;
                        sfxWall = true;
                    }
                    const px = 20;
                    const ox = PONG_W - PADDLE_W - 20 - BALL_SIZE;
                    if (ballX <= px + PADDLE_W && ballY + BALL_SIZE >= paddle1Y && ballY <= paddle1Y + PADDLE_H && ballSpeedX < 0) {
                        ballSpeedX = -ballSpeedX;
                        ballSpeedY = (ballY - paddle1Y) / PADDLE_H * (600/60) - 300/60;
                        sfxPaddle = true;
                    }
                    if (ballX >= ox && ballY + BALL_SIZE >= paddle2Y && ballY <= paddle2Y + PADDLE_H && ballSpeedX > 0) {
                        ballSpeedX = -ballSpeedX;
                        ballSpeedY = (ballY - paddle2Y) / PADDLE_H * (600/60) - 300/60;
                        sfxPaddle = true;
                    }
                    if (ballX < 0) {
                        score2++;
                        if (score2 >= PONG_SCORE_TO_WIN) { gameOver = true; winner = 'p2'; }
                        resetBall();
                        ballAccum = 0;
                        sfxScore2 = true;
                    }
                    if (ballX > PONG_W) {
                        score1++;
                        updateScore(score1);
                        if (score1 >= PONG_SCORE_TO_WIN) { gameOver = true; winner = 'p1'; }
                        resetBall();
                        ballAccum = 0;
                        sfxScore1 = true;
                    }
                }
                if (steps >= MAX_BALL_STEPS) ballAccum = 0;
                
                if (sfxWall) playSound(300, 0.05);
                if (sfxPaddle) playSound(500, 0.1);
                if (sfxScore2) playSound(200, 0.3);
                if (sfxScore1) playSound(800, 0.2);
                
                ballSpeedX = Math.max(-12, Math.min(12, ballSpeedX));
                ballSpeedY = Math.max(-10, Math.min(10, ballSpeedY));
                
                sendAcc += dt;
                if (sendAcc >= SEND_INTERVAL) {
                    sendAcc = 0;
                    conn.send({ t: 'state', ballX, ballY, ballSpeedX, ballSpeedY, score1, score2, paddle1Y, paddle2Y, winner });
                }
            } else {
                /* Joiner: paddle2Y is updated by local input above (lines 467-474).
                   We just send our position to the host periodically. */
                sendAcc += dt;
                if (sendAcc >= SEND_INTERVAL) {
                    sendAcc = 0;
                    conn.send({ t: 'paddle', y: paddle2Y });
                }
            }
            
            drawPongField(ctx, PONG_W, PONG_H);
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(20, paddle1Y, PADDLE_W, PADDLE_H);
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(PONG_W - PADDLE_W - 20, paddle2Y, PADDLE_W, PADDLE_H);
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ballX + BALL_SIZE/2, ballY + BALL_SIZE/2, BALL_SIZE/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = PONG_SCORE_FONT;
            ctx.fillStyle = '#00ffff';
            ctx.textAlign = 'center';
            ctx.fillText(score1, PONG_W / 4, 60);
            ctx.fillStyle = '#ff00ff';
            ctx.fillText(score2, 3 * PONG_W / 4, 60);
        }
        
        gameLoop = requestAnimationFrame(update);
    }
    
    cleanupFunctions.push(() => {
        window.removeEventListener('blur', clearPongKeys);
        gameContainer.classList.remove('pong-landscape-layout');
        modeOverlay.remove();
        rotateOverlay.remove();
        pongGameArea.remove();
        const playArea = gameContainer.querySelector('.game-play-area');
        if (playArea) {
            playArea.appendChild(canvas);
            playArea.appendChild(touchControls);
        } else {
            gameContainer.insertBefore(canvas, gameControls);
            gameContainer.insertBefore(touchControls, gameControls);
        }
        window.removeEventListener('orientationchange', checkPongOrientation);
        window.removeEventListener('resize', checkPongOrientation);
    });
}


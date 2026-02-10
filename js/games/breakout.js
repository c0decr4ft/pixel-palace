// === BREAKOUT GAME ===
function initBreakout() {
    currentGameTitle.textContent = 'BREAKOUT';
    gameControls.innerHTML = 'Arrow Keys or Mouse to move paddle';
    
    canvas.width = 480;
    canvas.height = 500;
    
    const basePaddleWidth = 80;
    const paddleHeight = 15;
    const ballSize = 10;
    const brickWidth = 42;
    const brickHeight = 20;
    const brickPadding = 4;
    const brickOffsetTop = 50;
    const brickOffsetLeft = 10;
    const brickCols = 10;
    
    /* ---- Level progression constants ---- */
    const BASE_BALL_SPEED = 2.5;
    const SPEED_PER_LEVEL = 0.12;        // very subtle increase each level
    const MIN_PADDLE_WIDTH = basePaddleWidth;
    const PADDLE_SHRINK_PER_LEVEL = 0;   // paddle stays same size
    const MAX_BRICK_ROWS = 8;
    
    /* Color palettes that rotate each level */
    const LEVEL_PALETTES = [
        ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00ffff'],
        ['#ff00ff', '#ff0066', '#ff6600', '#ffcc00', '#66ff00'],
        ['#00ffff', '#0088ff', '#4400ff', '#aa00ff', '#ff00aa'],
        ['#ff3333', '#ff9933', '#33ff99', '#3399ff', '#9933ff'],
        ['#ffff00', '#ff00ff', '#00ffff', '#ff4444', '#44ff44'],
        ['#ff6688', '#ffaa44', '#aaffaa', '#66bbff', '#dd88ff'],
    ];
    
    let level = 1;
    let lives = 3;
    let paddleWidth = basePaddleWidth;
    let paddleX = canvas.width / 2 - paddleWidth / 2;
    let ballX, ballY, ballSpeedX, ballSpeedY;
    let gameOver = false;
    let bricks = [];
    let brickRows = 5;
    let levelTransition = 0;  // countdown timer for "LEVEL X" display
    let ballLaunched = false; // ball sticks to paddle until launched
    
    function currentBallSpeed() {
        return BASE_BALL_SPEED + (level - 1) * SPEED_PER_LEVEL;
    }
    
    function buildLevel() {
        brickRows = Math.min(MAX_BRICK_ROWS, 5 + Math.floor((level - 1) / 2));
        paddleWidth = Math.max(MIN_PADDLE_WIDTH, basePaddleWidth - (level - 1) * PADDLE_SHRINK_PER_LEVEL);
        const palette = LEVEL_PALETTES[(level - 1) % LEVEL_PALETTES.length];
        
        bricks = [];
        for (let r = 0; r < brickRows; r++) {
            bricks[r] = [];
            for (let c = 0; c < brickCols; c++) {
                /* Higher levels: top rows need 2 hits */
                const hp = (level >= 4 && r < Math.floor((level - 2) / 2) && r < 3) ? 2 : 1;
                bricks[r][c] = {
                    x: 0, y: 0,
                    status: hp,
                    maxHp: hp,
                    color: palette[r % palette.length]
                };
            }
        }
    }
    
    function resetBall(launching) {
        const spd = currentBallSpeed();
        ballX = canvas.width / 2;
        ballY = canvas.height - 50;
        ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * spd * 0.7;
        ballSpeedY = -spd;
        ballLaunched = !launching;
    }
    
    function advanceLevel() {
        level++;
        levelTransition = 2.0; // show "LEVEL X" for 2 seconds
        buildLevel();
        resetBall(true);
        paddleX = canvas.width / 2 - paddleWidth / 2;
    }
    
    // Initial setup
    buildLevel();
    resetBall(true);
    
    const keys = {};
    
    handleKeyDown = (e) => { 
        keys[e.key] = true;
        if (gameOver && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('breakout');
            return;
        }
        // Launch ball
        if (!ballLaunched && (e.key === ' ' || e.key === 'ArrowUp')) {
            e.preventDefault();
            ballLaunched = true;
            const spd = currentBallSpeed();
            ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * spd * 0.7;
            ballSpeedY = -spd;
        }
    };
    handleKeyUp = (e) => { keys[e.key] = false; };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    function clearBreakoutKeys() { keys['ArrowLeft'] = false; keys['ArrowRight'] = false; }
    window.addEventListener('blur', clearBreakoutKeys);
    
    function setPaddleFromEvent(e) {
        const coords = getEventCanvasCoords(e);
        if (!coords) return;
        paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, coords.x - paddleWidth / 2));
        // Touch also launches ball
        if (!ballLaunched) {
            ballLaunched = true;
            const spd = currentBallSpeed();
            ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * spd * 0.7;
            ballSpeedY = -spd;
        }
    }
    canvas.onmousemove = (e) => {
        const coords = getEventCanvasCoords(e);
        if (!coords) return;
        paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, coords.x - paddleWidth / 2));
    };
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length) { e.preventDefault(); setPaddleFromEvent(e); }
    }, { passive: false });
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length) { e.preventDefault(); setPaddleFromEvent(e); }
    }, { passive: false });
    
    let lastTime = performance.now();
    const PADDLE_SPEED = 320;
    const BALL_DT = 1/60;
    const MAX_BALL_STEPS = 5;
    let ballAccum = 0;
    
    function update(now) {
        gameLoop = requestAnimationFrame(update);
        
        let dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = BALL_DT;
        
        /* Level transition countdown */
        if (levelTransition > 0) {
            levelTransition -= dt;
            drawScene();
            // Draw level banner
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80);
            ctx.fillStyle = '#00ffff';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('LEVEL ' + level, canvas.width / 2, canvas.height / 2 + 8);
            return;
        }
        
        if (keys['ArrowLeft']) paddleX = Math.max(0, paddleX - PADDLE_SPEED * dt);
        if (keys['ArrowRight']) paddleX = Math.min(canvas.width - paddleWidth, paddleX + PADDLE_SPEED * dt);
        
        /* Ball sticks to paddle before launch */
        if (!ballLaunched) {
            ballX = paddleX + paddleWidth / 2;
            ballY = canvas.height - paddleHeight - 20 - ballSize - 2;
            drawScene();
            // Prompt
            ctx.fillStyle = '#aaa';
            ctx.font = '9px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('TAP or SPACE to launch', canvas.width / 2, canvas.height / 2 + 60);
            return;
        }
        
        if (!gameOver) {
            ballAccum += dt;
            let steps = 0;
            while (ballAccum >= BALL_DT && steps < MAX_BALL_STEPS) {
                ballAccum -= BALL_DT;
                steps++;
                ballX += ballSpeedX;
                ballY += ballSpeedY;
                
                // Wall collisions
                if (ballX <= 0 || ballX >= canvas.width - ballSize) {
                    ballSpeedX = -ballSpeedX;
                    ballX = Math.max(ballSize, Math.min(canvas.width - ballSize * 2, ballX));
                    playSound(300, 0.05);
                }
                if (ballY <= 0) {
                    ballSpeedY = -ballSpeedY;
                    ballY = ballSize + 1;
                    playSound(300, 0.05);
                }
                
                // Paddle collision
                if (ballY >= canvas.height - paddleHeight - 20 - ballSize &&
                    ballX >= paddleX && ballX <= paddleX + paddleWidth) {
                    ballSpeedY = -Math.abs(ballSpeedY);
                    const hitPos = (ballX - paddleX) / paddleWidth;
                    const spd = currentBallSpeed();
                    ballSpeedX = (hitPos - 0.5) * (spd * 2.4);
                    ballY = canvas.height - paddleHeight - 20 - ballSize - 1;
                    playSound(500, 0.1);
                }
                
                // Bottom - lose a life
                if (ballY > canvas.height) {
                    lives--;
                    if (lives <= 0) {
                        gameOver = true;
                        playGameOverJingle();
                    } else {
                        playSound(200, 0.3);
                        resetBall(true);
                        ballAccum = 0;
                    }
                    break;
                }
                
                // Brick collision
                let brickHit = false;
                for (let r = 0; r < brickRows && !brickHit; r++) {
                    for (let c = 0; c < brickCols && !brickHit; c++) {
                        const brick = bricks[r][c];
                        if (brick.status > 0) {
                            const bX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                            const bY = r * (brickHeight + brickPadding) + brickOffsetTop;
                            brick.x = bX; brick.y = bY;
                            if (ballX >= bX && ballX <= bX + brickWidth &&
                                ballY >= bY && ballY <= bY + brickHeight) {
                                ballSpeedY = -ballSpeedY;
                                brick.status--;
                                brickHit = true;
                                if (ballSpeedY > 0) ballY = bY + brickHeight + ballSize + 1;
                                else ballY = bY - ballSize - 1;
                                updateScore(score + 10 * level);
                                playSound(600 + r * 100, 0.1);
                            }
                        }
                    }
                }
            }
            
            // Check level clear
            if (!gameOver) {
                let bricksLeft = 0;
                for (let r = 0; r < brickRows; r++)
                    for (let c = 0; c < brickCols; c++)
                        if (bricks[r][c].status > 0) bricksLeft++;
                if (bricksLeft === 0) {
                    playSound(1000, 0.3);
                    advanceLevel();
                }
            }
        }
        
        drawScene();
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '26px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
            ctx.fillStyle = '#aaa';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Level ' + level + '  Score ' + score, canvas.width / 2, canvas.height / 2 + 20);
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Press SPACE to restart', canvas.width / 2, canvas.height / 2 + 50);
        }
    }
    
    function drawScene() {
        ctx.fillStyle = '#000011';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // HUD — level and lives
        ctx.fillStyle = '#00ffff';
        ctx.font = '9px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText('LV ' + level, 8, 16);
        ctx.textAlign = 'right';
        let heartsStr = '';
        for (let i = 0; i < lives; i++) heartsStr += '\u2665 ';
        ctx.fillStyle = '#ff4466';
        ctx.fillText(heartsStr, canvas.width - 8, 16);
        
        // Bricks
        for (let r = 0; r < brickRows; r++) {
            for (let c = 0; c < brickCols; c++) {
                const brick = bricks[r][c];
                if (brick.status > 0) {
                    const bX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                    const bY = r * (brickHeight + brickPadding) + brickOffsetTop;
                    ctx.fillStyle = brick.color;
                    // Dim bricks that have been hit once (2-hp bricks)
                    if (brick.maxHp === 2 && brick.status === 1) ctx.globalAlpha = 0.55;
                    ctx.fillRect(bX, bY, brickWidth, brickHeight);
                    ctx.globalAlpha = 1;
                    // Top highlight
                    ctx.globalAlpha = 0.3;
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(bX, bY, brickWidth, 2);
                    ctx.globalAlpha = 1;
                    // 2-hp indicator: inner border
                    if (brick.maxHp === 2 && brick.status === 2) {
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(bX + 2, bY + 2, brickWidth - 4, brickHeight - 4);
                    }
                }
            }
        }
        
        // Paddle glow
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(paddleX - 2, canvas.height - paddleHeight - 22, paddleWidth + 4, paddleHeight + 4);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(paddleX, canvas.height - paddleHeight - 20, paddleWidth, paddleHeight);
        
        // Ball glow
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballSize + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    gameLoop = requestAnimationFrame(update);
    cleanupFunctions.push(() => { window.removeEventListener('blur', clearBreakoutKeys); });
}

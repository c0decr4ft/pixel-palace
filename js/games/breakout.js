// === BREAKOUT GAME ===
function initBreakout() {
    currentGameTitle.textContent = 'BREAKOUT';
    gameControls.innerHTML = 'Arrow Keys or Mouse to move paddle';
    
    canvas.width = 480;
    canvas.height = 500;
    
    const paddleWidth = 80;
    const paddleHeight = 15;
    const ballSize = 10;
    const brickRows = 5;
    const brickCols = 10;
    const brickWidth = 42;
    const brickHeight = 20;
    const brickPadding = 4;
    const brickOffsetTop = 50;
    const brickOffsetLeft = 10;
    
    let paddleX = canvas.width / 2 - paddleWidth / 2;
    let ballX = canvas.width / 2;
    let ballY = canvas.height - 50;
    let ballSpeedX = 2.5;
    let ballSpeedY = -2.5;
    let gameOver = false;
    let win = false;
    
    const brickColors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00ffff'];
    
    let bricks = [];
    for (let r = 0; r < brickRows; r++) {
        bricks[r] = [];
        for (let c = 0; c < brickCols; c++) {
            bricks[r][c] = { x: 0, y: 0, status: 1, color: brickColors[r] };
        }
    }
    
    const keys = {};
    
    handleKeyDown = (e) => { 
        keys[e.key] = true;
        // Restart on space when game over or win
        if ((gameOver || win) && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('breakout');
            return;
        }
    };
    handleKeyUp = (e) => { keys[e.key] = false; };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    function clearBreakoutKeys() { keys['ArrowLeft'] = false; keys['ArrowRight'] = false; }
    window.addEventListener('blur', clearBreakoutKeys);
    
    function setPaddleFromClientX(clientX) {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width) return;
        const scaleX = canvas.width / rect.width;
        const canvasX = (clientX - rect.left) * scaleX;
        paddleX = Math.max(0, Math.min(canvas.width - paddleWidth, canvasX - paddleWidth / 2));
    }
    canvas.onmousemove = (e) => setPaddleFromClientX(e.clientX);
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length) {
            e.preventDefault();
            setPaddleFromClientX(e.touches[0].clientX);
        }
    }, { passive: false });
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length) {
            e.preventDefault();
            setPaddleFromClientX(e.touches[0].clientX);
        }
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
        
        if (keys['ArrowLeft']) paddleX = Math.max(0, paddleX - PADDLE_SPEED * dt);
        if (keys['ArrowRight']) paddleX = Math.min(canvas.width - paddleWidth, paddleX + PADDLE_SPEED * dt);
        
        if (!gameOver && !win) {
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
                    ballSpeedX = (hitPos - 0.5) * 6;
                    ballY = canvas.height - paddleHeight - 20 - ballSize - 1;
                    playSound(500, 0.1);
                }
                
                // Bottom - game over
                if (ballY > canvas.height) {
                    gameOver = true;
                    playSound(100, 0.5);
                }
                
                // Brick collision (first hit only per step, then nudge ball out so it doesn't re-hit)
                let brickHit = false;
                for (let r = 0; r < brickRows && !brickHit; r++) {
                    for (let c = 0; c < brickCols && !brickHit; c++) {
                        const brick = bricks[r][c];
                        if (brick.status === 1) {
                            const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                            const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                            brick.x = brickX;
                            brick.y = brickY;
                            if (ballX >= brickX && ballX <= brickX + brickWidth &&
                                ballY >= brickY && ballY <= brickY + brickHeight) {
                                ballSpeedY = -ballSpeedY;
                                brick.status = 0;
                                brickHit = true;
                                if (ballSpeedY > 0) ballY = brickY + brickHeight + ballSize + 1;
                                else ballY = brickY - ballSize - 1;
                                updateScore(score + 10);
                                playSound(600 + r * 100, 0.1);
                            }
                        }
                    }
                }
            }
            if (!gameOver && !win) {
                let bricksLeft = 0;
                for (let r = 0; r < brickRows; r++)
                    for (let c = 0; c < brickCols; c++)
                        if (bricks[r][c].status === 1) bricksLeft++;
                if (bricksLeft === 0) {
                    win = true;
                    playSound(1000, 0.5);
                }
            }
        }
        
        // Draw
        ctx.fillStyle = '#000011';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw bricks (no shadowBlur — expensive on mobile)
        for (let r = 0; r < brickRows; r++) {
            for (let c = 0; c < brickCols; c++) {
                const brick = bricks[r][c];
                if (brick.status === 1) {
                    const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                    const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                    ctx.fillStyle = brick.color;
                    ctx.fillRect(brickX, brickY, brickWidth, brickHeight);
                    // Subtle highlight on top edge
                    ctx.globalAlpha = 0.3;
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(brickX, brickY, brickWidth, 2);
                    ctx.globalAlpha = 1;
                }
            }
        }
        
        // Paddle — glow via layered rects
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(paddleX - 2, canvas.height - paddleHeight - 22, paddleWidth + 4, paddleHeight + 4);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(paddleX, canvas.height - paddleHeight - 20, paddleWidth, paddleHeight);
        
        // Ball — glow via layered circles
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
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '30px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 40);
        }
        
        if (win) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff00';
            ctx.font = '30px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('YOU WIN!', canvas.width/2, canvas.height/2);
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText('Press SPACE to play again', canvas.width/2, canvas.height/2 + 40);
        }
    }
    
    gameLoop = requestAnimationFrame(update);
    cleanupFunctions.push(() => { window.removeEventListener('blur', clearBreakoutKeys); });
}


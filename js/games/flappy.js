// === FLAPPY BIRD ===
function initFlappy() {
    currentGameTitle.textContent = 'FLAPPY PIXEL';
    gameControls.innerHTML = 'SPACE or Click to flap';
    
    canvas.width = 200;
    canvas.height = 350;
    
    const birdSize = 20;
    let birdY = canvas.height / 2;
    let birdVelocity = 0;
    const gravity = 0.5;
    const flapStrength = -10;
    
    const pipeWidth = 40;
    const pipeGap = 130;
    let pipes = [];
    let gameOver = false;
    let started = false;
    
    let pipeSpawnAccum = 0;
    const pipeSpawnIntervalSec = 2;
    
    function spawnPipe() {
        const minHeight = 60;
        const maxHeight = canvas.height - pipeGap - minHeight;
        const height = Math.random() * (maxHeight - minHeight) + minHeight;
        if (pipes.length < 10) {
            pipes.push({
                x: canvas.width,
                topHeight: height,
                passed: false
            });
        }
    }
    
    function flap() {
        if (gameOver) return;
        if (!started) started = true;
        birdVelocity = flapStrength;
        playSound(400, 0.1);
    }
    
    handleKeyDown = (e) => {
        if (e.key === ' ') {
            e.preventDefault();
            // Restart on space when game over
            if (gameOver) {
                stopGame();
                startGame('flappy');
                return;
            }
            flap();
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    canvas.onclick = () => {
        if (gameOver) {
            stopGame();
            startGame('flappy');
            return;
        }
        flap();
    };
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameOver) {
            stopGame();
            startGame('flappy');
            return;
        }
        flap();
    }, { passive: false });
    
    spawnPipe();
    
    let lastTime = performance.now();
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#0a0630');
    bgGradient.addColorStop(0.4, '#001533');
    bgGradient.addColorStop(1, '#002244');
    
    const STEP_DT = 1/60;
    const MAX_STEPS = 5;
    const PIPE_SPEED_PER_STEP = 180 * STEP_DT;
    let accum = 0;
    let gameOverSoundPlayed = false;
    
    function update(now) {
        gameLoop = requestAnimationFrame(update);
        
        let dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = STEP_DT;
        
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Stars (two layers)
        for (let i = 0; i < 45; i++) {
            const x = (i * 47) % canvas.width;
            const y = (i * 83) % canvas.height;
            const a = 0.15 + (i % 3) * 0.15;
            ctx.fillStyle = `rgba(255,255,255,${a})`;
            ctx.fillRect(x, y, 1, 1);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (let i = 0; i < 20; i++) {
            ctx.fillRect((i * 61) % canvas.width, (i * 97) % canvas.height, 2, 2);
        }
        
        if (started && !gameOver) {
            accum += dt;
            let steps = 0;
            while (accum >= STEP_DT && steps < MAX_STEPS) {
                accum -= STEP_DT;
                steps++;
                birdVelocity += gravity;
                birdY += birdVelocity;
                
                // Spawn pipes every N seconds (fixed step)
                pipeSpawnAccum += STEP_DT;
                if (pipeSpawnAccum >= pipeSpawnIntervalSec) {
                    pipeSpawnAccum = 0;
                    spawnPipe();
                }
                
                // Move pipes (fixed speed per step)
                pipes = pipes.filter(pipe => {
                    pipe.x -= PIPE_SPEED_PER_STEP;
                    return pipe.x > -pipeWidth;
                });
                
                const birdX = 64;
                
                // Ground/ceiling - clamp and game over
                if (birdY < 0) {
                    birdY = 0;
                    gameOver = true;
                    if (!gameOverSoundPlayed) { gameOverSoundPlayed = true; playSound(100, 0.5); }
                }
                if (birdY > canvas.height - birdSize) {
                    birdY = canvas.height - birdSize;
                    gameOver = true;
                    if (!gameOverSoundPlayed) { gameOverSoundPlayed = true; playSound(100, 0.5); }
                }
                
                // Pipes - one collision per step, then stop so we don't re-trigger
                if (!gameOver) {
                    for (let pipe of pipes) {
                        if (birdX + birdSize > pipe.x && birdX < pipe.x + pipeWidth) {
                            if (birdY < pipe.topHeight || birdY + birdSize > pipe.topHeight + pipeGap) {
                                gameOver = true;
                                if (!gameOverSoundPlayed) { gameOverSoundPlayed = true; playSound(100, 0.5); }
                                break;
                            }
                        }
                        if (!pipe.passed && pipe.x + pipeWidth < birdX) {
                            pipe.passed = true;
                            updateScore(score + 1);
                            playSound(600, 0.1);
                        }
                    }
                }
            }
        }
        
        // Ground strip
        const groundY = canvas.height - 28;
        ctx.fillStyle = '#1a4d1a';
        ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
        ctx.fillStyle = '#2d6b2d';
        for (let i = 0; i < canvas.width; i += 24) ctx.fillRect(i, groundY, 12, 4);
        
        for (let pipe of pipes) {
            const capH = 24;
            const rim = 4;
            const bottomY = pipe.topHeight + pipeGap;
            // Pipe body - darker base
            ctx.fillStyle = '#0d5c0d';
            ctx.fillRect(pipe.x + rim, 0, pipeWidth - rim * 2, pipe.topHeight);
            ctx.fillRect(pipe.x + rim, bottomY, pipeWidth - rim * 2, canvas.height - bottomY);
            // Pipe fill with highlight
            ctx.fillStyle = '#00aa00';
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 6;
            ctx.fillRect(pipe.x + rim, 0, pipeWidth - rim * 2, pipe.topHeight - capH);
            ctx.fillRect(pipe.x + rim, bottomY + capH, pipeWidth - rim * 2, canvas.height - bottomY - capH);
            // Top cap
            ctx.fillStyle = '#008800';
            ctx.fillRect(pipe.x - 4, pipe.topHeight - capH, pipeWidth + 8, capH);
            ctx.fillStyle = '#00cc00';
            ctx.fillRect(pipe.x, pipe.topHeight - capH + 4, pipeWidth, capH - 6);
            // Bottom cap
            ctx.fillStyle = '#008800';
            ctx.fillRect(pipe.x - 4, bottomY, pipeWidth + 8, capH);
            ctx.fillStyle = '#00cc00';
            ctx.fillRect(pipe.x, bottomY + 4, pipeWidth, capH - 6);
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        ctx.fillStyle = '#ffdd00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 8;
        
        const birdX = 64;
        const rotation = Math.min(Math.max(birdVelocity * 3, -30), 90);
        
        ctx.save();
        ctx.translate(birdX + birdSize/2, birdY + birdSize/2);
        ctx.rotate(rotation * Math.PI / 180);
        
        // Bird body
        ctx.beginPath();
        ctx.arc(0, 0, birdSize/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,200,0.4)';
        ctx.beginPath();
        ctx.arc(-4, 4, birdSize/4, 0, Math.PI * 2);
        ctx.fill();
        // Wing
        ctx.fillStyle = '#e6c200';
        ctx.beginPath();
        ctx.ellipse(-6, 2, 6, 10, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(6, -4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(7, -5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Beak
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(20, 0);
        ctx.lineTo(12, 6);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        ctx.shadowBlur = 0;
        
        // Instructions
        if (!started) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('TAP TO START', canvas.width/2, canvas.height/2 + 50);
        }
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '18px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 20);
            ctx.font = '11px "Press Start 2P"';
            ctx.fillStyle = '#fff';
            ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 8);
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 36);
        }
    }
    
    gameLoop = requestAnimationFrame(update);
}


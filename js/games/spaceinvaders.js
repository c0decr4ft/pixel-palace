// === SPACE INVADERS ===
function initSpaceInvaders() {
    currentGameTitle.textContent = 'SPACE INVADERS';
    gameControls.innerHTML = '← → Move | SPACE Shoot';
    
    canvas.width = 560;
    canvas.height = 440;
    
    const playerWidth = 44;
    const playerHeight = 26;
    let playerX = canvas.width / 2 - playerWidth / 2;
    
    const invaderRows = 4;
    const invaderCols = 8;
    const invaderWidth = 36;
    const invaderHeight = 26;
    const invaderPadding = 12;
    
    let invaders = [];
    let invaderDirection = 1;
    let invaderSpeed = 1;
    let bullets = [];
    let enemyBullets = [];
    let gameOver = false;
    let win = false;
    
    const INVADER_COLORS = ['#ff4444', '#ffaa00', '#00ff88', '#00ccff'];
    
    for (let r = 0; r < invaderRows; r++) {
        for (let c = 0; c < invaderCols; c++) {
            invaders.push({
                x: c * (invaderWidth + invaderPadding) + 44,
                y: r * (invaderHeight + invaderPadding) + 40,
                alive: true,
                row: r
            });
        }
    }
    
    const keys = {};
    
    function doFire() {
        if (!gameOver && !win) {
            bullets.push({ x: playerX + playerWidth / 2, y: canvas.height - 52 });
            playSound(400, 0.1);
        }
    }
    handleKeyDown = (e) => {
        keys[e.key] = true;
        // Restart on space when game over or win
        if ((gameOver || win) && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('spaceinvaders');
            return;
        }
        if (e.key === ' ' && !gameOver && !win) doFire();
    };
    handleKeyUp = (e) => { keys[e.key] = false; };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    const touchKeys = {};
    addTouchDpad({
        onLeft: (p) => { touchKeys['ArrowLeft'] = p; },
        onRight: (p) => { touchKeys['ArrowRight'] = p; },
        onAction: doFire,
        actionLabel: 'FIRE'
    });
    function clearSpaceKeys() {
        keys['ArrowLeft'] = keys['ArrowRight'] = keys[' '] = false;
        touchKeys['ArrowLeft'] = touchKeys['ArrowRight'] = false;
    }
    window.addEventListener('blur', clearSpaceKeys);
    
    let lastEnemyShot = 0;
    let lastTime = performance.now();
    const PLAYER_SPEED = 360;
    const BULLET_SPEED = 480;
    const ENEMY_BULLET_SPEED = 300;
    const STEP_DT = 1/60;
    const MAX_STEPS = 5;
    let accum = 0;
    let enemyShotAccum = 0;
    
    function update(currentTime) {
        gameLoop = requestAnimationFrame(update);
        
        let dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        if (dt > 0.1) dt = STEP_DT;
        
        if (!gameOver && !win) {
            // Player movement (delta-time for responsiveness)
            if (keys['ArrowLeft'] || touchKeys['ArrowLeft']) playerX = Math.max(0, playerX - PLAYER_SPEED * dt);
            if (keys['ArrowRight'] || touchKeys['ArrowRight']) playerX = Math.min(canvas.width - playerWidth, playerX + PLAYER_SPEED * dt);
            
            let aliveInvaders = invaders.filter(inv => inv.alive);
            if (aliveInvaders.length === 0) {
                win = true;
                playSound(1000, 0.5);
            }
            
            // Fixed timestep for invaders, bullets, enemy bullets (smooth speed)
            accum += dt;
            enemyShotAccum += dt;
            let steps = 0;
            while (accum >= STEP_DT && steps < MAX_STEPS) {
                accum -= STEP_DT;
                steps++;
                
                // Move invaders one fixed step
                let moveDown = false;
                for (let inv of aliveInvaders) {
                    if ((inv.x <= 0 && invaderDirection < 0) || 
                        (inv.x >= canvas.width - invaderWidth && invaderDirection > 0)) {
                        moveDown = true;
                        break;
                    }
                }
                if (moveDown) {
                    invaderDirection = -invaderDirection;
                    for (let inv of invaders) {
                        inv.y += 20;
                        if (inv.alive && inv.y > canvas.height - 88) {
                            gameOver = true;
                            playSound(100, 0.5);
                        }
                    }
                } else {
                    for (let inv of invaders) {
                        inv.x += invaderDirection * invaderSpeed;
                    }
                }
                
                // Move bullets
                const bulletMove = BULLET_SPEED * STEP_DT;
                bullets = bullets.filter(b => {
                    b.y -= bulletMove;
                    return b.y > 0;
                });
                
                const enemyBulletMove = ENEMY_BULLET_SPEED * STEP_DT;
                enemyBullets = enemyBullets.filter(b => {
                    b.y += enemyBulletMove;
                    return b.y < canvas.height;
                });
            }
            
            // Enemy shooting (fixed interval)
            if (enemyShotAccum >= 1.5 && aliveInvaders.length > 0) {
                enemyShotAccum = 0;
                const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
                enemyBullets.push({ x: shooter.x + invaderWidth / 2, y: shooter.y + invaderHeight });
            }
            
            // Bullet-invader collision
            for (let bullet of bullets) {
                for (let inv of invaders) {
                    if (inv.alive &&
                        bullet.x >= inv.x && bullet.x <= inv.x + invaderWidth &&
                        bullet.y >= inv.y && bullet.y <= inv.y + invaderHeight) {
                        inv.alive = false;
                        bullet.y = -100;
                        updateScore(score + 20);
                        playSound(600, 0.1);
                    }
                }
            }
            
            // Enemy bullet-player collision
            for (let bullet of enemyBullets) {
                if (bullet.x >= playerX && bullet.x <= playerX + playerWidth &&
                    bullet.y >= canvas.height - 46 && bullet.y <= canvas.height - 18) {
                    gameOver = true;
                    playSound(100, 0.5);
                }
            }
        }
        
        // Draw
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#050510');
        bgGrad.addColorStop(0.6, '#0a0a1a');
        bgGrad.addColorStop(1, '#0d0d25');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Starfield - two layers
        const t = currentTime * 0.002;
        for (let i = 0; i < 60; i++) {
            const x = (i * 73) % canvas.width;
            const y = (i * 97 + Math.floor(t + i) % 100) % (canvas.height - 50);
            const bright = 0.2 + (i % 4) * 0.2;
            ctx.fillStyle = `rgba(200,220,255,${bright})`;
            ctx.fillRect(x, y, 1, 1);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 25; i++) {
            ctx.fillRect((i * 113) % canvas.width, (i * 67) % (canvas.height - 50), 2, 2);
        }
        
        // Ground line (base)
        const baseY = canvas.height - 22;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, baseY);
        ctx.lineTo(canvas.width, baseY);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Draw invaders - classic pixel look with row colors
        for (let inv of invaders) {
            if (inv.alive) {
                const color = INVADER_COLORS[inv.row % INVADER_COLORS.length];
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = 8;
                const w = invaderWidth - 8;
                const h = invaderHeight - 8;
                const cx = inv.x + invaderWidth / 2;
                ctx.fillRect(inv.x + 4, inv.y + 4, w, h);
                ctx.fillRect(inv.x, inv.y + 12, 6, 10);
                ctx.fillRect(inv.x + invaderWidth - 6, inv.y + 12, 6, 10);
                ctx.fillRect(inv.x + 10, inv.y + invaderHeight - 6, 8, 4);
                ctx.fillRect(inv.x + invaderWidth - 18, inv.y + invaderHeight - 6, 8, 4);
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fillRect(inv.x + 8, inv.y + 6, 6, 4);
            }
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        // Player ship - neon style
        const shipY = canvas.height - 24;
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(playerX + playerWidth / 2, shipY - 22);
        ctx.lineTo(playerX + 4, shipY);
        ctx.lineTo(playerX + playerWidth / 2 - 6, shipY - 8);
        ctx.lineTo(playerX + playerWidth / 2, shipY);
        ctx.lineTo(playerX + playerWidth / 2 + 6, shipY - 8);
        ctx.lineTo(playerX + playerWidth - 4, shipY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.moveTo(playerX + playerWidth / 2 - 4, shipY - 14);
        ctx.lineTo(playerX + playerWidth / 2, shipY - 18);
        ctx.lineTo(playerX + playerWidth / 2 + 4, shipY - 14);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ffff00';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ffff00';
        for (let bullet of bullets) {
            ctx.fillRect(bullet.x - 2, bullet.y, 4, 12);
        }
        
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff4444';
        for (let bullet of enemyBullets) {
            ctx.fillRect(bullet.x - 2, bullet.y, 4, 12);
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 32);
        }
        
        if (win) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#00ff00';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('YOU WIN!', canvas.width/2, canvas.height/2);
            ctx.fillStyle = '#ffff00';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Press SPACE to play again', canvas.width/2, canvas.height/2 + 32);
        }
    }
    
    gameLoop = requestAnimationFrame(update);
    cleanupFunctions.push(() => { window.removeEventListener('blur', clearSpaceKeys); });
}


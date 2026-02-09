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
    let lastFireTime = 0;
    const FIRE_COOLDOWN = 0.28; // seconds between shots (auto-fire rate)
    let touchFiring = false;
    let touchFireTimer = null;
    
    function doFire() {
        const now = performance.now() / 1000;
        if (!gameOver && !win && now - lastFireTime >= FIRE_COOLDOWN) {
            lastFireTime = now;
            bullets.push({ x: playerX + playerWidth / 2, y: canvas.height - 52 });
            playSound(400, 0.1);
        }
    }
    handleKeyDown = (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
        }
        keys[e.key] = true;
        // Restart on space when game over or win
        if ((gameOver || win) && e.key === ' ') {
            stopGame();
            startGame('spaceinvaders');
            return;
        }
    };
    handleKeyUp = (e) => { keys[e.key] = false; };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    const touchKeys = {};
    function startTouchFire() {
        if (touchFiring) return;
        touchFiring = true;
        doFire();
        touchFireTimer = setInterval(function() {
            if (touchFiring) doFire();
        }, FIRE_COOLDOWN * 1000);
    }
    function stopTouchFire() {
        touchFiring = false;
        if (touchFireTimer) { clearInterval(touchFireTimer); touchFireTimer = null; }
    }
    addTouchDpad({
        onLeft: (p) => { touchKeys['ArrowLeft'] = p; },
        onRight: (p) => { touchKeys['ArrowRight'] = p; },
        onAction: startTouchFire,
        onActionEnd: stopTouchFire,
        actionLabel: 'FIRE'
    });
    function clearSpaceKeys() {
        keys['ArrowLeft'] = keys['ArrowRight'] = keys[' '] = false;
        touchKeys['ArrowLeft'] = touchKeys['ArrowRight'] = false;
        stopTouchFire();
    }
    window.addEventListener('blur', clearSpaceKeys);
    
    // --- Classic pixel-art invader sprites (binary bitmaps) ---
    const PX = 3; // pixel block size
    const SPRITE_SQUID = [ // 8 wide x 8 tall
        [0,0,0,1,1,0,0,0],
        [0,0,1,1,1,1,0,0],
        [0,1,1,1,1,1,1,0],
        [1,1,0,1,1,0,1,1],
        [1,1,1,1,1,1,1,1],
        [0,0,1,0,0,1,0,0],
        [0,1,0,1,1,0,1,0],
        [1,0,1,0,0,1,0,1],
    ];
    const SPRITE_CRAB = [ // 11 wide x 8 tall
        [0,0,1,0,0,0,0,0,1,0,0],
        [0,0,0,1,0,0,0,1,0,0,0],
        [0,0,1,1,1,1,1,1,1,0,0],
        [0,1,1,0,1,1,1,0,1,1,0],
        [1,1,1,1,1,1,1,1,1,1,1],
        [1,0,1,1,1,1,1,1,1,0,1],
        [1,0,1,0,0,0,0,0,1,0,1],
        [0,0,0,1,1,0,1,1,0,0,0],
    ];
    const SPRITE_OCTO = [ // 12 wide x 8 tall
        [0,0,0,0,1,1,1,1,0,0,0,0],
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,0,0,1,1,0,0,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [0,0,1,1,1,0,0,1,1,1,0,0],
        [0,1,1,0,0,1,1,0,0,1,1,0],
        [1,1,0,0,0,0,0,0,0,0,1,1],
    ];
    const SPRITES = [SPRITE_SQUID, SPRITE_CRAB, SPRITE_CRAB, SPRITE_OCTO];

    function drawSprite(sprite, sx, sy, color) {
        ctx.fillStyle = color;
        for (let r = 0; r < sprite.length; r++) {
            const row = sprite[r];
            for (let c = 0; c < row.length; c++) {
                if (row[c]) ctx.fillRect(sx + c * PX, sy + r * PX, PX, PX);
            }
        }
    }

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
            
            // Auto-fire while holding space
            if (keys[' ']) doFire();
            
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
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Starfield
        for (let i = 0; i < 50; i++) {
            const sx = (i * 73 + 11) % canvas.width;
            const sy = (i * 97 + 7) % (canvas.height - 50);
            const a = 0.15 + (i % 4) * 0.15;
            ctx.fillStyle = 'rgba(200,220,255,' + a + ')';
            ctx.fillRect(sx, sy, (i % 5 === 0) ? 2 : 1, (i % 5 === 0) ? 2 : 1);
        }
        
        // Ground line
        const baseY = canvas.height - 22;
        ctx.fillStyle = '#00cccc';
        ctx.fillRect(0, baseY, canvas.width, 2);
        ctx.fillStyle = 'rgba(0,204,204,0.15)';
        ctx.fillRect(0, baseY + 2, canvas.width, 4);
        
        // Draw invaders
        for (let inv of invaders) {
            if (inv.alive) {
                const color = INVADER_COLORS[inv.row % INVADER_COLORS.length];
                const sprite = SPRITES[inv.row % SPRITES.length];
                const spriteW = sprite[0].length * PX;
                const spriteH = sprite.length * PX;
                const ox = inv.x + (invaderWidth - spriteW) / 2;
                const oy = inv.y + (invaderHeight - spriteH) / 2;
                drawSprite(sprite, ox, oy, color);
                // Subtle glow: redraw slightly larger behind, semi-transparent
                ctx.globalAlpha = 0.12;
                ctx.fillStyle = color;
                for (let r = 0; r < sprite.length; r++) {
                    for (let c = 0; c < sprite[r].length; c++) {
                        if (sprite[r][c]) ctx.fillRect(ox + c * PX - 1, oy + r * PX - 1, PX + 2, PX + 2);
                    }
                }
                ctx.globalAlpha = 1;
            }
        }
        
        // Player ship — classic pixel-art cannon
        const shipY = canvas.height - 44;
        const sp = playerX;
        // Ship glow (subtle)
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(sp, shipY + 14, playerWidth, 12);
        ctx.globalAlpha = 1;
        // Ship body
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(sp + 2, shipY + 16, playerWidth - 4, 8);  // base
        ctx.fillRect(sp + 6, shipY + 10, playerWidth - 12, 6); // mid
        ctx.fillRect(sp + 10, shipY + 6, playerWidth - 20, 4); // upper
        ctx.fillRect(sp + playerWidth / 2 - 3, shipY, 6, 6);   // cannon
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(sp + 8, shipY + 12, 4, 2);
        ctx.fillRect(sp + playerWidth / 2 - 1, shipY + 1, 2, 4);
        
        // Player bullets
        ctx.fillStyle = '#ffffff';
        for (let bullet of bullets) {
            ctx.fillRect(bullet.x - 1, bullet.y, 3, 10);
        }
        // Bullet glow
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#aaffff';
        for (let bullet of bullets) {
            ctx.fillRect(bullet.x - 2, bullet.y - 1, 5, 12);
        }
        ctx.globalAlpha = 1;
        
        // Enemy bullets
        ctx.fillStyle = '#ff4466';
        for (let bullet of enemyBullets) {
            ctx.fillRect(bullet.x - 1, bullet.y, 3, 10);
        }
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ff4466';
        for (let bullet of enemyBullets) {
            ctx.fillRect(bullet.x - 2, bullet.y - 1, 5, 12);
        }
        ctx.globalAlpha = 1;
        
        // Score display at top
        ctx.fillStyle = '#00ffcc';
        ctx.font = '12px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText('SCORE', 12, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('' + score, 12, 34);
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff3366';
            ctx.font = '28px "Press Start 2P"';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 16);
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 14);
            ctx.fillStyle = '#ffcc00';
            ctx.font = '9px "Press Start 2P"';
            ctx.fillText('SPACE to restart', canvas.width / 2, canvas.height / 2 + 40);
        }
        
        if (win) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#00ff88';
            ctx.font = '28px "Press Start 2P"';
            ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2 - 16);
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 14);
            ctx.fillStyle = '#ffcc00';
            ctx.font = '9px "Press Start 2P"';
            ctx.fillText('SPACE to play again', canvas.width / 2, canvas.height / 2 + 40);
        }
    }
    
    gameLoop = requestAnimationFrame(update);
    cleanupFunctions.push(() => { stopTouchFire(); window.removeEventListener('blur', clearSpaceKeys); });
}


// === SPACE INVADERS ===
function initSpaceInvaders() {
    currentGameTitle.textContent = 'SPACE INVADERS';
    gameControls.innerHTML = '← → Move | SPACE Shoot';
    
    canvas.width = 560;
    canvas.height = 440;
    
    const playerWidth = 44;
    const playerHeight = 26;
    let playerX = canvas.width / 2 - playerWidth / 2;
    
    const invaderWidth = 36;
    const invaderHeight = 26;
    const invaderPadding = 12;
    
    /* ---- Wave / difficulty progression ---- */
    let wave = 1;
    const BASE_INVADER_SPEED = 1;
    const SPEED_PER_WAVE = 0.15;          // subtle speed bump each wave
    const BASE_SHOT_INTERVAL = 1.5;       // seconds between enemy shots
    const SHOT_INTERVAL_REDUCE = 0.08;    // shoots faster each wave
    const MIN_SHOT_INTERVAL = 0.4;
    const BASE_ENEMY_BULLET_SPEED = 180;
    const ENEMY_BULLET_SPEED_PER_WAVE = 8;
    const BASE_INVADER_ROWS = 4;
    const BASE_INVADER_COLS = 8;
    const MAX_INVADER_ROWS = 6;
    const MAX_INVADER_COLS = 10;
    
    let invaders = [];
    let invaderDirection = 1;
    let invaderSpeed;
    let bullets = [];
    let enemyBullets = [];
    let gameOver = false;
    let waveTransition = 0;
    let invaderRows, invaderCols;
    let enemyShotInterval, enemyBulletSpeed;
    
    const INVADER_COLORS = ['#ff4444', '#ffaa00', '#00ff88', '#00ccff', '#ff66ff', '#ffff44'];
    
    function buildWave() {
        invaderRows = Math.min(MAX_INVADER_ROWS, BASE_INVADER_ROWS + Math.floor((wave - 1) / 3));
        invaderCols = Math.min(MAX_INVADER_COLS, BASE_INVADER_COLS + Math.floor((wave - 1) / 4));
        invaderSpeed = BASE_INVADER_SPEED + (wave - 1) * SPEED_PER_WAVE;
        enemyShotInterval = Math.max(MIN_SHOT_INTERVAL, BASE_SHOT_INTERVAL - (wave - 1) * SHOT_INTERVAL_REDUCE);
        enemyBulletSpeed = BASE_ENEMY_BULLET_SPEED + (wave - 1) * ENEMY_BULLET_SPEED_PER_WAVE;
        
        invaders = [];
        invaderDirection = 1;
        const startX = Math.max(20, (canvas.width - invaderCols * (invaderWidth + invaderPadding)) / 2);
        for (let r = 0; r < invaderRows; r++) {
            for (let c = 0; c < invaderCols; c++) {
                invaders.push({
                    x: c * (invaderWidth + invaderPadding) + startX,
                    y: r * (invaderHeight + invaderPadding) + 40,
                    alive: true,
                    row: r
                });
            }
        }
        bullets = [];
        enemyBullets = [];
    }
    
    function advanceWave() {
        wave++;
        waveTransition = 2.0;
        buildWave();
        playerX = canvas.width / 2 - playerWidth / 2;
    }
    
    // Initial setup
    buildWave();
    
    const keys = {};
    let lastFireTime = 0;
    const FIRE_COOLDOWN = 0.28;
    let touchFiring = false;
    let touchFireTimer = null;
    
    function doFire() {
        const now = performance.now() / 1000;
        if (!gameOver && waveTransition <= 0 && now - lastFireTime >= FIRE_COOLDOWN) {
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
        if (gameOver && e.key === ' ') {
            stopGame();
            startGame('spaceinvaders');
            return;
        }
    };
    handleKeyUp = (e) => { keys[e.key] = false; };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    const touchKeys = {};

    /* Touch: hold left/right half of screen to move, auto-fire always on */
    let siTouchId = null;
    let siAutoFireTimer = null;
    const isTouch = matchMedia('(pointer: coarse)').matches;

    function onSITouchStart(e) {
        if (e.touches.length < 1) return;
        e.preventDefault();
        siTouchId = e.touches[0].identifier;
        updateSITouch(e.touches[0]);
        // Start auto-fire on first touch
        if (!siAutoFireTimer && isTouch) {
            doFire();
            siAutoFireTimer = setInterval(doFire, FIRE_COOLDOWN * 1000);
        }
    }
    function onSITouchMove(e) {
        if (siTouchId === null) return;
        e.preventDefault();
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === siTouchId) {
                updateSITouch(e.touches[i]);
                return;
            }
        }
    }
    function onSITouchEnd(e) {
        if (e.touches.length === 0) {
            siTouchId = null;
            touchKeys['ArrowLeft'] = false;
            touchKeys['ArrowRight'] = false;
        } else {
            // Switch to remaining touch
            siTouchId = e.touches[0].identifier;
            updateSITouch(e.touches[0]);
        }
    }
    function updateSITouch(touch) {
        const screenMid = window.innerWidth / 2;
        if (touch.clientX < screenMid) {
            touchKeys['ArrowLeft'] = true;
            touchKeys['ArrowRight'] = false;
        } else {
            touchKeys['ArrowRight'] = true;
            touchKeys['ArrowLeft'] = false;
        }
    }
    function stopSIAutoFire() {
        if (siAutoFireTimer) { clearInterval(siAutoFireTimer); siAutoFireTimer = null; }
    }

    if (isTouch) {
        const siTarget = gameContainer || canvas;
        siTarget.addEventListener('touchstart', onSITouchStart, { passive: false });
        siTarget.addEventListener('touchmove', onSITouchMove, { passive: false });
        siTarget.addEventListener('touchend', onSITouchEnd, { passive: false });
        siTarget.addEventListener('touchcancel', onSITouchEnd, { passive: false });
        cleanupFunctions.push(() => {
            siTarget.removeEventListener('touchstart', onSITouchStart);
            siTarget.removeEventListener('touchmove', onSITouchMove);
            siTarget.removeEventListener('touchend', onSITouchEnd);
            siTarget.removeEventListener('touchcancel', onSITouchEnd);
            stopSIAutoFire();
        });
    }

    function clearSpaceKeys() {
        keys['ArrowLeft'] = keys['ArrowRight'] = keys[' '] = false;
        touchKeys['ArrowLeft'] = touchKeys['ArrowRight'] = false;
        stopSIAutoFire();
    }
    window.addEventListener('blur', clearSpaceKeys);
    
    // --- Classic pixel-art invader sprites (binary bitmaps) ---
    const PX = 3;
    const SPRITE_SQUID = [
        [0,0,0,1,1,0,0,0],
        [0,0,1,1,1,1,0,0],
        [0,1,1,1,1,1,1,0],
        [1,1,0,1,1,0,1,1],
        [1,1,1,1,1,1,1,1],
        [0,0,1,0,0,1,0,0],
        [0,1,0,1,1,0,1,0],
        [1,0,1,0,0,1,0,1],
    ];
    const SPRITE_CRAB = [
        [0,0,1,0,0,0,0,0,1,0,0],
        [0,0,0,1,0,0,0,1,0,0,0],
        [0,0,1,1,1,1,1,1,1,0,0],
        [0,1,1,0,1,1,1,0,1,1,0],
        [1,1,1,1,1,1,1,1,1,1,1],
        [1,0,1,1,1,1,1,1,1,0,1],
        [1,0,1,0,0,0,0,0,1,0,1],
        [0,0,0,1,1,0,1,1,0,0,0],
    ];
    const SPRITE_OCTO = [
        [0,0,0,0,1,1,1,1,0,0,0,0],
        [0,1,1,1,1,1,1,1,1,1,1,0],
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,0,0,1,1,0,0,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1],
        [0,0,1,1,1,0,0,1,1,1,0,0],
        [0,1,1,0,0,1,1,0,0,1,1,0],
        [1,1,0,0,0,0,0,0,0,0,1,1],
    ];
    const SPRITES = [SPRITE_SQUID, SPRITE_CRAB, SPRITE_CRAB, SPRITE_OCTO, SPRITE_SQUID, SPRITE_CRAB];

    // Player ship sprite
    const SHIP_SPRITE = [
        [0,0,0,0,0,0,2,2,0,0,0,0,0,0],
        [0,0,0,0,0,1,2,2,1,0,0,0,0,0],
        [0,0,0,0,1,1,1,1,1,1,0,0,0,0],
        [0,0,0,1,1,1,1,1,1,1,1,0,0,0],
        [0,0,1,1,1,2,2,2,2,1,1,1,0,0],
        [0,1,1,1,1,1,1,1,1,1,1,1,1,0],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,1,1,0,1,1,0,1,1,0,0,1],
        [0,0,0,0,3,0,3,3,0,3,0,0,0,0],
    ];
    const SHIP_COLORS = { 1: '#00ffcc', 2: '#aaffff', 3: '#ff8800' };

    function drawSprite(sprite, sx, sy, color) {
        ctx.fillStyle = color;
        for (let r = 0; r < sprite.length; r++) {
            const row = sprite[r];
            for (let c = 0; c < row.length; c++) {
                if (row[c]) ctx.fillRect(sx + c * PX, sy + r * PX, PX, PX);
            }
        }
    }

    function drawShip(sx, sy, time) {
        for (let r = 0; r < SHIP_SPRITE.length; r++) {
            const row = SHIP_SPRITE[r];
            for (let c = 0; c < row.length; c++) {
                const v = row[c];
                if (!v) continue;
                if (v === 3) {
                    const flicker = 0.6 + 0.4 * Math.sin(time * 12 + c * 2);
                    ctx.globalAlpha = flicker;
                    ctx.fillStyle = '#ff8800';
                    ctx.fillRect(sx + c * PX, sy + r * PX, PX, PX);
                    ctx.globalAlpha = flicker * 0.5;
                    ctx.fillStyle = '#ffcc00';
                    ctx.fillRect(sx + c * PX, sy + r * PX + PX, PX, PX * 0.6);
                    ctx.globalAlpha = 1;
                } else {
                    ctx.fillStyle = SHIP_COLORS[v];
                    ctx.fillRect(sx + c * PX, sy + r * PX, PX, PX);
                }
            }
        }
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx + 6 * PX, sy + 4 * PX, PX, PX);
        ctx.fillRect(sx + 7 * PX, sy + 0 * PX, PX, PX);
        ctx.globalAlpha = 1;
    }

    let lastEnemyShot = 0;
    let lastTime = performance.now();
    const PLAYER_SPEED = 240;
    const BULLET_SPEED = 320;
    const STEP_DT = 1/60;
    const MAX_STEPS = 5;
    let accum = 0;
    let enemyShotAccum = 0;
    
    function update(currentTime) {
        gameLoop = requestAnimationFrame(update);
        
        let dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        if (dt > 0.1) dt = STEP_DT;
        
        /* Wave transition countdown */
        if (waveTransition > 0) {
            waveTransition -= dt;
            drawScene(currentTime);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80);
            ctx.fillStyle = '#00ff88';
            ctx.font = '22px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('WAVE ' + wave, canvas.width / 2, canvas.height / 2 + 8);
            return;
        }
        
        if (!gameOver) {
            if (keys['ArrowLeft'] || touchKeys['ArrowLeft']) playerX = Math.max(0, playerX - PLAYER_SPEED * dt);
            if (keys['ArrowRight'] || touchKeys['ArrowRight']) playerX = Math.min(canvas.width - playerWidth, playerX + PLAYER_SPEED * dt);
            
            if (keys[' ']) doFire();
            
            let aliveInvaders = invaders.filter(inv => inv.alive);
            if (aliveInvaders.length === 0) {
                playSound(1000, 0.3);
                advanceWave();
                drawScene(currentTime);
                return;
            }
            
            accum += dt;
            enemyShotAccum += dt;
            let steps = 0;
            while (accum >= STEP_DT && steps < MAX_STEPS) {
                accum -= STEP_DT;
                steps++;
                
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
                        inv.y += 18;
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
                
                const bulletMove = BULLET_SPEED * STEP_DT;
                bullets = bullets.filter(b => { b.y -= bulletMove; return b.y > 0; });
                
                const enemyBulletMove = enemyBulletSpeed * STEP_DT;
                enemyBullets = enemyBullets.filter(b => { b.y += enemyBulletMove; return b.y < canvas.height; });
            }
            
            // Enemy shooting
            if (enemyShotAccum >= enemyShotInterval && aliveInvaders.length > 0) {
                enemyShotAccum = 0;
                const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
                enemyBullets.push({ x: shooter.x + invaderWidth / 2, y: shooter.y + invaderHeight });
                // Extra shooters at higher waves
                if (wave >= 3 && Math.random() < 0.3 && aliveInvaders.length > 1) {
                    const s2 = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
                    enemyBullets.push({ x: s2.x + invaderWidth / 2, y: s2.y + invaderHeight });
                }
                if (wave >= 6 && Math.random() < 0.25 && aliveInvaders.length > 2) {
                    const s3 = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
                    enemyBullets.push({ x: s3.x + invaderWidth / 2, y: s3.y + invaderHeight });
                }
            }
            
            // Bullet-invader collision
            for (let bullet of bullets) {
                for (let inv of invaders) {
                    if (inv.alive &&
                        bullet.x >= inv.x && bullet.x <= inv.x + invaderWidth &&
                        bullet.y >= inv.y && bullet.y <= inv.y + invaderHeight) {
                        inv.alive = false;
                        bullet.y = -100;
                        updateScore(score + 20 + (wave - 1) * 5);
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
        
        drawScene(currentTime);
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff3366';
            ctx.font = '28px "Press Start 2P"';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 16);
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText('Wave ' + wave + '  Score ' + score, canvas.width / 2, canvas.height / 2 + 14);
            ctx.fillStyle = '#ffcc00';
            ctx.font = '9px "Press Start 2P"';
            ctx.fillText('SPACE to restart', canvas.width / 2, canvas.height / 2 + 40);
        }
    }
    
    function drawScene(currentTime) {
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
        
        // Invaders
        for (let inv of invaders) {
            if (inv.alive) {
                const color = INVADER_COLORS[inv.row % INVADER_COLORS.length];
                const sprite = SPRITES[inv.row % SPRITES.length];
                const spriteW = sprite[0].length * PX;
                const spriteH = sprite.length * PX;
                const ox = inv.x + (invaderWidth - spriteW) / 2;
                const oy = inv.y + (invaderHeight - spriteH) / 2;
                drawSprite(sprite, ox, oy, color);
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
        
        // Player ship
        const shipSpriteW = SHIP_SPRITE[0].length * PX;
        const shipSpriteH = SHIP_SPRITE.length * PX;
        const shipX = playerX + (playerWidth - shipSpriteW) / 2;
        const shipY = canvas.height - 44;
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(shipX - 2, shipY + 6, shipSpriteW + 4, shipSpriteH - 6);
        ctx.globalAlpha = 1;
        drawShip(shipX, shipY, currentTime / 1000);
        
        // Player bullets
        ctx.fillStyle = '#ffffff';
        for (let bullet of bullets) ctx.fillRect(bullet.x - 1, bullet.y, 3, 10);
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#aaffff';
        for (let bullet of bullets) ctx.fillRect(bullet.x - 2, bullet.y - 1, 5, 12);
        ctx.globalAlpha = 1;
        
        // Enemy bullets
        ctx.fillStyle = '#ff4466';
        for (let bullet of enemyBullets) ctx.fillRect(bullet.x - 1, bullet.y, 3, 10);
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ff4466';
        for (let bullet of enemyBullets) ctx.fillRect(bullet.x - 2, bullet.y - 1, 5, 12);
        ctx.globalAlpha = 1;
        
        // HUD
        ctx.fillStyle = '#00ffcc';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText('WAVE ' + wave, 12, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'right';
        ctx.fillText('' + score, canvas.width - 12, 18);
    }
    
    gameLoop = requestAnimationFrame(update);
    cleanupFunctions.push(() => { stopTouchFire(); window.removeEventListener('blur', clearSpaceKeys); });
}

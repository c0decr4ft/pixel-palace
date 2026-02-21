// === NEON RACER — Endless top-down highway dodge ===

function initRacer() {
    currentGameTitle.textContent = 'NEON RACER';
    gameControls.innerHTML = 'Dodge traffic and survive as long as you can!';

    const W = 300, H = 500;
    canvas.width = W;
    canvas.height = H;

    const LANE_COUNT = 4;
    const LANE_W = 52;
    const ROAD_L = (W - LANE_COUNT * LANE_W) / 2;
    const ROAD_R = ROAD_L + LANE_COUNT * LANE_W;

    const CAR_W = 30;
    const CAR_H = 52;
    const PLAYER_Y = H - CAR_H - 40;

    const BG = '#0a0018';
    const ROAD_COL = '#111125';
    const LINE_COL = 'rgba(255,255,255,0.15)';
    const EDGE_COL = '#ff00ff';
    const PLAYER_COL = '#0ff0fc';
    const BOOST_COL = '#ffd700';

    // Speed / difficulty
    const BASE_SPEED = 220;
    const MAX_SPEED = 600;
    const ACCEL = 0.4;

    // Traffic
    const TRAFFIC_COLORS = ['#ff3c7f', '#ff6622', '#cc33ff', '#22ff66', '#ffaa00'];
    const MIN_SPAWN_GAP = 180;
    const MAX_TRAFFIC = 6;

    // State
    let playerX, speed, dist, gameOver, cars, dashes, boosts;
    let spawnTimer, nextSpawn, lastTime;
    let steerLeft, steerRight;
    let touchStartX, touchCurrentX;

    function reset() {
        playerX = ROAD_L + (LANE_COUNT * LANE_W) / 2 - CAR_W / 2;
        speed = BASE_SPEED;
        dist = 0;
        gameOver = false;
        cars = [];
        boosts = [];
        dashes = [];
        spawnTimer = 0;
        nextSpawn = 0.6;
        lastTime = -1;
        steerLeft = false;
        steerRight = false;
        touchStartX = null;
        touchCurrentX = null;

        // Pre-fill road dashes
        for (let y = 0; y < H; y += 40) {
            dashes.push(y);
        }
    }

    // ── Drawing helpers ──
    function drawCar(x, y, w, h, color, isPlayer) {
        // Body
        ctx.fillStyle = color;
        const r = 4;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.fill();

        // Windshield
        ctx.fillStyle = isPlayer ? 'rgba(0,255,252,0.3)' : 'rgba(255,255,255,0.2)';
        ctx.fillRect(x + 5, y + 6, w - 10, 12);

        // Taillights (on traffic) / headlights (on player)
        if (isPlayer) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 3, y, 5, 4);
            ctx.fillRect(x + w - 8, y, 5, 4);
        } else {
            ctx.fillStyle = '#ff2222';
            ctx.fillRect(x + 3, y + h - 4, 5, 4);
            ctx.fillRect(x + w - 8, y + h - 4, 5, 4);
        }

        // Glow underneath
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = color;
        ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
        ctx.globalAlpha = 1;
    }

    function drawBoost(b) {
        ctx.fillStyle = BOOST_COL;
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(Date.now() / 150);
        ctx.beginPath();
        ctx.moveTo(b.x + 10, b.y);
        ctx.lineTo(b.x + 20, b.y + 10);
        ctx.lineTo(b.x + 15, b.y + 10);
        ctx.lineTo(b.x + 18, b.y + 22);
        ctx.lineTo(b.x + 8, b.y + 12);
        ctx.lineTo(b.x + 13, b.y + 12);
        ctx.lineTo(b.x + 10, b.y);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // ── Spawn traffic ──
    function spawnCar() {
        if (cars.length >= MAX_TRAFFIC) return;
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const x = ROAD_L + lane * LANE_W + (LANE_W - CAR_W) / 2;
        // Don't spawn on top of another car
        for (const c of cars) {
            if (Math.abs(c.x - x) < CAR_W && c.y < 60) return;
        }
        const trafficSpeed = speed * (0.4 + Math.random() * 0.35);
        cars.push({
            x,
            y: -CAR_H - 10,
            speed: trafficSpeed,
            color: TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)]
        });
    }

    function spawnBoost() {
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const x = ROAD_L + lane * LANE_W + (LANE_W - 20) / 2;
        boosts.push({ x, y: -30 });
    }

    // ── Collision ──
    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    // ── Main update ──
    function update(now) {
        gameLoop = requestAnimationFrame(update);
        if (lastTime < 0) lastTime = now;
        let dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = 1 / 60;

        if (!gameOver) {
            // Steer
            const steerSpeed = 280;
            if (steerLeft) playerX -= steerSpeed * dt;
            if (steerRight) playerX += steerSpeed * dt;

            // Touch drag steering
            if (touchStartX !== null && touchCurrentX !== null) {
                const dx = touchCurrentX - touchStartX;
                const sens = 1.4;
                playerX = Math.max(ROAD_L + 2, Math.min(ROAD_R - CAR_W - 2,
                    ROAD_L + (LANE_COUNT * LANE_W) / 2 - CAR_W / 2 + dx * sens));
            } else {
                playerX = Math.max(ROAD_L + 2, Math.min(ROAD_R - CAR_W - 2, playerX));
            }

            // Speed up gradually
            speed = Math.min(MAX_SPEED, speed + ACCEL * dt * 60);
            dist += speed * dt;
            updateScore(Math.floor(dist / 10));

            // Road dashes
            for (let i = dashes.length - 1; i >= 0; i--) {
                dashes[i] += speed * dt;
                if (dashes[i] > H + 20) dashes[i] -= H + 60;
            }

            // Traffic
            spawnTimer += dt;
            const gap = Math.max(0.25, nextSpawn - speed * 0.0004);
            if (spawnTimer >= gap) {
                spawnTimer = 0;
                nextSpawn = 0.4 + Math.random() * 0.4;
                spawnCar();
                if (Math.random() < 0.12) spawnBoost();
            }

            for (let i = cars.length - 1; i >= 0; i--) {
                const c = cars[i];
                c.y += (speed - c.speed) * dt;
                if (c.y > H + 60) { cars.splice(i, 1); continue; }
                if (rectsOverlap(playerX, PLAYER_Y, CAR_W, CAR_H, c.x, c.y, CAR_W, CAR_H)) {
                    gameOver = true;
                    playGameOverJingle();
                }
            }

            // Boosts
            for (let i = boosts.length - 1; i >= 0; i--) {
                boosts[i].y += speed * dt;
                if (boosts[i].y > H + 30) { boosts.splice(i, 1); continue; }
                if (rectsOverlap(playerX, PLAYER_Y, CAR_W, CAR_H,
                                 boosts[i].x, boosts[i].y, 20, 22)) {
                    boosts.splice(i, 1);
                    updateScore(score + 50);
                    playSound(900, 0.1);
                }
            }
        }

        // ── Draw ──
        // Sky / background
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, W, H);

        // Road
        ctx.fillStyle = ROAD_COL;
        ctx.fillRect(ROAD_L, 0, LANE_COUNT * LANE_W, H);

        // Road edges (neon glow)
        ctx.fillStyle = EDGE_COL;
        ctx.fillRect(ROAD_L - 3, 0, 3, H);
        ctx.fillRect(ROAD_R, 0, 3, H);
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = EDGE_COL;
        ctx.fillRect(ROAD_L - 8, 0, 8, H);
        ctx.fillRect(ROAD_R, 0, 8, H);
        ctx.globalAlpha = 1;

        // Lane dashes
        ctx.fillStyle = LINE_COL;
        for (let l = 1; l < LANE_COUNT; l++) {
            const lx = ROAD_L + l * LANE_W - 1;
            for (const dy of dashes) {
                ctx.fillRect(lx, dy, 2, 18);
            }
        }

        // Boosts
        for (const b of boosts) drawBoost(b);

        // Traffic cars
        for (const c of cars) drawCar(c.x, c.y, CAR_W, CAR_H, c.color, false);

        // Player car
        drawCar(playerX, PLAYER_Y, CAR_W, CAR_H, PLAYER_COL, true);

        // Roadside scenery — simple neon dots scrolling
        ctx.globalAlpha = 0.3;
        for (const dy of dashes) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(ROAD_L - 18, dy + 5, 4, 4);
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(ROAD_R + 14, dy + 5, 4, 4);
        }
        ctx.globalAlpha = 1;

        // Speed indicator
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(Math.floor(speed) + ' KPH', 8, H - 8);

        // HUD — distance
        ctx.textAlign = 'right';
        ctx.fillText(Math.floor(dist / 10) + ' m', W - 8, H - 8);

        // Game over
        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff00ff';
            ctx.font = '22px "Press Start 2P"';
            ctx.fillText('CRASH!', W / 2, H / 2 - 40);
            ctx.fillStyle = '#0ff0fc';
            ctx.font = '11px "Press Start 2P"';
            ctx.fillText('SCORE: ' + score, W / 2, H / 2 - 6);
            ctx.fillStyle = '#fff';
            ctx.font = '10px "Press Start 2P"';
            ctx.fillText(Math.floor(dist / 10) + ' m  |  ' + Math.floor(speed) + ' KPH', W / 2, H / 2 + 18);
            ctx.fillStyle = '#ffd700';
            ctx.font = '9px "Press Start 2P"';
            ctx.fillText('SPACE / TAP TO RETRY', W / 2, H / 2 + 46);
        }
    }

    // ── Keyboard ──
    handleKeyDown = (e) => {
        if (gameOver && e.key === ' ') {
            e.preventDefault();
            reset();
            return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'a') { steerLeft = true; e.preventDefault(); }
        if (e.key === 'ArrowRight' || e.key === 'd') { steerRight = true; e.preventDefault(); }
    };
    function onKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a') steerLeft = false;
        if (e.key === 'ArrowRight' || e.key === 'd') steerRight = false;
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', onKeyUp);
    cleanupFunctions.push(() => {
        document.removeEventListener('keyup', onKeyUp);
    });

    // ── Touch controls — direct drag ──
    function onTouchStart(e) {
        if (typeof isTouchOnUI === 'function' && isTouchOnUI(e)) return;
        e.preventDefault();
        if (gameOver) { reset(); return; }
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchCurrentX = t.clientX;
    }
    function onTouchMove(e) {
        if (touchStartX === null) return;
        e.preventDefault();
        touchCurrentX = e.touches[0].clientX;
    }
    function onTouchEnd() {
        touchStartX = null;
        touchCurrentX = null;
    }

    const target = gameContainer || canvas;
    target.addEventListener('touchstart', onTouchStart, { passive: false });
    target.addEventListener('touchmove', onTouchMove, { passive: false });
    target.addEventListener('touchend', onTouchEnd, { passive: true });
    target.addEventListener('touchcancel', onTouchEnd, { passive: true });
    cleanupFunctions.push(() => {
        target.removeEventListener('touchstart', onTouchStart);
        target.removeEventListener('touchmove', onTouchMove);
        target.removeEventListener('touchend', onTouchEnd);
        target.removeEventListener('touchcancel', onTouchEnd);
    });

    // ── Start ──
    reset();
    startArcadeMusic('racer');
    gameLoop = requestAnimationFrame(update);
}

// === NEON RACER — Endless top-down highway lane-dodge ===

function initRacer() {
    currentGameTitle.textContent = 'NEON RACER';
    gameControls.innerHTML = 'Dodge traffic — tap sides or use arrow keys to switch lanes!';

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

    const BASE_SPEED = 220;
    const MAX_SPEED = 600;
    const ACCEL = 0.4;

    const TRAFFIC_COLORS = ['#ff3c7f', '#ff6622', '#cc33ff', '#22ff66', '#ffaa00'];
    const MIN_SPAWN_GAP = 180;
    const MAX_TRAFFIC = 6;

    const LANE_SWITCH_SPEED = 12;

    let currentLane, targetX, playerX, speed, dist, gameOver;
    let cars, dashes, boosts;
    let spawnTimer, nextSpawn, lastTime;

    function laneX(lane) {
        return ROAD_L + lane * LANE_W + (LANE_W - CAR_W) / 2;
    }

    function reset() {
        currentLane = Math.floor(LANE_COUNT / 2);
        playerX = laneX(currentLane);
        targetX = playerX;
        speed = BASE_SPEED;
        dist = 0;
        gameOver = false;
        cars = [];
        boosts = [];
        dashes = [];
        spawnTimer = 0;
        nextSpawn = 0.6;
        lastTime = -1;

        for (let y = 0; y < H; y += 40) {
            dashes.push(y);
        }
    }

    function moveLeft() {
        if (gameOver) return;
        if (currentLane > 0) {
            currentLane--;
            targetX = laneX(currentLane);
        }
    }

    function moveRight() {
        if (gameOver) return;
        if (currentLane < LANE_COUNT - 1) {
            currentLane++;
            targetX = laneX(currentLane);
        }
    }

    function drawCar(x, y, w, h, color, isPlayer) {
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

        ctx.fillStyle = isPlayer ? 'rgba(0,255,252,0.3)' : 'rgba(255,255,255,0.2)';
        ctx.fillRect(x + 5, y + 6, w - 10, 12);

        if (isPlayer) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 3, y, 5, 4);
            ctx.fillRect(x + w - 8, y, 5, 4);
        } else {
            ctx.fillStyle = '#ff2222';
            ctx.fillRect(x + 3, y + h - 4, 5, 4);
            ctx.fillRect(x + w - 8, y + h - 4, 5, 4);
        }

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

    function spawnCar() {
        if (cars.length >= MAX_TRAFFIC) return;
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const x = laneX(lane);
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

    function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function update(now) {
        gameLoop = requestAnimationFrame(update);
        if (lastTime < 0) { lastTime = now; return; }
        let dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = 1 / 60;

        if (!gameOver) {
            // Smooth lane-snap movement
            const diff = targetX - playerX;
            if (Math.abs(diff) > 0.5) {
                playerX += diff * LANE_SWITCH_SPEED * dt;
            } else {
                playerX = targetX;
            }

            speed = Math.min(MAX_SPEED, speed + ACCEL * dt * 60);
            dist += speed * dt;
            updateScore(Math.floor(dist / 10));

            for (let i = dashes.length - 1; i >= 0; i--) {
                dashes[i] += speed * dt;
                if (dashes[i] > H + 20) dashes[i] -= H + 60;
            }

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
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = ROAD_COL;
        ctx.fillRect(ROAD_L, 0, LANE_COUNT * LANE_W, H);

        ctx.fillStyle = EDGE_COL;
        ctx.fillRect(ROAD_L - 3, 0, 3, H);
        ctx.fillRect(ROAD_R, 0, 3, H);
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = EDGE_COL;
        ctx.fillRect(ROAD_L - 8, 0, 8, H);
        ctx.fillRect(ROAD_R, 0, 8, H);
        ctx.globalAlpha = 1;

        ctx.fillStyle = LINE_COL;
        for (let l = 1; l < LANE_COUNT; l++) {
            const lx = ROAD_L + l * LANE_W - 1;
            for (const dy of dashes) {
                ctx.fillRect(lx, dy, 2, 18);
            }
        }

        for (const b of boosts) drawBoost(b);
        for (const c of cars) drawCar(c.x, c.y, CAR_W, CAR_H, c.color, false);
        drawCar(playerX, PLAYER_Y, CAR_W, CAR_H, PLAYER_COL, true);

        // Roadside neon dots
        ctx.globalAlpha = 0.3;
        for (const dy of dashes) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(ROAD_L - 18, dy + 5, 4, 4);
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(ROAD_R + 14, dy + 5, 4, 4);
        }
        ctx.globalAlpha = 1;

        // Lane arrows (subtle hint showing which lane you're in)
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = PLAYER_COL;
        const arrowX = laneX(currentLane) + CAR_W / 2;
        for (let ay = PLAYER_Y - 30; ay > 0; ay -= 50) {
            ctx.beginPath();
            ctx.moveTo(arrowX, ay);
            ctx.lineTo(arrowX - 6, ay + 10);
            ctx.lineTo(arrowX + 6, ay + 10);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // HUD
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(Math.floor(speed) + ' KPH', 8, H - 8);
        ctx.textAlign = 'right';
        ctx.fillText(Math.floor(dist / 10) + ' m', W - 8, H - 8);

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
    handleKeyDown = function(e) {
        if (gameOver && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault();
            reset();
            return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); moveLeft(); }
        if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); moveRight(); }
    };
    document.addEventListener('keydown', handleKeyDown);

    // ── Touch controls — tap left/right half of canvas ──
    const target = gameContainer || canvas;

    function onTouchStart(e) {
        if (typeof isTouchOnUI === 'function' && isTouchOnUI(e)) return;
        e.preventDefault();
        if (gameOver) { reset(); return; }

        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const tapX = touch.clientX - rect.left;
        const midX = rect.width / 2;

        if (tapX < midX) {
            moveLeft();
        } else {
            moveRight();
        }
    }

    target.addEventListener('touchstart', onTouchStart, { passive: false });
    cleanupFunctions.push(function() {
        target.removeEventListener('touchstart', onTouchStart);
    });

    // ── Start ──
    reset();
    gameLoop = requestAnimationFrame(update);
}

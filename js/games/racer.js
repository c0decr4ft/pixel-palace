// === NEON RACER — Endless top-down lane-dodge ===

function initRacer() {
    currentGameTitle.textContent = 'NEON RACER';
    gameControls.innerHTML = 'Dodge traffic &mdash; tap sides or arrow keys to switch lanes!';

    var W = 300, H = 500;
    canvas.width = W;
    canvas.height = H;

    var LANE_COUNT = 4;
    var LANE_W = 52;
    var ROAD_L = (W - LANE_COUNT * LANE_W) / 2;
    var ROAD_R = ROAD_L + LANE_COUNT * LANE_W;

    var CAR_W = 30;
    var CAR_H = 52;
    var PLAYER_Y = H - CAR_H - 40;

    var BG = '#0a0018';
    var ROAD_COL = '#111125';
    var LINE_COL = 'rgba(255,255,255,0.15)';
    var EDGE_COL = '#ff00ff';
    var PLAYER_COL = '#0ff0fc';
    var BOOST_COL = '#ffd700';

    var BASE_SPEED = 220;
    var MAX_SPEED = 600;
    var ACCEL = 0.4;

    var TRAFFIC_COLORS = ['#ff3c7f', '#ff6622', '#cc33ff', '#22ff66', '#ffaa00'];
    var MAX_TRAFFIC = 6;
    var LANE_LERP = 12;

    var currentLane, targetX, playerX, speed, dist, dead;
    var cars, dashes, boosts;
    var spawnTimer, nextSpawn, lastTime;

    function laneCenter(lane) {
        return ROAD_L + lane * LANE_W + (LANE_W - CAR_W) / 2;
    }

    function reset() {
        currentLane = Math.floor(LANE_COUNT / 2);
        targetX = laneCenter(currentLane);
        playerX = targetX;
        speed = BASE_SPEED;
        dist = 0;
        dead = false;
        cars = [];
        boosts = [];
        dashes = [];
        spawnTimer = 0;
        nextSpawn = 0.6;
        lastTime = -1;
        for (var y = 0; y < H; y += 40) dashes.push(y);
        score = 0;
        updateScore(0);
    }

    function moveLeft() {
        if (dead || currentLane <= 0) return;
        currentLane--;
        targetX = laneCenter(currentLane);
        playSound(440, 0.04);
    }

    function moveRight() {
        if (dead || currentLane >= LANE_COUNT - 1) return;
        currentLane++;
        targetX = laneCenter(currentLane);
        playSound(440, 0.04);
    }

    // --- Drawing ---
    function drawCar(x, y, w, h, color, isPlayer) {
        ctx.fillStyle = color;
        var r = 4;
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

    // --- Spawning ---
    function spawnCar() {
        if (cars.length >= MAX_TRAFFIC) return;
        var lane = Math.floor(Math.random() * LANE_COUNT);
        var x = laneCenter(lane);
        for (var i = 0; i < cars.length; i++) {
            if (Math.abs(cars[i].x - x) < CAR_W && cars[i].y < 60) return;
        }
        cars.push({
            x: x,
            y: -CAR_H - 10,
            speed: speed * (0.4 + Math.random() * 0.35),
            color: TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)]
        });
    }

    function spawnBoost() {
        var lane = Math.floor(Math.random() * LANE_COUNT);
        boosts.push({ x: ROAD_L + lane * LANE_W + (LANE_W - 20) / 2, y: -30 });
    }

    function rectsHit(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    // --- Main loop ---
    function update(now) {
        gameLoop = requestAnimationFrame(update);
        if (lastTime < 0) { lastTime = now; return; }
        var dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = 1 / 60;

        if (!dead) {
            var diff = targetX - playerX;
            if (Math.abs(diff) > 0.5) {
                playerX += diff * LANE_LERP * dt;
            } else {
                playerX = targetX;
            }

            speed = Math.min(MAX_SPEED, speed + ACCEL * dt * 60);
            dist += speed * dt;
            updateScore(Math.floor(dist / 10));

            for (var i = dashes.length - 1; i >= 0; i--) {
                dashes[i] += speed * dt;
                if (dashes[i] > H + 20) dashes[i] -= H + 60;
            }

            spawnTimer += dt;
            var gap = Math.max(0.25, nextSpawn - speed * 0.0004);
            if (spawnTimer >= gap) {
                spawnTimer = 0;
                nextSpawn = 0.4 + Math.random() * 0.4;
                spawnCar();
                if (Math.random() < 0.12) spawnBoost();
            }

            for (var i = cars.length - 1; i >= 0; i--) {
                var c = cars[i];
                c.y += (speed - c.speed) * dt;
                if (c.y > H + 60) { cars.splice(i, 1); continue; }
                if (rectsHit(playerX, PLAYER_Y, CAR_W, CAR_H, c.x, c.y, CAR_W, CAR_H)) {
                    dead = true;
                    playGameOverJingle();
                }
            }

            for (var i = boosts.length - 1; i >= 0; i--) {
                boosts[i].y += speed * dt;
                if (boosts[i].y > H + 30) { boosts.splice(i, 1); continue; }
                if (rectsHit(playerX, PLAYER_Y, CAR_W, CAR_H, boosts[i].x, boosts[i].y, 20, 22)) {
                    boosts.splice(i, 1);
                    score += 50;
                    updateScore(score);
                    playSound(900, 0.1);
                }
            }
        }

        // --- Draw ---
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
        for (var l = 1; l < LANE_COUNT; l++) {
            var lx = ROAD_L + l * LANE_W - 1;
            for (var d = 0; d < dashes.length; d++) {
                ctx.fillRect(lx, dashes[d], 2, 18);
            }
        }

        for (var i = 0; i < boosts.length; i++) drawBoost(boosts[i]);
        for (var i = 0; i < cars.length; i++) drawCar(cars[i].x, cars[i].y, CAR_W, CAR_H, cars[i].color, false);
        drawCar(playerX, PLAYER_Y, CAR_W, CAR_H, PLAYER_COL, true);

        ctx.globalAlpha = 0.3;
        for (var d = 0; d < dashes.length; d++) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(ROAD_L - 18, dashes[d] + 5, 4, 4);
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(ROAD_R + 14, dashes[d] + 5, 4, 4);
        }
        ctx.globalAlpha = 1;

        ctx.globalAlpha = 0.15;
        ctx.fillStyle = PLAYER_COL;
        var arrowCX = laneCenter(currentLane) + CAR_W / 2;
        for (var ay = PLAYER_Y - 30; ay > 0; ay -= 50) {
            ctx.beginPath();
            ctx.moveTo(arrowCX, ay);
            ctx.lineTo(arrowCX - 6, ay + 10);
            ctx.lineTo(arrowCX + 6, ay + 10);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(Math.floor(speed) + ' KPH', 8, H - 8);
        ctx.textAlign = 'right';
        ctx.fillText(Math.floor(dist / 10) + ' m', W - 8, H - 8);

        if (dead) {
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

    // --- Keyboard ---
    handleKeyDown = function(e) {
        if (dead && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault();
            reset();
            return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); moveLeft(); }
        if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); moveRight(); }
    };
    document.addEventListener('keydown', handleKeyDown);

    // --- Touch: tap left/right half of canvas area ---
    var touchTarget = gameContainer || canvas;

    function onTouchStart(e) {
        if (typeof isTouchOnUI === 'function' && isTouchOnUI(e)) return;
        e.preventDefault();
        if (dead) { reset(); return; }

        var touch = e.touches[0];
        var rect = canvas.getBoundingClientRect();
        var tapX = touch.clientX - rect.left;

        if (tapX < rect.width / 2) {
            moveLeft();
        } else {
            moveRight();
        }
    }

    touchTarget.addEventListener('touchstart', onTouchStart, { passive: false });
    cleanupFunctions.push(function() {
        touchTarget.removeEventListener('touchstart', onTouchStart);
    });

    // --- Go ---
    reset();
    gameLoop = requestAnimationFrame(update);
}

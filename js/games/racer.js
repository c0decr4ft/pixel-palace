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

    var CAR_W = 32;
    var CAR_H = 56;
    var PLAYER_Y = H - CAR_H - 40;

    var BG = '#0a0018';
    var ROAD_COL = '#111125';
    var LINE_COL = 'rgba(255,255,255,0.15)';
    var EDGE_COL = '#ff00ff';
    var PLAYER_COL = '#0ff0fc';
    var COIN_COL = '#ffd700';

    var BASE_SPEED = 180;
    var MAX_SPEED = 650;
    var ACCEL = 1.2;

    var TRAFFIC_COLORS = ['#ff3c7f', '#ff6622', '#cc33ff', '#22ff66', '#ffaa00'];
    var MAX_TRAFFIC = 6;
    var LANE_LERP = 12;
    var SAFE_GAP = CAR_H + 30;

    var currentLane, targetX, playerX, speed, dist, dead;
    var cars, dashes, coins;
    var spawnTimer, nextSpawn, lastTime;
    var coinCount;

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
        coins = [];
        dashes = [];
        spawnTimer = 0;
        nextSpawn = 0.6;
        lastTime = -1;
        coinCount = 0;
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

    // --- Detailed car drawing ---
    function drawCar(x, y, w, h, color, isPlayer) {
        var r = 5;

        // Shadow underneath
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 2, y + 4, w, h);
        ctx.globalAlpha = 1;

        // Body (rounded rect)
        ctx.fillStyle = color;
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

        // Darker roof panel
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + 4, y + 14, w - 8, h - 28);

        // Windshield
        ctx.fillStyle = isPlayer ? 'rgba(0,255,252,0.35)' : 'rgba(100,180,255,0.35)';
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 8);
        ctx.lineTo(x + w - 5, y + 8);
        ctx.lineTo(x + w - 7, y + 18);
        ctx.lineTo(x + 7, y + 18);
        ctx.fill();

        // Rear window
        ctx.fillStyle = isPlayer ? 'rgba(0,255,252,0.2)' : 'rgba(100,180,255,0.2)';
        ctx.fillRect(x + 7, y + h - 18, w - 14, 8);

        // Side mirrors
        ctx.fillStyle = color;
        ctx.fillRect(x - 3, y + 12, 4, 6);
        ctx.fillRect(x + w - 1, y + 12, 4, 6);

        // Wheels (4 corners)
        ctx.fillStyle = '#222';
        ctx.fillRect(x - 1, y + 6, 4, 10);
        ctx.fillRect(x + w - 3, y + 6, 4, 10);
        ctx.fillRect(x - 1, y + h - 16, 4, 10);
        ctx.fillRect(x + w - 3, y + h - 16, 4, 10);
        // Wheel rims
        ctx.fillStyle = '#666';
        ctx.fillRect(x, y + 8, 2, 6);
        ctx.fillRect(x + w - 2, y + 8, 2, 6);
        ctx.fillRect(x, y + h - 14, 2, 6);
        ctx.fillRect(x + w - 2, y + h - 14, 2, 6);

        if (isPlayer) {
            // Headlights (bright white)
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + 4, y, 6, 3);
            ctx.fillRect(x + w - 10, y, 6, 3);
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + 3, y - 4, 8, 5);
            ctx.fillRect(x + w - 11, y - 4, 8, 5);
            ctx.globalAlpha = 1;
            // Brake lights
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(x + 4, y + h - 3, 5, 3);
            ctx.fillRect(x + w - 9, y + h - 3, 5, 3);
        } else {
            // Traffic headlights (dim)
            ctx.fillStyle = '#ddd';
            ctx.fillRect(x + 4, y, 5, 3);
            ctx.fillRect(x + w - 9, y, 5, 3);
            // Tail lights (red glow)
            ctx.fillStyle = '#ff2222';
            ctx.fillRect(x + 4, y + h - 3, 5, 3);
            ctx.fillRect(x + w - 9, y + h - 3, 5, 3);
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(x + 2, y + h - 1, 9, 4);
            ctx.fillRect(x + w - 11, y + h - 1, 9, 4);
            ctx.globalAlpha = 1;
        }

        // Neon underglow
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = color;
        ctx.fillRect(x - 4, y - 3, w + 8, h + 6);
        ctx.globalAlpha = 1;
    }

    // --- Coin drawing ---
    function drawCoin(c) {
        var cx = c.x + 10;
        var cy = c.y + 10;
        var pulse = 0.8 + 0.2 * Math.sin(Date.now() / 120 + c.x);
        ctx.save();
        ctx.globalAlpha = pulse;
        // Outer ring
        ctx.strokeStyle = COIN_COL;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.stroke();
        // Inner fill
        ctx.fillStyle = COIN_COL;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
        // Dollar sign
        ctx.fillStyle = '#a08000';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, cy + 1);
        ctx.restore();
    }

    // --- Spawning with fairness ---
    function laneOccupied(lane, minY, maxY) {
        var lx = laneCenter(lane);
        for (var i = 0; i < cars.length; i++) {
            if (Math.abs(cars[i].x - lx) < CAR_W && cars[i].y > minY && cars[i].y < maxY) {
                return true;
            }
        }
        return false;
    }

    function spawnCar() {
        if (cars.length >= MAX_TRAFFIC) return;

        // Build list of lanes that are free near the top
        var freeLanes = [];
        var occupiedLanes = [];
        for (var l = 0; l < LANE_COUNT; l++) {
            if (laneOccupied(l, -CAR_H - SAFE_GAP, SAFE_GAP)) {
                occupiedLanes.push(l);
            } else {
                freeLanes.push(l);
            }
        }

        // Always keep at least 1 lane free so the player can pass
        if (freeLanes.length <= 1) return;

        var lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
        var x = laneCenter(lane);

        // Also ensure no vertical overlap with nearby cars in the same lane
        for (var i = 0; i < cars.length; i++) {
            if (Math.abs(cars[i].x - x) < CAR_W && cars[i].y < SAFE_GAP) return;
        }

        cars.push({
            x: x,
            y: -CAR_H - 10,
            lane: lane,
            speed: speed * (0.4 + Math.random() * 0.3),
            color: TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)]
        });
    }

    function spawnCoin() {
        // Place coin in a free lane
        var freeLanes = [];
        for (var l = 0; l < LANE_COUNT; l++) {
            if (!laneOccupied(l, -40, 40)) freeLanes.push(l);
        }
        if (freeLanes.length === 0) return;
        var lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
        coins.push({
            x: ROAD_L + lane * LANE_W + (LANE_W - 20) / 2,
            y: -24
        });
    }

    function rectsHit(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    // --- Prevent traffic cars from overlapping each other ---
    function pushCarsApart(dt) {
        for (var i = 0; i < cars.length; i++) {
            for (var j = i + 1; j < cars.length; j++) {
                var a = cars[i], b = cars[j];
                if (Math.abs(a.x - b.x) < CAR_W) {
                    var overlap = (CAR_H + 4) - Math.abs(a.y - b.y);
                    if (overlap > 0) {
                        var push = overlap * 0.5;
                        if (a.y < b.y) {
                            a.y -= push * dt * 8;
                            b.y += push * dt * 8;
                        } else {
                            a.y += push * dt * 8;
                            b.y -= push * dt * 8;
                        }
                    }
                }
            }
        }
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
            updateScore(Math.floor(dist / 10) + coinCount * 25);

            for (var i = dashes.length - 1; i >= 0; i--) {
                dashes[i] += speed * dt;
                if (dashes[i] > H + 20) dashes[i] -= H + 60;
            }

            spawnTimer += dt;
            var gap = Math.max(0.3, nextSpawn - speed * 0.0003);
            if (spawnTimer >= gap) {
                spawnTimer = 0;
                nextSpawn = 0.45 + Math.random() * 0.4;
                spawnCar();
                if (Math.random() < 0.18) spawnCoin();
            }

            // Move traffic
            for (var i = cars.length - 1; i >= 0; i--) {
                var c = cars[i];
                c.y += (speed - c.speed) * dt;
                if (c.y > H + 60) { cars.splice(i, 1); continue; }
                if (rectsHit(playerX, PLAYER_Y, CAR_W, CAR_H, c.x, c.y, CAR_W, CAR_H)) {
                    dead = true;
                    playGameOverJingle();
                }
            }

            // Keep traffic from stacking on top of each other
            pushCarsApart(dt);

            // Move & collect coins
            for (var i = coins.length - 1; i >= 0; i--) {
                coins[i].y += speed * dt;
                if (coins[i].y > H + 30) { coins.splice(i, 1); continue; }
                if (rectsHit(playerX, PLAYER_Y, CAR_W, CAR_H, coins[i].x, coins[i].y, 20, 20)) {
                    coins.splice(i, 1);
                    coinCount++;
                    score = Math.floor(dist / 10) + coinCount * 25;
                    updateScore(score);
                    playSound(880, 0.08);
                    setTimeout(function() { playSound(1100, 0.06); }, 80);
                }
            }
        }

        // --- Draw ---
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = ROAD_COL;
        ctx.fillRect(ROAD_L, 0, LANE_COUNT * LANE_W, H);

        // Road edges with neon glow
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
        for (var l = 1; l < LANE_COUNT; l++) {
            var lx = ROAD_L + l * LANE_W - 1;
            for (var d = 0; d < dashes.length; d++) {
                ctx.fillRect(lx, dashes[d], 2, 18);
            }
        }

        // Coins
        for (var i = 0; i < coins.length; i++) drawCoin(coins[i]);

        // Traffic (draw back-to-front so closer cars are on top)
        cars.sort(function(a, b) { return a.y - b.y; });
        for (var i = 0; i < cars.length; i++) drawCar(cars[i].x, cars[i].y, CAR_W, CAR_H, cars[i].color, false);

        // Player car
        drawCar(playerX, PLAYER_Y, CAR_W, CAR_H, PLAYER_COL, true);

        // Roadside neon dots
        ctx.globalAlpha = 0.3;
        for (var d = 0; d < dashes.length; d++) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(ROAD_L - 18, dashes[d] + 5, 4, 4);
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(ROAD_R + 14, dashes[d] + 5, 4, 4);
        }
        ctx.globalAlpha = 1;

        // Lane guide arrows
        ctx.globalAlpha = 0.12;
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

        // HUD
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(Math.floor(speed) + ' KPH', 8, H - 8);
        ctx.textAlign = 'right';
        ctx.fillText(Math.floor(dist / 10) + ' m', W - 8, H - 8);

        // Coin counter
        ctx.textAlign = 'center';
        ctx.fillStyle = COIN_COL;
        ctx.fillText('$ ' + coinCount, W / 2, H - 8);

        if (dead) {
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(0, 0, W, H);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff00ff';
            ctx.font = '22px "Press Start 2P"';
            ctx.fillText('CRASH!', W / 2, H / 2 - 50);
            ctx.fillStyle = '#0ff0fc';
            ctx.font = '11px "Press Start 2P"';
            ctx.fillText('SCORE: ' + score, W / 2, H / 2 - 16);
            ctx.fillStyle = COIN_COL;
            ctx.font = '9px "Press Start 2P"';
            ctx.fillText('COINS: ' + coinCount, W / 2, H / 2 + 6);
            ctx.fillStyle = '#fff';
            ctx.font = '9px "Press Start 2P"';
            ctx.fillText(Math.floor(dist / 10) + ' m  |  ' + Math.floor(speed) + ' KPH', W / 2, H / 2 + 24);
            ctx.fillStyle = '#ffd700';
            ctx.font = '9px "Press Start 2P"';
            ctx.fillText('SPACE / TAP TO RETRY', W / 2, H / 2 + 50);
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

    // --- Touch: tap left/right half ---
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

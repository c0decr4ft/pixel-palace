// === NEON RACER — Endless top-down lane-dodge ===

function initRacer() {
    currentGameTitle.textContent = 'NEON RACER';
    gameControls.innerHTML = 'Dodge traffic &mdash; tap sides or arrow keys to switch lanes!';

    // Bottom-left promo for the full online racer
    var promo = document.createElement('a');
    promo.href = 'https://satsracer.com';
    promo.target = '_blank';
    promo.rel = 'noopener noreferrer';
    promo.className = 'racer-promo-link';
    promo.innerHTML = '<span class="racer-promo-label">Like this?</span> Try <strong>Sats Racer</strong> →';
    gameContainer.appendChild(promo);
    cleanupFunctions.push(function() {
        if (promo.parentNode) promo.parentNode.removeChild(promo);
    });

    var W = 360, H = 600;
    canvas.width = W;
    canvas.height = H;

    var LANE_COUNT = 4;
    var LANE_W = 58;
    var ROAD_L = (W - LANE_COUNT * LANE_W) / 2;
    var ROAD_R = ROAD_L + LANE_COUNT * LANE_W;

    var CAR_W = 34;
    var CAR_H = 58;
    var PLAYER_Y = H - CAR_H - 48;

    var BG_TOP = '#050010';
    var BG_BOT = '#120028';
    var ROAD_COL = '#12122a';
    var ROAD_STRIPE = '#1a1a36';
    var LINE_COL = 'rgba(255,255,255,0.22)';
    var EDGE_MAGENTA = '#ff2bd6';
    var EDGE_CYAN = '#00f0ff';
    var PLAYER_COL = '#00f0ff';
    var COIN_COL = '#ffd84a';

    var BASE_SPEED = 180;
    var MAX_SPEED = 650;
    var ACCEL = 1.2;

    var TRAFFIC_COLORS = ['#ff3c7f', '#ff6a2a', '#c44dff', '#2dff7a', '#ffb020', '#4d7cff'];
    var MAX_TRAFFIC = 6;
    var LANE_LERP = 12;
    // Vertical gap needed to switch lanes past a pack of cars
    var SAFE_GAP = CAR_H + 50;
    // Any horizontal slice this tall must keep ≥1 open lane
    var PASS_WINDOW = CAR_H + 80;

    var currentLane, targetX, playerX, speed, dist, dead;
    var cars, dashes, coins, buildings, stars;
    var spawnTimer, nextSpawn, lastTime;
    var coinCount, crashFlash, scrollY;

    function laneCenter(lane) {
        return ROAD_L + lane * LANE_W + (LANE_W - CAR_W) / 2;
    }

    function seedEnvironment() {
        buildings = [];
        // Left & right roadside towers
        for (var side = 0; side < 2; side++) {
            var xBase = side === 0 ? 4 : ROAD_R + 10;
            var y = -40;
            while (y < H + 120) {
                var bw = 18 + Math.floor(Math.random() * 22);
                var bh = 40 + Math.floor(Math.random() * 90);
                var hue = Math.random() > 0.5 ? EDGE_MAGENTA : EDGE_CYAN;
                buildings.push({
                    side: side,
                    x: xBase + Math.random() * 8,
                    y: y,
                    w: Math.min(bw, side === 0 ? ROAD_L - 10 : W - ROAD_R - 10),
                    h: bh,
                    color: hue,
                    windows: Math.floor(2 + Math.random() * 4)
                });
                y += bh + 12 + Math.random() * 30;
            }
        }
        stars = [];
        for (var i = 0; i < 28; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                s: 0.6 + Math.random() * 1.4,
                a: 0.25 + Math.random() * 0.55
            });
        }
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
        crashFlash = 0;
        scrollY = 0;
        for (var y = 0; y < H; y += 36) dashes.push(y);
        seedEnvironment();
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

    function roundRect(x, y, w, h, r) {
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
        ctx.closePath();
    }

    // --- Detailed car drawing (no shadowBlur) ---
    function drawCar(x, y, w, h, color, isPlayer) {
        var r = 6;

        // Drop shadow
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 3, y + 5, w, h);
        ctx.globalAlpha = 1;

        // Body
        ctx.fillStyle = color;
        roundRect(x, y, w, h, r);
        ctx.fill();

        // Highlight stripe down the hood
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + w * 0.35, y + 4, w * 0.3, h - 8);
        ctx.globalAlpha = 1;

        // Cabin / roof
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        roundRect(x + 3, y + 16, w - 6, h - 32, 3);
        ctx.fill();

        // Windshield
        ctx.fillStyle = isPlayer ? 'rgba(180,255,255,0.45)' : 'rgba(140,190,255,0.4)';
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 8);
        ctx.lineTo(x + w - 5, y + 8);
        ctx.lineTo(x + w - 8, y + 18);
        ctx.lineTo(x + 8, y + 18);
        ctx.closePath();
        ctx.fill();

        // Rear window
        ctx.fillStyle = isPlayer ? 'rgba(120,230,255,0.28)' : 'rgba(100,160,220,0.25)';
        ctx.fillRect(x + 7, y + h - 18, w - 14, 7);

        // Side vents
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x + 3, y + h * 0.42, 3, 10);
        ctx.fillRect(x + w - 6, y + h * 0.42, 3, 10);

        // Mirrors
        ctx.fillStyle = color;
        ctx.fillRect(x - 3, y + 14, 4, 7);
        ctx.fillRect(x + w - 1, y + 14, 4, 7);

        // Wheels
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 2, y + 8, 5, 12);
        ctx.fillRect(x + w - 3, y + 8, 5, 12);
        ctx.fillRect(x - 2, y + h - 20, 5, 12);
        ctx.fillRect(x + w - 3, y + h - 20, 5, 12);
        ctx.fillStyle = '#888';
        ctx.fillRect(x - 1, y + 10, 2, 7);
        ctx.fillRect(x + w - 1, y + 10, 2, 7);
        ctx.fillRect(x - 1, y + h - 18, 2, 7);
        ctx.fillRect(x + w - 1, y + h - 18, 2, 7);

        if (isPlayer) {
            // Headlights + beam
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + 5, y + 1, 7, 3);
            ctx.fillRect(x + w - 12, y + 1, 7, 3);
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#cfffff';
            ctx.beginPath();
            ctx.moveTo(x + 5, y);
            ctx.lineTo(x - 2, y - 28);
            ctx.lineTo(x + 16, y - 28);
            ctx.lineTo(x + 12, y);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x + w - 12, y);
            ctx.lineTo(x + w - 16, y - 28);
            ctx.lineTo(x + w + 2, y - 28);
            ctx.lineTo(x + w - 5, y);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
            // Neon trim
            ctx.strokeStyle = '#fff';
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1;
            roundRect(x + 1, y + 1, w - 2, h - 2, r - 1);
            ctx.stroke();
            ctx.globalAlpha = 1;
            // Brake lights
            ctx.fillStyle = '#ff3355';
            ctx.fillRect(x + 5, y + h - 3, 6, 3);
            ctx.fillRect(x + w - 11, y + h - 3, 6, 3);
        } else {
            ctx.fillStyle = '#eee';
            ctx.fillRect(x + 5, y + 1, 6, 3);
            ctx.fillRect(x + w - 11, y + 1, 6, 3);
            ctx.fillStyle = '#ff2244';
            ctx.fillRect(x + 5, y + h - 3, 6, 3);
            ctx.fillRect(x + w - 11, y + h - 3, 6, 3);
        }
    }

    function drawCoin(c, t) {
        var cx = c.x + 11;
        var cy = c.y + 11;
        var pulse = 0.75 + 0.25 * Math.sin(t / 140 + c.x);
        var spin = 0.65 + 0.35 * Math.abs(Math.sin(t / 220 + c.y * 0.02));

        ctx.save();
        ctx.globalAlpha = pulse;
        // Soft halo
        ctx.fillStyle = 'rgba(255,216,74,0.15)';
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
        // Outer ring
        ctx.strokeStyle = COIN_COL;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 10 * spin, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Face
        ctx.fillStyle = '#ffe27a';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 7 * spin, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b8860b';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (spin > 0.35) ctx.fillText('$', cx, cy + 1);
        ctx.restore();
    }

    function laneOccupied(lane, minY, maxY) {
        var lx = laneCenter(lane);
        for (var i = 0; i < cars.length; i++) {
            var c = cars[i];
            if (Math.abs(c.x - lx) < CAR_W && c.y < maxY && c.y + CAR_H > minY) {
                return true;
            }
        }
        return false;
    }

    function laneOfCar(c) {
        if (typeof c.lane === 'number' && c.lane >= 0 && c.lane < LANE_COUNT) return c.lane;
        return Math.max(0, Math.min(LANE_COUNT - 1,
            Math.round((c.x - ROAD_L - (LANE_W - CAR_W) / 2) / LANE_W)));
    }

    /** How many distinct lanes are occupied inside [winTop, winBot]? */
    function occupiedLaneCount(winTop, winBot, extraLane) {
        var seen = [false, false, false, false];
        var used = 0;
        if (extraLane >= 0 && extraLane < LANE_COUNT) {
            seen[extraLane] = true;
            used = 1;
        }
        for (var i = 0; i < cars.length; i++) {
            var c = cars[i];
            if (c.y < winBot && c.y + CAR_H > winTop) {
                var ln = laneOfCar(c);
                if (!seen[ln]) {
                    seen[ln] = true;
                    used++;
                }
            }
        }
        return used;
    }

    /** True if spawning in `lane` at `spawnY` would seal every lane in some pass-window. */
    function wouldBlockAllLanes(lane, spawnY) {
        var carTop = spawnY;
        var carBot = spawnY + CAR_H;
        for (var t = carTop - PASS_WINDOW + 8; t <= carBot; t += 12) {
            if (occupiedLaneCount(t, t + PASS_WINDOW, lane) >= LANE_COUNT) return true;
        }
        return false;
    }

    function spawnCar() {
        if (cars.length >= MAX_TRAFFIC) return;

        var spawnY = -CAR_H - 10;
        var candidates = [];
        for (var l = 0; l < LANE_COUNT; l++) {
            // Keep vertical spacing in this lane
            if (laneOccupied(l, spawnY - SAFE_GAP, spawnY + CAR_H + SAFE_GAP)) continue;
            // Never close the last escape route
            if (wouldBlockAllLanes(l, spawnY)) continue;
            candidates.push(l);
        }
        if (candidates.length === 0) return;

        // Prefer leaving the player's current lane open when other options exist
        var preferred = [];
        for (var i = 0; i < candidates.length; i++) {
            if (candidates[i] !== currentLane) preferred.push(candidates[i]);
        }
        var pool = preferred.length > 0 ? preferred : candidates;
        var lane = pool[Math.floor(Math.random() * pool.length)];

        cars.push({
            x: laneCenter(lane),
            y: spawnY,
            lane: lane,
            speed: speed * (0.4 + Math.random() * 0.3),
            color: TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)]
        });
    }

    /** Safety net: if a wall somehow forms ahead of the player, clear one lane. */
    function enforcePassable() {
        var zoneTop = -CAR_H;
        var zoneBot = PLAYER_Y + CAR_H;
        for (var t = zoneTop; t < zoneBot; t += 20) {
            var bot = t + PASS_WINDOW;
            if (occupiedLaneCount(t, bot, -1) < LANE_COUNT) continue;

            // Remove the highest car in this window (farthest / least unfair)
            var victim = -1;
            var bestY = Infinity;
            for (var i = 0; i < cars.length; i++) {
                var c = cars[i];
                if (c.y < bot && c.y + CAR_H > t && c.y < bestY) {
                    bestY = c.y;
                    victim = i;
                }
            }
            if (victim >= 0) {
                cars.splice(victim, 1);
                return;
            }
        }
    }

    function spawnCoin() {
        var freeLanes = [];
        for (var l = 0; l < LANE_COUNT; l++) {
            if (!laneOccupied(l, -40, 40)) freeLanes.push(l);
        }
        if (freeLanes.length === 0) return;
        var lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
        coins.push({
            x: ROAD_L + lane * LANE_W + (LANE_W - 22) / 2,
            y: -24
        });
    }

    function rectsHit(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

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

    function drawBackground(t) {
        // Night sky gradient
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, BG_TOP);
        sky.addColorStop(0.55, '#0c0030');
        sky.addColorStop(1, BG_BOT);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        // Stars
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            var tw = s.a * (0.7 + 0.3 * Math.sin(t / 400 + i));
            ctx.globalAlpha = tw;
            ctx.fillStyle = '#fff';
            ctx.fillRect(s.x, (s.y + scrollY * 0.15) % H, s.s, s.s);
        }
        ctx.globalAlpha = 1;

        // Horizon haze
        ctx.globalAlpha = 0.35;
        var haze = ctx.createLinearGradient(0, 0, 0, 90);
        haze.addColorStop(0, EDGE_MAGENTA);
        haze.addColorStop(1, 'transparent');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, W, 90);
        ctx.globalAlpha = 1;

        // Buildings
        for (var i = 0; i < buildings.length; i++) {
            var b = buildings[i];
            var by = b.y + (scrollY % (H + 200));
            if (by > H + 20) by -= H + 220;
            if (by + b.h < -20) continue;

            ctx.fillStyle = '#0a0618';
            ctx.fillRect(b.x, by, b.w, b.h);
            // Neon edge
            ctx.fillStyle = b.color;
            ctx.globalAlpha = 0.55;
            ctx.fillRect(b.x, by, 2, b.h);
            ctx.fillRect(b.x + b.w - 2, by, 2, b.h);
            ctx.fillRect(b.x, by, b.w, 2);
            ctx.globalAlpha = 0.12;
            ctx.fillRect(b.x - 2, by - 2, b.w + 4, b.h + 4);
            ctx.globalAlpha = 1;

            // Windows
            ctx.fillStyle = b.color;
            var rows = Math.max(2, Math.floor(b.h / 14));
            for (var row = 0; row < rows; row++) {
                for (var col = 0; col < b.windows; col++) {
                    if ((row + col + i) % 3 === 0) continue;
                    ctx.globalAlpha = 0.35 + 0.25 * ((row + col) % 2);
                    var wx = b.x + 4 + col * ((b.w - 8) / b.windows);
                    var wy = by + 6 + row * 12;
                    ctx.fillRect(wx, wy, 3, 4);
                }
            }
            ctx.globalAlpha = 1;
        }
    }

    function drawRoad() {
        // Asphalt with subtle lane tint bands
        ctx.fillStyle = ROAD_COL;
        ctx.fillRect(ROAD_L, 0, LANE_COUNT * LANE_W, H);
        for (var l = 0; l < LANE_COUNT; l++) {
            if (l % 2 === 0) {
                ctx.fillStyle = ROAD_STRIPE;
                ctx.globalAlpha = 0.35;
                ctx.fillRect(ROAD_L + l * LANE_W, 0, LANE_W, H);
                ctx.globalAlpha = 1;
            }
        }

        // Center dashed lines
        ctx.fillStyle = LINE_COL;
        for (var l = 1; l < LANE_COUNT; l++) {
            var lx = ROAD_L + l * LANE_W - 1;
            for (var d = 0; d < dashes.length; d++) {
                ctx.fillRect(lx, dashes[d], 2, 16);
            }
        }

        // Neon curb rails (layered glow, no shadowBlur)
        for (var g = 3; g >= 0; g--) {
            ctx.globalAlpha = 0.08 + (3 - g) * 0.08;
            ctx.fillStyle = EDGE_MAGENTA;
            ctx.fillRect(ROAD_L - 4 - g * 2, 0, 3 + g, H);
            ctx.fillStyle = EDGE_CYAN;
            ctx.fillRect(ROAD_R + g * 2, 0, 3 + g, H);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = EDGE_MAGENTA;
        ctx.fillRect(ROAD_L - 3, 0, 3, H);
        ctx.fillStyle = EDGE_CYAN;
        ctx.fillRect(ROAD_R, 0, 3, H);

        // Roadside marker lights
        for (var d = 0; d < dashes.length; d++) {
            var pulse = 0.35 + 0.35 * Math.sin(scrollY * 0.02 + d);
            ctx.globalAlpha = pulse;
            ctx.fillStyle = EDGE_MAGENTA;
            ctx.fillRect(ROAD_L - 16, dashes[d] + 4, 5, 5);
            ctx.fillStyle = EDGE_CYAN;
            ctx.fillRect(ROAD_R + 11, dashes[d] + 4, 5, 5);
        }
        ctx.globalAlpha = 1;
    }

    function drawSpeedLines() {
        if (speed < 280) return;
        var intensity = Math.min(1, (speed - 280) / 300);
        ctx.globalAlpha = 0.12 * intensity;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        var count = Math.floor(6 + intensity * 10);
        for (var i = 0; i < count; i++) {
            var x = ROAD_L + 8 + (i * 37 + (scrollY * 0.4)) % (LANE_COUNT * LANE_W - 16);
            var y = (i * 73 + scrollY * 1.8) % H;
            var len = 12 + intensity * 28;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + len);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    function drawHud() {
        // Top bar
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, W, 28);
        ctx.fillStyle = EDGE_CYAN;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(0, 28, W, 1);
        ctx.globalAlpha = 1;

        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillStyle = EDGE_CYAN;
        ctx.fillText(Math.floor(speed) + ' KPH', 10, 19);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.fillText(Math.floor(dist / 10) + 'm', W - 10, 19);
        ctx.textAlign = 'center';
        ctx.fillStyle = COIN_COL;
        ctx.fillText('$' + coinCount, W / 2, 19);

        // Active lane marker under player
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = PLAYER_COL;
        ctx.fillRect(ROAD_L + currentLane * LANE_W + 4, PLAYER_Y - 8, LANE_W - 8, CAR_H + 20);
        ctx.globalAlpha = 1;
    }

    function drawCrashOverlay() {
        ctx.fillStyle = 'rgba(0,0,0,0.78)';
        ctx.fillRect(0, 0, W, H);

        if (crashFlash > 0) {
            ctx.globalAlpha = Math.min(0.45, crashFlash);
            ctx.fillStyle = '#ff0066';
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
        }

        // Panel
        ctx.fillStyle = 'rgba(18,0,40,0.92)';
        roundRect(28, H / 2 - 110, W - 56, 200, 10);
        ctx.fill();
        ctx.strokeStyle = EDGE_MAGENTA;
        ctx.lineWidth = 2;
        roundRect(28, H / 2 - 110, W - 56, 200, 10);
        ctx.stroke();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = EDGE_CYAN;
        roundRect(34, H / 2 - 104, W - 68, 188, 8);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.textAlign = 'center';
        ctx.fillStyle = EDGE_MAGENTA;
        ctx.font = '22px "Press Start 2P"';
        ctx.fillText('CRASH!', W / 2, H / 2 - 60);

        ctx.fillStyle = EDGE_CYAN;
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('SCORE ' + score, W / 2, H / 2 - 22);

        ctx.fillStyle = COIN_COL;
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText('COINS  ' + coinCount, W / 2, H / 2 + 4);

        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = '9px "Press Start 2P"';
        ctx.fillText(Math.floor(dist / 10) + 'm   ' + Math.floor(speed) + ' KPH', W / 2, H / 2 + 32);

        var blink = (Date.now() % 800) < 500;
        ctx.fillStyle = blink ? '#ffd84a' : 'rgba(255,216,74,0.35)';
        ctx.font = '9px "Press Start 2P"';
        ctx.fillText('SPACE / TAP TO RETRY', W / 2, H / 2 + 62);
    }

    // --- Main loop ---
    function update(now) {
        gameLoop = requestAnimationFrame(update);
        if (lastTime < 0) { lastTime = now; return; }
        var dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = 1 / 60;

        if (crashFlash > 0) crashFlash -= dt * 2.2;

        if (!dead) {
            var diff = targetX - playerX;
            if (Math.abs(diff) > 0.5) {
                playerX += diff * LANE_LERP * dt;
            } else {
                playerX = targetX;
            }

            speed = Math.min(MAX_SPEED, speed + ACCEL * dt * 60);
            dist += speed * dt;
            scrollY += speed * dt;
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

            for (var i = cars.length - 1; i >= 0; i--) {
                var c = cars[i];
                c.y += (speed - c.speed) * dt;
                if (c.y > H + 60) { cars.splice(i, 1); continue; }
                if (rectsHit(playerX + 3, PLAYER_Y + 4, CAR_W - 6, CAR_H - 8, c.x + 3, c.y + 4, CAR_W - 6, CAR_H - 8)) {
                    dead = true;
                    crashFlash = 1;
                    playGameOverJingle();
                }
            }

            pushCarsApart(dt);
            enforcePassable();

            for (var i = coins.length - 1; i >= 0; i--) {
                coins[i].y += speed * dt;
                if (coins[i].y > H + 30) { coins.splice(i, 1); continue; }
                if (rectsHit(playerX, PLAYER_Y, CAR_W, CAR_H, coins[i].x, coins[i].y, 22, 22)) {
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
        drawBackground(now);
        drawRoad();
        drawSpeedLines();

        for (var i = 0; i < coins.length; i++) drawCoin(coins[i], now);

        cars.sort(function(a, b) { return a.y - b.y; });
        for (var i = 0; i < cars.length; i++) {
            drawCar(cars[i].x, cars[i].y, CAR_W, CAR_H, cars[i].color, false);
        }

        drawCar(playerX, PLAYER_Y, CAR_W, CAR_H, PLAYER_COL, true);
        drawHud();

        if (dead) drawCrashOverlay();
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

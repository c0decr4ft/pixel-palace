// === AIM TRAINER — Click the targets! ===

function initAimTrainer() {
    currentGameTitle.textContent = 'AIM TRAINER';
    gameControls.innerHTML = 'Click/tap the targets as fast as you can!';

    var W = 400, H = 500;
    canvas.width = W;
    canvas.height = H;

    var GAME_TIME = 30;
    var TARGET_R = 28;
    var SHRINK_TIME = 1.8;

    var targets, hits, misses, timeLeft, lastTime, gameOver, started;
    var particles;

    function reset() {
        targets = [];
        hits = 0;
        misses = 0;
        timeLeft = GAME_TIME;
        lastTime = -1;
        gameOver = false;
        started = false;
        particles = [];
        score = 0;
        updateScore(0);
    }

    function spawnTarget() {
        var pad = TARGET_R + 10;
        targets.push({
            x: pad + Math.random() * (W - pad * 2),
            y: pad + 40 + Math.random() * (H - pad * 2 - 60),
            r: TARGET_R,
            maxR: TARGET_R,
            age: 0,
            hue: Math.random() * 360
        });
    }

    function addParticles(x, y, hue) {
        for (var i = 0; i < 8; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 80 + Math.random() * 120;
            particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.4 + Math.random() * 0.3,
                hue: hue,
                r: 3 + Math.random() * 3
            });
        }
    }

    function handleClick(cx, cy) {
        if (gameOver) { reset(); return; }
        if (!started) { started = true; spawnTarget(); return; }

        var hit = false;
        for (var i = targets.length - 1; i >= 0; i--) {
            var t = targets[i];
            var dx = cx - t.x, dy = cy - t.y;
            if (dx * dx + dy * dy < t.r * t.r) {
                addParticles(t.x, t.y, t.hue);
                targets.splice(i, 1);
                hits++;
                score = hits * 10 - misses * 3;
                if (score < 0) score = 0;
                updateScore(score);
                playSound(600 + hits * 15, 0.06);
                hit = true;
                break;
            }
        }
        if (!hit && started) {
            misses++;
            playSound(200, 0.05);
        }
    }

    function update(now) {
        gameLoop = requestAnimationFrame(update);
        if (lastTime < 0) { lastTime = now; return; }
        var dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = 1 / 60;

        // --- Background ---
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#12121e');
        bg.addColorStop(1, '#0a0a14');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        if (!started && !gameOver) {
            ctx.fillStyle = '#fff';
            ctx.font = '600 20px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('AIM TRAINER', W / 2, H / 2 - 30);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '12px Orbitron';
            ctx.fillText('Click or tap to start', W / 2, H / 2 + 6);
            ctx.fillText(GAME_TIME + ' seconds  |  Hit as many as you can', W / 2, H / 2 + 28);
            return;
        }

        if (started && !gameOver) {
            timeLeft -= dt;
            if (timeLeft <= 0) {
                timeLeft = 0;
                gameOver = true;
                score = hits * 10 - misses * 3;
                if (score < 0) score = 0;
                updateScore(score);
                playGameOverJingle();
            }

            // Keep 1-3 targets on screen
            while (targets.length < Math.min(3, 1 + Math.floor((GAME_TIME - timeLeft) / 8))) {
                spawnTarget();
            }

            // Age + shrink targets
            for (var i = targets.length - 1; i >= 0; i--) {
                targets[i].age += dt;
                targets[i].r = targets[i].maxR * Math.max(0, 1 - targets[i].age / SHRINK_TIME);
                if (targets[i].r <= 1) {
                    targets.splice(i, 1);
                    misses++;
                }
            }
        }

        // Draw targets
        for (var i = 0; i < targets.length; i++) {
            var t = targets[i];
            // Outer ring
            ctx.strokeStyle = 'hsla(' + t.hue + ',80%,60%,0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.maxR, 0, Math.PI * 2);
            ctx.stroke();
            // Filled circle
            ctx.fillStyle = 'hsla(' + t.hue + ',75%,55%,0.9)';
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
            ctx.fill();
            // Inner dot
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.r * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Particles
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            ctx.globalAlpha = p.life * 2;
            ctx.fillStyle = 'hsl(' + p.hue + ',80%,60%)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * p.life * 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // HUD bar
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, 0, W, 36);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px Orbitron';
        ctx.textAlign = 'left';
        ctx.fillText('Hits: ' + hits, 12, 23);
        ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(timeLeft) + 's', W / 2, 23);
        ctx.textAlign = 'right';
        ctx.fillText('Miss: ' + misses, W - 12, 23);

        // Timer bar
        var pct = timeLeft / GAME_TIME;
        ctx.fillStyle = pct > 0.3 ? '#42a5f5' : '#ef5350';
        ctx.fillRect(0, 34, W * pct, 2);

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff';
            ctx.font = '600 22px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('TIME UP', W / 2, H / 2 - 50);

            ctx.font = '600 36px Orbitron';
            ctx.fillText(score, W / 2, H / 2 - 4);

            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.font = '12px Orbitron';
            ctx.fillText(hits + ' hits  |  ' + misses + ' misses', W / 2, H / 2 + 26);
            var acc = hits + misses > 0 ? Math.round(hits / (hits + misses) * 100) : 0;
            ctx.fillText('Accuracy: ' + acc + '%', W / 2, H / 2 + 48);

            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillText('Tap to retry', W / 2, H - 40);
        }
    }

    // --- Input ---
    function onClick(e) {
        var rect = canvas.getBoundingClientRect();
        var sx = canvas.width / rect.width;
        var sy = canvas.height / rect.height;
        var cx = (e.clientX - rect.left) * sx;
        var cy = (e.clientY - rect.top) * sy;
        handleClick(cx, cy);
    }

    canvas.addEventListener('click', onClick);
    cleanupFunctions.push(function() { canvas.removeEventListener('click', onClick); });

    handleKeyDown = function(e) {
        if (e.key === ' ' && gameOver) { e.preventDefault(); reset(); }
    };
    document.addEventListener('keydown', handleKeyDown);

    var touchTarget = gameContainer || canvas;
    function onTouch(e) {
        if (typeof isTouchOnUI === 'function' && isTouchOnUI(e)) return;
        e.preventDefault();
        var t = e.touches[0];
        var rect = canvas.getBoundingClientRect();
        var sx = canvas.width / rect.width;
        var sy = canvas.height / rect.height;
        handleClick((t.clientX - rect.left) * sx, (t.clientY - rect.top) * sy);
    }
    touchTarget.addEventListener('touchstart', onTouch, { passive: false });
    cleanupFunctions.push(function() { touchTarget.removeEventListener('touchstart', onTouch); });

    reset();
    gameLoop = requestAnimationFrame(update);
}

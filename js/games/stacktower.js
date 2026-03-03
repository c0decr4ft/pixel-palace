// === STACK TOWER — Modern block stacking game ===

function initStackTower() {
    currentGameTitle.textContent = 'STACK TOWER';
    gameControls.innerHTML = 'Tap or press SPACE to drop the block!';

    var W = 360, H = 560;
    canvas.width = W;
    canvas.height = H;

    var COLORS = [
        ['#ff6b6b','#ee5a5a'], ['#ffa726','#f59516'], ['#ffee58','#eedc38'],
        ['#66bb6a','#55aa59'], ['#42a5f5','#3194e4'], ['#ab47bc','#9a36ab'],
        ['#ef5350','#de4240'], ['#26c6da','#15b5c9']
    ];

    var stack, current, dropping, gameOver, lastTime;
    var cameraY, perfect, combo;

    function reset() {
        stack = [{ x: W / 2 - 50, w: 100, y: 0, color: 0 }];
        current = null;
        dropping = null;
        gameOver = false;
        lastTime = -1;
        cameraY = 0;
        perfect = 0;
        combo = 0;
        score = 0;
        updateScore(0);
        spawnBlock();
    }

    function spawnBlock() {
        var top = stack[stack.length - 1];
        var ci = stack.length % COLORS.length;
        var dir = stack.length % 2 === 0 ? 1 : -1;
        current = {
            x: dir > 0 ? -top.w : W,
            w: top.w,
            y: stack.length,
            speed: Math.min(280, 120 + stack.length * 6),
            dir: dir,
            color: ci
        };
        dropping = null;
    }

    var BLOCK_H = 28;
    var DROP_SPEED = 600;

    function dropBlock() {
        if (gameOver || !current) return;
        var top = stack[stack.length - 1];

        var overlapL = Math.max(current.x, top.x);
        var overlapR = Math.min(current.x + current.w, top.x + top.w);
        var overlapW = overlapR - overlapL;

        if (overlapW <= 0) {
            gameOver = true;
            dropping = { x: current.x, w: current.w, y: current.y, vy: 0, color: current.color };
            current = null;
            playGameOverJingle();
            return;
        }

        var isPerfect = Math.abs(overlapW - top.w) < 3;
        if (isPerfect) {
            overlapW = top.w;
            overlapL = top.x;
            combo++;
            perfect++;
            score += 2 + combo;
            playSound(600 + combo * 80, 0.08);
        } else {
            combo = 0;
            score += 1;
            playSound(400, 0.06);
        }

        stack.push({ x: overlapL, w: overlapW, y: stack.length, color: current.color % COLORS.length });
        updateScore(score);
        spawnBlock();
    }

    function update(now) {
        gameLoop = requestAnimationFrame(update);
        if (lastTime < 0) { lastTime = now; return; }
        var dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = 1 / 60;

        // Smooth camera
        var targetCam = Math.max(0, (stack.length - 8) * BLOCK_H);
        cameraY += (targetCam - cameraY) * 4 * dt;

        if (current && !gameOver) {
            current.x += current.speed * current.dir * dt;
            var top = stack[stack.length - 1];
            if (current.x > W) current.dir = -1;
            if (current.x + current.w < 0) current.dir = 1;
        }

        if (dropping) {
            dropping.vy += DROP_SPEED * dt;
            dropping.y -= dropping.vy * dt / BLOCK_H;
        }

        // --- Draw ---
        // Background gradient
        var grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(1, '#0f0f1a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Draw stacked blocks
        for (var i = 0; i < stack.length; i++) {
            drawBlock(stack[i].x, stack[i].y, stack[i].w, stack[i].color);
        }

        // Draw current sliding block
        if (current) {
            drawBlock(current.x, current.y, current.w, current.color);
        }

        // Draw dropping piece
        if (dropping) {
            drawBlock(dropping.x, dropping.y, dropping.w, dropping.color);
        }

        // Combo indicator
        if (combo > 1 && !gameOver) {
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#fff';
            ctx.font = '600 16px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('x' + combo + ' PERFECT', W / 2, H - 50);
            ctx.globalAlpha = 1;
        }

        // Score display on canvas
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '600 48px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(score, W / 2, 60);

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff';
            ctx.font = '600 24px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', W / 2, H / 2 - 30);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '14px Orbitron';
            ctx.fillText('Score: ' + score + '  |  Height: ' + (stack.length - 1), W / 2, H / 2 + 6);
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.font = '12px Orbitron';
            ctx.fillText('SPACE / TAP to retry', W / 2, H / 2 + 36);
        }
    }

    function drawBlock(x, yIndex, w, colorIdx) {
        var screenY = H - (yIndex + 1) * BLOCK_H + cameraY;
        if (screenY > H + BLOCK_H || screenY < -BLOCK_H) return;
        var c = COLORS[colorIdx % COLORS.length];
        var g = ctx.createLinearGradient(x, screenY, x, screenY + BLOCK_H);
        g.addColorStop(0, c[0]);
        g.addColorStop(1, c[1]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x, screenY, w, BLOCK_H - 2, 4);
        ctx.fill();
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 4, screenY + 2, w - 8, 6);
    }

    // --- Input ---
    handleKeyDown = function(e) {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (gameOver) reset();
            else dropBlock();
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    var touchTarget = gameContainer || canvas;
    function onTouch(e) {
        if (typeof isTouchOnUI === 'function' && isTouchOnUI(e)) return;
        e.preventDefault();
        if (gameOver) reset();
        else dropBlock();
    }
    touchTarget.addEventListener('touchstart', onTouch, { passive: false });
    cleanupFunctions.push(function() {
        touchTarget.removeEventListener('touchstart', onTouch);
    });

    reset();
    gameLoop = requestAnimationFrame(update);
}

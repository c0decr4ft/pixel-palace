// === COLOR MATCH — Stroop effect game ===

function initColorMatch() {
    currentGameTitle.textContent = 'COLOR MATCH';
    gameControls.innerHTML = 'Tap the color the word IS, not what it says!';

    var W = 360, H = 500;
    canvas.width = W;
    canvas.height = H;

    var PALETTE = [
        { name: 'RED',    hex: '#ef5350' },
        { name: 'BLUE',   hex: '#42a5f5' },
        { name: 'GREEN',  hex: '#66bb6a' },
        { name: 'YELLOW', hex: '#ffee58' },
        { name: 'PURPLE', hex: '#ab47bc' },
        { name: 'ORANGE', hex: '#ffa726' }
    ];

    var GAME_TIME = 30;
    var wordIdx, colorIdx, options, timeLeft, lastTime;
    var hits, misses, streak, bestStreak, gameOver, started;
    var flashResult, flashTimer;

    function reset() {
        hits = 0;
        misses = 0;
        streak = 0;
        bestStreak = 0;
        timeLeft = GAME_TIME;
        lastTime = -1;
        gameOver = false;
        started = false;
        flashResult = '';
        flashTimer = 0;
        score = 0;
        updateScore(0);
        nextRound();
    }

    function nextRound() {
        wordIdx = Math.floor(Math.random() * PALETTE.length);
        do { colorIdx = Math.floor(Math.random() * PALETTE.length); } while (colorIdx === wordIdx && Math.random() < 0.6);

        // 4 answer buttons, one is the correct color
        var correct = colorIdx;
        var opts = [correct];
        while (opts.length < 4) {
            var r = Math.floor(Math.random() * PALETTE.length);
            if (opts.indexOf(r) === -1) opts.push(r);
        }
        // Shuffle
        for (var i = opts.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
        }
        options = opts;
    }

    function pickOption(idx) {
        if (gameOver) { reset(); return; }
        if (!started) { started = true; }

        if (idx === colorIdx) {
            hits++;
            streak++;
            if (streak > bestStreak) bestStreak = streak;
            score = hits * 10 + bestStreak * 5 - misses * 5;
            if (score < 0) score = 0;
            updateScore(score);
            flashResult = 'correct';
            flashTimer = 0.25;
            playSound(700, 0.06);
        } else {
            misses++;
            streak = 0;
            score = hits * 10 + bestStreak * 5 - misses * 5;
            if (score < 0) score = 0;
            updateScore(score);
            flashResult = 'wrong';
            flashTimer = 0.35;
            playSound(250, 0.08);
        }
        nextRound();
    }

    // Button layout
    var BTN_W = 140, BTN_H = 52, BTN_GAP = 16;
    var BTN_START_Y = 300;
    function btnRect(i) {
        var col = i % 2;
        var row = Math.floor(i / 2);
        var x = (W - BTN_W * 2 - BTN_GAP) / 2 + col * (BTN_W + BTN_GAP);
        var y = BTN_START_Y + row * (BTN_H + BTN_GAP);
        return { x: x, y: y, w: BTN_W, h: BTN_H };
    }

    function hitTest(cx, cy) {
        for (var i = 0; i < options.length; i++) {
            var b = btnRect(i);
            if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
                return options[i];
            }
        }
        return -1;
    }

    function update(now) {
        gameLoop = requestAnimationFrame(update);
        if (lastTime < 0) { lastTime = now; return; }
        var dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = 1 / 60;

        if (flashTimer > 0) flashTimer -= dt;

        if (started && !gameOver) {
            timeLeft -= dt;
            if (timeLeft <= 0) {
                timeLeft = 0;
                gameOver = true;
                playGameOverJingle();
            }
        }

        // --- Draw ---
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#14141f');
        bg.addColorStop(1, '#0a0a12');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Flash feedback
        if (flashTimer > 0) {
            ctx.globalAlpha = flashTimer * 1.5;
            ctx.fillStyle = flashResult === 'correct' ? 'rgba(45,164,78,0.2)' : 'rgba(239,83,80,0.2)';
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
        }

        if (!started && !gameOver) {
            ctx.fillStyle = '#fff';
            ctx.font = '600 18px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('COLOR MATCH', W / 2, H / 2 - 40);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '11px Orbitron';
            ctx.fillText('Tap the color the word IS', W / 2, H / 2 - 10);
            ctx.fillText('NOT what it says!', W / 2, H / 2 + 10);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillText('Tap any answer to begin', W / 2, H / 2 + 40);

            // Draw sample buttons
            for (var i = 0; i < 4 && i < options.length; i++) {
                drawBtn(i);
            }
            drawWord();
            return;
        }

        // Timer bar
        var pct = timeLeft / GAME_TIME;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, 0, W, 4);
        ctx.fillStyle = pct > 0.3 ? '#42a5f5' : '#ef5350';
        ctx.fillRect(0, 0, W * pct, 4);

        // HUD
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px Orbitron';
        ctx.textAlign = 'left';
        ctx.fillText('Streak: ' + streak, 14, 24);
        ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(timeLeft) + 's', W / 2, 24);
        ctx.textAlign = 'right';
        ctx.fillText(hits + '/' + (hits + misses), W - 14, 24);

        if (!gameOver) {
            drawWord();
            for (var i = 0; i < options.length; i++) drawBtn(i);
        }

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff';
            ctx.font = '600 22px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('TIME UP', W / 2, H / 2 - 60);
            ctx.font = '600 40px Orbitron';
            ctx.fillText(score, W / 2, H / 2 - 10);
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.font = '11px Orbitron';
            ctx.fillText(hits + ' correct  |  ' + misses + ' wrong', W / 2, H / 2 + 20);
            ctx.fillText('Best streak: ' + bestStreak, W / 2, H / 2 + 42);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillText('Tap to retry', W / 2, H - 40);
        }
    }

    function drawWord() {
        ctx.fillStyle = PALETTE[colorIdx].hex;
        ctx.font = '900 38px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(PALETTE[wordIdx].name, W / 2, 200);

        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '10px Orbitron';
        ctx.fillText('What COLOR is this word?', W / 2, 240);
    }

    function drawBtn(i) {
        var b = btnRect(i);
        var col = PALETTE[options[i]];
        ctx.fillStyle = col.hex;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, b.w, b.h, 10);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#fff';
        ctx.font = '600 12px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(col.name, b.x + b.w / 2, b.y + b.h / 2 + 4);
    }

    // --- Input ---
    function onClick(e) {
        var rect = canvas.getBoundingClientRect();
        var sx = canvas.width / rect.width;
        var sy = canvas.height / rect.height;
        var cx = (e.clientX - rect.left) * sx;
        var cy = (e.clientY - rect.top) * sy;
        var pick = hitTest(cx, cy);
        if (pick >= 0) pickOption(pick);
        else if (gameOver) reset();
    }
    canvas.addEventListener('click', onClick);
    cleanupFunctions.push(function() { canvas.removeEventListener('click', onClick); });

    var touchTarget = gameContainer || canvas;
    function onTouch(e) {
        if (typeof isTouchOnUI === 'function' && isTouchOnUI(e)) return;
        e.preventDefault();
        var t = e.touches[0];
        var rect = canvas.getBoundingClientRect();
        var sx = canvas.width / rect.width;
        var sy = canvas.height / rect.height;
        var cx = (t.clientX - rect.left) * sx;
        var cy = (t.clientY - rect.top) * sy;
        var pick = hitTest(cx, cy);
        if (pick >= 0) pickOption(pick);
        else if (gameOver) reset();
    }
    touchTarget.addEventListener('touchstart', onTouch, { passive: false });
    cleanupFunctions.push(function() { touchTarget.removeEventListener('touchstart', onTouch); });

    handleKeyDown = function(e) {
        if (gameOver && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); reset(); }
    };
    document.addEventListener('keydown', handleKeyDown);

    reset();
    gameLoop = requestAnimationFrame(update);
}

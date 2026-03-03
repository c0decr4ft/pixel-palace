// === REACTION TEST — How fast can you react? ===

function initReaction() {
    currentGameTitle.textContent = 'REACTION';
    gameControls.innerHTML = 'Wait for green, then tap/click as fast as you can!';

    var W = 360, H = 500;
    canvas.width = W;
    canvas.height = H;

    var STATE_WAIT = 0, STATE_READY = 1, STATE_GO = 2, STATE_RESULT = 3, STATE_EARLY = 4;
    var state, goTime, resultMs, bestMs, round, times, timer;

    function reset() {
        state = STATE_WAIT;
        bestMs = Infinity;
        round = 0;
        times = [];
        timer = null;
        score = 0;
        updateScore(0);
        startRound();
    }

    function startRound() {
        state = STATE_READY;
        if (timer) clearTimeout(timer);
        var delay = 1500 + Math.random() * 3500;
        timer = setTimeout(function() {
            if (state !== STATE_READY) return;
            state = STATE_GO;
            goTime = performance.now();
        }, delay);
    }

    function tap() {
        if (state === STATE_READY) {
            if (timer) clearTimeout(timer);
            state = STATE_EARLY;
            resultMs = 0;
        } else if (state === STATE_GO) {
            resultMs = Math.round(performance.now() - goTime);
            state = STATE_RESULT;
            round++;
            times.push(resultMs);
            if (resultMs < bestMs) bestMs = resultMs;
            score = Math.max(0, 500 - resultMs);
            updateScore(score);
            playSound(700, 0.07);
        } else if (state === STATE_RESULT || state === STATE_EARLY) {
            startRound();
        } else if (state === STATE_WAIT) {
            startRound();
        }
    }

    function avgTime() {
        if (times.length === 0) return 0;
        var sum = 0;
        for (var i = 0; i < times.length; i++) sum += times[i];
        return Math.round(sum / times.length);
    }

    function draw() {
        gameLoop = requestAnimationFrame(draw);

        if (state === STATE_READY) {
            ctx.fillStyle = '#cf222e';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff';
            ctx.font = '600 20px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('Wait...', W / 2, H / 2 - 10);
            ctx.font = '12px Orbitron';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillText('Don\'t tap yet!', W / 2, H / 2 + 20);
        } else if (state === STATE_GO) {
            ctx.fillStyle = '#2da44e';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff';
            ctx.font = '600 22px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('TAP NOW!', W / 2, H / 2 - 10);
        } else if (state === STATE_RESULT) {
            var bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#1a1a2e');
            bg.addColorStop(1, '#0f0f1a');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = '#fff';
            ctx.font = '600 42px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(resultMs + ' ms', W / 2, H / 2 - 40);

            var label = resultMs < 200 ? 'Incredible!' : resultMs < 250 ? 'Great!' : resultMs < 350 ? 'Good' : 'Keep trying';
            ctx.fillStyle = resultMs < 200 ? '#2da44e' : resultMs < 250 ? '#66bb6a' : resultMs < 350 ? '#ffa726' : '#ef5350';
            ctx.font = '600 16px Orbitron';
            ctx.fillText(label, W / 2, H / 2);

            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.font = '11px Orbitron';
            ctx.fillText('Best: ' + (bestMs < Infinity ? bestMs + ' ms' : '---') + '  |  Avg: ' + (avgTime() || '---') + ' ms', W / 2, H / 2 + 30);
            ctx.fillText('Round ' + round, W / 2, H / 2 + 52);

            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.font = '11px Orbitron';
            ctx.fillText('Tap to go again', W / 2, H - 40);
        } else if (state === STATE_EARLY) {
            ctx.fillStyle = '#b35900';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff';
            ctx.font = '600 18px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('Too early!', W / 2, H / 2 - 10);
            ctx.font = '12px Orbitron';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillText('Tap to try again', W / 2, H / 2 + 20);
        } else {
            var bg2 = ctx.createLinearGradient(0, 0, 0, H);
            bg2.addColorStop(0, '#1a1a2e');
            bg2.addColorStop(1, '#0f0f1a');
            ctx.fillStyle = bg2;
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff';
            ctx.font = '600 18px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('REACTION TEST', W / 2, H / 2 - 20);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '12px Orbitron';
            ctx.fillText('Tap to start', W / 2, H / 2 + 14);
        }
    }

    // --- Input ---
    handleKeyDown = function(e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); }
    };
    document.addEventListener('keydown', handleKeyDown);

    canvas.addEventListener('click', tap);
    cleanupFunctions.push(function() {
        canvas.removeEventListener('click', tap);
        if (timer) clearTimeout(timer);
    });

    var touchTarget = gameContainer || canvas;
    function onTouch(e) {
        if (typeof isTouchOnUI === 'function' && isTouchOnUI(e)) return;
        e.preventDefault();
        tap();
    }
    touchTarget.addEventListener('touchstart', onTouch, { passive: false });
    cleanupFunctions.push(function() {
        touchTarget.removeEventListener('touchstart', onTouch);
    });

    state = STATE_WAIT;
    bestMs = Infinity;
    round = 0;
    times = [];
    timer = null;
    score = 0;
    gameLoop = requestAnimationFrame(draw);
}

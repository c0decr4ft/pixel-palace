// === FLAPPY PIXEL (faithful Flappy Bird clone) ===
function initFlappy() {
    currentGameTitle.textContent = 'FLAPPY PIXEL';
    gameControls.innerHTML = 'SPACE / Click / Tap to flap';

    /* --- Canvas --- */
    canvas.width = 288;
    canvas.height = 512;

    /* --- Constants --- */
    const GRAVITY = 0.45;
    const FLAP = -7.5;
    const BIRD_X = 70;
    const BIRD_W = 28;
    const BIRD_H = 20;
    const PIPE_W = 48;
    const PIPE_GAP = 130;
    const PIPE_SPEED = 150;       // px per second
    const PIPE_SPAWN_DIST = 180;  // horizontal distance between pipes
    const GROUND_H = 56;
    const GROUND_SPEED = PIPE_SPEED;
    const CEILING = 0;

    /* --- State --- */
    let birdY, birdVel, birdAngle;
    let pipes, nextPipeX;
    let groundX;
    let playing, dead, started;
    let lastTime;

    function reset() {
        birdY = canvas.height * 0.4;
        birdVel = 0;
        birdAngle = 0;
        pipes = [];
        nextPipeX = canvas.width + 60;
        groundX = 0;
        playing = false;
        dead = false;
        started = false;
        score = 0;
        updateScore(0);
        lastTime = performance.now();
    }
    reset();

    /* --- Input --- */
    function flap() {
        if (dead) { reset(); return; }
        if (!started) started = true;
        if (!playing) playing = true;
        birdVel = FLAP;
        playSound(880, 0.08);
    }

    handleKeyDown = function(e) {
        if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); flap(); }
    };
    document.addEventListener('keydown', handleKeyDown);

    canvas.onclick = flap;
    canvas.addEventListener('touchstart', function(e) { e.preventDefault(); flap(); }, { passive: false });

    /* --- Pipe helpers --- */
    function spawnPipe(x) {
        const minTop = 60;
        const maxTop = canvas.height - GROUND_H - PIPE_GAP - 60;
        const topH = Math.random() * (maxTop - minTop) + minTop;
        pipes.push({ x: x, topH: topH, scored: false });
    }

    /* --- Drawing --- */
    const SKY_TOP = '#1a0a2e';
    const SKY_BOT = '#0d1b3e';

    function drawBg() {
        const g = ctx.createLinearGradient(0, 0, 0, canvas.height - GROUND_H);
        g.addColorStop(0, SKY_TOP);
        g.addColorStop(1, SKY_BOT);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height - GROUND_H);

        /* Stars */
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        for (let i = 0; i < 40; i++) {
            const sx = (i * 53 + 7) % canvas.width;
            const sy = (i * 79 + 13) % (canvas.height - GROUND_H - 40);
            const r = (i % 3 === 0) ? 2 : 1;
            ctx.fillRect(sx, sy, r, r);
        }
    }

    function drawGround() {
        /* Dirt fill */
        const gy = canvas.height - GROUND_H;
        ctx.fillStyle = '#1a3a1a';
        ctx.fillRect(0, gy, canvas.width, GROUND_H);
        /* Grass strip */
        ctx.fillStyle = '#2d8b2d';
        ctx.fillRect(0, gy, canvas.width, 6);
        /* Scrolling grass ticks */
        ctx.fillStyle = '#40ad40';
        const offset = Math.floor(groundX) % 24;
        for (let x = -offset; x < canvas.width; x += 24) {
            ctx.fillRect(x, gy, 12, 4);
        }
    }

    function drawPipe(px, topH) {
        const capH = 8;
        const capOver = 4;
        const botY = topH + PIPE_GAP;
        const botH = canvas.height - GROUND_H - botY;

        /* Top pipe body */
        ctx.fillStyle = '#0d6e0d';
        ctx.fillRect(px, 0, PIPE_W, topH);
        /* Top pipe cap */
        ctx.fillStyle = '#0a8a0a';
        ctx.fillRect(px - capOver, topH - capH, PIPE_W + capOver * 2, capH);
        /* Top pipe highlight */
        ctx.fillStyle = '#10b010';
        ctx.fillRect(px + 4, 0, 6, topH - capH);

        /* Bottom pipe body */
        ctx.fillStyle = '#0d6e0d';
        ctx.fillRect(px, botY, PIPE_W, botH);
        /* Bottom pipe cap */
        ctx.fillStyle = '#0a8a0a';
        ctx.fillRect(px - capOver, botY, PIPE_W + capOver * 2, capH);
        /* Bottom pipe highlight */
        ctx.fillStyle = '#10b010';
        ctx.fillRect(px + 4, botY + capH, 6, botH - capH);
    }

    function drawBird(y, angle) {
        ctx.save();
        ctx.translate(BIRD_X + BIRD_W / 2, y + BIRD_H / 2);
        ctx.rotate(angle);

        /* Body */
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(-BIRD_W / 2, -BIRD_H / 2, BIRD_W, BIRD_H);

        /* Wing */
        const wingY = Math.sin(performance.now() / 80) > 0 ? -2 : 2;
        ctx.fillStyle = '#e6a800';
        ctx.fillRect(-BIRD_W / 2 + 2, wingY - 3, 12, 6);

        /* Eye */
        ctx.fillStyle = '#fff';
        ctx.fillRect(BIRD_W / 2 - 10, -BIRD_H / 2 + 2, 7, 7);
        ctx.fillStyle = '#000';
        ctx.fillRect(BIRD_W / 2 - 7, -BIRD_H / 2 + 4, 4, 4);

        /* Beak */
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(BIRD_W / 2 - 2, 0, 8, 5);

        ctx.restore();
    }

    function drawScore() {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.font = '32px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.strokeText(score, canvas.width / 2, 50);
        ctx.fillText(score, canvas.width / 2, 50);
    }

    function drawGetReady() {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('TAP TO START', canvas.width / 2, canvas.height / 2 + 20);
        /* Bouncing arrow */
        const bounce = Math.sin(performance.now() / 300) * 6;
        ctx.fillStyle = var_neonCyan || '#00ffff';
        ctx.font = '20px "Press Start 2P"';
        ctx.fillText('^', canvas.width / 2, canvas.height / 2 - 10 + bounce);
    }

    function drawGameOver() {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#ff3366';
        ctx.font = '20px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);

        ctx.fillStyle = '#fff';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 5);

        ctx.fillStyle = '#ffcc00';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText('TAP TO RETRY', canvas.width / 2, canvas.height / 2 + 35);
    }

    /* Grab CSS variable for neon cyan (fallback) */
    const var_neonCyan = getComputedStyle(document.documentElement).getPropertyValue('--neon-cyan').trim() || '#00ffff';

    /* --- Collision --- */
    function checkCollision() {
        const bx = BIRD_X;
        const by = birdY;
        /* Ground / ceiling */
        if (by + BIRD_H >= canvas.height - GROUND_H || by <= CEILING) return true;
        /* Pipes */
        for (const p of pipes) {
            if (bx + BIRD_W > p.x && bx < p.x + PIPE_W) {
                if (by < p.topH || by + BIRD_H > p.topH + PIPE_GAP) return true;
            }
        }
        return false;
    }

    /* --- Main loop --- */
    function loop() {
        const now = performance.now();
        let dt = (now - lastTime) / 1000;
        if (dt > 0.1) dt = 0.1; // clamp after pause / tab switch
        lastTime = now;

        /* --- Update --- */
        if (playing && !dead) {
            /* Bird physics */
            birdVel += GRAVITY;
            birdY += birdVel;
            /* Tilt: up when rising, down when falling */
            const targetAngle = birdVel < 0 ? -0.4 : Math.min(birdVel * 0.08, 1.4);
            birdAngle += (targetAngle - birdAngle) * 0.15;

            /* Move pipes */
            for (const p of pipes) {
                p.x -= PIPE_SPEED * dt;
                /* Score */
                if (!p.scored && p.x + PIPE_W < BIRD_X) {
                    p.scored = true;
                    score++;
                    updateScore(score);
                    playSound(660, 0.06);
                }
            }
            /* Remove off-screen pipes */
            if (pipes.length && pipes[0].x + PIPE_W < -10) pipes.shift();

            /* Spawn pipes */
            if (pipes.length === 0 || pipes[pipes.length - 1].x <= canvas.width - PIPE_SPAWN_DIST) {
                spawnPipe(canvas.width);
            }

            /* Scroll ground */
            groundX += GROUND_SPEED * dt;

            /* Collision */
            if (checkCollision()) {
                dead = true;
                playing = false;
                playSound(200, 0.3);
            }
        } else if (!started) {
            /* Idle bob */
            birdY = canvas.height * 0.4 + Math.sin(performance.now() / 300) * 8;
            birdAngle = 0;
            groundX += GROUND_SPEED * dt;
        }

        /* --- Draw --- */
        drawBg();
        for (const p of pipes) drawPipe(p.x, p.topH);
        drawGround();
        drawBird(birdY, birdAngle);
        drawScore();

        if (!started) drawGetReady();
        if (dead) drawGameOver();

        gameLoop = requestAnimationFrame(loop);
    }

    gameLoop = requestAnimationFrame(loop);
}

// === SNAKE GAME ===
function initSnake() {
    currentGameTitle.textContent = 'SNAKE';
    gameControls.innerHTML = 'Arrow Keys or WASD to move';
    
    canvas.width = 360;
    canvas.height = 360;
    
    const gridSize = 20;
    const tileCount = canvas.width / gridSize;
    
    let snake = [{x: 9, y: 9}];
    let direction = {x: 0, y: 0};
    let food = spawnFood();
    let gameOver = false;
    
    /* ---- Scissor power-up ---- */
    const SCISSOR_SPAWN_MIN = 8;    // min food eaten before first scissor
    const SCISSOR_SPAWN_CHANCE = 0.12; // chance per tick when eligible
    const SCISSOR_LIFETIME = 40;     // ticks before it disappears
    const SCISSOR_CUT = 4;           // segments removed
    let scissor = null;              // { x, y, ticksLeft }
    let foodEaten = 0;
    let scissorFlash = 0;            // flash timer when collected
    
    function spawnScissor() {
        if (scissor) return;
        let x, y;
        for (let tries = 0; tries < 50; tries++) {
            x = Math.floor(Math.random() * tileCount);
            y = Math.floor(Math.random() * tileCount);
            if (!snake.some(s => s.x === x && s.y === y) &&
                !(food.x === x && food.y === y)) {
                scissor = { x, y, ticksLeft: SCISSOR_LIFETIME };
                return;
            }
        }
    }
    
    function spawnFood() {
        let x, y;
        for (let tries = 0; tries < 50; tries++) {
            x = Math.floor(Math.random() * tileCount);
            y = Math.floor(Math.random() * tileCount);
            if (!snake.some(s => s.x === x && s.y === y)) return { x, y };
        }
        for (let yy = 0; yy < tileCount; yy++)
            for (let xx = 0; xx < tileCount; xx++)
                if (!snake.some(s => s.x === xx && s.y === yy)) return { x: xx, y: yy };
        return { x: 0, y: 0 };
    }
    
    handleKeyDown = (e) => {
        // Restart on space when game over
        if (gameOver && e.key === ' ') {
            e.preventDefault();
            stopGame();
            startGame('snake');
            return;
        }
        
        switch(e.key) {
            case 'ArrowUp': case 'w': case 'W':
                e.preventDefault();
                if (direction.y !== 1) direction = {x: 0, y: -1};
                break;
            case 'ArrowDown': case 's': case 'S':
                e.preventDefault();
                if (direction.y !== -1) direction = {x: 0, y: 1};
                break;
            case 'ArrowLeft': case 'a': case 'A':
                e.preventDefault();
                if (direction.x !== 1) direction = {x: -1, y: 0};
                break;
            case 'ArrowRight': case 'd': case 'D':
                e.preventDefault();
                if (direction.x !== -1) direction = {x: 1, y: 0};
                break;
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    /* Swipe gesture detection — swipe anywhere on screen to change direction */
    let swipeStartX = null;
    let swipeStartY = null;
    const SWIPE_MIN = 20; // minimum px to count as a swipe

    function onSwipeStart(e) {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
    }
    function onSwipeMove(e) {
        if (swipeStartX !== null) e.preventDefault();
    }
    function onSwipeEnd(e) {
        if (swipeStartX === null || swipeStartY === null) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - swipeStartX;
        const dy = t.clientY - swipeStartY;
        swipeStartX = null;
        swipeStartY = null;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (Math.max(ax, ay) < SWIPE_MIN) return;
        if (ax >= ay) {
            if (dx > 0 && direction.x !== -1) direction = { x: 1, y: 0 };
            else if (dx < 0 && direction.x !== 1) direction = { x: -1, y: 0 };
        } else {
            if (dy > 0 && direction.y !== -1) direction = { x: 0, y: 1 };
            else if (dy < 0 && direction.y !== 1) direction = { x: 0, y: -1 };
        }
    }

    const swipeTarget = gameContainer || canvas;
    swipeTarget.addEventListener('touchstart', onSwipeStart, { passive: false });
    swipeTarget.addEventListener('touchmove', onSwipeMove, { passive: false });
    swipeTarget.addEventListener('touchend', onSwipeEnd, { passive: false });

    cleanupFunctions.push(() => {
        swipeTarget.removeEventListener('touchstart', onSwipeStart);
        swipeTarget.removeEventListener('touchmove', onSwipeMove);
        swipeTarget.removeEventListener('touchend', onSwipeEnd);
    });
    
    let lastTime = 0;
    const isTouch = matchMedia('(pointer: coarse)').matches;
    const BASE_SPEED = isTouch ? 380 : 300;   // ms per tick at start
    const MIN_SPEED = isTouch ? 150 : 120;    // fastest possible (ms per tick)
    const SPEED_PER_FOOD = isTouch ? 1.5 : 1; // ms faster per food eaten (very gradual)
    
    function currentSpeed() {
        // Snake starts at length 1, each food adds 1 segment
        const eaten = Math.max(0, snake.length - 1);
        return Math.max(MIN_SPEED, BASE_SPEED - eaten * SPEED_PER_FOOD);
    }
    
    function update(currentTime) {
        gameLoop = requestAnimationFrame(update);
        
        const gameSpeed = currentSpeed();
        if (currentTime - lastTime < gameSpeed) return;
        // If we fell way behind (e.g. device rotation, tab switch), skip ahead
        // instead of fast-forwarding many ticks at once
        if (currentTime - lastTime > gameSpeed * 2) lastTime = currentTime;
        else lastTime += gameSpeed;
        
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ff00ff';
            ctx.font = '30px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
            ctx.font = '12px "Press Start 2P"';
            ctx.fillStyle = '#ffff00';
            ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 40);
            return;
        }
        
        // Move snake
        if (direction.x !== 0 || direction.y !== 0) {
            const head = {
                x: snake[0].x + direction.x,
                y: snake[0].y + direction.y
            };
            
            // Check wall collision
            if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
                gameOver = true;
                playSound(100, 0.5);
                return;
            }
            
            // Check self collision
            for (let segment of snake) {
                if (head.x === segment.x && head.y === segment.y) {
                    gameOver = true;
                    playSound(100, 0.5);
                    return;
                }
            }
            
            snake.unshift(head);
            
            // Check food collision
            if (head.x === food.x && head.y === food.y) {
                updateScore(score + 10);
                food = spawnFood();
                foodEaten++;
                playSound(600, 0.1);
            } else {
                snake.pop();
            }
            
            // Check scissor collision
            if (scissor && head.x === scissor.x && head.y === scissor.y) {
                const cut = Math.min(SCISSOR_CUT, snake.length - 2); // keep at least head + 1
                if (cut > 0) {
                    snake.splice(snake.length - cut, cut);
                    scissorFlash = 6; // flash for 6 ticks
                }
                scissor = null;
                playSound(900, 0.15);
                playSound(700, 0.1);
            }
            
            // Scissor spawning & lifetime
            if (scissor) {
                scissor.ticksLeft--;
                if (scissor.ticksLeft <= 0) scissor = null;
            } else if (foodEaten >= SCISSOR_SPAWN_MIN && snake.length > 5 && Math.random() < SCISSOR_SPAWN_CHANCE) {
                spawnScissor();
            }
        }
        
        if (scissorFlash > 0) scissorFlash--;
        
        // Draw
        ctx.fillStyle = '#001100';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = '#002200';
        for (let i = 0; i < tileCount; i++) {
            ctx.beginPath();
            ctx.moveTo(i * gridSize, 0);
            ctx.lineTo(i * gridSize, canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * gridSize);
            ctx.lineTo(canvas.width, i * gridSize);
            ctx.stroke();
        }
        
        // Food — glow via layered circles (no shadowBlur)
        const fx = food.x * gridSize + gridSize / 2;
        const fy = food.y * gridSize + gridSize / 2;
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(fx, fy, gridSize / 2 + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(fx, fy, gridSize / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        // Food highlight
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ff6666';
        ctx.beginPath();
        ctx.arc(fx - 2, fy - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Scissor power-up
        if (scissor) {
            const scx = scissor.x * gridSize;
            const scy = scissor.y * gridSize;
            const blink = scissor.ticksLeft <= 10 ? (scissor.ticksLeft % 2 === 0) : true;
            if (blink) {
                // Glow
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(scx - 2, scy - 2, gridSize + 4, gridSize + 4);
                ctx.globalAlpha = 1;
                // Scissor icon: two blades + pivot
                ctx.fillStyle = '#ffdd00';
                // Left blade
                ctx.beginPath();
                ctx.moveTo(scx + 4, scy + 3);
                ctx.lineTo(scx + 10, scy + 10);
                ctx.lineTo(scx + 7, scy + 12);
                ctx.lineTo(scx + 2, scy + 5);
                ctx.closePath();
                ctx.fill();
                // Right blade
                ctx.beginPath();
                ctx.moveTo(scx + 16, scy + 3);
                ctx.lineTo(scx + 10, scy + 10);
                ctx.lineTo(scx + 13, scy + 12);
                ctx.lineTo(scx + 18, scy + 5);
                ctx.closePath();
                ctx.fill();
                // Handles
                ctx.fillStyle = '#cc8800';
                ctx.beginPath();
                ctx.arc(scx + 4, scy + 15, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(scx + 16, scy + 15, 3, 0, Math.PI * 2);
                ctx.fill();
                // Pivot dot
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(scx + 10, scy + 10, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Scissor flash effect — brief green flash when collected
        if (scissorFlash > 0) {
            ctx.globalAlpha = 0.12 * scissorFlash;
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }
        
        // Snake body — solid fills with head highlight (no shadowBlur/gradients)
        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            const sx = seg.x * gridSize;
            const sy = seg.y * gridSize;
            if (i === 0) {
                // Head glow
                ctx.globalAlpha = 0.15;
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(sx - 1, sy - 1, gridSize + 2, gridSize + 2);
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(sx + 1, sy + 1, gridSize - 2, gridSize - 2);
                // Eyes
                ctx.fillStyle = '#001100';
                if (direction.x === 1) { ctx.fillRect(sx + 14, sy + 4, 3, 3); ctx.fillRect(sx + 14, sy + 13, 3, 3); }
                else if (direction.x === -1) { ctx.fillRect(sx + 3, sy + 4, 3, 3); ctx.fillRect(sx + 3, sy + 13, 3, 3); }
                else if (direction.y === -1) { ctx.fillRect(sx + 4, sy + 3, 3, 3); ctx.fillRect(sx + 13, sy + 3, 3, 3); }
                else { ctx.fillRect(sx + 4, sy + 14, 3, 3); ctx.fillRect(sx + 13, sy + 14, 3, 3); }
            } else {
                // Body — slightly darker toward the tail
                const bright = Math.max(100, 255 - i * 4);
                ctx.fillStyle = 'rgb(0,' + bright + ',0)';
                ctx.fillRect(sx + 1, sy + 1, gridSize - 2, gridSize - 2);
            }
        }
    }
    
    gameLoop = requestAnimationFrame(update);
}


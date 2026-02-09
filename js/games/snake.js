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

    addTouchDpad({
        onLeft: (pressed) => { if (pressed && direction.x !== 1) direction = { x: -1, y: 0 }; },
        onRight: (pressed) => { if (pressed && direction.x !== -1) direction = { x: 1, y: 0 }; },
        onUp: (pressed) => { if (pressed && direction.y !== 1) direction = { x: 0, y: -1 }; },
        onDown: (pressed) => { if (pressed && direction.y !== -1) direction = { x: 0, y: 1 }; },
        snapCardinal: true
    });
    
    let lastTime = 0;
    const gameSpeed = 200;
    
    function update(currentTime) {
        gameLoop = requestAnimationFrame(update);
        
        if (currentTime - lastTime < gameSpeed) return;
        lastTime += gameSpeed;
        
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
                playSound(600, 0.1);
            } else {
                snake.pop();
            }
        }
        
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


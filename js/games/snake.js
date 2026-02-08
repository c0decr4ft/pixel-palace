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
                if (direction.y !== 1) direction = {x: 0, y: -1};
                break;
            case 'ArrowDown': case 's': case 'S':
                if (direction.y !== -1) direction = {x: 0, y: 1};
                break;
            case 'ArrowLeft': case 'a': case 'A':
                if (direction.x !== 1) direction = {x: -1, y: 0};
                break;
            case 'ArrowRight': case 'd': case 'D':
                if (direction.x !== -1) direction = {x: 1, y: 0};
                break;
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    addTouchDpad({
        onLeft: (pressed) => { if (pressed && direction.x !== 1) direction = { x: -1, y: 0 }; },
        onRight: (pressed) => { if (pressed && direction.x !== -1) direction = { x: 1, y: 0 }; },
        onUp: (pressed) => { if (pressed && direction.y !== 1) direction = { x: 0, y: -1 }; },
        onDown: (pressed) => { if (pressed && direction.y !== -1) direction = { x: 0, y: 1 }; }
    });
    
    let lastTime = 0;
    const gameSpeed = 150;
    
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
        
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(
            food.x * gridSize + gridSize/2,
            food.y * gridSize + gridSize/2,
            gridSize/2 - 2,
            0, Math.PI * 2
        );
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        snake.forEach((segment, index) => {
            const gradient = ctx.createRadialGradient(
                segment.x * gridSize + gridSize/2,
                segment.y * gridSize + gridSize/2,
                0,
                segment.x * gridSize + gridSize/2,
                segment.y * gridSize + gridSize/2,
                gridSize/2
            );
            gradient.addColorStop(0, '#00ff00');
            gradient.addColorStop(1, '#00aa00');
            ctx.fillStyle = gradient;
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = index === 0 ? 6 : 2;
            ctx.fillRect(
                segment.x * gridSize + 1,
                segment.y * gridSize + 1,
                gridSize - 2,
                gridSize - 2
            );
        });
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
    }
    
    gameLoop = requestAnimationFrame(update);
}


// === MEMORY GAME ===
function initMemory() {
    currentGameTitle.textContent = 'MEMORY';
    gameControls.innerHTML = 'Click cards to match pairs';
    
    canvas.width = 250;
    canvas.height = 250;
    
    const symbols = ['★', '♦', '♣', '♥', '●', '■', '▲', '◆'];
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#88ff00'];
    
    let cards = [];
    const rows = 4;
    const cols = 4;
    const cardWidth = 52;
    const cardHeight = 52;
    const padding = 8;
    
    // Create pairs
    let pairs = [];
    for (let i = 0; i < 8; i++) {
        pairs.push({ symbol: symbols[i], color: colors[i] });
        pairs.push({ symbol: symbols[i], color: colors[i] });
    }
    
    // Shuffle
    pairs.sort(() => Math.random() - 0.5);
    
    // Create cards
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const pair = pairs[r * cols + c];
            cards.push({
                x: c * (cardWidth + padding) + 9,
                y: r * (cardHeight + padding) + 9,
                symbol: pair.symbol,
                color: pair.color,
                flipped: false,
                matched: false
            });
        }
    }
    
    let flippedCards = [];
    let canClick = true;
    let moves = 0;
    
    function handleCardTap(e) {
        if (!canClick) return;
        const coords = e.touches ? getEventCanvasCoords(e) : (() => {
            const rect = canvas.getBoundingClientRect();
            if (!rect.width || !rect.height) return null;
            return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
        })();
        if (!coords) return;
        const mouseX = coords.x, mouseY = coords.y;
        
        for (let card of cards) {
            if (mouseX >= card.x && mouseX <= card.x + cardWidth &&
                mouseY >= card.y && mouseY <= card.y + cardHeight &&
                !card.flipped && !card.matched) {
                
                card.flipped = true;
                flippedCards.push(card);
                playSound(500, 0.1);
                
                if (flippedCards.length === 2) {
                    moves++;
                    canClick = false;
                    
                    if (flippedCards[0].symbol === flippedCards[1].symbol) {
                        flippedCards[0].matched = true;
                        flippedCards[1].matched = true;
                        flippedCards = [];
                        canClick = true;
                        updateScore(score + 50);
                        playSound(800, 0.2);
                        
                        // Check win
                        if (cards.every(c => c.matched)) {
                            setTimeout(() => {
                                alert(`You won in ${moves} moves!`);
                            }, 500);
                        }
                    } else {
                        setTimeout(() => {
                            flippedCards[0].flipped = false;
                            flippedCards[1].flipped = false;
                            flippedCards = [];
                            canClick = true;
                        }, 1000);
                    }
                }
                break;
            }
        }
    }
    canvas.onclick = (e) => handleCardTap(e);
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length) { e.preventDefault(); handleCardTap(e); }
    }, { passive: false });
    
    function draw() {
        gameLoop = requestAnimationFrame(draw);
        
        ctx.fillStyle = '#1a0030';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let card of cards) {
            if (card.flipped || card.matched) {
                // Show card
                ctx.fillStyle = '#222';
                ctx.strokeStyle = card.color;
                ctx.lineWidth = 3;
                ctx.shadowColor = card.color;
                ctx.shadowBlur = card.matched ? 20 : 10;
                ctx.fillRect(card.x, card.y, cardWidth, cardHeight);
                ctx.strokeRect(card.x, card.y, cardWidth, cardHeight);
                
                ctx.fillStyle = card.color;
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(card.symbol, card.x + cardWidth/2, card.y + cardHeight/2);
            } else {
                // Card back
                ctx.fillStyle = '#ff00ff';
                ctx.shadowColor = '#ff00ff';
                ctx.shadowBlur = 5;
                ctx.fillRect(card.x, card.y, cardWidth, cardHeight);
                ctx.strokeStyle = '#aa00aa';
                ctx.lineWidth = 3;
                ctx.strokeRect(card.x + 5, card.y + 5, cardWidth - 10, cardHeight - 10);
                
                ctx.fillStyle = '#aa00aa';
                ctx.font = '18px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', card.x + cardWidth/2, card.y + cardHeight/2);
            }
        }
        ctx.shadowBlur = 0;
    }
    
    gameLoop = requestAnimationFrame(draw);
}


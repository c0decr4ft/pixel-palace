// === MEMORY TWO — Matrix / Hacker theme ===
function initMemory2() {
    currentGameTitle.textContent = 'MEMORY';
    gameControls.innerHTML = 'Click tiles to reveal & match pairs';

    canvas.width = 460;
    canvas.height = 460;

    const symbols = ['⚡', '☆', '◈', '⬡', '⊕', '♠', '✧', '⚙', '☄', '♜'];
    const colors = [
        '#00ff41', '#39ff14', '#0ff0fc', '#ff003c',
        '#ffd700', '#ff6ec7', '#7df9ff', '#ff8c00',
        '#b4ff39', '#e0aaff'
    ];

    let cards = [];
    const rows = 4;
    const cols = 5;
    const cardW = 76;
    const cardH = 92;
    const pad = 12;
    const gridW = cols * (cardW + pad) - pad;
    const gridH = rows * (cardH + pad) - pad;
    const offX = Math.floor((canvas.width - gridW) / 2);
    const offY = Math.floor((canvas.height - gridH) / 2);

    // Create 10 pairs
    let pairs = [];
    for (let i = 0; i < 10; i++) {
        pairs.push({ symbol: symbols[i], color: colors[i] });
        pairs.push({ symbol: symbols[i], color: colors[i] });
    }
    // Shuffle
    for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = pairs[i]; pairs[i] = pairs[j]; pairs[j] = tmp;
    }

    // Build card grid
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const p = pairs[r * cols + c];
            cards.push({
                x: c * (cardW + pad) + offX,
                y: r * (cardH + pad) + offY,
                symbol: p.symbol,
                color: p.color,
                flipped: false,
                matched: false,
                matchAnim: 0
            });
        }
    }

    let flippedCards = [];
    let canClick = true;
    let moves = 0;
    let matchedCount = 0;
    let won = false;
    let wonTime = 0;

    let flipTimer = null;

    /* Use shared getEventCanvasCoords from core.js — handles borders + object-fit */

    function handleTap(e) {
        if (!canClick || won) return;
        const coords = getEventCanvasCoords(e);
        if (!coords) return;

        for (let card of cards) {
            if (coords.x >= card.x && coords.x <= card.x + cardW &&
                coords.y >= card.y && coords.y <= card.y + cardH &&
                !card.flipped && !card.matched) {

                card.flipped = true;
                flippedCards.push(card);
                playSound(600 + Math.random() * 200, 0.06);

                if (flippedCards.length === 2) {
                    moves++;
                    canClick = false;
                    if (flippedCards[0].symbol === flippedCards[1].symbol) {
                        // Match!
                        const m0 = flippedCards[0], m1 = flippedCards[1];
                        m0.matched = true;
                        m1.matched = true;
                        m0.matchAnim = 1;
                        m1.matchAnim = 1;
                        matchedCount += 2;
                        updateScore(score + 50);
                        playSound(880, 0.12);
                        flippedCards = [];
                        canClick = true;
                        if (matchedCount >= cards.length) {
                            won = true;
                            wonTime = performance.now();
                            playSound(1200, 0.3);
                        }
                    } else {
                        // No match — flip back after delay
                        flipTimer = setTimeout(() => {
                            flippedCards[0].flipped = false;
                            flippedCards[1].flipped = false;
                            flippedCards = [];
                            canClick = true;
                            flipTimer = null;
                        }, 600);
                    }
                }
                break;
            }
        }
    }

    function onTouchTap(e) {
        if (e.touches.length) { e.preventDefault(); handleTap(e); }
    }
    canvas.onclick = (e) => handleTap(e);
    canvas.addEventListener('touchstart', onTouchTap, { passive: false });

    // Proper cleanup so listeners don't leak between game restarts
    cleanupFunctions.push(function() {
        canvas.removeEventListener('touchstart', onTouchTap);
        if (flipTimer) { clearTimeout(flipTimer); flipTimer = null; }
    });

    /* Scrolling matrix rain columns (decorative) */
    const rainCols = [];
    for (let i = 0; i < 24; i++) {
        rainCols.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: 30 + Math.random() * 50,
            chars: '01'.split('')
        });
    }

    let lastTime = performance.now();

    function draw(now) {
        gameLoop = requestAnimationFrame(draw);
        let dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.1) dt = 1/60;

        // Background
        ctx.fillStyle = '#050d05';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subtle matrix rain
        ctx.font = '14px monospace';
        ctx.fillStyle = 'rgba(0,255,65,0.07)';
        for (const col of rainCols) {
            col.y += col.speed * dt;
            if (col.y > canvas.height + 20) { col.y = -10; col.x = Math.random() * canvas.width; }
            const ch = col.chars[Math.floor(now / 200 + col.x) % col.chars.length];
            ctx.fillText(ch, col.x, col.y);
        }

        // Draw cards
        for (let card of cards) {
            // Decay match animation
            if (card.matchAnim > 0) card.matchAnim = Math.max(0, card.matchAnim - dt * 2);

            if (card.flipped || card.matched) {
                // Revealed card
                const glow = card.matched ? 0.25 + card.matchAnim * 0.4 : 0.12;
                // Glow behind
                ctx.globalAlpha = glow;
                ctx.fillStyle = card.color;
                ctx.fillRect(card.x - 3, card.y - 3, cardW + 6, cardH + 6);
                ctx.globalAlpha = 1;
                // Card bg
                ctx.fillStyle = '#0a1a0a';
                ctx.fillRect(card.x, card.y, cardW, cardH);
                // Border
                ctx.strokeStyle = card.color;
                ctx.lineWidth = card.matched ? 3 : 1.5;
                ctx.strokeRect(card.x, card.y, cardW, cardH);
                // Symbol
                ctx.fillStyle = card.color;
                ctx.font = '32px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(card.symbol, card.x + cardW / 2, card.y + cardH / 2);
            } else {
                // Hidden card — green circuit-style back
                ctx.fillStyle = '#0b2e0b';
                ctx.fillRect(card.x, card.y, cardW, cardH);
                ctx.strokeStyle = '#1a5c1a';
                ctx.lineWidth = 1;
                ctx.strokeRect(card.x, card.y, cardW, cardH);
                // Inner grid pattern
                ctx.strokeStyle = 'rgba(0,255,65,0.12)';
                ctx.lineWidth = 1;
                const cx = card.x + cardW / 2;
                const cy = card.y + cardH / 2;
                ctx.beginPath();
                ctx.moveTo(card.x + 12, cy); ctx.lineTo(card.x + cardW - 12, cy);
                ctx.moveTo(cx, card.y + 12); ctx.lineTo(cx, card.y + cardH - 12);
                ctx.stroke();
                // Center dot
                ctx.fillStyle = '#00ff41';
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(cx, cy, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // HUD: moves counter
        ctx.fillStyle = '#00ff41';
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('MOVES: ' + moves, 8, 6);
        ctx.textAlign = 'right';
        ctx.fillText(matchedCount / 2 + '/' + (cards.length / 2), canvas.width - 8, 6);

        // Win overlay
        if (won) {
            const t = (now - wonTime) / 1000;
            ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.7, t * 2) + ')';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#00ff41';
            ctx.font = '28px "Press Start 2P"';
            ctx.fillText('DECODED!', canvas.width / 2, canvas.height / 2 - 24);
            ctx.fillStyle = '#7df9ff';
            ctx.font = '14px "Press Start 2P"';
            ctx.fillText(moves + ' moves', canvas.width / 2, canvas.height / 2 + 20);
        }
    }

    gameLoop = requestAnimationFrame(draw);
}

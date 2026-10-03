// === MY FIRST GAME — Godot 4 web export (iframe) ===

function initFirstGame() {
    currentGameTitle.textContent = 'MY FIRST GAME';
    gameControls.innerHTML = 'Arrow keys / WASD to move &mdash; Space or Enter to jump';

    var playArea = gameContainer.querySelector('.game-play-area');
    if (!playArea) {
        console.error('PIXEL PALACE: game-play-area missing for My First Game.');
        return;
    }

    gameContainer.classList.add('godot-mode');

    var frame = document.createElement('iframe');
    frame.className = 'godot-frame';
    frame.src = 'godot/first-game/index.html';
    frame.title = 'My First Game';
    frame.allow = 'autoplay; gamepad; fullscreen';
    frame.setAttribute('allowfullscreen', '');
    playArea.appendChild(frame);

    frame.addEventListener('load', function() {
        try { frame.focus(); } catch (e) {}
    });

    cleanupFunctions.push(function() {
        try { frame.remove(); } catch (e) {}
        gameContainer.classList.remove('godot-mode');
    });
}

// === MY FIRST GAME — Godot 4 web export ===
// Must open as a full page. Pixel Palace CSP sets frame-src 'none', so an
// iframe shows Chrome's "This content is blocked" error.

function initFirstGame() {
    // Resolve relative to the current page so GitHub Pages project sites work
    // (e.g. /pixel-palace/index.html → /pixel-palace/godot/first-game/index.html)
    var target = new URL('godot/first-game/index.html', window.location.href).href;
    window.location.assign(target);
}

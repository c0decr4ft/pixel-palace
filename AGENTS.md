# AGENTS.md - Information for AI Agents

This document provides essential information about the PIXEL PALACE project for AI agents and automated systems.

## Project Overview

**PIXEL PALACE** is a web-based retro arcade game center built with vanilla JavaScript, HTML, and CSS. It features 19+ classic arcade games with a nostalgic neon aesthetic and CRT-style visual effects.

## Technology Stack

- **Frontend**: Pure vanilla JavaScript (ES6+), HTML5, CSS3
- **External Dependencies**: 
  - PeerJS (v1.5.2) - For multiplayer functionality (loaded via CDN)
  - Google Fonts - Press Start 2P and Orbitron fonts
- **No Build Tools**: The project runs directly in the browser without compilation
- **No Package Manager**: No npm, yarn, or other package managers required

## File Structure

```
pixel-palace/
├── index.html          # Main entry point, contains game lobby UI
├── styles.css          # All CSS styling, includes animations
├── js/
│   ├── core.js        # Shared globals, lobby, startGame/stopGame, audio, touch helpers
│   └── games/         # One file per game (each exports init via global)
│       ├── snake.js
│       ├── tetris.js
│       ├── pong.js
│       ├── tron.js
│       ├── breakout.js
│       ├── spaceinvaders.js
│       ├── memory.js
│       ├── flappy.js
│       ├── 2048.js
│       ├── simonsays.js
│       ├── frogger.js
│       ├── tictactoe.js
│       └── pacman.js
├── README.md
├── AGENTS.md
└── LICENSE
```

## Key Components

### index.html
- Main HTML structure
- Game lobby with category tabs
- Game cabinet grid layout
- Game creator modal
- Game container for active gameplay
- Footer with credits

### styles.css
- CSS variables for theming (neon colors, dark purple backgrounds)
- CRT scanlines and noise effects
- Neon glow animations
- Game cabinet styling
- Responsive design breakpoints
- Futuristic game cabinet variants

### js/core.js
- DOM refs, audio (playSound, arcade music), SFX/music toggles
- startGame(gameName) / stopGame(), updateScore()
- Touch helpers: addTouchDpad, getEventCanvasCoords, clearTouchControls
- Lobby: category filter, play-btn handlers, back button

### js/games/*.js
- Each file defines one global: `function initSnake()`, `function initTetris()`, etc.
- Game loop implementations
- Input handling (keyboard, mouse, touch)
- Score tracking
- Audio effects (Web Audio API)
- Multiplayer support (PeerJS)
- Game creator functionality
- LocalStorage for custom games

## Game List

The project includes the following games:

1. **Snake** - Classic snake game
2. **Tetris** - Block stacking puzzle
3. **Pong** - Paddle tennis game
4. **Breakout** - Brick breaking game
5. **Space Invaders** - Alien shooter
6. **Memory** - Card matching game
7. **Flappy Pixel** - Flappy Bird clone
8. **2048** - Number merging puzzle
9. **Cyber Arena** - Multiplayer target shooter
10. **Neon Kart** - Online PvP racing
11. **Tank Wars** - Online PvP tank battle
12. **Mine Scan** - Minesweeper variant
13. **Quad Link** - Connect 4 game
14. **Holo Stack** - Tower building game
15. **Void Hunter** - Asteroids-style space game
16. **Holo Draw** - Multiplayer drawing game
17. **Bio Hazard** - Zombie survival game
18. **Neon Dash** - Infinite runner
19. **Cipher Code** - Wordle-style word game
20. **Apex Zone** - Battle royale game

## Architecture Patterns

### Game Initialization
Each game follows a pattern:
```javascript
function initGameName() {
    // Setup canvas, variables, initial state
    // Register event listeners
    // Start game loop
}
```

### Game Loop Pattern
```javascript
function gameLoop() {
    // Update game state
    // Render graphics
    // Check win/lose conditions
    // Request next frame
}
```

### State Management
- Global variables for current game state
- Score tracking via `updateScore()` function
- Cleanup functions array for proper resource management

## Dependencies

### External CDN Resources
- `https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js` - PeerJS library
- `https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron` - Google Fonts

### Browser APIs Used
- Canvas API - For game rendering
- Web Audio API - For sound effects
- LocalStorage API - For saving custom games
- PeerJS API - For WebRTC multiplayer connections

## Development Guidelines

### Adding a New Game

1. Add game cabinet HTML in `index.html`:
```html
<div class="game-cabinet" data-game="gamename" data-category="arcade">
    <!-- Cabinet content -->
</div>
```

2. In `js/core.js`: add to `GAME_DISPLAY_NAMES` and add `case 'gamename': initGameName(); break;` in `startGame()`.
3. Create `js/games/gamename.js` with `function initGameName() { ... }` (and game loop).
4. In `index.html`: add `<script src="js/games/gamename.js"></script>` before `</body>`.
5. Add CSS in `styles.css` if needed.

### Code Style
- Use ES6+ features (const, let, arrow functions)
- CamelCase for function names
- Descriptive variable names
- Comments for complex logic

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires Canvas API support
- Requires Web Audio API support (for sound)
- Mobile browsers supported (touch controls)

## Performance Considerations

- Games use `requestAnimationFrame` for smooth animation
- Canvas rendering optimized for 60fps
- Audio context suspended until user interaction (browser policy)
- LocalStorage used sparingly (only for custom games)

## Security Notes

- No server-side code - entirely client-side
- PeerJS connections are peer-to-peer (no central server)
- LocalStorage data is browser-specific
- No external API calls except CDN resources

## Testing

- Test in multiple browsers
- Test on mobile devices
- Test multiplayer functionality with multiple clients
- Test localStorage persistence for custom games

## Common Issues

1. **Audio not playing**: Browser requires user interaction before audio can play
2. **Multiplayer not connecting**: Check network/firewall settings for WebRTC
3. **Custom games not saving**: Check browser LocalStorage permissions
4. **Performance issues**: Reduce canvas size or simplify game logic

## License Information

- **License**: GNU GPL v3 with Non-Commercial restrictions
- **Commercial Use**: Prohibited without explicit permission
- **Modification**: Allowed under GPL v3 terms
- **Distribution**: Must include license and source code

## Maintenance Notes

- No build process to maintain
- No dependency updates needed (only CDN resources)
- Games.js is large (8300+ lines) - consider modularization for future
- CSS is comprehensive (1700+ lines) - well-organized with comments

## Future Enhancement Opportunities

- Game logic is split into js/core.js and js/games/*.js
- Add game save/load functionality
- Implement leaderboards
- Add more multiplayer games
- Create game editor UI improvements
- Add sound effect customization
- Implement game difficulty settings

## Agent-Specific Notes

When working with this codebase:
- Game logic lives in js/core.js (shared) and js/games/*.js (one file per game)
- No TypeScript or type checking
- No linting configuration
- No testing framework
- Focus on vanilla JavaScript solutions
- Maintain retro aesthetic in any changes
- Keep games simple and performant
- Ensure mobile compatibility

---

**Last Updated**: 2024
**Project Status**: Active
**Maintainer**: c0decr4ft

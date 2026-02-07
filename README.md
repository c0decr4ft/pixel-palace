# 🎮 PIXEL PALACE - Retro Arcade Game Center

A nostalgic web-based arcade game center featuring classic retro games with a stunning neon aesthetic and CRT-style visual effects. Play timeless favorites like Snake, Tetris, Pong, and many more in your browser!

![PIXEL PALACE](https://img.shields.io/badge/PIXEL-PALACE-ff00ff?style=for-the-badge&logo=gamepad&logoColor=white)
![License](https://img.shields.io/badge/License-GPL%20v3%20%2B%20NC-blue?style=for-the-badge)

## ✨ Features

- **19+ Classic Games**: Snake, Tetris, Pong, Breakout, Space Invaders, Memory, Flappy Pixel, 2048, and more
- **Multiplayer Support**: Online PvP games including Tank Wars, Neon Kart, Cyber Arena, and Apex Zone
- **Retro Aesthetic**: Neon colors, CRT scanlines, glitch effects, and pixel-perfect styling
- **Game Creator**: Built-in tool to create and add custom games
- **Category Filtering**: Organize games by Arcade, Puzzle, or Action
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **No Dependencies**: Pure vanilla JavaScript, HTML, and CSS (except PeerJS for multiplayer)

## 🎯 Available Games

### Arcade Classics
- **Snake** - Eat and grow, avoid hitting yourself
- **Pong** - Classic tennis-style paddle game
- **Breakout** - Break all the bricks
- **Asteroids** - Space combat in the void
- **Neon Dash** - Infinite runner with synthwave vibes

### Puzzle Games
- **Tetris** - Stack blocks and clear lines
- **Memory** - Match pairs of cards
- **2048** - Merge numbers to reach 2048
- **Mine Scan** - Detect and avoid mines
- **Quad Link** - Strategic alignment game
- **Holo Stack** - Build skyward
- **Cipher Code** - Decode words (Wordle-style)

### Action Games
- **Space Invaders** - Defend against alien attacks
- **Flappy Pixel** - Fly and survive
- **Bio Hazard** - Survive the zombie outbreak
- **Tank Wars** - Battle online ⚡ ONLINE PVP
- **Neon Kart** - Mario Kart-style racing 🏎️ ONLINE PVP
- **Cyber Arena** - Target shooter 🎯 MULTIPLAYER
- **Apex Zone** - Last one standing battle royale 👑 ONLINE PVP

### Creative
- **Holo Draw** - Create and guess drawings ✎ MULTIPLAYER

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server required - runs entirely client-side!

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pixel-palace.git
cd pixel-palace
```

2. Open `index.html` in your web browser:
```bash
# On macOS/Linux
open index.html

# On Windows
start index.html

# Or simply drag and drop index.html into your browser
```

That's it! No build process, no package managers, just pure web technologies.

## 🎮 How to Play

1. **Browse Games**: Use the category tabs (ALL GAMES, ARCADE, PUZZLE, ACTION) to filter games
2. **Select a Game**: Click the "PLAY" button on any game cabinet
3. **Play**: Use keyboard controls (displayed in-game) or mouse/touch controls
4. **Return to Lobby**: Click "← LOBBY" to go back and try another game

### Controls

Each game has its own controls, typically:
- **Arrow Keys**: Movement/direction
- **Spacebar**: Action/jump
- **Mouse/Touch**: For games that support it

Controls are displayed in the game interface when you start playing.

## 🛠️ Game Creator

Create your own custom games using the built-in Game Creator:

1. Click the "+" cabinet at the end of the game grid
2. Fill in the game details:
   - Game Name
   - Category (Arcade, Puzzle, or Action)
   - Description
   - Icon (Emoji)
   - Game Code (JavaScript)
3. Click "Save Game"

Custom games are saved to your browser's localStorage and will persist across sessions.

## 🎨 Customization

### Styling

The entire visual theme is controlled through CSS variables in `styles.css`:

```css
:root {
    --neon-pink: #ff00ff;
    --neon-cyan: #00ffff;
    --neon-yellow: #ffff00;
    --neon-green: #00ff00;
    --neon-orange: #ff6600;
    --dark-purple: #0a0015;
    /* ... */
}
```

Modify these variables to change the color scheme.

### Adding Games

Games are implemented in `games.js`. Each game has:
- An initialization function (e.g., `initSnake()`)
- A game loop function
- Input handlers
- Score tracking

See existing game implementations for reference.

## 📁 Project Structure

```
pixel-palace/
├── index.html          # Main HTML file
├── styles.css          # All styling and animations
├── games.js           # Game logic and implementations
├── README.md          # This file
├── AGENTS.md          # Information for AI agents
└── LICENSE            # GNU GPL v3 + Non-Commercial License
```

## 🌐 Multiplayer Games

Some games support online multiplayer using PeerJS:
- **Tank Wars**: Battle other players in real-time
- **Neon Kart**: Race against other players
- **Cyber Arena**: Compete in target shooting
- **Apex Zone**: Battle royale mode
- **Holo Draw**: Collaborative drawing and guessing

Multiplayer games require an active internet connection and may need to establish peer connections.

## 🐛 Known Issues

- Some browsers may require user interaction before playing sounds (Web Audio API policy)
- Multiplayer games may experience latency depending on network conditions
- Custom games saved to localStorage are browser-specific

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Contributing Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingGame`)
3. Commit your changes (`git commit -m 'Add some AmazingGame'`)
4. Push to the branch (`git push origin feature/AmazingGame`)
5. Open a Pull Request

## 📝 License

This project is licensed under the GNU General Public License v3.0 with additional non-commercial restrictions. See the [LICENSE](LICENSE) file for details.

**Important**: This software is licensed for **NON-COMMERCIAL USE ONLY**. Commercial use requires explicit written permission from the copyright holder.

## 👤 Creator

**c0decr4ft**

Created with ❤️ for retro gaming enthusiasts.

## 🙏 Acknowledgments

- Inspired by classic arcade games of the 80s and 90s
- Fonts: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) and [Orbitron](https://fonts.google.com/specimen/Orbitron)
- Multiplayer powered by [PeerJS](https://peerjs.com/)

## 📧 Contact

For questions, suggestions, or commercial licensing inquiries, please open an issue on GitHub.

---

**Enjoy your stay at PIXEL PALACE! 🎮✨**

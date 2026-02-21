// Browser automation test for Neon Racer
// This script uses Puppeteer to test the game

const puppeteer = require('puppeteer');

(async () => {
    console.log('=== NEON RACER BROWSER TEST ===\n');
    
    let browser;
    try {
        // Launch browser
        console.log('1. Launching browser...');
        browser = await puppeteer.launch({
            headless: false, // Set to true for headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1280, height: 800 });
        
        // Navigate to localhost:8765
        console.log('2. Navigating to http://localhost:8765...');
        await page.goto('http://localhost:8765', { waitUntil: 'networkidle2' });
        console.log('   ✓ Page loaded\n');
        
        // Take initial snapshot
        console.log('3. Taking initial snapshot...');
        const title = await page.title();
        console.log(`   - Page title: ${title}`);
        
        // Check if Neon Racer cabinet exists
        const racerCabinet = await page.$('[data-game="racer"]');
        if (!racerCabinet) {
            console.log('   ✗ ERROR: Neon Racer cabinet not found!');
            return;
        }
        console.log('   ✓ Neon Racer cabinet found\n');
        
        // Click the PLAY button
        console.log('4. Clicking PLAY button...');
        const playButton = await racerCabinet.$('.play-btn');
        if (!playButton) {
            console.log('   ✗ ERROR: PLAY button not found!');
            return;
        }
        await playButton.click();
        console.log('   ✓ PLAY button clicked\n');
        
        // Wait 2 seconds
        console.log('5. Waiting 2 seconds...');
        await page.waitForTimeout(2000);
        console.log('   ✓ Wait complete\n');
        
        // Check for JavaScript errors
        console.log('6. Checking for JavaScript errors...');
        const jsErrors = await page.evaluate(() => {
            return JSON.stringify({
                initRacerExists: typeof initRacer,
                consoleErrors: window._errs || 'none'
            });
        });
        console.log(`   Result: ${jsErrors}\n`);
        
        // Check game container class
        console.log('7. Checking game container class...');
        const containerClass = await page.evaluate(() => {
            return document.querySelector('.game-container')?.className;
        });
        console.log(`   Result: ${containerClass}\n`);
        
        // Check canvas size
        console.log('8. Checking canvas size...');
        const canvasSize = await page.evaluate(() => {
            const canvas = document.querySelector('#gameCanvas');
            return canvas ? `${canvas.width}x${canvas.height}` : 'canvas not found';
        });
        console.log(`   Result: ${canvasSize}\n`);
        
        // Check instructions overlay
        console.log('9. Checking instructions overlay...');
        const instructionsStatus = await page.evaluate(() => {
            return document.querySelector('.game-instructions-overlay') ? 'instructions showing' : 'no instructions';
        });
        console.log(`   Result: ${instructionsStatus}\n`);
        
        // Get all console messages
        console.log('10. Checking browser console for errors...');
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push(`${msg.type()}: ${msg.text()}`);
        });
        
        // Check if game is actually running
        console.log('11. Checking if game is running...');
        const gameState = await page.evaluate(() => {
            return {
                currentGame: window.currentGame,
                score: window.score,
                canvasVisible: window.canvas?.style.display !== 'none',
                gameLoopActive: window.gameLoop !== null && window.gameLoop !== undefined,
                contextExists: window.ctx !== null && window.ctx !== undefined
            };
        });
        console.log(`   Current game: ${gameState.currentGame}`);
        console.log(`   Score: ${gameState.score}`);
        console.log(`   Canvas visible: ${gameState.canvasVisible}`);
        console.log(`   Game loop active: ${gameState.gameLoopActive}`);
        console.log(`   Context exists: ${gameState.contextExists}\n`);
        
        // Take a screenshot
        console.log('12. Taking screenshot...');
        await page.screenshot({ path: 'neon-racer-test-screenshot.png' });
        console.log('   ✓ Screenshot saved to neon-racer-test-screenshot.png\n');
        
        // Wait a bit longer to see if game renders
        console.log('13. Waiting 3 more seconds to observe game...');
        await page.waitForTimeout(3000);
        
        // Check if canvas has content
        const hasContent = await page.evaluate(() => {
            const canvas = document.querySelector('#gameCanvas');
            if (!canvas) return false;
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            return imageData.data.some(pixel => pixel !== 0);
        });
        console.log(`   Canvas has rendered content: ${hasContent}\n`);
        
        console.log('=== TEST COMPLETE ===');
        console.log('\nSUMMARY:');
        console.log(`- initRacer function exists: ${JSON.parse(jsErrors).initRacerExists === 'function' ? 'YES' : 'NO'}`);
        console.log(`- Game container class: ${containerClass}`);
        console.log(`- Canvas size: ${canvasSize}`);
        console.log(`- Instructions overlay: ${instructionsStatus}`);
        console.log(`- Current game: ${gameState.currentGame}`);
        console.log(`- Game loop active: ${gameState.gameLoopActive}`);
        console.log(`- Canvas has content: ${hasContent}`);
        
    } catch (error) {
        console.error('ERROR:', error.message);
    } finally {
        if (browser) {
            console.log('\nClosing browser in 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            await browser.close();
        }
    }
})();

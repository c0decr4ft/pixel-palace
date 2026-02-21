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
        
        // Track console messages from the start
        const consoleLogs = [];
        page.on('console', msg => {
            const text = msg.text();
            consoleLogs.push(`${msg.type()}: ${text}`);
            if (msg.type() === 'error' || msg.type() === 'warning') {
                console.log(`   [BROWSER ${msg.type().toUpperCase()}]: ${text}`);
            }
        });
        
        page.on('pageerror', error => {
            console.log(`   [PAGE ERROR]: ${error.message}`);
            consoleLogs.push(`pageerror: ${error.message}`);
        });
        
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
        
        // Check immediately after click
        console.log('4a. Checking state immediately after click...');
        await new Promise(resolve => setTimeout(resolve, 100));
        const immediateCheck = await page.evaluate(() => {
            return {
                hasOverlay: !!document.querySelector('.game-instructions-overlay'),
                gameContainerActive: !!document.querySelector('.game-container.active'),
                currentGame: window.currentGame
            };
        });
        console.log(`   Overlay exists immediately: ${immediateCheck.hasOverlay}`);
        console.log(`   Game container active: ${immediateCheck.gameContainerActive}`);
        console.log(`   Current game: ${immediateCheck.currentGame}\n`);
        
        // Wait 2 seconds for initial check
        console.log('5. Waiting 2 seconds (instructions should be showing)...');
        await new Promise(resolve => setTimeout(resolve, 2000));
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
        console.log('9. Checking instructions overlay (at 2 seconds)...');
        const instructionsCheck = await page.evaluate(() => {
            const overlay = document.querySelector('.game-instructions-overlay');
            return {
                exists: !!overlay,
                visible: overlay ? overlay.style.display !== 'none' : false,
                text: overlay ? overlay.textContent.substring(0, 100) : 'none'
            };
        });
        console.log(`   Overlay exists: ${instructionsCheck.exists}`);
        console.log(`   Overlay visible: ${instructionsCheck.visible}`);
        console.log(`   Overlay text: ${instructionsCheck.text}\n`);
        
        // Wait for instructions to finish (6 seconds total, already waited 2)
        console.log('10. Waiting 5 more seconds for instructions to complete...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('   ✓ Instructions should be done now\n');
        
        // Report console messages
        console.log('11. Checking browser console messages...');
        if (consoleLogs.length > 0) {
            console.log(`   Found ${consoleLogs.length} console messages`);
            const errors = consoleLogs.filter(log => log.startsWith('error:') || log.startsWith('pageerror:'));
            if (errors.length > 0) {
                console.log(`   ERRORS FOUND: ${errors.length}`);
                errors.forEach(err => console.log(`     - ${err}`));
            }
            const warnings = consoleLogs.filter(log => log.startsWith('warning:'));
            if (warnings.length > 0) {
                console.log(`   WARNINGS: ${warnings.length}`);
                warnings.forEach(warn => console.log(`     - ${warn}`));
            }
            // Show all logs for debugging
            console.log(`   ALL LOGS:`);
            consoleLogs.forEach(log => console.log(`     - ${log}`));
        } else {
            console.log('   No console messages captured');
        }
        
        // Check if game is actually running
        console.log('12. Checking if game is running (after instructions)...');
        const gameState = await page.evaluate(() => {
            return {
                currentGame: window.currentGame,
                score: window.score,
                canvasVisible: window.canvas?.style.display !== 'none',
                gameLoopActive: window.gameLoop !== null && window.gameLoop !== undefined,
                contextExists: window.ctx !== null && window.ctx !== undefined,
                initRacerCalled: typeof window.initRacer === 'function',
                canvasWidth: window.canvas?.width,
                canvasHeight: window.canvas?.height,
                hasGameContainer: !!document.querySelector('.game-container.active')
            };
        });
        console.log(`   Current game: ${gameState.currentGame}`);
        console.log(`   Score: ${gameState.score}`);
        console.log(`   Canvas visible: ${gameState.canvasVisible}`);
        console.log(`   Canvas size: ${gameState.canvasWidth}x${gameState.canvasHeight}`);
        console.log(`   Game loop active: ${gameState.gameLoopActive}`);
        console.log(`   Context exists: ${gameState.contextExists}`);
        console.log(`   initRacer exists: ${gameState.initRacerCalled}`);
        console.log(`   Game container active: ${gameState.hasGameContainer}\n`);
        
        // Take a screenshot
        console.log('13. Taking screenshot after game should have started...');
        await page.screenshot({ path: 'neon-racer-test-screenshot.png' });
        console.log('   ✓ Screenshot saved to neon-racer-test-screenshot.png\n');
        
        // Try to manually trigger the game if it hasn't started
        console.log('14. Attempting to manually call initRacer...');
        const manualResult = await page.evaluate(() => {
            try {
                if (typeof initRacer === 'function') {
                    initRacer();
                    return { success: true, error: null };
                } else {
                    return { success: false, error: 'initRacer is not a function' };
                }
            } catch (err) {
                return { success: false, error: err.message };
            }
        });
        console.log(`   Manual call result: ${manualResult.success ? 'SUCCESS' : 'FAILED'}`);
        if (!manualResult.success) {
            console.log(`   Error: ${manualResult.error}`);
        }
        
        // Wait and check again
        console.log('15. Waiting 2 seconds after manual call...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const finalState = await page.evaluate(() => {
            return {
                currentGame: window.currentGame,
                canvasWidth: window.canvas?.width,
                canvasHeight: window.canvas?.height,
                gameLoopActive: window.gameLoop !== null && window.gameLoop !== undefined
            };
        });
        console.log(`   Final state after manual call:`);
        console.log(`     - currentGame: ${finalState.currentGame}`);
        console.log(`     - canvas: ${finalState.canvasWidth}x${finalState.canvasHeight}`);
        console.log(`     - gameLoop active: ${finalState.gameLoopActive}`);
        
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

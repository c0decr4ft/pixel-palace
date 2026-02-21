// Test script to diagnose Neon Racer issue
// This script simulates what would happen when clicking the PLAY button

console.log('=== NEON RACER TEST ===\n');

// Read the racer.js file to check for syntax errors
const fs = require('fs');
const path = require('path');

const racerPath = path.join(__dirname, 'js/games/racer.js');
const racerCode = fs.readFileSync(racerPath, 'utf8');

console.log('1. Checking racer.js file...');
console.log(`   - File exists: ${fs.existsSync(racerPath)}`);
console.log(`   - File size: ${racerCode.length} bytes`);
console.log(`   - Contains initRacer function: ${racerCode.includes('function initRacer()')}`);

// Try to parse the JavaScript to check for syntax errors
try {
    new Function(racerCode);
    console.log('   - ✓ No syntax errors detected\n');
} catch (err) {
    console.log(`   - ✗ SYNTAX ERROR: ${err.message}\n`);
}

// Check for common issues
console.log('2. Checking for common issues...');

// Check if all required global variables are used
const requiredGlobals = [
    'currentGameTitle',
    'gameControls',
    'canvas',
    'ctx',
    'updateScore',
    'playSound',
    'playGameOverJingle',
    'handleKeyDown',
    'gameContainer',
    'cleanupFunctions',
    'gameLoop',
    'score'
];

console.log('   Required globals used in racer.js:');
requiredGlobals.forEach(global => {
    const used = racerCode.includes(global);
    console.log(`   - ${global}: ${used ? '✓' : '✗'}`);
});

console.log('\n3. Checking core.js for racer registration...');
const corePath = path.join(__dirname, 'js/core.js');
const coreCode = fs.readFileSync(corePath, 'utf8');

const hasRacerCase = coreCode.includes("case 'racer': initRacer(); break;");
console.log(`   - Racer registered in startGame: ${hasRacerCase ? '✓' : '✗'}`);

console.log('\n4. Checking index.html for script inclusion...');
const indexPath = path.join(__dirname, 'index.html');
const indexCode = fs.readFileSync(indexPath, 'utf8');

const hasRacerScript = indexCode.includes('js/games/racer.js');
console.log(`   - racer.js script tag present: ${hasRacerScript ? '✓' : '✗'}`);

const hasRacerCabinet = indexCode.includes('data-game="racer"');
console.log(`   - Racer game cabinet present: ${hasRacerCabinet ? '✓' : '✗'}`);

console.log('\n=== TEST COMPLETE ===');

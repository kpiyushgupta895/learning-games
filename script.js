// Get references to our HTML elements
const gameContainer = document.getElementById('game-container');
const nextButton = document.getElementById('next-button');
const feedback = document.getElementById('feedback');
const emojiTooltip = document.getElementById('emoji-tooltip');

// The color palette is now inside the game container, so we'll select it when needed.

let currentCorrectAnswer = null;
let isGameActive = true;
let currentResizeObserver = null;
let currentGameMode = null; // Will store the game 'id' from the URL if present

// --- STATE MANAGEMENT ---
function saveGameState(gameState) {
    sessionStorage.setItem('activeGame', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = sessionStorage.getItem('activeGame');
    return savedState ? JSON.parse(savedState) : null;
}

function clearGameState() {
    sessionStorage.removeItem('activeGame');
}

// --- HELPER FUNCTIONS ---
function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffleArray(arr) { return arr.sort(() => Math.random() - 0.5); }

// --- COLOR NAME MAPPING ---
// Translates color values to display-friendly names.
const COLOR_NAMES = {
    'red': 'Red',
    'blue': 'Blue',
    'green': 'Green',
    'yellow': 'Yellow',
    'orange': 'Orange',
    'purple': 'Purple',
    'brown': 'Brown',
    'black': 'Black',
    'white': 'White',
    'gray': 'Gray',
    'pink': 'Pink'
};

// --- TOOLTIP LOGIC ---
let tooltipTimeout;
function showTooltip(e) {
    const target = e.target.closest('[data-name]');
    if (!target) return;

    const name = target.dataset.name;
    if (!name) return;

    // For touch events, use the touch coordinates. For mouse, use mouse coordinates.
    const touch = e.touches ? e.touches[0] : e;

    emojiTooltip.textContent = name;
    emojiTooltip.style.left = `${touch.clientX}px`;
    emojiTooltip.style.top = `${touch.clientY}px`;
    emojiTooltip.classList.add('visible');

    // Hide the tooltip after a delay
    clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
        emojiTooltip.classList.remove('visible');
    }, 1500);
}

// --- GAME DEFINITIONS (Updated to handle state) ---
const games = {
    'Count The Items': {
        generate: (state = null) => {
            const item = state ? MASTER_CONFIG.find(i => i.name === state.itemName) : getRandomElement(MASTER_CONFIG);
            const count = state ? state.count : Math.floor(Math.random() * 5) + 1;
            
            if (!state) saveGameState({ gameName: 'Count The Items', itemName: item.name, count: count });

            currentCorrectAnswer = count; isGameActive = true;
            const itemsHTML = item.emoji.repeat(count);
            const options = new Set([count]); while (options.size < 3) options.add(Math.floor(Math.random() * 5) + 1);
            gameContainer.innerHTML = `<h2>How many ${item.emoji} are there?</h2><div class="game-area" data-name="${item.name}" title="${item.name}">${itemsHTML}</div><div class="options">${shuffleArray([...options]).map(opt => `<button class="option" data-answer="${opt}">${opt}</button>`).join('')}</div>`;
            gameContainer.onclick = handleSimpleAnswer;
        }
    },
    'Color Recognition': {
        generate: (state = null) => {
            const itemsWithColor = MASTER_CONFIG.filter(i => i.color);
            const item = state ? itemsWithColor.find(i => i.name === state.itemName) : getRandomElement(itemsWithColor);
            
            if (!state) saveGameState({ gameName: 'Color Recognition', itemName: item.name });

            const correctColor = item.color;
            currentCorrectAnswer = correctColor;
            isGameActive = true;

            // --- Dynamic Color Option Generation ---
            // 1. Get all unique colors from the master config, excluding the correct one.
            const allColors = [...new Set(MASTER_CONFIG.filter(i => i.color).map(i => i.color))];
            const incorrectColors = allColors.filter(c => c !== correctColor);

            // 2. Create a set of options, starting with the correct answer.
            const options = new Set([correctColor]);
            const shuffledIncorrect = shuffleArray(incorrectColors);
            
            // 3. Add 2-3 incorrect colors to the options.
            while (options.size < 4 && shuffledIncorrect.length > 0) {
                options.add(shuffledIncorrect.pop());
            }

            gameContainer.innerHTML = `
                <h2>What color is the ${item.emoji}?</h2>
                <div class="game-area" style="font-size: 8rem;" data-name="${item.name}" title="${item.name}">${item.emoji}</div>
                <div class="options color-options">${shuffleArray([...options]).map(color => `
                    <button class="option color-option-wrapper" data-answer="${color}">
                        <div class="color-swatch" style="background-color: ${color};"></div>
                        <span class="color-name">${COLOR_NAMES[color] || ''}</span>
                    </button>
                `).join('')}</div>`;
            gameContainer.onclick = handleSimpleAnswer;
        }
    },
    'Alphabet Match': {
        generate: (state = null) => { // Accept state for consistency, though unused
            clearGameState(); // This game's state is too complex to save/restore easily
            isGameActive = true; let selectedLetterElement = null; let matchesFound = 0; const totalMatches = 4; const gameItems = []; const usedLetters = new Set(); const shuffledConfig = shuffleArray([...MASTER_CONFIG]); for (const item of shuffledConfig) { const firstLetter = item.name.charAt(0); if (!usedLetters.has(firstLetter)) { usedLetters.add(firstLetter); gameItems.push({ ...item, letter: firstLetter }); if (gameItems.length === totalMatches) break; } } const letters = shuffleArray([...gameItems]); const emojis = shuffleArray([...gameItems]); gameContainer.innerHTML = `<h2>Match the letter to the object!</h2><div id="match-game-wrapper"><div id="letters-col" class="match-column">${letters.map(item => `<div class="match-item letter" data-letter="${item.letter}">${Math.random() > 0.5 ? item.letter.toUpperCase() : item.letter.toLowerCase()}</div>`).join('')}</div><div id="images-col" class="match-column">${emojis.map(item => `<div class="match-item image" data-letter="${item.letter}" data-name="${item.name}" title="${item.name}">${item.emoji}</div>`).join('')}</div></div>`;
            function handleMatchClick(e) { if (!isGameActive) return; const target = e.target.closest('.match-item'); if (!target || target.classList.contains('matched')) return; if (target.classList.contains('letter')) { if (selectedLetterElement) selectedLetterElement.classList.remove('selected'); selectedLetterElement = target; selectedLetterElement.classList.add('selected'); } else if (target.classList.contains('image')) { if (!selectedLetterElement) return; if (selectedLetterElement.dataset.letter === target.dataset.letter) { selectedLetterElement.classList.remove('selected'); selectedLetterElement.classList.add('matched'); target.classList.add('matched'); selectedLetterElement = null; matchesFound++; feedback.textContent = 'A Match! 🎉'; feedback.className = 'correct'; if (matchesFound === totalMatches) { feedback.textContent = 'All Done! Amazing! 🌟'; isGameActive = false; nextButton.classList.remove('hidden'); } } else { feedback.textContent = 'Not a match, try again!'; feedback.className = 'incorrect'; selectedLetterElement.classList.add('shake'); target.classList.add('shake'); setTimeout(() => { selectedLetterElement.classList.remove('shake'); target.classList.remove('shake'); selectedLetterElement = null; }, 500); } } }
            gameContainer.onclick = handleMatchClick;
        }
    }
,
    'Match the Colour': {
        generate: (state = null) => {
            clearGameState();
            isGameActive = true; let selectedElement = null; let matchesFound = 0; const totalMatches = 4; const gameItems = []; const usedColors = new Set(); const itemsWithColor = shuffleArray(MASTER_CONFIG.filter(i => i.color)); for (const item of itemsWithColor) { if (!usedColors.has(item.color)) { usedColors.add(item.color); gameItems.push(item); if (gameItems.length === totalMatches) break; } } const emojis = shuffleArray([...gameItems]); const colors = shuffleArray([...gameItems]); gameContainer.innerHTML = `<h2>Match the object to its colour!</h2><div id="match-game-wrapper"><div id="images-col" class="match-column">${emojis.map(item => `<div class="match-item image" data-color="${item.color}" data-name="${item.name}" title="${item.name}">${item.emoji}</div>`).join('')}</div><div id="colors-col" class="match-column">${colors.map(item => `<div class="match-item color" data-color="${item.color}" data-name="${COLOR_NAMES[item.color] || ''}" title="${COLOR_NAMES[item.color] || ''}"><div class="color-swatch" style="background-color: ${item.color};"></div></div>`).join('')}</div></div>`;
            function handleMatchClick(e) { if (!isGameActive) return; const target = e.target.closest('.match-item'); if (!target || target.classList.contains('matched')) return; if (!selectedElement) { selectedElement = target; selectedElement.classList.add('selected'); return; } if (target.classList.contains(selectedElement.classList.contains('image') ? 'color' : 'image')) { if (selectedElement.dataset.color === target.dataset.color) { selectedElement.classList.remove('selected'); selectedElement.classList.add('matched'); target.classList.add('matched'); selectedElement = null; matchesFound++; feedback.textContent = 'A Match! 🎉'; feedback.className = 'correct'; if (matchesFound === totalMatches) { feedback.textContent = 'All Done! Amazing! 🌟'; isGameActive = false; nextButton.classList.remove('hidden'); } } else { feedback.textContent = 'Not a match, try again!'; feedback.className = 'incorrect'; selectedElement.classList.add('shake'); target.classList.add('shake'); setTimeout(() => { selectedElement.classList.remove('shake'); target.classList.remove('shake'); selectedElement.classList.remove('selected'); selectedElement = null; }, 500); } } else { selectedElement.classList.remove('selected'); selectedElement = target; selectedElement.classList.add('selected'); } }
            gameContainer.onclick = handleMatchClick;
        }
    }
};

// --- CORE GAME LOGIC & EVENT HANDLERS ---
function handleSimpleAnswer(e) {
    if (!isGameActive) return;
    const selectedButton = e.target.closest('.option');
    if (!selectedButton) return;

    const userAnswer = selectedButton.dataset.answer;

    if (String(userAnswer) === String(currentCorrectAnswer)) {
        isGameActive = false; // Lock the game on correct answer
        feedback.textContent = 'Correct! Great job! 👍';
        feedback.className = 'correct';
        selectedButton.classList.add('correct');
        nextButton.classList.remove('hidden');
    } else {
        // Incorrect answer: allow retry
        feedback.textContent = 'Oops, try again! 😊';
        feedback.className = 'incorrect';
        selectedButton.classList.add('shake');
        setTimeout(() => selectedButton.classList.remove('shake'), 500); // Remove shake after animation
    }
}

function loadNextGame() {
    clearGameState();
    if (currentResizeObserver) { currentResizeObserver.disconnect(); currentResizeObserver = null; }
    gameContainer.onclick = null; 
    isGameActive = true;
    
    // Clear previous game content
    gameContainer.innerHTML = '';
    feedback.textContent = ''; 
    feedback.className = '';
    nextButton.classList.add('hidden');

    // If a specific game mode is active (from URL), load another game of the same type.
    if (currentGameMode && GAMES_CONFIG[currentGameMode]) {
        const gameName = GAMES_CONFIG[currentGameMode].name;
        games[gameName].generate();
    } else {
        // Otherwise, load a completely random game.
        const gameParams = Object.keys(GAMES_CONFIG);
        const randomGameParam = getRandomElement(gameParams);
        const gameName = GAMES_CONFIG[randomGameParam].name;
        games[gameName].generate();
    }
}

// --- INITIALIZATION & STATE RESTORATION ---
function initialize() {
    const urlParams = new URLSearchParams(window.location.search);
    const gameParam = urlParams.get('id');

    const savedState = loadGameState();

    if (!gameParam && savedState && games[savedState.gameName]) {
        console.log("Restoring previous game state:", savedState);
        games[savedState.gameName].generate(savedState);
    } else {
        // If a specific game is requested via URL, load it. Otherwise, load a random one.
        if (gameParam && GAMES_CONFIG[gameParam]) {
            currentGameMode = gameParam; // Set the game mode for the session
            const gameName = GAMES_CONFIG[gameParam].name;
            if (games[gameName]) {
                clearGameState(); // Clear any old state when loading a specific game
                games[gameName].generate();
                return;
            }
        }
        // Default behavior
        loadNextGame(); 
    }
}

// --- EVENT LISTENERS ---
nextButton.addEventListener('click', loadNextGame);
gameContainer.addEventListener('touchstart', showTooltip, { passive: true });
gameContainer.addEventListener('mouseover', showTooltip);
initialize();

// --- NAVIGATION CONTROL ---
history.pushState(null, '', location.href);
window.addEventListener('popstate', function (event) {
    history.pushState(null, '', location.href);
});
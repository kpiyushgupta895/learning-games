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
let currentMatchRenderer = null;

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

function cleanupMatchRenderer() {
    if (currentMatchRenderer && typeof currentMatchRenderer.cleanup === 'function') {
        currentMatchRenderer.cleanup();
    }
    currentMatchRenderer = null;
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

function createArrowMatchGame(config) {
    const {
        promptText,
        leftItems,
        rightItems,
        leftClass,
        rightClass,
        leftKeyAttr,
        rightKeyAttr,
        leftContent,
        rightContent,
        stateKey,
        extraState = {},
        savedState = null
    } = config;

    const totalMatches = leftItems.length;
    const restoredMatches = new Set(savedState?.matches || []);
    let selectedItem = null;
    let isBusyAnimatingWrongArrow = false;
    let activeStartItem = null;
    let activePointerId = null;
    let dragLine = null;

    const renderColumn = (items, side, className, keyAttr, renderContent) => items.map((item, index) => `
        <div
            class="match-item ${className} ${restoredMatches.has(item[keyAttr]) ? 'matched' : ''}"
            data-side="${side}"
            data-key="${item[keyAttr]}"
            data-id="${side}-${index}">
            ${renderContent(item)}
        </div>
    `).join('');

    gameContainer.innerHTML = `
        <h2>${promptText}</h2>
        <div id="match-game-wrapper" class="arrow-match-wrapper">
            <svg class="match-lines" aria-hidden="true"></svg>
            <div id="match-left-col" class="match-column">
                ${renderColumn(leftItems, 'left', leftClass, leftKeyAttr, leftContent)}
            </div>
            <div id="match-right-col" class="match-column">
                ${renderColumn(rightItems, 'right', rightClass, rightKeyAttr, rightContent)}
            </div>
        </div>
    `;

    const wrapper = gameContainer.querySelector('#match-game-wrapper');
    const svg = wrapper.querySelector('.match-lines');

    function persistState() {
        saveGameState({
            gameName: stateKey,
            promptText,
            leftItems,
            rightItems,
            matches: [...restoredMatches],
            ...extraState
        });
    }

    function getCenter(itemEl) {
        const itemRect = itemEl.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        return {
            x: itemRect.left - wrapperRect.left + itemRect.width / 2,
            y: itemRect.top - wrapperRect.top + itemRect.height / 2
        };
    }

    function drawLine(fromEl, toEl, className = 'correct') {
        const start = getCenter(fromEl);
        const end = getCenter(toEl);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', start.x);
        line.setAttribute('y1', start.y);
        line.setAttribute('x2', end.x);
        line.setAttribute('y2', end.y);
        line.setAttribute('class', `match-line ${className}`);
        svg.appendChild(line);
        return line;
    }

    function createPreviewLine(fromEl, clientX, clientY) {
        const start = getCenter(fromEl);
        const wrapperRect = wrapper.getBoundingClientRect();
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', start.x);
        line.setAttribute('y1', start.y);
        line.setAttribute('x2', clientX - wrapperRect.left);
        line.setAttribute('y2', clientY - wrapperRect.top);
        line.setAttribute('class', 'match-line preview');
        svg.appendChild(line);
        return line;
    }

    function updatePreviewLine(line, clientX, clientY) {
        if (!line) return;
        const wrapperRect = wrapper.getBoundingClientRect();
        line.setAttribute('x2', clientX - wrapperRect.left);
        line.setAttribute('y2', clientY - wrapperRect.top);
    }

    function redrawMatchedLines() {
        svg.innerHTML = '';
        restoredMatches.forEach((key) => {
            const leftEl = wrapper.querySelector(`.match-item[data-side="left"][data-key="${key}"]`);
            const rightEl = wrapper.querySelector(`.match-item[data-side="right"][data-key="${key}"]`);
            if (leftEl && rightEl) drawLine(leftEl, rightEl, 'correct');
        });
    }

    function clearSelection() {
        if (selectedItem) selectedItem.classList.remove('selected');
        selectedItem = null;
    }

    function clearDragState() {
        if (dragLine && dragLine.parentNode) dragLine.parentNode.removeChild(dragLine);
        dragLine = null;
        activeStartItem = null;
        activePointerId = null;
    }

    function finishGameIfComplete() {
        if (restoredMatches.size === totalMatches) {
            isGameActive = false;
            feedback.textContent = 'All Done! Amazing! 🌟';
            feedback.className = 'correct';
            nextButton.classList.remove('hidden');
        }
    }

    function resolveMatch(first, second) {
        const isCorrect = first.dataset.key === second.dataset.key;

        if (isCorrect) {
            drawLine(first, second, 'correct');
            first.classList.remove('selected');
            second.classList.remove('selected');
            first.classList.add('matched');
            second.classList.add('matched');
            restoredMatches.add(first.dataset.key);
            clearSelection();
            feedback.textContent = 'A Match! 🎉';
            feedback.className = 'correct';
            persistState();
            finishGameIfComplete();
            return;
        }

        const wrongLine = drawLine(first, second, 'incorrect');
        isBusyAnimatingWrongArrow = true;
        feedback.textContent = 'Not a match, try again!';
        feedback.className = 'incorrect';
        first.classList.add('shake');
        second.classList.add('shake');

        setTimeout(() => {
            first.classList.remove('shake');
            second.classList.remove('shake');
            if (wrongLine && wrongLine.parentNode) wrongLine.parentNode.removeChild(wrongLine);
            clearSelection();
            isBusyAnimatingWrongArrow = false;
        }, 500);
    }

    function getMatchItemAtPoint(clientX, clientY) {
        const el = document.elementFromPoint(clientX, clientY);
        return el ? el.closest('.match-item') : null;
    }

    function handlePointerDown(e) {
        if (!isGameActive || isBusyAnimatingWrongArrow) return;
        const target = e.target.closest('.match-item');
        if (!target || target.classList.contains('matched')) return;

        e.preventDefault();
        selectedItem = target;
        selectedItem.classList.add('selected');
        activeStartItem = target;
        activePointerId = e.pointerId;
        dragLine = createPreviewLine(target, e.clientX, e.clientY);
        wrapper.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e) {
        if (e.pointerId !== activePointerId || !dragLine || !activeStartItem) return;
        updatePreviewLine(dragLine, e.clientX, e.clientY);
    }

    function handlePointerEnd(e) {
        if (e.pointerId !== activePointerId || !activeStartItem) return;
        updatePreviewLine(dragLine, e.clientX, e.clientY);
        const start = activeStartItem;
        const target = getMatchItemAtPoint(e.clientX, e.clientY);

        if (!target || target.classList.contains('matched') || target === start || target.dataset.side === start.dataset.side) {
            clearSelection();
            clearDragState();
            return;
        }

        clearDragState();
        resolveMatch(start, target);
    }

    const redrawHandler = () => redrawMatchedLines();
    const pointerDownHandler = (e) => handlePointerDown(e);
    const pointerMoveHandler = (e) => handlePointerMove(e);
    const pointerUpHandler = (e) => handlePointerEnd(e);
    const pointerCancelHandler = (e) => handlePointerEnd(e);

    window.addEventListener('resize', redrawHandler);
    wrapper.addEventListener('pointerdown', pointerDownHandler);
    wrapper.addEventListener('pointermove', pointerMoveHandler);
    wrapper.addEventListener('pointerup', pointerUpHandler);
    wrapper.addEventListener('pointercancel', pointerCancelHandler);

    currentMatchRenderer = {
        cleanup: () => {
            window.removeEventListener('resize', redrawHandler);
            wrapper.removeEventListener('pointerdown', pointerDownHandler);
            wrapper.removeEventListener('pointermove', pointerMoveHandler);
            wrapper.removeEventListener('pointerup', pointerUpHandler);
            wrapper.removeEventListener('pointercancel', pointerCancelHandler);
        }
    };

    redrawMatchedLines();
    gameContainer.onclick = null;
    finishGameIfComplete();
    persistState();
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
        generate: (state = null) => {
            isGameActive = true;
            const totalMatches = 4;
            let gameItems = state?.sourceItems || null;

            if (!gameItems) {
                const usedLetters = new Set();
                gameItems = [];
                const shuffledConfig = shuffleArray([...MASTER_CONFIG]);
                for (const item of shuffledConfig) {
                    const firstLetter = item.name.charAt(0);
                    if (!usedLetters.has(firstLetter)) {
                        usedLetters.add(firstLetter);
                        gameItems.push({ letter: firstLetter, emoji: item.emoji, name: item.name });
                        if (gameItems.length === totalMatches) break;
                    }
                }
            }

            const letters = state?.leftItems || shuffleArray([...gameItems]).map(item => ({
                letter: item.letter,
                displayLetter: Math.random() > 0.5 ? item.letter.toUpperCase() : item.letter.toLowerCase()
            }));
            const emojis = state?.rightItems || shuffleArray([...gameItems]).map(item => ({
                letter: item.letter,
                emoji: item.emoji,
                name: item.name
            }));

            createArrowMatchGame({
                promptText: 'Match the letter to the object!',
                leftItems: letters,
                rightItems: emojis,
                leftClass: 'letter',
                rightClass: 'image',
                leftKeyAttr: 'letter',
                rightKeyAttr: 'letter',
                leftContent: (item) => item.displayLetter,
                rightContent: (item) => `<span data-name="${item.name}" title="${item.name}">${item.emoji}</span>`,
                stateKey: 'Alphabet Match',
                extraState: { sourceItems: gameItems },
                savedState: state
            });
        }
    },
    'Match the Colour': {
        generate: (state = null) => {
            isGameActive = true;
            const totalMatches = 4;
            let gameItems = state?.sourceItems || null;

            if (!gameItems) {
                gameItems = [];
                const usedColors = new Set();
                const itemsWithColor = shuffleArray(MASTER_CONFIG.filter(i => i.color));
                for (const item of itemsWithColor) {
                    if (!usedColors.has(item.color)) {
                        usedColors.add(item.color);
                        gameItems.push({ color: item.color, emoji: item.emoji, name: item.name });
                        if (gameItems.length === totalMatches) break;
                    }
                }
            }

            const emojis = state?.leftItems || shuffleArray([...gameItems]).map(item => ({
                color: item.color,
                emoji: item.emoji,
                name: item.name
            }));
            const colors = state?.rightItems || shuffleArray([...gameItems]).map(item => ({
                color: item.color,
                colorName: COLOR_NAMES[item.color] || ''
            }));

            createArrowMatchGame({
                promptText: 'Match the object to its colour!',
                leftItems: emojis,
                rightItems: colors,
                leftClass: 'image',
                rightClass: 'color',
                leftKeyAttr: 'color',
                rightKeyAttr: 'color',
                leftContent: (item) => `<span data-name="${item.name}" title="${item.name}">${item.emoji}</span>`,
                rightContent: (item) => `<div class="color-swatch" style="background-color: ${item.color};" data-name="${item.colorName}" title="${item.colorName}"></div>`,
                stateKey: 'Match the Colour',
                extraState: { sourceItems: gameItems },
                savedState: state
            });
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
    cleanupMatchRenderer();
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
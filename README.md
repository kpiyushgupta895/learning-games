# Nursery Learning Fun! 🎉

A collection of simple, fun, and interactive learning games designed for toddlers and nursery-aged children. This web-based application helps kids learn basic concepts like counting, colors, and the alphabet in an engaging way.

It is built with plain HTML, CSS, and JavaScript, making it lightweight, fast, and easy to modify.

## Live Demo

**Play the game here!** 👈

## Features

-   **Multiple Game Modes:** A variety of games to keep learning fresh and exciting.
-   **Responsive Design:** Plays great on desktops, tablets, and mobile phones in both portrait and landscape modes.
-   **PWA Ready:** Can be "installed" on a mobile device via the "Add to Home Screen" feature for a full-screen, app-like experience and offline access.
-   **Interactive Feedback:** Instant visual feedback with fun animations for correct and incorrect answers.
-   **Direct Game Access:** Load a specific game directly using a URL parameter (e.g., `index.html?id=count`).
-   **Session Restoration:** If you accidentally refresh the page, the current game state is restored so you don't lose your place (for supported games).
-   **Emoji Tooltips:** Hover over or touch an emoji to see its name, helping with vocabulary.

## Game Modes

The application currently includes the following games:

1.  **🔢 Count The Items:** A random number of a specific emoji is shown, and the child has to select the correct count from a set of options.
2.  **🎨 Color Recognition:** An emoji is displayed, and the child must identify its color from a palette of choices.
3.  **🔤 Alphabet Match:** Match letters (uppercase or lowercase) to the corresponding object that starts with that letter.
4.  **🌈 Match the Colour:** Match an emoji to its corresponding color swatch.

## How to Run Locally

Since this is a client-side application with no server-side dependencies, running it locally is very simple.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/kpiyushgupta895/learning-games.git
    ```

2.  **Navigate to the directory:**
    ```bash
    cd learning-games
    ```

3.  **Open the `index.html` file:**
    You can simply open the `index.html` file directly in your web browser (like Chrome, Firefox, or Edge).

    For a better development experience, you can use a live server extension (like the "Live Server" for VS Code) to automatically reload the page when you make changes to the code.

## Configuration

The games are highly configurable. You can easily add new items or even new game types.

-   **`config.js`**: This file contains the `MASTER_CONFIG` array. This is the master list of all items (emojis) that can be used in the games. You can add new objects here, specifying their name, emoji, category, and color (if applicable).

    ```javascript
    // Example of an item in MASTER_CONFIG
    { name: 'lion', emoji: '🦁', category: 'animal', color: 'yellow' }
    ```

-   **`games_config.js`**: This file defines the available games, their display names, and the URL parameter used to access them.

    ```javascript
    // Example of a game definition
    'count': {
        name: 'Count The Items',
    }
    ```

## Technologies Used

-   **HTML5**
-   **CSS3**
-   **Vanilla JavaScript (ES6+)**

No frameworks or external libraries (other than Google Fonts) are used, keeping the project simple and focused.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
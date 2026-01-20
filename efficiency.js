
// State
let currentDevice = null;
let testActive = false;
let startTime = 0;
let endTime = 0;
let tasksTotal = 0;
let tasksCompleted = 0;
let errors = 0;
let timerInterval = null;

// DOM Elements
const selectionSection = document.getElementById('selection-section');
const testSection = document.getElementById('test-section');
const resultsSection = document.getElementById('results-section');
const testTitle = document.getElementById('test-title');
const testInstruction = document.getElementById('test-instruction');
const interactionArea = document.getElementById('interaction-area');
const statsDisplay = document.getElementById('stats-display');
const resultTime = document.getElementById('result-time');
const resultAccuracy = document.getElementById('result-accuracy');

// Device Configuration
const testConfig = {
    mouse: {
        title: "Mouse Efficiency Test",
        instruction: "Click the blue circles as quickly as they appear.",
        taskCount: 10,
        type: "click"
    },
    keyboard: {
        title: "Keyboard Efficiency Test",
        instruction: "Type the text exactly as shown below.",
        text: "The quick brown fox jumps over the lazy dog.",
        type: "type"
    },
    touch: {
        title: "Touch Efficiency Test",
        instruction: "Tap the large squares as soon as they appear.",
        taskCount: 10,
        type: "tap"
    }
};

function selectDevice(device) {
    currentDevice = device;
    startTest();
}

function startTest() {
    selectionSection.classList.remove('active-section');
    selectionSection.classList.add('hidden-section');

    testSection.classList.remove('hidden-section');
    testSection.classList.add('active-section');

    // Reset state
    tasksCompleted = 0;
    errors = 0;
    tasksTotal = testConfig[currentDevice].taskCount || 1;

    // UI Setup
    testTitle.textContent = testConfig[currentDevice].title;
    testInstruction.textContent = testConfig[currentDevice].instruction;
    interactionArea.innerHTML = ''; // Clear previous

    // Start Logic
    if (currentDevice === 'mouse') {
        startClickTest(50); // 50px targets
    } else if (currentDevice === 'touch') {
        startClickTest(100); // 100px targets for touch
    } else if (currentDevice === 'keyboard') {
        startKeyboardTest();
    }

    startTime = performance.now();
    timerInterval = setInterval(updateTimer, 100);
    testActive = true;
}

function updateTimer() {
    if (!testActive) return;
    const current = performance.now();
    const elapsed = ((current - startTime) / 1000).toFixed(1);
    statsDisplay.textContent = `Time: ${elapsed}s | Errors: ${errors}`;
}

// Click/Tap Test Logic
function startClickTest(size) {
    createTarget(size);

    // Background click (miss) listener
    interactionArea.onclick = (e) => {
        if (e.target === interactionArea) {
            errors++;
            interactionArea.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            setTimeout(() => {
                interactionArea.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }, 100);
        }
    };
}

function createTarget(size) {
    if (tasksCompleted >= tasksTotal) {
        endTest();
        return;
    }

    const target = document.createElement('div');
    target.classList.add('target-circle');

    // Adjust size for touch/mouse
    target.style.width = `${size}px`;
    target.style.height = `${size}px`;
    if (currentDevice === 'touch') {
        target.style.borderRadius = '12px'; // Square-ish for touch
    }

    // Random Position
    const containerRect = interactionArea.getBoundingClientRect();
    const maxX = containerRect.width - size;
    const maxY = containerRect.height - size;

    const randomX = Math.floor(Math.random() * maxX);
    const randomY = Math.floor(Math.random() * maxY);

    target.style.left = `${randomX}px`;
    target.style.top = `${randomY}px`;

    target.onmousedown = (e) => {
        e.stopPropagation(); // Prevent background click
        target.remove();
        tasksCompleted++;
        createTarget(size);
    };

    // For touch devices, handle touchstart to avoid delay
    target.ontouchstart = (e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent mouse emulation
        target.remove();
        tasksCompleted++;
        createTarget(size);
    };

    interactionArea.appendChild(target);
}

// Keyboard Test Logic
function startKeyboardTest() {
    const textToType = testConfig.keyboard.text;

    const display = document.createElement('div');
    display.classList.add('typing-display');
    display.textContent = textToType;

    const input = document.createElement('textarea');
    input.classList.add('typing-input');
    input.placeholder = "Start typing...";
    input.autofocus = true;

    interactionArea.appendChild(display);
    interactionArea.appendChild(input);
    input.focus();

    input.addEventListener('input', () => {
        const val = input.value;
        if (val === textToType) {
            endTest();
        } else {
            // Check for errors in real-time or just count at end?
            // Simple check: if current length matches but char is wrong
            if (val.length > 0) {
                const expected = textToType.substring(0, val.length);
                if (val !== expected) {
                    input.style.borderColor = 'var(--error-color)';
                } else {
                    input.style.borderColor = 'var(--success-color)';
                }
            }
        }
    });

    // Count errors as Levenshtein distance at the end or just mistyped chars?
    // Let's do a simple check on finish for this demo iteration.
}

function endTest() {
    testActive = false;
    clearInterval(timerInterval);
    endTime = performance.now();

    const totalTime = ((endTime - startTime) / 1000).toFixed(2);

    // Calculate Accuracy
    let accuracy = 100;
    if (currentDevice === 'keyboard') {
        const input = document.querySelector('.typing-input').value;
        const target = testConfig.keyboard.text;
        const dist = levenshtein(input, target);
        const len = Math.max(input.length, target.length);
        accuracy = Math.max(0, ((len - dist) / len) * 100).toFixed(1);
    } else {
        // Click/Tap: Accuracy based on misses vs total clicks
        // Total clicks = tasksTotal + errors
        const totalClicks = tasksTotal + errors;
        accuracy = totalClicks === 0 ? 0 : ((tasksTotal / totalClicks) * 100).toFixed(1);
    }

    showResults(totalTime, accuracy);
}

function showResults(time, accuracy) {
    testSection.classList.add('hidden-section');
    testSection.classList.remove('active-section');

    resultsSection.classList.remove('hidden-section');
    resultsSection.classList.add('active-section');

    resultTime.textContent = time;
    resultAccuracy.textContent = accuracy;
}

function resetTest() {
    resultsSection.classList.remove('active-section');
    resultsSection.classList.add('hidden-section');

    selectionSection.classList.remove('hidden-section');
    selectionSection.classList.add('active-section');

    currentDevice = null;
}

// Utility: Levenshtein Distance for typing accuracy
function levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

/* Data & State Configuration */
const WORD_POOL = [
    "Apple", "River", "Shadow", "Planet", "Guitar",
    "Velvet", "Thunder", "Mirror", "Falcon", "Whisper",
    "Crystal", "Journey", "Silence", "Orbit", "Mosaic",
    "Lantern", "Echo", "Forest", "Puzzle", "Breeze"
];

const CONFIG = {
    MEMORY_TIME: 30, // seconds
    WORD_COUNT: 10,
    REACTION_TRIALS: 5
};

const state = {
    currentPhase: 'welcome', // welcome, memory-display, memory-recall, reaction-intro, reaction-test, results
    memoryWords: [],
    recalledWords: [],
    reactionTimes: [],
    currentReactionTrial: 0,
    reactionStartTime: 0,
    reactionTimerId: null,
    isWaitingForGreen: false
};

/* DOM Elements */
const sections = {
    welcome: document.getElementById('welcome-section'),
    memoryDisplay: document.getElementById('memory-display-section'),
    memoryRecall: document.getElementById('memory-recall-section'),
    reactionIntro: document.getElementById('reaction-intro-section'),
    reactionActive: document.getElementById('reaction-active-section'),
    results: document.getElementById('results-section')
};

/* Helper Functions */
function showSection(sectionKey) {
    Object.values(sections).forEach(el => el.classList.remove('active-section', 'hidden-section'));
    Object.values(sections).forEach(el => el.classList.add('hidden-section'));

    sections[sectionKey].classList.remove('hidden-section');
    sections[sectionKey].classList.add('active-section');
    state.currentPhase = sectionKey;
}

function getRandomWords(count) {
    const shuffled = [...WORD_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

/* Phase 1: Welcome */
document.getElementById('start-btn').addEventListener('click', startMemoryPhase);

/* Phase 2: Memory Test */
function startMemoryPhase() {
    state.memoryWords = getRandomWords(CONFIG.WORD_COUNT);

    // Render Words
    const wordGrid = document.getElementById('word-grid');
    wordGrid.innerHTML = '';
    state.memoryWords.forEach(word => {
        const div = document.createElement('div');
        div.className = 'word-card';
        div.textContent = word;
        wordGrid.appendChild(div);
    });

    showSection('memoryDisplay');
    startTimer();
}

function startTimer() {
    let timeLeft = CONFIG.MEMORY_TIME;
    const timeDisplay = document.getElementById('time-left');
    const circle = document.querySelector('.progress-ring__circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;

    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;

    function setProgress(percent) {
        const offset = circumference - percent / 100 * circumference;
        circle.style.strokeDashoffset = offset;
    }

    // Initial Set
    setProgress(100);

    const timerInterval = setInterval(() => {
        timeLeft--;
        timeDisplay.textContent = timeLeft;
        setProgress((timeLeft / CONFIG.MEMORY_TIME) * 100);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            startRecallPhase();
        }
    }, 1000);
}

function startRecallPhase() {
    showSection('memoryRecall');
    document.getElementById('recall-input').focus();
    state.recalledWords = [];
    renderRecallTags();
}

/* Phase 3: Recall */
const recallInput = document.getElementById('recall-input');
const recallList = document.getElementById('recall-list');

recallInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && recallInput.value.trim() !== '') {
        addRecallWord(recallInput.value.trim());
        recallInput.value = '';
    }
});

function addRecallWord(word) {
    // Prevent duplicates in visual list
    if (state.recalledWords.some(w => w.toLowerCase() === word.toLowerCase())) return;

    state.recalledWords.push(word);
    renderRecallTags();
}

function renderRecallTags() {
    recallList.innerHTML = '';
    state.recalledWords.forEach(word => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML = `${word}`;
        recallList.appendChild(tag);
    });
}

document.getElementById('submit-memory-btn').addEventListener('click', () => {
    showSection('reactionIntro');
});

/* Phase 4: Reaction Test */
document.getElementById('start-reaction-btn').addEventListener('click', startReactionTrials);

function startReactionTrials() {
    state.reactionTimes = [];
    state.currentReactionTrial = 0;
    runReactionTrial();
}

function runReactionTrial() {
    state.currentReactionTrial++;

    if (state.currentReactionTrial > CONFIG.REACTION_TRIALS) {
        finishAssessment();
        return;
    }

    showSection('reactionActive');

    const reactionBox = document.getElementById('reaction-box');
    const reactionText = document.getElementById('reaction-text');
    const counter = document.getElementById('trial-counter');

    counter.textContent = `Trial ${state.currentReactionTrial} / ${CONFIG.REACTION_TRIALS}`;
    reactionBox.className = 'reaction-state-waiting';
    reactionText.textContent = "Wait for Green...";

    state.isWaitingForGreen = true;

    // Random delay between 2-5 seconds
    const delay = Math.floor(Math.random() * 3000) + 2000;

    state.reactionTimerId = setTimeout(() => {
        if (!state.isWaitingForGreen) return; // check if user clicked early

        reactionBox.className = 'reaction-state-go';
        reactionText.textContent = "CLICK NOW!";
        state.isWaitingForGreen = false;
        state.reactionStartTime = Date.now();
    }, delay);
}

const reactionActiveSection = document.getElementById('reaction-active-section');
reactionActiveSection.addEventListener('mousedown', handleReactionClick);

function handleReactionClick() {
    const reactionBox = document.getElementById('reaction-box');
    const reactionText = document.getElementById('reaction-text');

    if (state.isWaitingForGreen) {
        // Early click
        clearTimeout(state.reactionTimerId);
        reactionBox.className = 'reaction-state-early';
        reactionText.textContent = "Too Early!";
        state.isWaitingForGreen = false;

        // Restart this trial after short delay
        setTimeout(() => {
            state.currentReactionTrial--; // redo
            runReactionTrial();
        }, 1000);
    } else if (state.reactionStartTime > 0) {
        // Valid click
        const reactionTime = Date.now() - state.reactionStartTime;
        state.reactionTimes.push(reactionTime);
        state.reactionStartTime = 0;

        reactionText.textContent = `${reactionTime} ms`;

        // Next trial
        setTimeout(runReactionTrial, 1000);
    }
}

/* Phase 5: Results */
function finishAssessment() {
    showSection('results');

    // Calculate Memory Score
    // Normalize to lowercase for comparison
    const targetWords = state.memoryWords.map(w => w.toLowerCase());
    const inputWords = state.recalledWords.map(w => w.toLowerCase());

    let memoryScore = 0;
    inputWords.forEach(word => {
        if (targetWords.includes(word)) {
            memoryScore++;
        }
    });

    // Calculate Avg Reaction Time
    const sum = state.reactionTimes.reduce((a, b) => a + b, 0);
    const avgReaction = Math.round(sum / state.reactionTimes.length);

    // Update UI
    document.getElementById('memory-score').textContent = memoryScore;
    document.getElementById('reaction-score').textContent = avgReaction;

    // Feedback
    const memFeedback = document.getElementById('memory-feedback');
    if (memoryScore >= 9) memFeedback.textContent = "Photographic Memory!";
    else if (memoryScore >= 6) memFeedback.textContent = "Great Memory!";
    else memFeedback.textContent = "Good effort!";

    const reacFeedback = document.getElementById('reaction-feedback');
    if (avgReaction < 250) reacFeedback.textContent = "Pro Gamer Speed!";
    else if (avgReaction < 350) reacFeedback.textContent = "Better than average!";
    else reacFeedback.textContent = "Keep practicing!";
}

document.getElementById('restart-btn').addEventListener('click', () => {
    state.recalledWords = [];
    state.reactionTimes = [];
    showSection('welcome');
});

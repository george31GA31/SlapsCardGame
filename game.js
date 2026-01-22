// --- CONFIGURATION ---
const difficulty = parseInt(localStorage.getItem('spitDifficulty')) || 5;
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// State
let playerLayout = [[], [], [], [], []]; // 5 stacks
let aiLayout = [[], [], [], [], []];
let playerSpitPile = [];
let aiSpitPile = [];
let centerPiles = [null, null]; // The two active piles
let selectedCard = null; // { stackIndex, val }

// --- INITIALIZATION ---
window.onload = function() {
    initGame();
};

function initGame() {
    // Create full deck
    let deck = [];
    for(let i=1; i<=13; i++) {
        for(let s=0; s<4; s++) deck.push(i);
    }
    deck = shuffle(deck);

    // Split deck (26 each)
    let p1Deck = deck.slice(0, 26);
    let aiDeck = deck.slice(26, 52);

    // Deal Layouts (1, 2, 3, 4, 5 cards)
    dealLayout(p1Deck, playerLayout);
    dealLayout(aiDeck, aiLayout);

    // Remaining go to spit piles
    playerSpitPile = p1Deck;
    aiSpitPile = aiDeck;

    // Initial Spit to start game
    spitBoth(true);

    // Start AI Loop
    startAI();
}

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

function dealLayout(sourceDeck, layoutArray) {
    // Standard Solitaire Setup: Stack 1 gets 1, Stack 2 gets 2...
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j <= i; j++) {
            if (sourceDeck.length > 0) {
                layoutArray[i].push(sourceDeck.shift());
            }
        }
    }
}

// --- RENDERING ---
function renderBoard() {
    renderLayout('player-layout', playerLayout, true);
    renderLayout('ai-layout', aiLayout, false);
    renderCenter();
    checkWinCondition();
}

function renderLayout(elementId, layoutData, isPlayer) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';

    layoutData.forEach((stack, index) => {
        const slot = document.createElement('div');
        slot.className = 'card-slot';
        
        // If stack is empty, it's a valid drop target for player
        if (stack.length === 0 && isPlayer) {
            slot.onclick = () => handleEmptySlotClick(index);
        }

        // Render cards in stack
        stack.forEach((val, cardIndex) => {
            const card = document.createElement('div');
            card.className = 'card';
            const isTop = cardIndex === stack.length - 1;

            // Logic: Top card face up, others face down
            if (isTop) {
                card.innerText = getRankSymbol(val);
                if (isPlayer) {
                    card.onclick = (e) => {
                        e.stopPropagation(); // prevent triggering slot click
                        handlePlayerCardClick(index, val);
                    };
                    // Highlight if selected
                    if (selectedCard && selectedCard.stackIndex === index) {
                        card.classList.add('selected');
                    }
                }
            } else {
                card.classList.add('face-down');
            }
            slot.appendChild(card);
        });
        container.appendChild(slot);
    });
}

function renderCenter() {
    document.getElementById('center-1').innerText = getRankSymbol(centerPiles[0]);
    document.getElementById('center-2').innerText = getRankSymbol(centerPiles[1]);
    
    // Update visual count of spit piles
    document.getElementById('spit-deck-1').innerText = aiSpitPile.length;
    document.getElementById('spit-deck-2').innerText = playerSpitPile.length;
}

function getRankSymbol(num) {
    if (!num) return '';
    if (num === 1) return 'A';
    if (num === 11) return 'J';
    if (num === 12) return 'Q';
    if (num === 13) return 'K';
    return num;
}

// --- GAMEPLAY LOGIC ---

// Check if move is valid (Wrapping K-A-2 allowed)
function isValidMove(cardVal, pileVal) {
    if (!pileVal) return true;
    const diff = Math.abs(cardVal - pileVal);
    if (diff === 1) return true;
    if (cardVal === 13 && pileVal === 1) return true; // K on A
    if (cardVal === 1 && pileVal === 13) return true; // A on K
    return false;
}

function handlePlayerCardClick(stackIndex, val) {
    // 1. Try to play on Left Center
    if (isValidMove(val, centerPiles[0])) {
        playCard('player', stackIndex, 0);
        return;
    }
    // 2. Try to play on Right Center
    if (isValidMove(val, centerPiles[1])) {
        playCard('player', stackIndex, 1);
        return;
    }
    
    // 3. If can't play, Select it (for moving to empty slot)
    if (selectedCard && selectedCard.stackIndex === stackIndex) {
        selectedCard = null; // Deselect
    } else {
        selectedCard = { stackIndex, val };
    }
    renderBoard();
}

function handleEmptySlotClick(targetStackIndex) {
    if (selectedCard) {
        // Move card from source stack to empty target stack
        const val = playerLayout[selectedCard.stackIndex].pop();
        playerLayout[targetStackIndex].push(val);
        selectedCard = null;
        renderBoard();
    }
}

function playCard(who, stackIndex, centerPileIndex) {
    let layout = who === 'player' ? playerLayout : aiLayout;
    
    // Move card logic
    const card = layout[stackIndex].pop();
    centerPiles[centerPileIndex] = card;

    if (who === 'player') selectedCard = null;

    renderBoard();
}

// Global "Spit" Action
function spitBoth(force = false) {
    // Only allow if both players have cards in spit pile
    if (playerSpitPile.length > 0 && aiSpitPile.length > 0) {
        centerPiles[0] = playerSpitPile.shift();
        centerPiles[1] = aiSpitPile.shift();
        renderBoard();
    } else {
        // If spit piles empty, we shuffle center piles (simplified for this version)
        document.getElementById('status-text').innerText = "Spit piles empty! (Reload to reset)";
    }
}

function checkWinCondition() {
    // Check if layouts are empty
    const pEmpty = playerLayout.every(stack => stack.length === 0);
    const aiEmpty = aiLayout.every(stack => stack.length === 0);

    if (pEmpty) {
        alert("YOU WIN! Click OK to restart.");
        location.reload();
    } else if (aiEmpty) {
        alert("AI WINS! Click OK to restart.");
        location.reload();
    }
}

// --- AI INTELLIGENCE ---
function startAI() {
    // Difficulty 1 (Slow) = 2500ms, Difficulty 10 (Fast) = 400ms
    const speed = 2600 - (difficulty * 220); 

    setInterval(() => {
        aiMove();
    }, speed);
}

function aiMove() {
    let moved = false;

    // AI looks at all its top cards
    for (let i = 0; i < 5; i++) {
        if (aiLayout[i].length > 0) {
            const card = aiLayout[i][aiLayout[i].length - 1]; // Top card

            // Check Left Pile
            if (isValidMove(card, centerPiles[0])) {
                playCard('ai', i, 0);
                moved = true;
                break;
            }
            // Check Right Pile
            if (isValidMove(card, centerPiles[1])) {
                playCard('ai', i, 1);
                moved = true;
                break;
            }
        }
    }

    // AI Logic: Move to empty slot?
    // Simplified: If AI has an empty slot and a stack with > 1 card, move a card there.
    if (!moved) {
        const emptySlotIndex = aiLayout.findIndex(s => s.length === 0);
        if (emptySlotIndex !== -1) {
            // Find a stack with cards
            const sourceIndex = aiLayout.findIndex(s => s.length > 1); // Only move if stack has >1 card (keeps face downs safe)
            if (sourceIndex !== -1) {
                const card = aiLayout[sourceIndex].pop();
                aiLayout[emptySlotIndex].push(card);
                renderBoard();
            }
        }
    }
}

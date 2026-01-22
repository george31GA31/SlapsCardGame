function goToSetup() {
    window.location.href = 'setup.html';
}

function startGame() {
    const diff = document.getElementById('diffSlider').value;
    localStorage.setItem('spitDifficulty', diff);
    window.location.href = 'game.html';
}

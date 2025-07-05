const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
nextContext.scale(20, 20);
const arenaWidth = 30;
const arenaHeight = 20;
let highScore = parseInt(localStorage.getItem('tetrisHighScore')) || 0;
let isGameStarted = false;
let isGameOver = false;
let nextMatrix = null;
let isPaused = false;
let piecesPlaced = 0;
let shrinkCount = 0;
let leftBoundary = -1;
let rightBoundary = arenaWidth;

context.scale(20, 20);

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

const arena = createMatrix(arenaWidth, arenaHeight);

const pieces = {
  'T': [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  'O': [
    [2, 2],
    [2, 2],
  ],
  'L': [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0],
  ],
  'J': [
    [4, 0, 0],
    [4, 4, 4],
    [0, 0, 0],
  ],
  'I': [
    [0, 0, 0, 0],
    [5, 5, 5, 5],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  'S': [
    [0, 6, 6],
    [6, 6, 0],
    [0, 0, 0],
  ],
  'Z': [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ],
};

const colors = [
  null,
  '#FF0D72',
  '#0DC2FF',
  '#0DFF72',
  '#F538FF',
  '#FF8E0D',
  '#FFE138',
  '#3877FF',
  '#888888',
];

function createPiece(type) {
  return pieces[type];
}

const player = {
  pos: {x: 0, y: 0},
  matrix: null,
  score: 0,
};

function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0) {
        const arenaX = x + o.x;
        if (
          arenaX < leftBoundary ||
          arenaX > rightBoundary ||
          arena[y + o.y]?.[arenaX] !== 0
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function getGhostPosition() {
  const ghost = {
    pos: { ...player.pos },
    matrix: player.matrix,
  };

  while (!collide(arena, ghost)) {
    ghost.pos.y++;
  }
  ghost.pos.y--;

  return ghost;
}

function rotate(matrix, dir) {
  for (let y=0; y < matrix.length; ++y) {
    for (let x=0; x < y; ++x) {
      [
        matrix[x][y],
        matrix[y][x],
      ] = [
        matrix[y][x],
        matrix[x][y],
      ];
    }
  }
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function arenaSweep() {
  let rowCount = 0;

  for (let y = arena.length - 1; y >= 0; --y) {
    let isFull = true;

    for (let x = leftBoundary; x <= rightBoundary; x++) {
      const cell = arena[y][x];

      if (cell === 0) {
        isFull = false;
        break;
      }
    }

    if (isFull) {
      arena.splice(y, 1);

      const newRow = new Array(arenaWidth).fill(0);
      newRow[leftBoundary] = 8;
      newRow[rightBoundary] = 8;
      arena.unshift(newRow);

      rowCount++;
      y++;
    }
  }

  const scoreTable = [0, 100, 300, 500, 800];
  player.score += scoreTable[rowCount] || (rowCount * 200);
}

function drawMatrix(matrix, offset, ctx = context, ghostMode = false) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        ctx.fillStyle = ghostMode
          ? colors[value] + '88' 
          : colors[value];

        ctx.fillRect(x + offset.x, y + offset.y, 1, 1);

        ctx.strokeStyle = ghostMode ? '#666' : '#222';
        ctx.lineWidth = 0.1;
        ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawMatrix(arena, { x: 0, y: 0 });

  const ghost = getGhostPosition();
  drawMatrix(ghost.matrix, ghost.pos, context, true); 

  drawMatrix(player.matrix, player.pos);
}

function drawNext() {
  nextContext.fillStyle = '#000';
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!nextMatrix) return;

  const offset = {
    x: Math.floor((4 - nextMatrix[0].length) / 2),
    y: Math.floor((4 - nextMatrix.length) / 2)
  };

  drawMatrix(nextMatrix, offset, nextContext);
}

function drop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    resetPlayer();
    arenaSweep();
    shrinkArena(); 
    updateScore();
  }
  dropCounter = 0;
}

function hardDrop() {
  const ghost = getGhostPosition();
  player.pos.y = ghost.pos.y;
  merge(arena, player);
  resetPlayer();
  arenaSweep();
  shrinkArena();
  updateScore();
  dropCounter = 0;
}

function resetPlayer(incrementPieces = true) {
  if (!nextMatrix) {
    const piecesKeys = Object.keys(pieces);
    nextMatrix = createPiece(piecesKeys[Math.floor(Math.random() * piecesKeys.length)]);
  }

  player.matrix = nextMatrix;
  const piecesKeys = Object.keys(pieces);
  nextMatrix = createPiece(piecesKeys[Math.floor(Math.random() * piecesKeys.length)]);

  player.pos.y = 0;
  player.pos.x = Math.floor((leftBoundary + rightBoundary - player.matrix[0].length + 1) / 2);

  if (collide(arena, player)) {
    isGameOver = true;
  }

  if (incrementPieces) {
    piecesPlaced++;

    if (Math.floor(piecesPlaced / 25) > shrinkCount && rightBoundary - leftBoundary > 4) {
      leftBoundary++;
      rightBoundary--;
      shrinkArena();
      shrinkCount++;
    }
  }
}

let dropCounter = 0;
let dropInterval = 1000;

let lastTime = 0;

function update(time = 0) {
  if (!isGameStarted) {
    drawStartScreen();
    return;
  }

  if (isGameOver) {
    drawGameOver();
    return;
  }

  if (isPaused) {
    drawPauseScreen();
    return;
  }

  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    drop();
  }

  draw();
  drawNext();
  requestAnimationFrame(update);
}

function updateScore() {
  document.getElementById('score').innerText = player.score;

  if (player.score > highScore) {
    highScore = player.score;
    localStorage.setItem('tetrisHighScore', highScore);
  }

  document.getElementById('highscore').innerText = highScore;
}

function shrinkArena() {
  for (let y = 0; y < arena.length; y++) {
    for (let x = 0; x < arenaWidth; x++) {
      if (arena[y][x] === 8) {
        arena[y][x] = 0;
      }
    }
    arena[y][leftBoundary] = 8;
    arena[y][rightBoundary] = 8;
  }
}

function drawPauseScreen() {
  draw(); 

  context.fillStyle = 'rgba(0, 0, 0, 0.5)';
  context.fillRect(0, 0, arenaWidth, arenaHeight);

  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.font = '1.5px monospace';
  context.fillText('PAUSED', arenaWidth / 2, 10);
}

function drawGameOver() {
  context.fillStyle = 'rgba(0, 0, 0, 0.75)';
  context.fillRect(0, 0, arenaWidth, arenaHeight);

  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.font = '1.5px monospace';

  context.fillText('GAME OVER', arenaWidth / 2, 8);

  context.font = '1px monospace';
  context.fillText(`Score: ${player.score}`, arenaWidth / 2, 10);
  context.fillText(`High Score: ${highScore}`, arenaWidth / 2, 11.5);

  context.font = '0.8px monospace';
  context.fillText('Press Space to Restart', arenaWidth / 2, 13);
}

function drawStartScreen() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.font = '1.5px monospace';
  context.fillText('TETRIS', arenaWidth / 2, 8);

  context.font = '1px monospace';
  context.fillText('Press SPACE to Start', arenaWidth / 2, 10);
}

function restartGame() {
  leftBoundary = -1;
  rightBoundary = arenaWidth;
  piecesPlaced = 0;
  shrinkCount = 0;

  arena.forEach(row => row.fill(0));
  shrinkArena();

  player.score = 0;
  updateScore();
  isGameOver = false;

  resetPlayer();
  update();
}

document.addEventListener('keydown', event => {
  if (isGameOver && event.code === 'Space') {
    restartGame();
    return;
  }

  if (isGameOver && (event.key === 'r' || event.key === 'R')) {
    restartGame();
    return;
  }

  if (!isGameStarted && event.code === 'Space') {
  isGameStarted = true;
  lastTime = performance.now();
  update();
  return;
}

  if (!isGameOver && event.code === 'Space') {
    isPaused = !isPaused;
    if (!isPaused) {
      lastTime = performance.now();
      update(); 
    } else {
      drawPauseScreen();
    }
    return;
   }

   if (isPaused || isGameOver) return;

   if (event.key === 'a' || event.key === 'A') {
    player.pos.x--;
    if (collide(arena, player)) {
      player.pos.x++;
    }
   } else if (event.key === 'd' || event.key === 'D') {
    player.pos.x++;
    if (collide(arena, player)) {
      player.pos.x--;
    }
   } else if (event.key === 's' || event.key === 'S') {
    drop();
   } else if (event.key === 'q' || event.key === 'Q') {
    playerRotate(-1);
   } else if (event.key === 'e' || event.key === 'E') {
    playerRotate(1);
   }
   else if (event.key === 'w' || event.key === 'W') {
  hardDrop();
}
});

resetPlayer(false);
updateScore();
drawStartScreen();

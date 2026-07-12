import { FRUIT_NAMES, drawFruit, type FruitName } from "./snake-assets/sprites";
import { SNAKE_THEMES, type SkinId } from "./themes";

export type SnakeHooks = {
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
  onGameOver?: (finalScore: number) => void;
};

export type SnakeControls = {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  destroy: () => void;
};

const COLS = 20;
const ROWS = 20;
const CELL = 30;
const INITIAL_MOVE_INTERVAL = 160;
const MIN_MOVE_INTERVAL = 60;
const MOVE_INTERVAL_STEP = 8;
const FRUITS_PER_LEVEL = 5;
const SCORE_PER_FRUIT = 10;

type Point = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";
type GameState = "playing" | "gameover";

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function createSnakeGame(
  canvas: HTMLCanvasElement,
  hooks: SnakeHooks,
  skin: SkinId = "clasico"
): SnakeControls {
  const ctx = canvas.getContext("2d")!;
  const palette = SNAKE_THEMES[skin];

  let snake: Point[],
    direction: Direction,
    nextDirection: Direction,
    fruit: Point & { name: FruitName },
    score: number,
    level: number,
    fruitsEaten: number,
    moveInterval: number,
    moveAccum: number,
    lastTime: number,
    gameState: GameState,
    isPaused: boolean,
    animId: number;

  function randomEmptyCell(): Point {
    let cell: Point;
    do {
      cell = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (snake.some((s) => s.x === cell.x && s.y === cell.y));
    return cell;
  }

  function spawnFruit() {
    const cell = randomEmptyCell();
    const name = FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)];
    fruit = { ...cell, name };
  }

  function endGame() {
    gameState = "gameover";
    hooks.onGameOver?.(score);
    hooks.onLivesChange?.(0);
  }

  function step() {
    if (nextDirection !== OPPOSITE[direction] || snake.length === 1) {
      direction = nextDirection;
    }

    const head = snake[0];
    const delta = DELTA[direction];
    const newHead: Point = { x: head.x + delta.x, y: head.y + delta.y };

    if (
      newHead.x < 0 ||
      newHead.x >= COLS ||
      newHead.y < 0 ||
      newHead.y >= ROWS
    ) {
      endGame();
      return;
    }

    if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      endGame();
      return;
    }

    snake.unshift(newHead);

    if (newHead.x === fruit.x && newHead.y === fruit.y) {
      score += SCORE_PER_FRUIT;
      hooks.onScoreChange?.(score);
      fruitsEaten++;
      if (fruitsEaten % FRUITS_PER_LEVEL === 0) {
        level++;
        hooks.onLevelChange?.(level);
        moveInterval = Math.max(
          MIN_MOVE_INTERVAL,
          moveInterval - MOVE_INTERVAL_STEP
        );
      }
      spawnFruit();
    } else {
      snake.pop();
    }
  }

  function update(dt: number) {
    if (isPaused || gameState !== "playing") return;
    moveAccum += dt;
    if (moveAccum >= moveInterval) {
      moveAccum -= moveInterval;
      step();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(COLS * CELL, r * CELL);
      ctx.stroke();
    }

    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 3;
    if (palette.glow) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = palette.glow;
    }
    ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);
    ctx.shadowBlur = 0;

    drawFruit(ctx, fruit.name, fruit.x * CELL, fruit.y * CELL, CELL);

    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? palette.primary : palette.accent;
      if (palette.glow) {
        ctx.shadowBlur = i === 0 ? 10 : 4;
        ctx.shadowColor = palette.glow;
      }
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.shadowBlur = 0;

    ctx.fillStyle = palette.text;
    ctx.font = "20px monospace";
    ctx.fillText(`SCORE ${score}`, 8, 24);

    if (gameState === "gameover") {
      ctx.fillStyle = palette.overlay;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = palette.text;
      ctx.font = "32px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
      ctx.font = "16px monospace";
      ctx.fillText(
        "SPACE para reiniciar",
        canvas.width / 2,
        canvas.height / 2 + 32
      );
      ctx.textAlign = "left";
    }
  }

  function loop(ts: number) {
    const dt = ts - lastTime;
    lastTime = ts;
    update(dt);
    draw();
    animId = requestAnimationFrame(loop);
  }

  function reset() {
    const startX = Math.floor(COLS / 2);
    const startY = Math.floor(ROWS / 2);
    snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
    direction = "right";
    nextDirection = "right";
    score = 0;
    level = 1;
    fruitsEaten = 0;
    moveInterval = INITIAL_MOVE_INTERVAL;
    moveAccum = 0;
    gameState = "playing";
    isPaused = false;
    spawnFruit();
    hooks.onScoreChange?.(score);
    hooks.onLivesChange?.(1);
    hooks.onLevelChange?.(level);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (gameState === "gameover") {
      if (e.code === "Space") {
        e.preventDefault();
        reset();
      }
      return;
    }

    switch (e.code) {
      case "ArrowUp":
        e.preventDefault();
        nextDirection = "up";
        break;
      case "ArrowDown":
        e.preventDefault();
        nextDirection = "down";
        break;
      case "ArrowLeft":
        e.preventDefault();
        nextDirection = "left";
        break;
      case "ArrowRight":
        e.preventDefault();
        nextDirection = "right";
        break;
    }
  }

  document.addEventListener("keydown", onKeyDown);
  reset();
  lastTime = performance.now();
  animId = requestAnimationFrame(loop);

  return {
    pause() {
      isPaused = true;
    },
    resume() {
      isPaused = false;
    },
    forceGameOver() {
      if (gameState === "gameover") return;
      endGame();
    },
    destroy() {
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown", onKeyDown);
    },
  };
}

import { LEVELS } from "./arkanoid-assets/levels";
import {
  drawFrame,
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
} from "./arkanoid-assets/spritesheet";
import { ARKANOID_THEMES, type SkinId } from "./themes";

export type ArkanoidHooks = {
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
  onGameOver?: (finalScore: number) => void;
};

export type ArkanoidControls = {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  destroy: () => void;
};

type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
};
type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  elapsed: number;
};

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  hooks: ArkanoidHooks,
  skin: SkinId = "clasico"
): ArkanoidControls {
  const ctx = canvas.getContext("2d")!;
  const palette = ARKANOID_THEMES[skin];

  const PADDLE_SPEED = 400;
  const BLOCK_COLS = 10;
  const BLOCK_W = 64;
  const BLOCK_H = 24;
  const BLOCKS_ORIGIN_X = (800 - BLOCK_COLS * BLOCK_W) / 2;
  const BLOCKS_ORIGIN_Y = 80;
  const BASE_BALL_VX = 200;
  const BASE_BALL_VY = -300;

  const paddle = { x: 0, y: 560, w: 81, h: 14 };
  const ball = { x: 0, y: 0, w: 16, h: 16, vx: 200, vy: -300 };

  const bounceSound = new Audio("/games/arkanoid/sounds/ball-bounce.mp3");
  const breakSound = new Audio("/games/arkanoid/sounds/break-sound.mp3");

  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let lives = 3;
  let score = 0;
  let gameState: "playing" | "gameover" | "win" = "playing";
  let currentLevel = 1;
  let isPaused = false;
  let gameOverReported = false;

  const keys: Record<string, boolean> = { ArrowLeft: false, ArrowRight: false };

  function initPaddle() {
    paddle.x = (canvas.width - paddle.w) / 2;
  }

  function initBall() {
    const speed = LEVELS[currentLevel - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number) {
    currentLevel = n;
    const level = LEVELS[n - 1];
    blocks = level.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * level.speed;
    ball.vy = BASE_BALL_VY * level.speed;
    hooks.onLevelChange?.(currentLevel);
  }

  function collideAABB(block: Block) {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  function reportGameOver() {
    if (gameOverReported) return;
    gameOverReported = true;
    hooks.onGameOver?.(score);
  }

  const PAUSE_BTN_W = 60;
  const PAUSE_BTN_H = 40;
  const PAUSE_BTN_GAP = 12;
  const PAUSE_BTN_Y = 340;
  const PAUSE_BTN_ROW_X =
    (canvas.width - (5 * PAUSE_BTN_W + 4 * PAUSE_BTN_GAP)) / 2;

  const onClick = (e: MouseEvent) => {
    if (!isPaused) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    for (let i = 0; i < 5; i++) {
      const bx = PAUSE_BTN_ROW_X + i * (PAUSE_BTN_W + PAUSE_BTN_GAP);
      if (
        mx >= bx &&
        mx <= bx + PAUSE_BTN_W &&
        my >= PAUSE_BTN_Y &&
        my <= PAUSE_BTN_Y + PAUSE_BTN_H
      ) {
        loadLevel(i + 1);
        isPaused = false;
        return;
      }
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    paddle.x = Math.max(
      0,
      Math.min(canvas.width - paddle.w, mouseX - paddle.w / 2)
    );
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key in keys) keys[e.key] = true;
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key in keys) keys[e.key] = false;
  };

  canvas.addEventListener("click", onClick);
  canvas.addEventListener("mousemove", onMouseMove);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function update(dt: number) {
    if (isPaused) return;
    if (gameState !== "playing") return;

    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(
        canvas.width - paddle.w,
        paddle.x + PADDLE_SPEED * dt
      );

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      (bounceSound.cloneNode(true) as HTMLAudioElement).play();
    }
    if (ball.x + ball.w >= canvas.width) {
      ball.x = canvas.width - ball.w;
      ball.vx = -Math.abs(ball.vx);
      (bounceSound.cloneNode(true) as HTMLAudioElement).play();
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      (bounceSound.cloneNode(true) as HTMLAudioElement).play();
    }

    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      (bounceSound.cloneNode(true) as HTMLAudioElement).play();
    }

    for (const block of blocks) {
      if (!block.alive) continue;
      if (collideAABB(block)) {
        block.alive = false;
        explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        score += 10;
        hooks.onScoreChange?.(score);
        ball.vy = -ball.vy;
        (breakSound.cloneNode(true) as HTMLAudioElement).play();
        if (blocks.every((b) => !b.alive)) {
          if (currentLevel < 5) loadLevel(currentLevel + 1);
          else {
            gameState = "win";
            reportGameOver();
          }
        }
        break;
      }
    }

    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    if (ball.y > canvas.height) {
      lives--;
      hooks.onLivesChange?.(lives);
      if (lives <= 0) {
        lives = 0;
        gameState = "gameover";
        reportGameOver();
      } else {
        initBall();
      }
    }
  }

  function drawOverlay(message: string) {
    ctx.fillStyle = palette.overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = palette.text;
    ctx.font = "bold 64px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  }

  function drawPauseOverlay() {
    ctx.fillStyle = palette.overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = palette.text;
    ctx.font = "bold 56px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAUSA", canvas.width / 2, 260);

    ctx.font = "bold 16px monospace";
    ctx.fillText("Saltar al nivel:", canvas.width / 2, 310);

    for (let i = 0; i < 5; i++) {
      const bx = PAUSE_BTN_ROW_X + i * (PAUSE_BTN_W + PAUSE_BTN_GAP);
      const isActive = i + 1 === currentLevel;
      ctx.fillStyle = isActive ? palette.accent : palette.grid;
      ctx.strokeStyle = palette.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, PAUSE_BTN_Y, PAUSE_BTN_W, PAUSE_BTN_H, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isActive ? palette.bg : palette.text;
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        String(i + 1),
        bx + PAUSE_BTN_W / 2,
        PAUSE_BTN_Y + PAUSE_BTN_H / 2
      );
    }
  }

  function drawGlow() {
    if (palette.glow) {
      ctx.shadowBlur = 14;
      ctx.shadowColor = palette.glow;
    }
  }

  function clearGlow() {
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }

  function draw() {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 2;
    drawGlow();
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    clearGlow();

    for (const block of blocks) {
      if (block.alive) {
        ctx.fillStyle = palette.blockColors[block.color] ?? palette.primary;
        drawGlow();
        ctx.fillRect(block.x, block.y, block.w, block.h);
        clearGlow();
      }
    }

    for (const exp of explosions) {
      const frameIndex = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
        3
      );
      drawFrame(
        ctx,
        EXPLOSION_FRAMES[exp.color][frameIndex],
        exp.x,
        exp.y,
        exp.w,
        exp.h
      );
    }

    ctx.fillStyle = palette.primary;
    drawGlow();
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    clearGlow();

    ctx.fillStyle = palette.accent;
    drawGlow();
    ctx.beginPath();
    ctx.arc(
      ball.x + ball.w / 2,
      ball.y + ball.h / 2,
      ball.w / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    clearGlow();

    if (gameState === "playing") {
      ctx.fillStyle = palette.text;
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Score: " + score, 10, 10);
      ctx.textAlign = "center";
      ctx.fillText("Nivel: " + currentLevel, canvas.width / 2, 10);
      const ballSize = 16;
      const ballSpacing = 4;
      ctx.fillStyle = palette.accent;
      for (let i = 0; i < lives; i++) {
        const bx = canvas.width - 10 - (lives - i) * (ballSize + ballSpacing);
        ctx.beginPath();
        ctx.arc(
          bx + ballSize / 2,
          10 + ballSize / 2,
          ballSize / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    if (gameState === "gameover") drawOverlay("GAME OVER");
    if (gameState === "win") drawOverlay("¡Completaste el juego!");
    if (isPaused) drawPauseOverlay();
  }

  let lastTime: number | null = null;
  let rafId = 0;
  let destroyed = false;

  function loop(timestamp: number) {
    if (destroyed) return;
    if (lastTime === null) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    draw();

    rafId = requestAnimationFrame(loop);
  }

  hooks.onScoreChange?.(score);
  hooks.onLivesChange?.(lives);
  initPaddle();
  loadLevel(1);
  rafId = requestAnimationFrame(loop);

  return {
    pause() {
      isPaused = true;
    },
    resume() {
      isPaused = false;
    },
    forceGameOver() {
      if (gameState !== "playing") return;
      gameState = "gameover";
      reportGameOver();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}

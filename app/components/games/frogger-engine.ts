import { FROGGER_THEMES, type SkinId } from "./themes";

export type FroggerHooks = {
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
  onGameOver?: (finalScore: number) => void;
};

export type FroggerControls = {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  destroy: () => void;
};

const COLS = 16;
const ROWS = 14;
const CELL = 40;
export const CANVAS_W = COLS * CELL; // 640
export const CANVAS_H = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

type Direction = "up" | "down" | "left" | "right";
type GameState = "playing" | "gameover";

type Entity = {
  col: number;
  width: number;
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
};

type Lane = {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
};

type Frog = {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
};

const LEVEL_SPEED_STEP = 0.15;
export const TURTLE_VISIBLE_MS = 3000;
export const TURTLE_SUBMERGED_MS = 1500;

type LaneSpec = {
  row: number;
  speed: number; // px/frame @60fps, nivel 1
  dir: 1 | -1;
  type: Entity["type"];
  widths: number[]; // un valor por entidad, se reparten a intervalos regulares
};

// Carretera: filas 8–12, sentidos alternos, 1.5–4 px/frame
const ROAD_SPECS: LaneSpec[] = [
  { row: 8, speed: 1.5, dir: -1, type: "truck", widths: [2, 3, 2] },
  { row: 9, speed: 2.5, dir: 1, type: "car", widths: [1, 1, 1, 1] },
  { row: 10, speed: 2, dir: -1, type: "car", widths: [1, 1, 1] },
  { row: 11, speed: 3, dir: 1, type: "car", widths: [1, 1, 1, 1] },
  { row: 12, speed: 4, dir: -1, type: "truck", widths: [2, 2] },
];

// Río: filas 1–6, 1–3 px/frame, troncos 2–4 celdas, tortugas en grupos de 2–3
const RIVER_SPECS: LaneSpec[] = [
  { row: 1, speed: 1.5, dir: 1, type: "log", widths: [3, 3, 3] },
  { row: 2, speed: 1, dir: -1, type: "turtle", widths: [2, 2, 2] },
  { row: 3, speed: 2.5, dir: 1, type: "log", widths: [4, 4] },
  { row: 4, speed: 2, dir: -1, type: "log", widths: [2, 2, 2] },
  { row: 5, speed: 1.5, dir: 1, type: "turtle", widths: [3, 3] },
  { row: 6, speed: 3, dir: -1, type: "log", widths: [3, 3, 3] },
];

function buildLane(spec: LaneSpec, speedMult: number): Lane {
  const spacing = COLS / spec.widths.length;
  const entities: Entity[] = spec.widths.map((width, i) => {
    const entity: Entity = {
      col: i * spacing + (spec.row % 2),
      width,
      type: spec.type,
    };
    if (spec.type === "turtle") entity.submerged = false;
    return entity;
  });
  return {
    row: spec.row,
    speed: spec.speed * speedMult,
    dir: spec.dir,
    entities,
  };
}

export function buildLanes(level: number): Lane[] {
  const speedMult = 1 + LEVEL_SPEED_STEP * (level - 1);
  return [...RIVER_SPECS, ...ROAD_SPECS].map((s) => buildLane(s, speedMult));
}

const HOP_MS = 120;
const INITIAL_LIVES = 3;
const BASE_ROUND_MS = 15000;
const MIN_ROUND_MS = 8000;
const ROUND_MS_STEP = 1000;
const SCORE_PER_ROW = 10;
const GOAL_SCORE = 50;
const ROUND_SCORE = 200;
const TIME_BONUS_PER_SEC = 10;
const START_COL = Math.floor(COLS / 2);
const GOAL_COUNT = 5;
const GOAL_W = 2; // celdas por boca
const HUD_H = 18; // franja superior de la fila 0 reservada al HUD
const TURTLE_CYCLE_MS = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;

const DIR_DELTA: Record<Direction, { dc: number; dr: number }> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

const KEY_DIR: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/** Columna (en celdas) donde empieza la boca i. */
function goalStartCol(i: number): number {
  return (i + 0.5) * (COLS / GOAL_COUNT) - GOAL_W / 2;
}

function roundTimeMs(level: number): number {
  return Math.max(MIN_ROUND_MS, BASE_ROUND_MS - (level - 1) * ROUND_MS_STEP);
}

function laneAt(lanes: Lane[], row: number): Lane | undefined {
  return lanes.find((l) => l.row === row);
}

/** Vehículo solapando la rana (caja reducida) en su carril de carretera. */
function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  if (frog.row < ROW_ROAD_TOP || frog.row > ROW_ROAD_BOT) return false;
  const lane = laneAt(lanes, frog.row);
  if (!lane) return false;
  const left = frog.col + 0.15;
  const right = frog.col + 0.85;
  return lane.entities.some(
    (e) => right > e.col && left < e.col + e.width
  );
}

/** Tronco/tortuga visible bajo el centro de la rana, o null. */
function getSupport(frog: Frog, lanes: Lane[]): Entity | null {
  if (frog.row < ROW_RIVER_TOP || frog.row > ROW_RIVER_BOT) return null;
  const lane = laneAt(lanes, frog.row);
  if (!lane) return null;
  const center = frog.col + 0.5;
  return (
    lane.entities.find(
      (e) =>
        !(e.type === "turtle" && e.submerged) &&
        center >= e.col &&
        center < e.col + e.width
    ) ?? null
  );
}

/** Índice de la boca destino bajo el centro de la rana, o -1. */
function goalIndexAt(col: number): number {
  const center = col + 0.5;
  for (let i = 0; i < GOAL_COUNT; i++) {
    const start = goalStartCol(i);
    if (center >= start && center < start + GOAL_W) return i;
  }
  return -1;
}

export function createFroggerGame(
  canvas: HTMLCanvasElement,
  hooks: FroggerHooks,
  skin: SkinId = "clasico"
): FroggerControls {
  const ctx = canvas.getContext("2d")!;
  const palette = FROGGER_THEMES[skin];
  const glowOn = !!palette.glow;

  let lanes: Lane[],
    frog: Frog,
    fromCol: number,
    fromRow: number,
    pendingDir: Direction | null,
    goals: boolean[],
    maxRow: number,
    score: number,
    lives: number,
    level: number,
    timeLeft: number,
    turtleClock: number,
    lastTime: number,
    gameState: GameState,
    isPaused: boolean,
    animId: number;

  function addScore(points: number) {
    score += points;
    hooks.onScoreChange?.(score);
  }

  function resetFrog() {
    frog = {
      col: START_COL,
      row: ROW_START,
      animating: false,
      animT: 0,
      targetCol: START_COL,
      targetRow: ROW_START,
    };
    fromCol = START_COL;
    fromRow = ROW_START;
    pendingDir = null;
    maxRow = ROW_START;
    timeLeft = roundTimeMs(level);
  }

  /** Rana en fila de metas: ocupa boca libre (true) o muere (false). */
  function checkGoal(): boolean {
    const i = goalIndexAt(frog.col);
    if (i < 0 || goals[i]) return false;
    goals[i] = true;
    addScore(GOAL_SCORE + Math.floor(timeLeft / 1000) * TIME_BONUS_PER_SEC);
    return true;
  }

  function resolveLanding() {
    if (frog.row < maxRow) {
      addScore((maxRow - frog.row) * SCORE_PER_ROW);
      maxRow = frog.row;
    }
    if (frog.row === ROW_GOALS) {
      if (!checkGoal()) {
        killFrog();
        return;
      }
      if (goals.every(Boolean)) completeRound();
      else resetFrog();
      return;
    }
    if (
      frog.row >= ROW_RIVER_TOP &&
      frog.row <= ROW_RIVER_BOT &&
      !getSupport(frog, lanes)
    ) {
      killFrog();
    }
  }

  function completeRound() {
    addScore(ROUND_SCORE);
    level++;
    hooks.onLevelChange?.(level);
    goals = new Array(GOAL_COUNT).fill(false);
    lanes = buildLanes(level);
    turtleClock = 0;
    resetFrog();
  }

  function killFrog() {
    if (gameState !== "playing") return;
    lives--;
    hooks.onLivesChange?.(lives);
    if (lives <= 0) {
      gameState = "gameover";
      hooks.onGameOver?.(score);
      return;
    }
    resetFrog();
  }

  function startHop(dir: Direction) {
    const { dc, dr } = DIR_DELTA[dir];
    const baseCol = Math.round(frog.col);
    const tc = baseCol + dc;
    const tr = frog.row + dr;
    if (tc < 0 || tc >= COLS || tr < 0 || tr >= ROWS) return;
    fromCol = frog.col;
    fromRow = frog.row;
    frog.targetCol = tc;
    frog.targetRow = tr;
    frog.animating = true;
    frog.animT = 0;
  }

  function update(dt: number) {
    if (isPaused || gameState !== "playing") return;
    const frames = dt / 16;
    turtleClock += dt;

    for (const lane of lanes) {
      const dx = (lane.speed / CELL) * lane.dir * frames;
      lane.entities.forEach((e, i) => {
        e.col += dx;
        if (lane.dir === 1 && e.col >= COLS) e.col = -e.width;
        else if (lane.dir === -1 && e.col + e.width <= 0) e.col = COLS;
        if (e.type === "turtle") {
          e.submerged = (turtleClock + i * 1000) % TURTLE_CYCLE_MS >= TURTLE_VISIBLE_MS;
        }
      });
    }

    if (!frog.animating) {
      if (pendingDir) {
        const dir = pendingDir;
        pendingDir = null;
        startHop(dir);
      }
    } else {
      frog.animT += dt;
      if (frog.animT >= HOP_MS) {
        frog.col = frog.targetCol;
        frog.row = frog.targetRow;
        frog.animating = false;
        frog.animT = 0;
        resolveLanding();
      }
    }

    if (!frog.animating && frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
      if (getSupport(frog, lanes)) {
        const lane = laneAt(lanes, frog.row)!;
        frog.col += (lane.speed / CELL) * lane.dir * frames;
        if (frog.col < -0.5 || frog.col > COLS - 0.5) killFrog();
      } else {
        killFrog(); // agua o tortuga sumergida bajo la rana
      }
    }

    if (checkRoadCollision(frog, lanes)) killFrog();

    timeLeft -= dt;
    if (timeLeft <= 0) killFrog();
  }

  function drawFrog() {
    const t = frog.animating ? Math.min(1, frog.animT / HOP_MS) : 0;
    const col = frog.animating ? fromCol + (frog.targetCol - fromCol) * t : frog.col;
    const row = frog.animating ? fromRow + (frog.targetRow - fromRow) * t : frog.row;
    const cx = col * CELL + CELL / 2;
    const cy = row * CELL + CELL / 2;
    const stretch = frog.animating ? 1 + 0.25 * Math.sin(t * Math.PI) : 1;

    ctx.fillStyle = palette.primary;
    if (glowOn) {
      ctx.shadowColor = palette.glow!;
      ctx.shadowBlur = 12;
    }
    if (frog.animating) {
      ctx.fillRect(cx - 17 * stretch, cy - 14, 6, 6);
      ctx.fillRect(cx + 11 * stretch, cy - 14, 6, 6);
      ctx.fillRect(cx - 17 * stretch, cy + 8, 6, 6);
      ctx.fillRect(cx + 11 * stretch, cy + 8, 6, 6);
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const ex of [-6, 6]) {
      ctx.fillStyle = palette.frogEye;
      ctx.beginPath();
      ctx.arc(cx + ex, cy - 9, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.frogPupil;
      ctx.beginPath();
      ctx.arc(cx + ex, cy - 9, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawEntity(e: Entity, row: number) {
    const x = e.col * CELL;
    const y = row * CELL;
    const w = e.width * CELL;
    switch (e.type) {
      case "car": {
        ctx.fillStyle = palette.cars[row % 3];
        ctx.fillRect(x + 3, y + 8, w - 6, CELL - 16);
        ctx.fillStyle = palette.wheel;
        ctx.beginPath();
        ctx.arc(x + 11, y + CELL - 8, 4, 0, Math.PI * 2);
        ctx.arc(x + w - 11, y + CELL - 8, 4, 0, Math.PI * 2);
        ctx.arc(x + 11, y + 8, 4, 0, Math.PI * 2);
        ctx.arc(x + w - 11, y + 8, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "truck": {
        ctx.fillStyle = palette.truckBody;
        ctx.fillRect(x + 2, y + 6, w - 4, CELL - 12);
        ctx.fillStyle = palette.truckCab;
        ctx.fillRect(x + 2, y + 6, 14, CELL - 12);
        ctx.fillStyle = palette.wheel;
        for (const wx of [14, w / 2, w - 12]) {
          ctx.beginPath();
          ctx.arc(x + wx, y + CELL - 6, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case "log": {
        ctx.fillStyle = palette.log;
        ctx.fillRect(x + 1, y + 6, w - 2, CELL - 12);
        ctx.strokeStyle = palette.logGrain;
        ctx.lineWidth = 1;
        for (let lx = 10; lx < w - 4; lx += 14) {
          ctx.beginPath();
          ctx.moveTo(x + lx, y + 8);
          ctx.lineTo(x + lx, y + CELL - 8);
          ctx.stroke();
        }
        break;
      }
      case "turtle": {
        for (let k = 0; k < e.width; k++) {
          const cx = x + k * CELL + CELL / 2;
          const cy = y + CELL / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 15, 0, Math.PI * 2);
          if (e.submerged) {
            ctx.strokeStyle = palette.turtleSubmerged;
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.fillStyle = palette.turtle;
            ctx.fill();
            ctx.strokeStyle = palette.turtleLine;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy);
            ctx.lineTo(cx + 10, cy);
            ctx.moveTo(cx, cy - 10);
            ctx.lineTo(cx, cy + 10);
            ctx.stroke();
          }
        }
        break;
      }
    }
  }

  function drawFilledGoal(x: number, y: number, w: number) {
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 11, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // zonas
    ctx.fillStyle = palette.goalRow; // fila de metas
    ctx.fillRect(0, 0, CANVAS_W, CELL);
    ctx.fillStyle = palette.river; // río
    ctx.fillRect(0, ROW_RIVER_TOP * CELL, CANVAS_W, (ROW_RIVER_BOT - ROW_RIVER_TOP + 1) * CELL);
    ctx.fillStyle = palette.safe; // zonas seguras
    ctx.fillRect(0, ROW_SAFE_MID * CELL, CANVAS_W, CELL);
    ctx.fillRect(0, ROW_START * CELL, CANVAS_W, CELL);
    ctx.fillStyle = palette.road; // carretera
    ctx.fillRect(0, ROW_ROAD_TOP * CELL, CANVAS_W, (ROW_ROAD_BOT - ROW_ROAD_TOP + 1) * CELL);
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([12, 12]);
    for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(CANVAS_W, r * CELL);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // bocas destino
    for (let i = 0; i < GOAL_COUNT; i++) {
      const x = goalStartCol(i) * CELL;
      const w = GOAL_W * CELL;
      ctx.fillStyle = palette.goalSlot;
      ctx.fillRect(x, HUD_H, w, CELL - HUD_H);
      ctx.strokeStyle = palette.goalBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, HUD_H + 1, w - 2, CELL - HUD_H - 2);
      if (goals[i]) drawFilledGoal(x, HUD_H, w);
    }

    // entidades
    for (const lane of lanes) {
      for (const e of lane.entities) drawEntity(e, lane.row);
    }

    drawFrog();

    // HUD interno
    const timeRatio = Math.max(0, timeLeft / roundTimeMs(level));
    ctx.fillStyle = timeRatio > 0.5 ? palette.timeOk : timeRatio > 0.25 ? palette.timeWarn : palette.timeBad;
    ctx.fillRect(0, 0, CANVAS_W * timeRatio, 4);

    ctx.fillStyle = palette.text;
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE ${score}`, 8, 15);
    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${level}`, CANVAS_W / 2, 15);
    ctx.fillStyle = palette.primary;
    for (let i = 0; i < lives; i++) {
      ctx.beginPath();
      ctx.arc(CANVAS_W - 14 - i * 18, 10, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.textAlign = "left";

    if (gameState === "gameover") {
      ctx.fillStyle = palette.overlay;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = palette.text;
      ctx.font = "32px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2);
      ctx.font = "16px monospace";
      ctx.fillText("SPACE para reiniciar", CANVAS_W / 2, CANVAS_H / 2 + 32);
      ctx.textAlign = "left";
    }
  }

  function loop(ts: number) {
    const dt = Math.min(ts - lastTime, 50);
    lastTime = ts;
    update(dt);
    draw();
    animId = requestAnimationFrame(loop);
  }

  function reset() {
    score = 0;
    lives = INITIAL_LIVES;
    level = 1;
    lanes = buildLanes(level);
    goals = new Array(GOAL_COUNT).fill(false);
    turtleClock = 0;
    gameState = "playing";
    isPaused = false;
    resetFrog();
    hooks.onScoreChange?.(score);
    hooks.onLivesChange?.(lives);
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
    const dir = KEY_DIR[e.code];
    if (dir) {
      e.preventDefault();
      pendingDir = dir;
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
      gameState = "gameover";
      hooks.onLivesChange?.(0);
      hooks.onGameOver?.(score);
    },
    destroy() {
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown", onKeyDown);
    },
  };
}

import type { ComponentType, RefAttributes } from "react";
import Arkanoid from "./Arkanoid";
import Asteroids from "./Asteroids";
import Tetris from "./Tetris";

export type GameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type GameHandle = {
  forceGameOver: () => void;
};

export const GAME_ENGINES: Record<
  string,
  ComponentType<GameProps & RefAttributes<GameHandle>>
> = {
  arkanoid: Arkanoid,
  asteroids: Asteroids,
  tetris: Tetris,
};

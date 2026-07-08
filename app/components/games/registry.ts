import type { ComponentType, RefAttributes } from "react";
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
  asteroids: Asteroids,
  tetris: Tetris,
};

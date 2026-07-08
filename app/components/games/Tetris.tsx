"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createTetrisGame, type TetrisControls } from "./tetris-engine";
import type { GameProps, GameHandle } from "./registry";

// registry.ts's GameProps only has onLivesChange; tetris has no lives, so
// onLivesChange maps to the engine's onLinesChange (same functional slot).
const Tetris = forwardRef<GameHandle, GameProps>(function Tetris(
  { paused, onScoreChange, onLivesChange, onLevelChange, onGameOver },
  ref
) {
  const boardRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<TetrisControls | null>(null);

  useEffect(() => {
    if (!boardRef.current || !nextRef.current) return;
    const controls = createTetrisGame(boardRef.current, nextRef.current, {
      onScoreChange,
      onLinesChange: onLivesChange,
      onLevelChange,
      onGameOver,
    });
    controlsRef.current = controls;
    return () => {
      controls.destroy();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (paused) {
      controlsRef.current?.pause();
    } else {
      controlsRef.current?.resume();
    }
  }, [paused]);

  useImperativeHandle(ref, () => ({
    forceGameOver: () => controlsRef.current?.forceGameOver(),
  }));

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      <canvas ref={boardRef} width={300} height={600} />
      <canvas ref={nextRef} width={120} height={120} />
    </div>
  );
});

export default Tetris;

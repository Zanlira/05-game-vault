"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createTetrisGame, type TetrisControls } from "./tetris-engine";
import type { GameProps, GameHandle } from "./registry";
import TouchControls, { type TouchButton } from "./TouchControls";

const TOUCH_BUTTONS: TouchButton[] = [
  { code: "ArrowLeft", label: "◀", position: "dpad-left" },
  { code: "ArrowRight", label: "▶", position: "dpad-right" },
  { code: "ArrowDown", label: "▼", position: "dpad-down" },
  { code: "ArrowUp", label: "ROTAR", position: "action" },
  { code: "Space", label: "CAER", position: "action" },
];

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
    <div className="max-w-full">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <canvas
          ref={boardRef}
          width={300}
          height={600}
          className="max-w-full h-auto"
        />
        <canvas ref={nextRef} width={120} height={120} />
      </div>
      <TouchControls buttons={TOUCH_BUTTONS} />
    </div>
  );
});

export default Tetris;

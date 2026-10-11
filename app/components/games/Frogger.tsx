"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  createFroggerGame,
  CANVAS_W,
  CANVAS_H,
  type FroggerControls,
} from "./frogger-engine";
import type { GameProps, GameHandle } from "./registry";
import TouchControls, { type TouchButton } from "./TouchControls";

const TOUCH_BUTTONS: TouchButton[] = [
  { code: "ArrowUp", label: "▲", position: "dpad-up" },
  { code: "ArrowDown", label: "▼", position: "dpad-down" },
  { code: "ArrowLeft", label: "◀", position: "dpad-left" },
  { code: "ArrowRight", label: "▶", position: "dpad-right" },
];

const Frogger = forwardRef<GameHandle, GameProps>(function Frogger(
  { paused, skin, onScoreChange, onLivesChange, onLevelChange, onGameOver },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<FroggerControls | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    controlsRef.current = createFroggerGame(
      canvasRef.current,
      {
        onScoreChange,
        onLivesChange,
        onLevelChange,
        onGameOver,
      },
      skin ?? "clasico"
    );
    return () => {
      controlsRef.current?.destroy();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skin]);

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
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="max-w-full h-auto"
      />
      <TouchControls buttons={TOUCH_BUTTONS} />
    </div>
  );
});

export default Frogger;

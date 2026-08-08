"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  createAsteroidsGame,
  type AsteroidsControls,
} from "./asteroids-engine";
import type { GameProps, GameHandle } from "./registry";
import TouchControls, { type TouchButton } from "./TouchControls";

const TOUCH_BUTTONS: TouchButton[] = [
  { code: "ArrowLeft", label: "◀", position: "dpad-left" },
  { code: "ArrowRight", label: "▶", position: "dpad-right" },
  { code: "ArrowUp", label: "▲", position: "dpad-up" },
  { code: "Space", label: "DISPARAR", position: "action" },
];

const Asteroids = forwardRef<GameHandle, GameProps>(function Asteroids(
  {
    paused,
    skin = "clasico",
    onScoreChange,
    onLivesChange,
    onLevelChange,
    onGameOver,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<AsteroidsControls | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const controls = createAsteroidsGame(
      canvasRef.current,
      {
        onScoreChange,
        onLivesChange,
        onLevelChange,
        onGameOver,
      },
      skin
    );
    controlsRef.current = controls;
    return () => {
      controls.destroy();
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
        width={800}
        height={600}
        className="max-w-full h-auto"
      />
      <TouchControls buttons={TOUCH_BUTTONS} />
    </div>
  );
});

export default Asteroids;

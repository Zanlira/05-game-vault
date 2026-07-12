"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createSnakeGame, type SnakeControls } from "./snake-engine";
import { loadSpritesheet } from "./snake-assets/sprites";
import type { GameProps, GameHandle } from "./registry";

const Snake = forwardRef<GameHandle, GameProps>(function Snake(
  { paused, skin, onScoreChange, onLivesChange, onLevelChange, onGameOver },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<SnakeControls | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    loadSpritesheet(() => {
      if (cancelled || !canvasRef.current) return;
      controlsRef.current = createSnakeGame(
        canvasRef.current,
        {
          onScoreChange,
          onLivesChange,
          onLevelChange,
          onGameOver,
        },
        skin ?? "clasico"
      );
    });
    return () => {
      cancelled = true;
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

  return <canvas ref={canvasRef} width={600} height={600} />;
});

export default Snake;

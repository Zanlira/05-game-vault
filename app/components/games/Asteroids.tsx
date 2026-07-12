"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  createAsteroidsGame,
  type AsteroidsControls,
} from "./asteroids-engine";
import type { GameProps, GameHandle } from "./registry";

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

  return <canvas ref={canvasRef} width={800} height={600} />;
});

export default Asteroids;

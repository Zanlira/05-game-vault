"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  createAsteroidsGame,
  type AsteroidsControls,
} from "./asteroids-engine";

export type AsteroidsProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export type AsteroidsHandle = {
  forceGameOver: () => void;
};

const Asteroids = forwardRef<AsteroidsHandle, AsteroidsProps>(
  function Asteroids(
    { paused, onScoreChange, onLivesChange, onLevelChange, onGameOver },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const controlsRef = useRef<AsteroidsControls | null>(null);

    useEffect(() => {
      if (!canvasRef.current) return;
      const controls = createAsteroidsGame(canvasRef.current, {
        onScoreChange,
        onLivesChange,
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

    return <canvas ref={canvasRef} width={800} height={600} />;
  }
);

export default Asteroids;

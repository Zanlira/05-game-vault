"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createArkanoidGame, type ArkanoidControls } from "./arkanoid-engine";
import { loadSpritesheet } from "./arkanoid-assets/spritesheet";
import type { GameProps, GameHandle } from "./registry";

const Arkanoid = forwardRef<GameHandle, GameProps>(function Arkanoid(
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
  const controlsRef = useRef<ArkanoidControls | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;
    loadSpritesheet(() => {
      if (cancelled || !canvasRef.current) return;
      controlsRef.current = createArkanoidGame(
        canvasRef.current,
        {
          onScoreChange,
          onLivesChange,
          onLevelChange,
          onGameOver,
        },
        skin
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

  return <canvas ref={canvasRef} width={800} height={600} />;
});

export default Arkanoid;

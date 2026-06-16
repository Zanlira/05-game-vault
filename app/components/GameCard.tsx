"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/app/data/games";

export default function GameCard({ game }: { game: Game }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  }

  function onLeave() {
    if (ref.current) ref.current.style.transform = "";
  }

  function go(e?: React.MouseEvent) {
    e?.stopPropagation();
    router.push(`/games/${game.id}`);
  }

  const btnColor = game.color === "magenta" ? "magenta" : game.color === "yellow" ? "yellow" : "";

  return (
    <div ref={ref} className="card" onMouseMove={onMove} onMouseLeave={onLeave} onClick={go}>
      <div className="cover">
        <div className={"cover-bg " + game.cover} />
        <div className="label">{game.cat}</div>
      </div>
      <div className="meta">
        <div className="title">{game.title}</div>
        <div className="desc">{game.short}</div>
        <div className="row">
          <div className="score-badge">
            <span>MEJOR PUNTUACIÓN</span>
            <b>{game.best.toLocaleString("es-ES")}</b>
          </div>
          <button className={`btn ${btnColor}`} onClick={go}>JUGAR</button>
        </div>
      </div>
    </div>
  );
}

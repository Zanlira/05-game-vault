"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GAMES } from "@/app/data/games";
import { seededScores, type ScoreRow } from "@/app/data/scores";
import { getTopScores } from "@/lib/supabase/scores";

export default function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isAsteroids = id === "asteroids";

  const game = useMemo(() => GAMES.find((g) => g.id === id), [id]);
  const mockScores = useMemo(() => seededScores(id.length * 17 + 3, 10), [id]);

  const [scores, setScores] = useState<ScoreRow[]>(
    isAsteroids ? [] : mockScores
  );
  const [loading, setLoading] = useState(isAsteroids);

  useEffect(() => {
    if (!isAsteroids) return;
    let cancelled = false;
    setLoading(true);
    getTopScores("asteroids", 10)
      .then((rows) => {
        if (!cancelled) setScores(rows);
      })
      .catch((err) => {
        console.error("getTopScores failed", err);
        if (!cancelled) setScores([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAsteroids]);

  if (!game) {
    return (
      <div
        style={{ textAlign: "center", padding: 80, color: "var(--ink-faint)" }}
      >
        <div
          className="pixel"
          style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
        >
          JUEGO NO ENCONTRADO
        </div>
        <button className="btn ghost" onClick={() => router.push("/games")}>
          VOLVER AL VAULT
        </button>
      </div>
    );
  }

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover} />
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {game.best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <button
              className="btn xl pulse"
              onClick={() => router.push(`/games/${game.id}/play`)}
            >
              ▶ JUGAR AHORA
            </button>
            <button
              className="btn ghost lg"
              onClick={() => router.push("/games")}
            >
              VOLVER AL VAULT
            </button>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {loading ? (
            <div
              style={{
                padding: "24px 0",
                color: "var(--ink-faint)",
                textAlign: "center",
              }}
            >
              CARGANDO…
            </div>
          ) : scores.length === 0 ? (
            <div
              style={{
                padding: "24px 0",
                color: "var(--ink-faint)",
                textAlign: "center",
              }}
            >
              SIN PUNTUACIONES AÚN
            </div>
          ) : (
            scores.map((r, i) => (
              <div
                key={r.name}
                className={
                  "lb-row" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">
                  {r.name}
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--ink-faint)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {r.date}
                  </div>
                </div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

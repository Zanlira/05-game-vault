"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GAMES } from "@/app/data/games";
import { seededScores, type ScoreRow } from "@/app/data/scores";
import { getTopScores } from "@/lib/supabase/scores";
import { useUser } from "@/app/context/UserContext";
import { GAME_ENGINES } from "@/app/components/games/registry";

export default function HallOfFame() {
  const [tab, setTab] = useState(GAMES[0].id);
  const { user } = useUser();
  const router = useRouter();
  const hasEngine = tab in GAME_ENGINES;

  const mockRows = useMemo(() => seededScores(tab.length * 23 + 7, 12), [tab]);
  const [realRows, setRealRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(hasEngine);

  useEffect(() => {
    if (!hasEngine) return;
    let cancelled = false;
    setLoading(true);
    getTopScores(tab, 12)
      .then((data) => {
        if (!cancelled) setRealRows(data);
      })
      .catch((err) => {
        console.error("getTopScores failed", err);
        if (!cancelled) setRealRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasEngine, tab]);

  const rows = hasEngine ? realRows : mockRows;
  const game = GAMES.find((g) => g.id === tab)!;
  const showYouBlock = user && (!hasEngine || rows.length >= 6);
  const youRank = showYouBlock ? Math.floor(8 + (tab.length % 4)) : null;
  const youScore = showYouBlock ? rows[5]?.score - 2400 : null;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {hasEngine && loading ? (
        <div
          style={{
            padding: "48px 0",
            textAlign: "center",
            color: "var(--ink-faint)",
          }}
        >
          CARGANDO…
        </div>
      ) : hasEngine && rows.length === 0 ? (
        <div
          style={{
            padding: "48px 0",
            textAlign: "center",
            color: "var(--ink-faint)",
          }}
        >
          SIN PUNTUACIONES AÚN
        </div>
      ) : (
        <>
          <div className="podium">
            <div className="podium-slot silver">
              <div className="rank-num">02</div>
              <div className="name">{rows[1]?.name ?? "—"}</div>
              <div className="score">
                {(rows[1]?.score ?? 0).toLocaleString("es-ES")}
              </div>
              <div className="date">{rows[1]?.date ?? "—"}</div>
            </div>
            <div className="podium-slot gold">
              <div
                className="pixel"
                style={{
                  fontSize: 9,
                  color: "var(--gold)",
                  letterSpacing: "0.18em",
                }}
              >
                CAMPEÓN
              </div>
              <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                01
              </div>
              <div className="name">{rows[0]?.name ?? "—"}</div>
              <div className="score" style={{ fontSize: 20 }}>
                {(rows[0]?.score ?? 0).toLocaleString("es-ES")}
              </div>
              <div className="date">{rows[0]?.date ?? "—"}</div>
            </div>
            <div className="podium-slot bronze">
              <div className="rank-num">03</div>
              <div className="name">{rows[2]?.name ?? "—"}</div>
              <div className="score">
                {(rows[2]?.score ?? 0).toLocaleString("es-ES")}
              </div>
              <div className="date">{rows[2]?.date ?? "—"}</div>
            </div>
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.name + i}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
            {showYouBlock && (
              <>
                <div className="tr you-label">
                  ▸ TU MEJOR MARCA EN {game.title}
                </div>
                <div
                  className="tr you"
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk" style={{ color: "var(--yellow)" }}>
                    #{String(youRank).padStart(2, "0")}
                  </div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>
                    {user.name}
                  </div>
                  <div
                    className="sc"
                    style={{
                      color: "var(--yellow)",
                      textShadow: "0 0 6px rgba(245,255,0,0.5)",
                    }}
                  >
                    {(youScore ?? 9999).toLocaleString("es-ES")}
                  </div>
                  <div className="dt">11/05/2026</div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button className="btn lg" onClick={() => router.push("/")}>
          VOLVER A LA BIBLIOTECA
        </button>
      </div>
    </div>
  );
}

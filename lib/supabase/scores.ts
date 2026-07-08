import { createClient } from "@/lib/supabase/client";
import type { ScoreRow } from "@/app/data/scores";

export type ScoreEntry = {
  id: number;
  game: string;
  playerName: string;
  score: number;
  createdAt: string;
};

export async function insertScore(entry: {
  game: string;
  playerName: string;
  score: number;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scores").insert({
    game: entry.game,
    player_name: entry.playerName,
    score: entry.score,
  });
  if (error) throw error;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function getTopScores(
  game: string,
  limit: number
): Promise<ScoreRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("id, game, player_name, score, created_at")
    .eq("game", game)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

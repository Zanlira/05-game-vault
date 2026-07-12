export type SkinId = "clasico" | "neon" | "retro";

export interface GamePalette {
  bg: string;
  primary: string;
  accent: string;
  grid: string;
  text: string;
  overlay: string;
  glow?: string; // opcional, usado sobre todo por el skin neon (shadowBlur/shadowColor)
}

export const ASTEROIDS_THEMES: Record<SkinId, GamePalette> = {
  clasico: {
    bg: "#000000",
    primary: "#ffffff",
    accent: "#00ffff",
    grid: "#ffffff",
    text: "#ffffff",
    overlay: "rgba(255,255,255,0.65)",
  },
  neon: {
    bg: "#050109",
    primary: "#00f5ff",
    accent: "#ff006e",
    grid: "#f5ff00",
    text: "#00ff88",
    overlay: "rgba(0,245,255,0.65)",
    glow: "#00f5ff",
  },
  retro: {
    bg: "#0a0f0a",
    primary: "#33ff33",
    accent: "#ffb000",
    grid: "#1f7a1f",
    text: "#33ff33",
    overlay: "rgba(51,255,51,0.55)",
  },
};

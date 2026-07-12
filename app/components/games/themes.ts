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

export interface ArkanoidPalette extends GamePalette {
  /** Mapa nombre de bloque (arkanoid-assets/levels.ts) -> hex del skin activo */
  blockColors: Record<string, string>;
}

export const ARKANOID_THEMES: Record<SkinId, ArkanoidPalette> = {
  clasico: {
    bg: "#000000",
    primary: "#ffffff",
    accent: "#ffffff",
    grid: "#444444",
    text: "#ffffff",
    overlay: "rgba(0,0,0,0.6)",
    blockColors: {
      red: "#ff3b3b",
      yellow: "#ffe135",
      cyan: "#00e5ff",
      magenta: "#ff00ff",
      hotpink: "#ff69b4",
      green: "#33ff33",
      gray: "#888888",
    },
  },
  neon: {
    bg: "#05010c",
    primary: "#00f5ff",
    accent: "#ff006e",
    grid: "#f5ff00",
    text: "#00ff88",
    overlay: "rgba(0,245,255,0.55)",
    glow: "#00f5ff",
    blockColors: {
      red: "#ff006e",
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      magenta: "#d400ff",
      hotpink: "#ff00aa",
      green: "#00ff88",
      gray: "#7d7dff",
    },
  },
  retro: {
    bg: "#0a0f0a",
    primary: "#33ff33",
    accent: "#ffb000",
    grid: "#1f7a1f",
    text: "#33ff33",
    overlay: "rgba(51,255,51,0.5)",
    blockColors: {
      red: "#ff8800",
      yellow: "#ffcc00",
      cyan: "#33ff99",
      magenta: "#66ffcc",
      hotpink: "#99ffdd",
      green: "#33ff33",
      gray: "#2a5f2a",
    },
  },
};

export const SNAKE_THEMES: Record<SkinId, GamePalette> = {
  clasico: {
    bg: "#14241a",
    primary: "#81c784",
    accent: "#4caf50",
    grid: "rgba(255,255,255,0.15)",
    text: "#ffffff",
    overlay: "rgba(0,0,0,0.6)",
  },
  neon: {
    bg: "#050109",
    primary: "#00f5ff",
    accent: "#ff006e",
    grid: "rgba(245,255,0,0.15)",
    text: "#00ff88",
    overlay: "rgba(0,245,255,0.35)",
    glow: "#00f5ff",
  },
  retro: {
    bg: "#0a0f0a",
    primary: "#33ff33",
    accent: "#ffb000",
    grid: "rgba(51,255,51,0.15)",
    text: "#33ff33",
    overlay: "rgba(51,255,51,0.35)",
  },
};

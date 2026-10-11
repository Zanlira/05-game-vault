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

export interface FroggerPalette extends GamePalette {
  goalRow: string;
  river: string;
  safe: string;
  road: string;
  goalSlot: string;
  goalBorder: string;
  frogEye: string;
  frogPupil: string;
  cars: [string, string, string];
  truckBody: string;
  truckCab: string;
  wheel: string;
  log: string;
  logGrain: string;
  turtle: string;
  turtleLine: string;
  turtleSubmerged: string;
  timeOk: string;
  timeWarn: string;
  timeBad: string;
}

export const FROGGER_THEMES: Record<SkinId, FroggerPalette> = {
  clasico: {
    bg: "#000000",
    primary: "#2ecc40",
    accent: "#f1c40f",
    grid: "#555555",
    text: "#ffffff",
    overlay: "rgba(0,0,0,0.65)",
    goalRow: "#0b3d1a",
    river: "#0a2a5e",
    safe: "#145a2a",
    road: "#000000",
    goalSlot: "#2ecc71",
    goalBorder: "#f1c40f",
    frogEye: "#ffffff",
    frogPupil: "#000000",
    cars: ["#e74c3c", "#f1c40f", "#3498db"],
    truckBody: "#95a5a6",
    truckCab: "#e67e22",
    wheel: "#111111",
    log: "#8b5a2b",
    logGrain: "#5e3b17",
    turtle: "#27ae60",
    turtleLine: "#1e8449",
    turtleSubmerged: "rgba(46,204,64,0.35)",
    timeOk: "#2ecc40",
    timeWarn: "#f1c40f",
    timeBad: "#e74c3c",
  },
  neon: {
    bg: "#050109",
    primary: "#00ff88",
    accent: "#f5ff00",
    grid: "#f5ff00",
    text: "#00f5ff",
    overlay: "rgba(5,1,9,0.75)",
    glow: "#00f5ff",
    goalRow: "#06140f",
    river: "#07104a",
    safe: "#12062a",
    road: "#050109",
    goalSlot: "#0a2a22",
    goalBorder: "#00f5ff",
    frogEye: "#ffffff",
    frogPupil: "#ff006e",
    cars: ["#ff006e", "#f5ff00", "#00f5ff"],
    truckBody: "#7d7dff",
    truckCab: "#ff006e",
    wheel: "#050109",
    log: "#d400ff",
    logGrain: "#ff00aa",
    turtle: "#00ff88",
    turtleLine: "#00f5ff",
    turtleSubmerged: "rgba(0,255,136,0.35)",
    timeOk: "#00ff88",
    timeWarn: "#f5ff00",
    timeBad: "#ff006e",
  },
  retro: {
    bg: "#0a0f0a",
    primary: "#33ff33",
    accent: "#ffb000",
    grid: "#1f7a1f",
    text: "#33ff33",
    overlay: "rgba(10,15,10,0.75)",
    goalRow: "#0d1f0d",
    river: "#0f2a14",
    safe: "#16381a",
    road: "#0a0f0a",
    goalSlot: "#1f7a1f",
    goalBorder: "#ffb000",
    frogEye: "#b6ffb6",
    frogPupil: "#0a0f0a",
    cars: ["#ffb000", "#33ff33", "#2a9f2a"],
    truckBody: "#2a5f2a",
    truckCab: "#ffb000",
    wheel: "#0a0f0a",
    log: "#8a6a1a",
    logGrain: "#4a380d",
    turtle: "#2a9f2a",
    turtleLine: "#0d3d0d",
    turtleSubmerged: "rgba(51,255,51,0.3)",
    timeOk: "#33ff33",
    timeWarn: "#ffb000",
    timeBad: "#ff5533",
  },
};

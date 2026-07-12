# Skins por juego

Mantenido por el agente skin-designer.

| Juego     | Skins                | Fecha      | Notas                                                                                                                                                                                                                                                                                                                        |
| --------- | -------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| asteroids | clasico, neon, retro | 2026-07-11 | Paleta en `themes.ts` (`ASTEROIDS_THEMES`). Engine parametrizado (nave, asteroides, balas, partículas, power-up, HUD, overlay) vía `palette.*`; neon usa `ctx.shadowBlur/shadowColor` con `palette.glow`. `registry.ts` con `skin?: SkinId` en `GameProps`. `tsc --noEmit` OK. Solo verificado a nivel de tipos, no runtime. |

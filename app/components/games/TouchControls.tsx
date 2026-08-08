"use client";

import { useEffect, useState } from "react";

export type TouchButton = {
  code: string; // KeyboardEvent.code a simular, ej. "ArrowLeft", "Space"
  label: string; // texto/ícono del botón, ej. "◀", "DISPARAR"
  position: "dpad-left" | "dpad-right" | "dpad-up" | "dpad-down" | "action";
};

export type TouchControlsProps = {
  buttons: TouchButton[];
};

// code === KeyboardEvent.code (ej. "ArrowLeft", "Space"), key === KeyboardEvent.key
// (ej. "ArrowLeft", " "). Los 4 engines leen indistintamente e.key (arkanoid) o
// e.code (asteroids/snake/tetris), así que el evento sintético debe traer ambos.
function keyFor(code: string): string {
  if (code === "Space") return " ";
  return code;
}

function press(code: string) {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { code, key: keyFor(code), bubbles: true })
  );
}

function release(code: string) {
  document.dispatchEvent(
    new KeyboardEvent("keyup", { code, key: keyFor(code), bubbles: true })
  );
}

function TouchControls({ buttons }: TouchControlsProps) {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const detected =
      "ontouchstart" in window || matchMedia("(pointer: coarse)").matches;
    setIsTouch(detected);
  }, []);

  if (!isTouch || buttons.length === 0) return null;

  const dpadButtons = buttons.filter((b) => b.position.startsWith("dpad-"));
  const actionButtons = buttons.filter((b) => b.position === "action");

  const dpadFor = (position: TouchButton["position"]) =>
    dpadButtons.find((b) => b.position === position);

  const renderButton = (btn: TouchButton) => (
    <button
      key={btn.code}
      type="button"
      aria-label={btn.label}
      onTouchStart={(e) => {
        e.preventDefault();
        press(btn.code);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        release(btn.code);
      }}
      onTouchCancel={(e) => {
        e.preventDefault();
        release(btn.code);
      }}
      className="flex h-14 w-14 select-none items-center justify-center rounded-lg border border-cyan-400/50 bg-cyan-950/60 text-xl text-cyan-300 active:bg-cyan-800/70"
      style={{ touchAction: "none" }}
    >
      {btn.label}
    </button>
  );

  return (
    <div className="mt-4 flex w-full max-w-full items-center justify-between px-2">
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        <div className="col-start-2 row-start-1">
          {dpadFor("dpad-up") ? renderButton(dpadFor("dpad-up")!) : null}
        </div>
        <div className="col-start-1 row-start-2">
          {dpadFor("dpad-left") ? renderButton(dpadFor("dpad-left")!) : null}
        </div>
        <div className="col-start-3 row-start-2">
          {dpadFor("dpad-right") ? renderButton(dpadFor("dpad-right")!) : null}
        </div>
        <div className="col-start-2 row-start-3">
          {dpadFor("dpad-down") ? renderButton(dpadFor("dpad-down")!) : null}
        </div>
      </div>
      {actionButtons.length > 0 ? (
        <div className="flex gap-2">{actionButtons.map(renderButton)}</div>
      ) : null}
    </div>
  );
}

export default TouchControls;

export type FruitName = "apple" | "cherry" | "strawberry" | "watermelon";

export const FRUITS: Record<
  FruitName,
  { x: number; y: number; w: number; h: number }
> = {
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
};

export const FRUIT_NAMES: FruitName[] = [
  "apple",
  "cherry",
  "strawberry",
  "watermelon",
];

let ssImg: HTMLCanvasElement | null = null;
let ssLoaded = false;
const ssCallbacks: Array<() => void> = [];

export function loadSpritesheet(cb: () => void) {
  if (ssLoaded) {
    cb();
    return;
  }
  ssCallbacks.push(cb);
  if (ssImg) return;

  const rawImg = new Image();
  rawImg.onload = () => {
    const oc = document.createElement("canvas");
    oc.width = rawImg.width;
    oc.height = rawImg.height;
    const octx = oc.getContext("2d")!;
    octx.drawImage(rawImg, 0, 0);
    ssImg = oc;
    ssLoaded = true;
    ssCallbacks.forEach((f) => f());
  };
  rawImg.onerror = () => console.error("Failed to load spritesheet");
  rawImg.src = "/games/snake/fruits.png";
}

export function drawFruit(
  ctx: CanvasRenderingContext2D,
  name: FruitName,
  dx: number,
  dy: number,
  size: number
) {
  if (!ssLoaded || !ssImg) return;
  const f = FRUITS[name];
  ctx.drawImage(ssImg, f.x, f.y, f.w, f.h, dx, dy, size, size);
}

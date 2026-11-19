import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const font = {
  A:"01110/10001/10001/11111/10001/10001/10001", B:"11110/10001/10001/11110/10001/10001/11110",
  C:"01111/10000/10000/10000/10000/10000/01111", D:"11110/10001/10001/10001/10001/10001/11110",
  E:"11111/10000/10000/11110/10000/10000/11111", F:"11111/10000/10000/11110/10000/10000/10000",
  G:"01111/10000/10000/10111/10001/10001/01111", H:"10001/10001/10001/11111/10001/10001/10001",
  I:"11111/00100/00100/00100/00100/00100/11111", J:"00111/00010/00010/00010/10010/10010/01100",
  K:"10001/10010/10100/11000/10100/10010/10001", L:"10000/10000/10000/10000/10000/10000/11111",
  M:"10001/11011/10101/10101/10001/10001/10001", N:"10001/11001/10101/10011/10001/10001/10001",
  O:"01110/10001/10001/10001/10001/10001/01110", P:"11110/10001/10001/11110/10000/10000/10000",
  Q:"01110/10001/10001/10001/10101/10010/01101", R:"11110/10001/10001/11110/10100/10010/10001",
  S:"01111/10000/10000/01110/00001/00001/11110", T:"11111/00100/00100/00100/00100/00100/00100",
  U:"10001/10001/10001/10001/10001/10001/01110", V:"10001/10001/10001/10001/10001/01010/00100",
  W:"10001/10001/10001/10101/10101/10101/01010", X:"10001/10001/01010/00100/01010/10001/10001",
  Y:"10001/10001/01010/00100/00100/00100/00100", Z:"11111/00001/00010/00100/01000/10000/11111",
  0:"01110/10001/10011/10101/11001/10001/01110", 1:"00100/01100/00100/00100/00100/00100/01110",
  2:"01110/10001/00001/00010/00100/01000/11111", 3:"11110/00001/00001/01110/00001/00001/11110",
  4:"00010/00110/01010/10010/11111/00010/00010", 5:"11111/10000/10000/11110/00001/00001/11110",
  6:"01110/10000/10000/11110/10001/10001/01110", 7:"11111/00001/00010/00100/01000/01000/01000",
  8:"01110/10001/10001/01110/10001/10001/01110", 9:"01110/10001/10001/01111/00001/00001/01110",
  "-":"00000/00000/00000/11111/00000/00000/00000", ".":"00000/00000/00000/00000/00000/00110/00110",
  "/":"00001/00010/00010/00100/01000/01000/10000", ":":"00000/00110/00110/00000/00110/00110/00000",
  " ":"00000/00000/00000/00000/00000/00000/00000"
};

function canvas(width, height, baseTop, baseBottom, glow) {
  const data = new Uint8Array(width * height * 3);
  const parse = (hex) => {
    const value = hex.startsWith("#") ? hex.slice(1) : hex;
    return [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16));
  };
  const top = parse(baseTop), bottom = parse(baseBottom);
  const glows = glow.map(g => ({ ...g, color: parse(g.color) }));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = y / Math.max(1, height - 1);
      let color = top.map((v, i) => v * (1 - t) + bottom[i] * t);
      for (const g of glows) {
        const dx = (x - g.x) / g.radiusX;
        const dy = (y - g.y) / g.radiusY;
        const influence = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
        const a = influence * influence * g.alpha;
        color = color.map((v, i) => v * (1 - a) + g.color[i] * a);
      }
      const i = (y * width + x) * 3;
      data[i] = Math.round(color[0]); data[i + 1] = Math.round(color[1]); data[i + 2] = Math.round(color[2]);
    }
  }
  return { width, height, data };
}

function pixel(image, x, y, color, alpha = 1) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const i = (y * image.width + x) * 3;
  image.data[i] = Math.round(image.data[i] * (1 - alpha) + color[0] * alpha);
  image.data[i + 1] = Math.round(image.data[i + 1] * (1 - alpha) + color[1] * alpha);
  image.data[i + 2] = Math.round(image.data[i + 2] * (1 - alpha) + color[2] * alpha);
}
function rect(image, x, y, w, h, color, alpha = 1) {
  for (let py = Math.floor(y); py < Math.ceil(y + h); py++)
    for (let px = Math.floor(x); px < Math.ceil(x + w); px++) pixel(image, px, py, color, alpha);
}
function circle(image, cx, cy, radius, color, thickness = 1, alpha = 1) {
  const outer = radius + thickness / 2, inner = Math.max(0, radius - thickness / 2);
  for (let y = Math.floor(cy - outer); y <= cy + outer; y++) {
    for (let x = Math.floor(cx - outer); x <= cx + outer; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= outer && d >= inner) pixel(image, x, y, color, alpha);
    }
  }
}
function line(image, x1, y1, x2, y2, color, alpha = 1) {
  const dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
  const dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    pixel(image, x1, y1, color, alpha);
    if (x1 === x2 && y1 === y2) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x1 += sx; }
    if (e2 <= dx) { err += dx; y1 += sy; }
  }
}
function textWidth(value, scale, spacing = scale) {
  return value.length ? value.length * 5 * scale + (value.length - 1) * spacing : 0;
}
function drawText(image, value, x, y, scale, color, spacing = scale) {
  let cursor = x;
  for (const ch of value) {
    const glyph = (font[ch] || font[" "]).split("/");
    for (let gy = 0; gy < 7; gy++)
      for (let gx = 0; gx < 5; gx++)
        if (glyph[gy][gx] === "1") rect(image, cursor + gx * scale, y + gy * scale, scale, scale, color);
    cursor += 5 * scale + spacing;
  }
}
function blockText(image, value, x, y, scale, color) {
  drawText(image, value, x, y, scale, [11, 7, 22], 0);
  drawText(image, value, x, y - 1, scale, color, 0);
}
function bmp(image) {
  const rowBytes = Math.ceil(image.width * 3 / 4) * 4;
  const pixelBytes = rowBytes * image.height;
  const out = Buffer.alloc(54 + pixelBytes);
  out.write("BM", 0, "ascii");
  out.writeUInt32LE(out.length, 2);
  out.writeUInt32LE(54, 10);
  out.writeUInt32LE(40, 14);
  out.writeInt32LE(image.width, 18);
  out.writeInt32LE(image.height, 22);
  out.writeUInt16LE(1, 26);
  out.writeUInt16LE(24, 28);
  out.writeUInt32LE(0, 30);
  out.writeUInt32LE(pixelBytes, 34);
  out.writeInt32LE(2835, 38);
  out.writeInt32LE(2835, 42);
  for (let y = 0; y < image.height; y++) {
    const targetY = image.height - 1 - y;
    for (let x = 0; x < image.width; x++) {
      const source = (y * image.width + x) * 3;
      const target = 54 + targetY * rowBytes + x * 3;
      out[target] = image.data[source + 2];
      out[target + 1] = image.data[source + 1];
      out[target + 2] = image.data[source];
    }
  }
  return out;
}

function makeSidebar() {
  const image = canvas(164, 314, "#11091E", "#281037", [
    { x: 83, y: 132, radiusX: 100, radiusY: 105, color: "#9B4BD0", alpha: 0.54 },
    { x: 150, y: 244, radiusX: 75, radiusY: 105, color: "#DC62BE", alpha: 0.38 },
    { x: 12, y: 65, radiusX: 60, radiusY: 80, color: "#7047CA", alpha: 0.32 }
  ]);
  const violet = [185, 138, 255], pink = [238, 131, 212], pale = [238, 232, 249];
  // Sparse stars and fine grid lines.
  for (let i = 0; i < 29; i++) {
    const x = (i * 47 + 13) % 158 + 3, y = (i * 71 + 19) % 224 + 3;
    pixel(image, x, y, [205, 184, 255], i % 3 === 0 ? 0.72 : 0.34);
  }
  for (let y = 0; y < 228; y += 18) line(image, 0, y, 163, y, [157, 122, 205], 0.075);
  for (let x = 0; x < 164; x += 18) line(image, x, 0, x, 228, [157, 122, 205], 0.055);

  // Portal halo behind the mark.
  for (const radius of [44, 53, 63]) {
    circle(image, 82, 143, radius + 4, violet, 5, 0.075);
    circle(image, 82, 143, radius, radius === 53 ? pink : violet, radius === 53 ? 1.5 : 1, radius === 53 ? 0.76 : 0.55);
  }
  circle(image, 82, 143, 35, [219, 190, 255], 1, 0.28);
  line(image, 23, 143, 141, 143, violet, 0.14);
  line(image, 82, 81, 82, 205, violet, 0.12);

  // Brand lock-up.
  drawText(image, "OFFICIAL", 50, 18, 1, [183, 165, 210], 1);
  drawText(image, "KWADRATOWY", 29, 35, 1, pale, 1);
  drawText(image, "CHAOS", 49, 51, 2, [211, 181, 255], 2);
  rect(image, 54, 72, 56, 1, violet, 0.8);
  rect(image, 67, 75, 30, 1, pink, 0.5);

  // Large pixel monogram KC.
  blockText(image, "K", 42, 105, 5, [224, 204, 255]);
  blockText(image, "C", 82, 105, 5, [238, 131, 212]);
  rect(image, 29, 155, 106, 2, [180, 130, 255], 0.66);
  drawText(image, "CRAFT PLAY CREATE", 25, 170, 1, [220, 208, 239], 1);
  drawText(image, "YOUR WORLD STARTS HERE", 18, 184, 1, [150, 133, 174], 0);

  // Pixel world silhouette at the bottom.
  const skyline = [
    [0, 244, 23, 70], [16, 231, 25, 83], [37, 251, 20, 63], [54, 222, 25, 92],
    [75, 243, 21, 71], [94, 230, 27, 84], [119, 248, 20, 66], [137, 234, 27, 80]
  ];
  for (let i = 0; i < skyline.length; i++) {
    const [x, y, w, h] = skyline[i];
    rect(image, x, y, w, h, i % 2 ? [39, 28, 60] : [29, 24, 49], 0.94);
    rect(image, x, y, w, 2, i % 2 ? [151, 103, 208] : [115, 83, 165], 0.54);
    for (let wy = y + 9; wy < 308; wy += 13)
      for (let wx = x + 5; wx < x + w - 3; wx += 9)
        rect(image, wx, wy, 3, 4, [191, 144, 238], 0.18 + ((i + wy + wx) % 3) * 0.08);
  }
  rect(image, 0, 300, 164, 14, [10, 8, 19], 0.55);
  line(image, 0, 300, 163, 300, pink, 0.62);
  drawText(image, "CRAFT  PLAY  CHAOS", 23, 304, 1, [183, 163, 210], 1);
  return bmp(image);
}

function makeHeader() {
  const image = canvas(150, 57, "#241039", "#120A20", [
    { x: 30, y: 27, radiusX: 60, radiusY: 46, color: "#A84DE1", alpha: 0.54 },
    { x: 125, y: 8, radiusX: 48, radiusY: 48, color: "#E56ABF", alpha: 0.3 }
  ]);
  // Small portal emblem on the left.
  circle(image, 27, 28, 20, [185, 138, 255], 1, 0.7);
  circle(image, 27, 28, 15, [238, 131, 212], 1, 0.5);
  blockText(image, "KC", 10, 19, 2, [241, 230, 255]);
  // Typography sits clear of the NSIS heading copy.
  drawText(image, "KWADRATOWY", 57, 10, 1, [229, 219, 244], 1);
  drawText(image, "CHAOS", 57, 23, 2, [193, 151, 255], 2);
  drawText(image, "OFFICIAL LAUNCHER", 57, 43, 1, [156, 139, 180], 0);
  rect(image, 56, 39, 84, 1, [185, 138, 255], 0.6);
  return bmp(image);
}

const buildDir = resolve(root, "build");
await mkdir(buildDir, { recursive: true });
await writeFile(resolve(buildDir, "installer-sidebar.bmp"), makeSidebar());
await writeFile(resolve(buildDir, "installer-header.bmp"), makeHeader());
console.log("Generated Kwadratowy Chaos NSIS artwork (164x314 sidebar, 150x57 header).");

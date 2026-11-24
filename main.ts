// news-image-20261124 — draw Tuesday 24 November 2026's world news as a
// front page and write it to /output/entry.png.
//
// The picture is drawn by this program itself, pixel by pixel: a small
// 5x7 bitmap font, flat geometric scenes, no network, no clock and no
// randomness, so both grader runs emit identical bytes. The six stories
// are the day's news as reported on 24 November 2026:
//   - Nvidia rehires Jensen Huang as CEO after Trump pushes the board
//   - a suspected North Korean aircraft breaches South Korean airspace
//     near Ulleung island; residents are told to take shelter
//   - Russian strikes on the Kyiv region kill at least 14
//   - naval mines hit three oil tankers in the Strait of Hormuz
//   - Rep. Jimmy Gomez resigns from Congress after an ethics finding
//   - the 2031 Women's World Cup goes to the USA, Mexico, Costa Rica
//     and Jamaica; the UK hosts in 2035
// A strip at the foot also notes the allies' warning of a Russian space
// weapon, Honda's 810,000-car recall and Anthropic's Claude Ship launch.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// Palette: warm newsprint, dark navy ink, flat-scene colours.
const PAPER = [247, 242, 230];
const INK = [32, 40, 54];
const RULE = [118, 108, 86];
const SKY = [206, 223, 231];
const DUSK = [228, 208, 168];
const SEA = [46, 104, 130];
const DARK = [34, 39, 45];
const TEAL = [30, 110, 106];
const GREEN = [46, 125, 70];
const ORANGE = [224, 110, 44];
const YELLOW = [242, 201, 76];
const GREY = [136, 139, 142];
const SMOKE = [118, 118, 116];
const WHITE = [241, 238, 229];
const BROWN = [120, 88, 58];
const BLUE = [46, 92, 136];
const RED = [174, 56, 44];
const PITCH = [74, 138, 74];

const px = new Uint8Array(W * H * 3);

function setPixel(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fillRect(x, y, w, h, c) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) setPixel(i, j, c);
  }
}

function fillCircle(cx, cy, r, c) {
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      if (i * i + j * j <= r * r) setPixel(cx + i, cy + j, c);
    }
  }
}

// Filled triangle by barycentric test; d is never 0 for our shapes.
function triangle(x1, y1, x2, y2, x3, y3, c) {
  const minX = Math.min(x1, x2, x3);
  const maxX = Math.max(x1, x2, x3);
  const minY = Math.min(y1, y2, y3);
  const maxY = Math.max(y1, y2, y3);
  const d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / d;
      const b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / d;
      if (a >= 0 && b >= 0 && 1 - a - b >= 0) setPixel(x, y, c);
    }
  }
}

// --- 5x7 bitmap font: each glyph is 7 rows of 5 bits, MSB on the left. ---
const FONT = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  '-': [0, 0, 0, 0x1f, 0, 0, 0],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
};

function textWidth(s, scale) {
  return s.length * 6 * scale - scale;
}

function drawText(x, y, s, scale, c) {
  for (let n = 0; n < s.length; n++) {
    const glyph = FONT[s[n]] ?? FONT[' '];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[r] & (1 << (4 - col))) {
          fillRect(x + n * 6 * scale + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
  }
}

function drawCentered(cx, y, s, scale, c) {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}

// --- The six panels. Each draws a flat, symbolic scene inside a
// (x, y, w, h) box: no bodies, no gore, just shapes that name the story. ---

function panelChip(x, y, w, h) {
  fillRect(x, y, w, h, [222, 228, 220]); // bench top
  // circuit traces running out of the frame
  for (let i = 0; i < 4; i++) {
    fillRect(x + 20 + i * 68, y + 8, 4, 26, [150, 160, 150]);
    fillRect(x + 20 + i * 68, y + h - 34, 4, 26, [150, 160, 150]);
  }
  // the chip: dark green body, lighter die, pins on all four sides
  fillRect(x + 76, y + 44, 160, 112, [24, 68, 40]);
  fillRect(x + 96, y + 64, 120, 72, [38, 110, 66]);
  for (let i = 0; i < 6; i++) {
    fillRect(x + 88 + i * 24, y + 30, 8, 14, [190, 196, 188]);
    fillRect(x + 88 + i * 24, y + 156, 8, 14, [190, 196, 188]);
    fillRect(x + 62, y + 56 + i * 18, 14, 8, [190, 196, 188]);
    fillRect(x + 236, y + 56 + i * 18, 14, 8, [190, 196, 188]);
  }
  drawCentered(x + w / 2, y + 92, 'NV', 5, WHITE);
  // a small rising arrow above the chip: the stock, the return
  fillRect(x + w - 58, y + 46, 6, 44, GREEN);
  triangle(x + w - 68, y + 46, x + w - 40, y + 46, x + w - 54, y + 24, GREEN);
}

function panelJet(x, y, w, h) {
  fillRect(x, y, w, h, SKY);
  fillCircle(x + 52, y + 34, 18, [240, 222, 160]); // pale sun
  // sea and island
  fillRect(x, y + 132, w, h - 132, SEA);
  triangle(x + 96, y + 132, x + 156, y + 84, x + 216, y + 132, GREEN);
  fillRect(x + 140, y + 66, 30, 20, [120, 90, 60]); // watch post
  triangle(x + 136, y + 66, x + 174, y + 66, x + 155, y + 52, RED);
  fillRect(x + 196, y + 104, 26, 14, WHITE); // shelter hut
  triangle(x + 192, y + 104, x + 226, y + 104, x + 209, y + 90, RED);
  // warning beacon on the island
  fillCircle(x + 262, y + 116, 6, RED);
  fillRect(x + 258, y + 122, 8, 10, DARK);
  // the jet, high and crossing
  fillRect(x + 40, y + 40, 130, 10, DARK);
  triangle(x + 170, y + 40, x + 204, y + 45, x + 170, y + 50, DARK);
  triangle(x + 76, y + 50, x + 94, y + 74, x + 104, y + 50, DARK);
  triangle(x + 118, y + 40, x + 128, y + 20, x + 138, y + 40, DARK);
  // dashed flight path behind it
  for (let i = 0; i < 3; i++) fillRect(x + 216 + i * 26, y + 42, 14, 3, [140, 150, 158]);
  // waves
  fillRect(x + 24, y + 152, 90, 3, [190, 220, 230]);
  fillRect(x + 210, y + 168, 80, 3, [190, 220, 230]);
}

function panelKyiv(x, y, w, h) {
  fillRect(x, y, w, h, DUSK);
  fillCircle(x + 56, y + 36, 18, [242, 230, 190]); // low moon
  // skyline: three blocks, the middle one cut short by the strike
  const blocks = [
    { bx: 16, bw: 76, bh: 122 },
    { bx: 102, bw: 76, bh: 66 },
    { bx: 188, bw: 76, bh: 132 },
  ];
  for (const b of blocks) {
    fillRect(x + b.bx, y + h - b.bh, b.bw, b.bh, [56, 61, 72]);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const wy = y + h - b.bh + 12 + r * 24;
        if (wy < y + h - 14) fillRect(x + b.bx + 12 + c * 22, wy, 10, 12, YELLOW);
      }
    }
  }
  // jagged top on the broken block
  triangle(x + 102, y + h - 66, x + 122, y + h - 88, x + 140, y + h - 66, [56, 61, 72]);
  triangle(x + 140, y + h - 66, x + 160, y + h - 82, x + 178, y + h - 66, [56, 61, 72]);
  // rubble and smoke
  triangle(x + 100, y + h, x + 132, y + h - 30, x + 166, y + h, GREY);
  fillCircle(x + 138, y + 96, 12, SMOKE);
  fillCircle(x + 150, y + 72, 15, SMOKE);
  fillCircle(x + 136, y + 48, 11, SMOKE);
  // a thin orange glow at the break
  fillRect(x + 118, y + h - 70, 40, 5, ORANGE);
}

function panelTanker(x, y, w, h) {
  fillRect(x, y, w, h, [232, 222, 196]); // hazy sky
  fillRect(x, y + 126, w, h - 126, SEA); // strait
  // the tanker: long hull, bow, containers, bridge tower
  fillRect(x + 30, y + 104, 220, 24, DARK);
  triangle(x + 250, y + 104, x + 288, y + 114, x + 250, y + 128, DARK);
  fillRect(x + 52, y + 82, 34, 22, RED);
  fillRect(x + 90, y + 82, 34, 22, BLUE);
  fillRect(x + 128, y + 82, 34, 22, YELLOW);
  fillRect(x + 210, y + 70, 26, 34, WHITE); // bridge
  fillRect(x + 218, y + 58, 4, 12, DARK);
  // flames mid-deck and smoke above
  triangle(x + 168, y + 104, x + 180, y + 72, x + 192, y + 104, ORANGE);
  triangle(x + 178, y + 104, x + 186, y + 84, x + 194, y + 104, YELLOW);
  fillCircle(x + 184, y + 52, 13, SMOKE);
  fillCircle(x + 198, y + 34, 11, SMOKE);
  // two spiked mines in the water ahead
  fillCircle(x + 52, y + 156, 9, DARK);
  fillCircle(x + 262, y + 168, 9, DARK);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    fillRect(
      x + 52 + Math.round(Math.cos(a) * 11) - 1,
      y + 156 + Math.round(Math.sin(a) * 11) - 1,
      3, 3, DARK,
    );
    fillRect(
      x + 262 + Math.round(Math.cos(a) * 11) - 1,
      y + 168 + Math.round(Math.sin(a) * 11) - 1,
      3, 3, DARK,
    );
  }
  // wake lines
  fillRect(x + 36, y + 142, 200, 3, [190, 220, 230]);
}

function panelCapitol(x, y, w, h) {
  fillRect(x, y, w, h, SKY);
  fillRect(x, y + 158, w, h - 158, [214, 206, 188]); // lawn
  // dome: a circle whose lower half hides behind the building
  fillCircle(x + w / 2, y + 74, 42, WHITE);
  fillRect(x + w / 2 - 42, y + 74, 84, 44, WHITE);
  fillRect(x + w / 2 - 4, y + 26, 8, 12, INK); // statue spike
  // colonnade
  fillRect(x + w / 2 - 118, y + 118, 174, 40, WHITE);
  for (let i = 0; i < 5; i++) {
    fillRect(x + w / 2 - 106 + i * 36, y + 122, 10, 32, [210, 206, 196]);
  }
  fillRect(x + w / 2 - 128, y + 158, 194, 10, WHITE);
  // the resignation letter, bottom right
  fillRect(x + w - 92, y + h - 52, 64, 40, WHITE);
  fillRect(x + w - 92, y + h - 52, 64, 4, RED);
  for (let r = 0; r < 3; r++) fillRect(x + w - 82, y + h - 40 + r * 10, 44, 4, [150, 156, 162]);
  // a red seal on the letter
  fillCircle(x + w - 38, y + h - 20, 7, RED);
}

function panelSoccer(x, y, w, h) {
  fillRect(x, y, w, h, PITCH);
  // pitch stripes and touchline
  for (let i = 0; i < 4; i++) fillRect(x, y + i * 50, w, 25, [68, 130, 68]);
  fillRect(x, y + 96, w, 3, WHITE);
  fillCircle(x + w / 2, y + 97, 26, WHITE);
  fillCircle(x + w / 2, y + 97, 22, PITCH);
  // goal posts, left
  fillRect(x + 22, y + 26, 6, 52, WHITE);
  fillRect(x + 22, y + 26, 62, 6, WHITE);
  fillRect(x + 78, y + 26, 6, 52, WHITE);
  // the ball, centre-right, with a black pentagon and patches
  fillCircle(x + 196, y + 108, 44, WHITE);
  const pent = [
    [196, 94], [210, 104], [205, 120], [187, 120], [182, 104],
  ];
  for (let i = 0; i < 5; i++) {
    const [ax, ay] = pent[i];
    const [bx, by] = pent[(i + 1) % 5];
    triangle(x + 196, y + 108, x + ax, y + ay, x + bx, y + by, DARK);
  }
  fillCircle(x + 168, y + 82, 7, DARK);
  fillCircle(x + 226, y + 88, 7, DARK);
  fillCircle(x + 196, y + 142, 7, DARK);
  // ball shadow
  fillRect(x + 158, y + 158, 76, 5, [56, 110, 56]);
  // a small flag: 2031 hosts, four stripes
  fillRect(x + 246, y + 130, 44, 30, WHITE);
  fillRect(x + 246, y + 130, 44, 8, RED);
  fillRect(x + 246, y + 138, 44, 7, BLUE);
  fillRect(x + 246, y + 145, 44, 7, GREEN);
  fillRect(x + 246, y + 152, 44, 8, YELLOW);
}

// --- Page layout: masthead, dateline, 3x2 grid, foot strip. ---

const PANELS = [
  { draw: panelChip, lines: ['HUANG BACK', 'AT NVIDIA'] },
  { draw: panelJet, lines: ['NK JET OVER', 'ULLEUNG ISLE'] },
  { draw: panelKyiv, lines: ['KYIV STRIKES', 'KILL 14'] },
  { draw: panelTanker, lines: ['3 TANKERS HIT', 'BY MINES'] },
  { draw: panelCapitol, lines: ['GOMEZ QUITS', 'CONGRESS'] },
  { draw: panelSoccer, lines: ['2031 WORLD CUP', 'HOSTS NAMED'] },
];

function drawPage() {
  fillRect(0, 0, W, H, PAPER);
  drawCentered(W / 2, 30, 'THE WORLD', 13, INK);
  drawCentered(W / 2, 146, 'TUESDAY 24 NOVEMBER 2026', 4, INK);
  fillRect(30, 190, W - 60, 3, RULE);

  const marginX = 30;
  const gutter = 14;
  const panelW = 312;
  const artH = 200;
  const rowY = [210, 524];
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = marginX + col * (panelW + gutter);
    const y = rowY[row];
    PANELS[i].draw(x, y, panelW, artH);
    drawCentered(x + panelW / 2, y + artH + 12, PANELS[i].lines[0], 4, INK);
    drawCentered(x + panelW / 2, y + artH + 48, PANELS[i].lines[1], 4, INK);
  }

  fillRect(30, 850, W - 60, 2, RULE);
  drawCentered(W / 2, 872, 'ALSO: ALLIES WARN OF RUSSIAN SPACE WEAPON - HONDA RECALLS 810,000 CARS', 2, INK);
  drawCentered(W / 2, 896, 'GREECE REOPENS ACROPOLIS MUSEUM - STATES SUE MUSK FIRMS OVER GROK', 2, INK);
  fillRect(30, 926, W - 60, 2, RULE);
  drawCentered(W / 2, 948, 'PAGE 1 - WORLD NEWS SUMMARY', 3, INK);
}

// --- Minimal PNG writer: CRC32, IHDR, one zlib IDAT, IEND. ---

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'latin1'), data])), 8 + data.length);
  return out;
}

function encodePng() {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return png;
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
drawPage();
const png = encodePng();
if (png.length > 1024 * 1024) {
  throw new Error(`entry.png is ${png.length} bytes, over the 1 MiB cap`);
}
mkdirSync(outDir, { recursive: true });
const target = join(outDir, 'entry.png');
writeFileSync(target, png);
console.log(`wrote ${target}: ${W}x${H} PNG, ${png.length} bytes`);

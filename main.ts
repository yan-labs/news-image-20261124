// news-image-20261124 (round 2) — one image summing up Tuesday 24 November 2026.
// Written from scratch in this session. Pure TypeScript, no dependencies and
// no network: a 5x7 dot-matrix font draws the front page into an RGB buffer,
// a small PNG writer (zlib + CRC32) saves it as /output/entry.png
// ($MAKEFUN_OUTPUT_DIR stands in for /output outside the grader).
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PAGE_W = 1600;
const PAGE_H = 1000;

// A 5x7 dot-matrix face. Each letter is seven rows of five dots;
// "#" is ink, "." is paper. Only the characters the page uses are cut.
const FACE: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "•": ["00000", "00000", "00100", "01110", "01110", "00100", "00000"],
};

// ------------------------------------------------------------------ palette
type Ink = [number, number, number];
const PAPER: Ink = [242, 237, 227];
const BLACK: Ink = [18, 18, 20];
const RED: Ink = [178, 34, 28];
const GREY: Ink = [96, 96, 92];
const GOLD: Ink = [176, 141, 74];
const STEEL: Ink = [58, 92, 122];
const TEAL: Ink = [42, 110, 108];
const CARD: Ink = [255, 255, 255];

// ------------------------------------------------------------------- poster
class Poster {
  private buf = new Uint8Array(PAGE_W * PAGE_H * 3);
  dot(x: number, y: number, c: Ink): void {
    if (x < 0 || y < 0 || x >= PAGE_W || y >= PAGE_H) return;
    const i = (y * PAGE_W + x) * 3;
    this.buf[i] = c[0]; this.buf[i + 1] = c[1]; this.buf[i + 2] = c[2];
  }
  block(x: number, y: number, w: number, h: number, c: Ink): void {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) this.dot(i, j, c);
  }
  // A filled disc, used for the masthead seal and the lead motif.
  disc(cx: number, cy: number, r: number, c: Ink): void {
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.dot(x, y, c);
  }
  // One glyph, scaled: every dot becomes an s-by-s square.
  glyph(ch: string, x: number, y: number, s: number, c: Ink): void {
    const rows = FACE[ch] ?? FACE["?"];
    rows.forEach((row, r) => {
      for (let col = 0; col < 5; col++)
        if (row[col] === "1") this.block(x + col * s, y + r * s, s, s, c);
    });
  }
  measure(t: string, s: number): number {
    return t.length * 6 * s - s;
  }
  line(t: string, x: number, y: number, s: number, c: Ink): void {
    let cx = x;
    for (const ch of t) { this.glyph(ch, cx, y, s, c); cx += 6 * s; }
  }
  // Greedy word wrap, returns the lines so the caller can place them.
  wrap(t: string, maxW: number, s: number): string[] {
    const out: string[] = [];
    let cur = "";
    for (const w of t.split(" ")) {
      const next = cur ? cur + " " + w : w;
      if (this.measure(next, s) <= maxW) { cur = next; continue; }
      if (cur) out.push(cur);
      cur = w;
    }
    if (cur) out.push(cur);
    return out;
  }
  paragraph(t: string, x: number, y: number, maxW: number, s: number, c: Ink, leading: number): number {
    const lines = this.wrap(t, maxW, s);
    lines.forEach((ln, i) => this.line(ln, x, y + i * leading, s, c));
    return lines.length;
  }
  // A sunburst: short rays around a disc, the lead story's motif.
  burst(cx: number, cy: number, r0: number, r1: number, c: Ink): void {
    for (let a = 0; a < 16; a++) {
      const ang = (a * Math.PI) / 8;
      const dx = Math.cos(ang), dy = Math.sin(ang);
      for (let r = r0; r <= r1; r += 3)
        this.block(Math.round(cx + dx * r) - 2, Math.round(cy + dy * r) - 2, 4, 4, c);
    }
    this.disc(cx, cy, r0 - 6, c);
  }
  png(): Buffer {
    const raw = Buffer.alloc(PAGE_H * (1 + PAGE_W * 3));
    for (let y = 0; y < PAGE_H; y++) {
      raw[y * (1 + PAGE_W * 3)] = 0;
      raw.set(this.buf.subarray(y * PAGE_W * 3, (y + 1) * PAGE_W * 3), y * (1 + PAGE_W * 3) + 1);
    }
    return pngEncode(raw);
  }
}

// ------------------------------------------------------------- PNG container
const TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  TABLE[n] = c >>> 0;
}
function crc(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function piece(kind: string, data: Buffer): Buffer {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(kind, "ascii"), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc(body), 0);
  return Buffer.concat([head, body, tail]);
}
function pngEncode(raw: Buffer): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(PAGE_W, 0);
  header.writeUInt32BE(PAGE_H, 4);
  header[8] = 8; header[9] = 2; // 8-bit RGB
  const magic = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    magic,
    piece("IHDR", header),
    piece("IDAT", deflateSync(raw, { level: 9 })),
    piece("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ the day
// Every story below was first reported on Tuesday 24 November 2026.
const LEAD_HEAD = "HAMAS SECURITY CHIEF KILLED IN GAZA STRIKES";
const LEAD_DEK =
  "ISRAELI AIRSTRIKES KILL NAEEM ABU NAHAL AND SIX OTHERS, INCLUDING TWO POLICE OFFICERS, DESPITE A CEASEFIRE IN PLACE SINCE LAST YEAR.";
const GRID = [
  { tag: "UKRAINE", c: STEEL, head: "RUSSIAN STRIKE HITS FLATS IN ZAPORIZHZHIA", body: "TWO KILLED AND 40 WOUNDED, FOUR OF THEM CHILDREN." },
  { tag: "KOREA", c: TEAL, head: "RUSSIAN JETS ENTER SEOUL AIR DEFENCE ZONE", body: "RUSSIAN AIRCRAFT FLY INTO THE ZONE OVER WATERS BETWEEN KOREA AND JAPAN." },
  { tag: "TECH", c: GOLD, head: "HUANG BACK AS NVIDIA CHIEF", body: "JENSEN HUANG IS REINSTATED AS CEO LESS THAN TWO WEEKS AFTER HE RESIGNED." },
  { tag: "BRITAIN", c: RED, head: "TWO HELD OVER BREAK-IN AT WILLIAM'S HOME", body: "MASKED MEN ENTERED ANMER HALL ON THE SANDRINGHAM ESTATE." },
];
const TICKER =
  "ALSO  •  NATO VOWS SPACE DEFENCE  •  IRAN VOWS TO FIGHT THE US BLOCKADE  •  LANDMINE DEATHS HIT A FIVE-YEAR HIGH  •  US BLACKLISTS MEGASPEED";

// ------------------------------------------------------------------- layout
function draw(p: Poster): void {
  p.block(0, 0, PAGE_W, PAGE_H, PAPER);

  // Masthead: black band, paper title, red date line.
  p.block(0, 0, PAGE_W, 118, BLACK);
  p.disc(76, 59, 34, RED);
  p.line("24", 60, 38, 3, PAPER);
  p.line("THE WORLD IN ONE IMAGE", 140, 34, 7, PAPER);
  p.line("TUESDAY 24 NOVEMBER 2026", 140, 92, 2, GOLD);
  p.line("MAKE.FUN DAILY NEWS", 1240, 48, 3, [150, 150, 148]);

  // Lead band.
  p.line("GAZA  •  ISRAEL-HAMAS WAR", 48, 152, 3, RED);
  p.paragraph(LEAD_HEAD, 48, 188, 1060, 6, BLACK, 52);
  p.paragraph(LEAD_DEK, 48, 300, 1060, 3, GREY, 30);
  p.burst(1330, 250, 46, 96, RED);
  p.line("GAZA CITY", 1240, 372, 2, GREY);
  p.block(48, 408, 1504, 3, BLACK);

  // Grid of four cards, two by two.
  const gx = 48, gy = 440, gw = 742, gh = 196, gap = 20;
  GRID.forEach((g, i) => {
    const x = gx + (i % 2) * (gw + gap);
    const y = gy + Math.floor(i / 2) * (gh + gap);
    p.block(x, y, gw, gh, CARD);
    p.block(x, y, gw, 8, g.c);
    p.line(g.tag, x + 28, y + 26, 3, g.c);
    p.paragraph(g.head, x + 28, y + 58, gw - 56, 4, BLACK, 32);
    p.paragraph(g.body, x + 28, y + 128, gw - 56, 3, GREY, 26);
  });

  // Bottom ticker.
  p.block(0, 896, PAGE_W, 104, BLACK);
  p.paragraph(TICKER, 48, 926, 1504, 3, PAPER, 30);
}

// ---------------------------------------------------------------------- run
function main(): void {
  const p = new Poster();
  draw(p);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, "entry.png");
  const png = p.png();
  writeFileSync(file, png);
  console.log(`wrote ${file} (${png.length} bytes, ${PAGE_W}x${PAGE_H})`);
}
main();

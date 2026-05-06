/**
 * Gera os ícones PNG para a PWA sem dependências externas.
 * Uso: node scripts/generate-icons.mjs
 */
import { deflateSync } from "zlib";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/icons");

// ── CRC32 lookup table ─────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── PNG chunk builder ──────────────────────────────────────────────
function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

// ── Build a solid-color PNG ────────────────────────────────────────
function makePNG(size, r, g, b, a = 255) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  // compress, filter, interlace = 0

  // Raw scanlines: filter byte (0) + RGBA per pixel
  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(size * rowSize, 0);
  for (let y = 0; y < size; y++) {
    const base = y * rowSize;
    raw[base] = 0; // filter None
    for (let x = 0; x < size; x++) {
      const i = base + 1 + x * 4;
      raw[i]     = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }

  const idat = deflateSync(raw, { level: 6 });
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", iend),
  ]);
}

// ── Draw a rounded-square icon with "T" letter ────────────────────
function makeIconPNG(size) {
  // Background: #407b75 (brand green)
  const bg = { r: 64, g: 123, b: 117, a: 255 };
  // Letter area: white pixels
  const fg = { r: 255, g: 255, b: 255, a: 255 };

  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(size * rowSize, 0);

  const radius = Math.round(size * 0.22); // rounded corners

  for (let y = 0; y < size; y++) {
    const base = y * rowSize;
    raw[base] = 0;
    for (let x = 0; x < size; x++) {
      const i = base + 1 + x * 4;

      // Rounded rectangle check
      const cx = Math.min(x, size - 1 - x);
      const cy = Math.min(y, size - 1 - y);
      let inside = true;
      if (cx < radius && cy < radius) {
        const dx = radius - cx - 1;
        const dy = radius - cy - 1;
        inside = dx * dx + dy * dy <= radius * radius;
      }

      if (!inside) {
        raw[i] = raw[i+1] = raw[i+2] = raw[i+3] = 0; // transparent
        continue;
      }

      // Default: brand bg
      let { r, g, b, a } = bg;

      // Draw a "T" letter — relative coords in [0..1]
      const nx = x / size;
      const ny = y / size;

      // Horizontal bar: y 28%–42%, x 25%–75%
      const inHBar = ny >= 0.28 && ny <= 0.42 && nx >= 0.25 && nx <= 0.75;
      // Vertical bar: y 42%–76%, x 42%–58%
      const inVBar = ny >= 0.42 && ny <= 0.76 && nx >= 0.42 && nx <= 0.58;

      if (inHBar || inVBar) { r = fg.r; g = fg.g; b = fg.b; a = fg.a; }

      raw[i]     = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  const idat = deflateSync(raw, { level: 6 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Generate files ─────────────────────────────────────────────────
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const s of sizes) {
  const file = join(outDir, `icon-${s}.png`);
  writeFileSync(file, makeIconPNG(s));
  console.log(`✓ icon-${s}.png`);
}

// Apple touch icon (180x180)
writeFileSync(join(outDir, "apple-touch-icon.png"), makeIconPNG(180));
console.log("✓ apple-touch-icon.png");

console.log("\nÍcones gerados em public/icons/");
console.log("Substitua os arquivos pela logo real quando quiser.");

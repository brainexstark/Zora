// Pure-Node PNG generator for ZORA icons (glitch Ζ + kiroween aesthetic)
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function writePNG(file, w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  // add filter byte (0) per row
  const raw = Buffer.alloc((w * 4 + 1) * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      raw[p++] = rgba[i];
      raw[p++] = rgba[i + 1];
      raw[p++] = rgba[i + 2];
      raw[p++] = rgba[i + 3];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const png = Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  console.log("wrote", file, `${(png.length / 1024).toFixed(0)}KB`);
}

// build an RGBA buffer
function newBuf(w, h) {
  return Buffer.alloc(w * h * 4, 0);
}

function setPx(buf, w, h, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const i = (y * w + x) * 4;
  // alpha blend over existing
  const oa = buf[i + 3] / 255;
  const na = a / 255;
  const da = na + oa * (1 - na);
  if (da <= 0) return;
  buf[i] = Math.round((r * na + buf[i] * oa * (1 - na)) / da);
  buf[i + 1] = Math.round((g * na + buf[i + 1] * oa * (1 - na)) / da);
  buf[i + 2] = Math.round((b * na + buf[i + 2] * oa * (1 - na)) / da);
  buf[i + 3] = Math.round(da * 255);
}

// is point inside the Z shape (unit coords 0..size)
function inZ(lx, ly, size, bar) {
  // top bar, bottom bar, diagonal band x+y=size
  if (ly < bar) return true;
  if (ly > size - bar) return true;
  if (Math.abs(lx + ly - size) < bar) return true;
  return false;
}

function drawZ(buf, w, h, cx, cy, size, col, ox, oy, alpha) {
  const bar = size * 0.16;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const lx = x - cx + size / 2 + ox;
      const ly = y - cy + size / 2 + oy;
      if (lx < 0 || ly < 0 || lx >= size || ly >= size) continue;
      if (inZ(lx, ly, size, bar)) {
        setPx(buf, w, h, x, y, col[0], col[1], col[2], alpha);
      }
    }
  }
}

function drawGlow(buf, w, h, cx, cy, radius, col, maxA) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > radius) continue;
      const a = (1 - d / radius) * maxA;
      setPx(buf, w, h, x, y, col[0], col[1], col[2], a * 255);
    }
  }
}

function fillGradient(buf, w, h, c1, c2) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = (x / w + y / h) / 2;
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
      setPx(buf, w, h, x, y, r, g, b, 255);
    }
  }
}

function drawScanlines(buf, w, h, alpha) {
  for (let y = 0; y < h; y += 3) {
    for (let x = 0; x < w; x++) {
      setPx(buf, w, h, x, y, 0, 0, 0, alpha);
    }
  }
}

function drawMoon(buf, w, h, cx, cy, r, col) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < r) {
        // crescent: subtract a circle offset to the right
        const d2 = Math.hypot(x - (cx + r * 0.45), y - cy);
        if (d2 > r * 0.85) setPx(buf, w, h, x, y, col[0], col[1], col[2], 230);
      }
    }
  }
}

function makeIcon(file, w, h, zSize) {
  const buf = newBuf(w, h);
  // dark gradient background
  fillGradient(buf, w, h, [10, 10, 12], [0, 0, 0]);
  // purple halloween glow behind Z
  drawGlow(buf, w, h, w / 2, h / 2, Math.min(w, h) * 0.52, [107, 0, 179], 0.55);
  // green glow accent (kiroween)
  drawGlow(buf, w, h, w * 0.5, h * 0.42, Math.min(w, h) * 0.3, [0, 255, 136], 0.25);
  // glitch Z: red offset, green offset, white core
  const cx = w / 2;
  const cy = h / 2;
  drawZ(buf, w, h, cx, cy, zSize, [255, 0, 51], -7, 0, 150); // glitch red
  drawZ(buf, w, h, cx, cy, zSize, [0, 255, 136], 7, 0, 140); // glitch green
  // glitch slice bands (extra displacement)
  drawZ(buf, w, h, cx, cy, zSize, [255, 0, 51], -16, 0, 90);
  drawZ(buf, w, h, cx, cy, zSize, [0, 255, 136], 16, 0, 80);
  // white core Z
  drawZ(buf, w, h, cx, cy, zSize, [255, 255, 255], 0, 0, 255);
  // scanlines
  drawScanlines(buf, w, h, 28);
  // crescent moon top-right (halloween motif)
  drawMoon(buf, w, h, w * 0.82, h * 0.2, Math.min(w, h) * 0.06, [220, 255, 230]);
  writePNG(file, w, h, buf);
}

const out = path.join(__dirname, "assets");
makeIcon(path.join(out, "icon.png"), 1024, 1024, 560);
makeIcon(path.join(out, "adaptive-icon.png"), 1024, 1024, 560);
makeIcon(path.join(out, "splash.png"), 1242, 2436, 720);
console.log("done");

// Canvas-based image converter — works entirely in the browser
// Supports: JPEG, PNG, WebP, BMP, GIF output (single frame), SVG output (traced vector)

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ImageTracer from 'imagetracerjs';

const fileToDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });

const drawToCanvas = (img: HTMLImageElement, whiteBg: boolean): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width || 800;
  canvas.height = img.naturalHeight || img.height || 600;
  const ctx = canvas.getContext('2d')!;
  if (whiteBg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);
  return canvas;
};

const canvasToBlob = (canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`Cannot encode as ${mime}`))),
      mime,
      quality
    )
  );

// Estimate how many distinct color groups the image has (samples ~4000 pixels).
// Returns a value 2–8 used to cap numberofcolors before tracing.
const estimateColorComplexity = (data: Uint8ClampedArray): number => {
  const seen = new Set<number>();
  const total = data.length / 4;
  const step = Math.max(1, Math.floor(total / 4000));
  for (let i = 0; i < total; i += step) {
    // Quantise to 32 shades per channel for broad grouping
    const key = ((data[i * 4] >> 3) << 10) | ((data[i * 4 + 1] >> 3) << 5) | (data[i * 4 + 2] >> 3);
    seen.add(key);
    if (seen.size >= 8) return 8; // cap early once we know it's complex
  }
  return Math.max(2, seen.size);
};

// Clean up the SVG string imagetracerjs produces:
//   - round opacity="0.7843137254901961" → opacity="0.78"
//   - round long floats inside path d="..." to 1 decimal place
//   - strip the verbose version comment
const cleanSVG = (svg: string): string =>
  svg
    .replace(/\s+version="[^"]*"/, '')           // remove version attr
    .replace(/\s+desc="[^"]*"/, '')              // remove desc attr if any
    .replace(/opacity="([\d.]{5,})"/g, (_, v) => `opacity="${parseFloat(v).toFixed(2)}"`)
    .replace(/([\d]+\.\d{3,})/g, (_, v) => parseFloat(v).toFixed(1));

// Vectorize a raster image into real SVG paths using imagetracerjs.
// Resolution is capped at 512px before tracing — this is the single biggest
// factor for output size since it directly limits coordinate magnitude.
const toTracedSVG = (img: HTMLImageElement, quality = 80): Blob => {
  const MAX = 512;
  const origW = img.naturalWidth || img.width || 800;
  const origH = img.naturalHeight || img.height || 600;
  const scale = Math.min(1, MAX / Math.max(origW, origH));
  const w = Math.round(origW * scale);
  const h = Math.round(origH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);

  // Cap color count to image complexity — no point tracing 16 colors on a B&W icon
  const maxColors = estimateColorComplexity(imageData.data);
  const colors = Math.min(maxColors, Math.max(2, Math.round(2 + (quality / 100) * 6))); // 2–8
  const err    = Math.max(1, 10 - (quality / 100) * 8);    // 10 → 2  (fewer nodes)
  const omit   = Math.max(8, Math.round(48 - (quality / 100) * 40)); // 48 → 8

  const svgString: string = ImageTracer.imagedataToSVG(imageData, {
    numberofcolors:  colors,
    pathomit:        omit,
    ltres:           err,
    qtres:           err,
    rightangleenhance: true,
    scale:           1 / scale,  // restore original dimensions in the output SVG
    roundcoords:     1,          // 1 decimal place on all coordinates
    blurradius:      1,          // smooth pixel noise → fewer tiny paths
    blurdelta:       20,
    linefilter:      true,       // reduce jagged pixel edges → fewer nodes
    desc:            false,
    mincolorratio:   0.03,       // drop colors that cover <3% of pixels
    colorquantcycles: 2,         // was 3 — faster, still accurate enough
  });

  return new Blob([cleanSVG(svgString)], { type: 'image/svg+xml' });
};

// Single-frame GIF encoder (pure JS, no dependencies)
const encodeGIF = (canvas: HTMLCanvasElement): Blob => {
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  // Build palette (up to 256 colors)
  const palette: [number, number, number][] = [];
  const colorMap = new Map<number, number>();
  const indices = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const key = (r << 16) | (g << 8) | b;

    if (!colorMap.has(key)) {
      if (palette.length < 256) {
        colorMap.set(key, palette.length);
        palette.push([r, g, b]);
      } else {
        // Map to nearest palette color
        let best = 0;
        let bestDist = Infinity;
        for (let j = 0; j < palette.length; j++) {
          const [pr, pg, pb] = palette[j];
          const dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
          if (dist < bestDist) { bestDist = dist; best = j; }
        }
        colorMap.set(key, best);
      }
    }
    indices[i] = colorMap.get(key)!;
  }

  // Pad palette length to power of 2
  let colorBits = 1;
  while ((1 << colorBits) < palette.length) colorBits++;
  colorBits = Math.max(2, colorBits);
  const tableSize = 1 << colorBits;

  const colorTable = new Uint8Array(tableSize * 3);
  for (let i = 0; i < palette.length; i++) {
    colorTable[i * 3] = palette[i][0];
    colorTable[i * 3 + 1] = palette[i][1];
    colorTable[i * 3 + 2] = palette[i][2];
  }

  // LZW encode pixel indices
  const lzwMin = colorBits;
  const clearCode = 1 << lzwMin;
  const eofCode = clearCode + 1;
  let bitBuf = 0, bits = 0, codeSize = lzwMin + 1, nextCode = eofCode + 1;
  const lzwOut: number[] = [];

  const emit = (code: number) => {
    bitBuf |= code << bits;
    bits += codeSize;
    while (bits >= 8) {
      lzwOut.push(bitBuf & 0xff);
      bitBuf >>= 8;
      bits -= 8;
    }
  };

  const initTable = (): Map<string, number> => {
    const t = new Map<string, number>();
    for (let i = 0; i < clearCode; i++) t.set(String.fromCharCode(i), i);
    nextCode = eofCode + 1;
    codeSize = lzwMin + 1;
    return t;
  };

  let table = initTable();
  emit(clearCode);

  let buf = String.fromCharCode(indices[0]);
  for (let i = 1; i < indices.length; i++) {
    const k = String.fromCharCode(indices[i]);
    const combined = buf + k;
    if (table.has(combined)) {
      buf = combined;
    } else {
      emit(table.get(buf)!);
      if (nextCode < 4096) {
        table.set(combined, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        emit(clearCode);
        table = initTable();
      }
      buf = k;
    }
  }
  emit(table.get(buf)!);
  emit(eofCode);
  if (bits > 0) lzwOut.push(bitBuf & 0xff);

  // Assemble GIF binary
  const out: number[] = [];
  const w16 = (n: number) => out.push(n & 0xff, (n >> 8) & 0xff);

  // Header
  out.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // GIF89a
  // Logical Screen Descriptor
  w16(width); w16(height);
  out.push(0x80 | (7 << 4) | (colorBits - 1), 0, 0); // GCT flag + color res + GCT size
  // Global Color Table
  colorTable.forEach(b => out.push(b));
  // Image Descriptor
  out.push(0x2c);
  w16(0); w16(0); w16(width); w16(height);
  out.push(0x00); // no local color table, no interlace
  // LZW Image Data
  out.push(lzwMin);
  for (let i = 0; i < lzwOut.length; i += 255) {
    const len = Math.min(255, lzwOut.length - i);
    out.push(len);
    for (let j = 0; j < len; j++) out.push(lzwOut[i + j]);
  }
  out.push(0x00); // block terminator
  out.push(0x3b); // GIF trailer

  return new Blob([new Uint8Array(out)], { type: 'image/gif' });
};

// Build a multi-size ICO file containing PNG frames at 16, 32, 48 and 256 px.
// Each frame is a standard PNG blob embedded directly in the ICO container
// (Vista+ / "PNG ICO" format — supported by all modern OS and browsers).
const toICO = async (img: HTMLImageElement): Promise<Blob> => {
  const origMax = Math.max(img.naturalWidth || 32, img.naturalHeight || 32);
  const allSizes = [16, 32, 48, 256];
  const sizes = allSizes.filter(s => s <= origMax);
  if (sizes.length === 0) sizes.push(origMax); // very small source image

  // Render each size to a PNG blob
  const pngDatas: Uint8Array[] = await Promise.all(
    sizes.map(async size => {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      c.getContext('2d')!.drawImage(img, 0, 0, size, size);
      const blob = await canvasToBlob(c, 'image/png');
      return new Uint8Array(await blob.arrayBuffer());
    })
  );

  const count = sizes.length;
  const HEADER = 6;
  const ENTRY  = 16;
  const dataStart = HEADER + count * ENTRY;
  const totalBytes = dataStart + pngDatas.reduce((s, d) => s + d.length, 0);

  const buf  = new ArrayBuffer(totalBytes);
  const view = new DataView(buf);
  const u8   = new Uint8Array(buf);

  // ICONDIR
  view.setUint16(0, 0, true);      // reserved
  view.setUint16(2, 1, true);      // type = 1 (icon)
  view.setUint16(4, count, true);  // image count

  // ICONDIRENTRY + image data
  let offset = dataStart;
  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const png  = pngDatas[i];
    const base = HEADER + i * ENTRY;

    view.setUint8 (base,      size === 256 ? 0 : size); // width  (0 means 256)
    view.setUint8 (base + 1,  size === 256 ? 0 : size); // height
    view.setUint8 (base + 2,  0);    // palette size (0 = no palette)
    view.setUint8 (base + 3,  0);    // reserved
    view.setUint16(base + 4,  1,  true); // color planes
    view.setUint16(base + 6,  32, true); // bits per pixel
    view.setUint32(base + 8,  png.length, true); // image byte size
    view.setUint32(base + 12, offset,     true); // offset from file start

    u8.set(png, offset);
    offset += png.length;
  }

  return new Blob([buf], { type: 'image/x-icon' });
};

const FORMAT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

const LOSSY_FORMATS = new Set(['jpg', 'jpeg', 'webp']);

export const convertImage = async (
  file: File,
  targetFormat: string,
  quality: number
): Promise<Blob> => {
  const dataUrl = await fileToDataURL(file);
  const img = await loadImage(dataUrl);

  if (targetFormat === 'svg') return toTracedSVG(img, quality);
  if (targetFormat === 'ico') return toICO(img);

  // JPEG and GIF don't support transparency — fill white background
  const needsWhiteBg = targetFormat === 'jpg' || targetFormat === 'jpeg' || targetFormat === 'gif';
  const canvas = drawToCanvas(img, needsWhiteBg);

  if (targetFormat === 'gif') return encodeGIF(canvas);

  const mime = FORMAT_MIME[targetFormat];
  if (!mime) throw new Error(`Unsupported image format: ${targetFormat}`);

  return canvasToBlob(canvas, mime, LOSSY_FORMATS.has(targetFormat) ? quality / 100 : undefined);
};

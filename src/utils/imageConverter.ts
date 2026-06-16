// Canvas-based image converter — works entirely in the browser
// Supports: JPEG, PNG, WebP, BMP, SVG output, GIF output (single frame)

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

const toSVG = (img: HTMLImageElement, dataUrl: string, filename: string): Blob => {
  const safe = filename.replace(/[<>&'"]/g, '');
  const w = img.naturalWidth || img.width || 800;
  const h = img.naturalHeight || img.height || 600;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <title>${safe}</title>
  <image width="100%" height="100%" xlink:href="${dataUrl}"/>
</svg>`;
  return new Blob([xml], { type: 'image/svg+xml' });
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

  if (targetFormat === 'svg') {
    return toSVG(img, dataUrl, file.name);
  }

  // JPEG doesn't support transparency — fill white background
  const needsWhiteBg = targetFormat === 'jpg' || targetFormat === 'jpeg';
  const canvas = drawToCanvas(img, needsWhiteBg);

  if (targetFormat === 'gif') {
    return encodeGIF(canvas);
  }

  const mime = FORMAT_MIME[targetFormat];
  if (!mime) throw new Error(`Unsupported image format: ${targetFormat}`);

  return canvasToBlob(canvas, mime, LOSSY_FORMATS.has(targetFormat) ? quality / 100 : undefined);
};

// Browser-based document converter
// PDF parsing: pdfjs-dist (lazy loaded)
// DOCX creation: docx (lazy loaded)

interface TextItem {
  str: string;
  x: number;
  y: number;      // PDF Y (bottom-up)
  height: number; // font size in points
}

interface DocLine {
  kind: 'text';
  text: string;
  fontSize: number;
  isHeading: boolean;
  y: number; // PDF Y of this line (bottom-up)
}

interface DocImage {
  kind: 'image';
  data: Uint8Array;
  displayW: number; // pixels at 96 DPI screen
  displayH: number;
  y: number; // PDF Y center (bottom-up)
}

type DocItem = DocLine | DocImage;

// Replace sequences of replacement chars (garbled PDF font encoding).
const cleanStr = (s: string): string =>
  s.replace(/�{3,}/g, '···').replace(/�+/g, '').trim();

// pdfjs operator codes (verified against pdfjs-dist v6)
const OPS = { save: 10, restore: 11, transform: 12, paintImageMaskXObject: 83, paintImageXObject: 85, paintInlineImageXObject: 86 };

interface ImageRegion { xMin: number; yMin: number; xMax: number; yMax: number; yCenter: number }

// Walk the operator list tracking the current transform matrix to find image bounding boxes.
// pageW/pageH in PDF points — used to skip full-page background images.
const trackImageRegions = (
  opList: { fnArray: number[]; argsArray: unknown[][] },
  pageW: number,
  pageH: number,
): ImageRegion[] => {
  const regions: ImageRegion[] = [];
  let ctm = [1, 0, 0, 1, 0, 0]; // [a,b,c,d,e,f] identity
  const stack: number[][] = [];
  const pageArea = pageW * pageH;

  const mul = (m: number[], n: number[]): number[] => [
    m[0]*n[0] + m[1]*n[2],
    m[0]*n[1] + m[1]*n[3],
    m[2]*n[0] + m[3]*n[2],
    m[2]*n[1] + m[3]*n[3],
    m[4]*n[0] + m[5]*n[2] + n[4],
    m[4]*n[1] + m[5]*n[3] + n[5],
  ];

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i] as number[];
    if (fn === OPS.save) {
      stack.push([...ctm]);
    } else if (fn === OPS.restore) {
      if (stack.length) ctm = stack.pop()!;
    } else if (fn === OPS.transform) {
      ctm = mul(ctm, args);
    } else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageMaskXObject) {
      const [a, b, c, d, e, f] = ctm;
      const xs = [e, a+e, c+e, a+c+e];
      const ys = [f, b+f, d+f, b+d+f];
      const xMin = Math.min(...xs), xMax = Math.max(...xs);
      const yMin = Math.min(...ys), yMax = Math.max(...ys);
      const imgW = xMax - xMin, imgH = yMax - yMin;
      // Skip tiny images (bullets, hairlines < 20pt)
      if (imgW < 20 || imgH < 20) continue;
      // Skip full-page background images (> 60% of page area) — those are background layers,
      // not content images. Diagram pages are handled separately via full-page render.
      if ((imgW * imgH) / pageArea > 0.60) continue;
      // Deduplicate: skip if very similar to last region
      const last = regions[regions.length - 1];
      if (last && Math.abs(last.xMin - xMin) < 5 && Math.abs(last.yMin - yMin) < 5) continue;
      regions.push({ xMin, yMin, xMax, yMax, yCenter: (yMin + yMax) / 2 });
    }
  }
  return regions;
};

// Render a PDF page to a canvas at given scale and return it.
const renderPage = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any, scale: number
): Promise<HTMLCanvasElement | null> => {
  try {
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vp.width);
    canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    return canvas;
  } catch { return null; }
};

// Crop a region from a rendered canvas and return PNG bytes + display size.
const cropRegion = async (
  canvas: HTMLCanvasElement,
  region: ImageRegion,
  pageHeight: number,
  scale: number
): Promise<{ data: Uint8Array; displayW: number; displayH: number } | null> => {
  const canvasX = Math.max(0, Math.round(region.xMin * scale));
  // PDF Y is bottom-up; canvas Y is top-down
  const canvasY = Math.max(0, Math.round((pageHeight - region.yMax) * scale));
  const w = Math.round((region.xMax - region.xMin) * scale);
  const h = Math.round((region.yMax - region.yMin) * scale);
  if (w <= 0 || h <= 0) return null;

  const crop = document.createElement('canvas');
  crop.width = Math.min(w, canvas.width - canvasX);
  crop.height = Math.min(h, canvas.height - canvasY);
  if (crop.width <= 0 || crop.height <= 0) return null;

  const ctx = crop.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(canvas, canvasX, canvasY, crop.width, crop.height, 0, 0, crop.width, crop.height);

  const blob = await new Promise<Blob | null>(res => crop.toBlob(b => res(b), 'image/png'));
  if (!blob) return null;

  // Display size in DOCX at 96 DPI (PDF points → inches → screen pixels)
  const displayW = Math.round((region.xMax - region.xMin) / 72 * 96);
  const displayH = Math.round((region.yMax - region.yMin) / 72 * 96);
  // Cap to 576px wide (6 inches), scale height proportionally
  const maxW = 576;
  const dw = Math.min(displayW, maxW);
  const dh = Math.round(displayH * (dw / displayW));

  return { data: new Uint8Array(await blob.arrayBuffer()), displayW: dw, displayH: dh };
};

const extractPDFItems = async (file: File): Promise<DocItem[][]> => {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const allPages: DocItem[][] = [];

  // Render scale: 150 DPI (150/72 ≈ 2.08)
  const RENDER_SCALE = 150 / 72;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;

    // Header/footer exclusion zones
    const headerMinY = pageHeight * 0.92;
    const footerMaxY = pageHeight * 0.06;

    const [content, opList] = await Promise.all([
      page.getTextContent(),
      page.getOperatorList(),
    ]);

    const imageRegions = trackImageRegions(
      opList as { fnArray: number[]; argsArray: unknown[][] },
      viewport.width,
      pageHeight,
    );

    // Render page only when needed: either sub-page images exist, or
    // it's a diagram page (has image ops but very little text → render entire page).
    const hasAnyImageOp = (opList.fnArray as number[]).some(fn =>
      fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject
    );
    let pageCanvas: HTMLCanvasElement | null = null;
    let isDiagramPage = false;
    if (imageRegions.length > 0) {
      pageCanvas = await renderPage(page, RENDER_SCALE);
    } else if (hasAnyImageOp) {
      // Page has images but they were all filtered as backgrounds.
      // If the page also has very little text, treat the whole page as a diagram.
      const rawTextCount = content.items.filter((r: unknown) => 'str' in (r as object) && cleanStr((r as {str:string}).str)).length;
      if (rawTextCount < 8) {
        isDiagramPage = true;
        pageCanvas = await renderPage(page, RENDER_SCALE);
      }
    }

    // Collect text items, excluding header/footer zones
    const items: TextItem[] = [];
    for (const raw of content.items) {
      if (!('str' in raw)) continue;
      const str = cleanStr((raw as { str: string }).str);
      if (!str) continue;
      const y = (raw as { transform: number[] }).transform[5];
      if (y > headerMinY || y < footerMaxY) continue;
      items.push({
        str,
        x: (raw as { transform: number[] }).transform[4],
        y,
        height: (raw as { height: number }).height || Math.abs((raw as { transform: number[] }).transform[3]) || 12,
      });
    }

    // Dominant body font size
    let bodySize = 12;
    if (items.length > 0) {
      const sc = new Map<number, number>();
      for (const it of items) { const sz = Math.round(it.height); sc.set(sz, (sc.get(sz) ?? 0) + 1); }
      bodySize = [...sc.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }

    // Group items into visual lines by Y bucket
    const lineMap = new Map<number, TextItem[]>();
    for (const it of items) {
      const y = Math.round(it.y / 3) * 3;
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push(it);
    }

    // Build raw text lines, sorted top-to-bottom
    const rawLines: DocLine[] = [];
    for (const [yKey, lineItems] of [...lineMap.entries()].sort(([a], [b]) => b - a)) {
      lineItems.sort((a, b) => a.x - b.x);
      const text = lineItems.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const avgSize = lineItems.reduce((s, it) => s + it.height, 0) / lineItems.length;
      rawLines.push({
        kind: 'text',
        text,
        fontSize: Math.round(avgSize),
        isHeading: avgSize > bodySize * 1.25 && text.length < 120,
        y: yKey,
      });
    }

    // Join lines ending with hyphen into the next (cross-line word breaks)
    const docLines: DocLine[] = [];
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (line.text.endsWith('-') && i + 1 < rawLines.length && !rawLines[i + 1].isHeading) {
        docLines.push({ ...line, text: line.text.slice(0, -1) + rawLines[i + 1].text });
        i++;
      } else {
        docLines.push(line);
      }
    }

    // Build image items from regions
    const docImages: DocImage[] = [];
    if (pageCanvas && isDiagramPage) {
      // Whole page is a diagram — embed it as one image at mid-page Y
      const result = await cropRegion(
        pageCanvas,
        { xMin: 0, yMin: 0, xMax: viewport.width, yMax: pageHeight, yCenter: pageHeight / 2 },
        pageHeight,
        RENDER_SCALE,
      );
      if (result) docImages.push({ kind: 'image', ...result, y: pageHeight / 2 });
    } else if (pageCanvas) {
      for (const region of imageRegions) {
        if (region.yCenter > headerMinY || region.yCenter < footerMaxY) continue;
        const result = await cropRegion(pageCanvas, region, pageHeight, RENDER_SCALE);
        if (result) docImages.push({ kind: 'image', ...result, y: region.yCenter });
      }
    }

    // Merge text lines and images, sorted top-to-bottom by Y (descending PDF Y = top)
    const pageItems: DocItem[] = [...docLines, ...docImages].sort((a, b) => b.y - a.y);
    allPages.push(pageItems);
  }

  return allPages;
};

// Build a DOCX from all page items
const buildDocx = async (allPages: DocItem[][], title: string): Promise<Blob> => {
  const { Document, Packer, Paragraph, TextRun, PageBreak, HeadingLevel, ImageRun } = await import('docx');

  const children = [];

  for (let i = 0; i < allPages.length; i++) {
    const items = allPages[i];
    if (items.length === 0) continue;

    if (i > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    for (const item of items) {
      if (item.kind === 'text') {
        if (item.isHeading) {
          children.push(new Paragraph({
            text: item.text,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          }));
        } else {
          children.push(new Paragraph({
            children: [new TextRun({ text: item.text })],
            spacing: { after: 80 },
          }));
        }
      } else {
        children.push(new Paragraph({
          children: [new ImageRun({
            data: item.data,
            transformation: { width: item.displayW, height: item.displayH },
            type: 'png',
          })],
          spacing: { before: 80, after: 80 },
        }));
      }
    }
  }

  const doc = new Document({ creator: 'Universal File Converter', title, sections: [{ children }] });
  return Packer.toBlob(doc);
};

// ── Public converters ────────────────────────────────────────────────────────

const pdfToDocx = async (file: File): Promise<Blob> => {
  const pages = await extractPDFItems(file);
  return buildDocx(pages, file.name.replace(/\.pdf$/i, ''));
};

// For TXT/HTML we still just need text, use a simpler extractor
const extractTextOnly = async (file: File) => {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const headerMinY = vp.height * 0.92;
    const footerMaxY = vp.height * 0.06;
    const content = await page.getTextContent();
    const items: TextItem[] = [];
    for (const raw of content.items) {
      if (!('str' in raw)) continue;
      const str = cleanStr((raw as { str: string }).str);
      if (!str) continue;
      const y = (raw as { transform: number[] }).transform[5];
      if (y > headerMinY || y < footerMaxY) continue;
      items.push({ str, x: (raw as { transform: number[] }).transform[4], y, height: (raw as { height: number }).height || 12 });
    }
    let bodySize = 12;
    if (items.length > 0) {
      const sc = new Map<number, number>();
      for (const it of items) { const sz = Math.round(it.height); sc.set(sz, (sc.get(sz) ?? 0) + 1); }
      bodySize = [...sc.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    const lineMap = new Map<number, TextItem[]>();
    for (const it of items) { const y = Math.round(it.y / 3) * 3; if (!lineMap.has(y)) lineMap.set(y, []); lineMap.get(y)!.push(it); }
    const lines: { text: string; isHeading: boolean }[] = [];
    for (const [, li] of [...lineMap.entries()].sort(([a], [b]) => b - a)) {
      li.sort((a, b) => a.x - b.x);
      const text = li.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const avg = li.reduce((s, it) => s + it.height, 0) / li.length;
      lines.push({ text, isHeading: avg > bodySize * 1.25 && text.length < 120 });
    }
    pages.push(lines);
  }
  return pages;
};

const pdfToTxt = async (file: File): Promise<Blob> => {
  const pages = await extractTextOnly(file);
  return new Blob([pages.map(p => p.map(l => l.text).join('\n')).join('\n\n\n')], { type: 'text/plain' });
};

const pdfToHtml = async (file: File): Promise<Blob> => {
  const pages = await extractTextOnly(file);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = pages.map((p, i) =>
    `<section id="page-${i + 1}">\n${p.map(l => l.isHeading ? `  <h2>${esc(l.text)}</h2>` : `  <p>${esc(l.text)}</p>`).join('\n')}\n</section>`
  ).join('\n\n');
  return new Blob([`<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><title>${esc(file.name)}</title></head>\n<body>\n${body}\n</body>\n</html>`], { type: 'text/html' });
};

const txtToHtml = async (file: File): Promise<Blob> => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const text = await file.text();
  const body = text.split('\n').map(l => l.trim() ? `<p>${esc(l)}</p>` : '<br>').join('\n');
  return new Blob([`<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><title>${esc(file.name)}</title></head>\n<body>\n${body}\n</body>\n</html>`], { type: 'text/html' });
};

const htmlToTxt = async (file: File): Promise<Blob> => {
  const html = await file.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return new Blob([doc.body.textContent ?? ''], { type: 'text/plain' });
};

const retext = async (file: File, mime: string): Promise<Blob> =>
  new Blob([await file.text()], { type: mime });

export const convertDocument = async (file: File, targetFormat: string): Promise<Blob> => {
  const src = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (src === 'pdf') {
    if (targetFormat === 'docx') return pdfToDocx(file);
    if (targetFormat === 'txt')  return pdfToTxt(file);
    if (targetFormat === 'html') return pdfToHtml(file);
  }
  if (src === 'txt') {
    if (targetFormat === 'html') return txtToHtml(file);
    if (targetFormat === 'md')   return retext(file, 'text/markdown');
  }
  if (src === 'md') {
    if (targetFormat === 'txt')  return retext(file, 'text/plain');
  }
  if (src === 'html') {
    if (targetFormat === 'txt')  return htmlToTxt(file);
  }
  throw new Error(`Document conversion from .${src} to .${targetFormat} is not yet supported`);
};

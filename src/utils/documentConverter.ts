// Browser-based document converter
// PDF parsing: pdfjs-dist (lazy loaded)
// DOCX creation: docx (lazy loaded)

interface TextItem {
  str: string;
  x: number;
  y: number;
  height: number; // font size in points
}

interface DocLine {
  text: string;
  fontSize: number;
  isHeading: boolean;
}

interface PageContent {
  lines: DocLine[];
  pageNum: number;
  image?: { data: Uint8Array; width: number; height: number };
}

// Replace sequences of replacement chars (garbled PDF font encoding).
// ≥3 in a row → "···" (TOC dot leaders), single/double → remove.
const cleanStr = (s: string): string =>
  s.replace(/�{3,}/g, '···').replace(/�+/g, '').trim();

// Render a PDF page to PNG bytes at a given display width.
const renderPageToPng = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  displayWidthPx: number
): Promise<{ data: Uint8Array; width: number; height: number } | null> => {
  try {
    const viewport = page.getViewport({ scale: 1 });
    const scale = displayWidthPx / viewport.width;
    const scaledVP = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(scaledVP.width);
    canvas.height = Math.round(scaledVP.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    await page.render({ canvasContext: ctx, viewport: scaledVP }).promise;

    const blob = await new Promise<Blob | null>(res => canvas.toBlob(b => res(b), 'image/png'));
    if (!blob) return null;
    return {
      data: new Uint8Array(await blob.arrayBuffer()),
      width: canvas.width,
      height: canvas.height,
    };
  } catch {
    return null;
  }
};

// pdfjs operator codes for image painting
const IMAGE_OPS = new Set([83, 84, 85]); // paintInlineImageXObject, paintImageMaskXObject, paintImageXObject

const extractPDFPages = async (file: File): Promise<PageContent[]> => {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: PageContent[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;

    // Header zone: top 8% of page; footer zone: bottom 6%
    const headerMinY = pageHeight * 0.92;
    const footerMaxY = pageHeight * 0.06;

    const [content, opList] = await Promise.all([
      page.getTextContent(),
      page.getOperatorList(),
    ]);

    const hasImages = opList.fnArray.some((fn: number) => IMAGE_OPS.has(fn));

    // Collect raw text items, skip headers/footers and garbled/empty strings
    const items: TextItem[] = [];
    for (const raw of content.items) {
      if (!('str' in raw)) continue;
      const str = cleanStr(raw.str);
      if (!str) continue;
      const y = raw.transform[5] as number;
      // Skip running headers and footers
      if (y > headerMinY || y < footerMaxY) continue;
      items.push({
        str,
        x: raw.transform[4] as number,
        y,
        height: (raw.height as number) || Math.abs(raw.transform[3] as number) || 12,
      });
    }

    // Determine dominant (body) font size — most frequently occurring
    let bodySize = 12;
    if (items.length > 0) {
      const sizeCount = new Map<number, number>();
      for (const it of items) {
        const sz = Math.round(it.height);
        sizeCount.set(sz, (sizeCount.get(sz) ?? 0) + 1);
      }
      bodySize = [...sizeCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }

    // Group items into lines by rounded Y position (PDF Y is bottom-up)
    const lineMap = new Map<number, TextItem[]>();
    for (const it of items) {
      const y = Math.round(it.y / 3) * 3; // bucket to 3-unit rows
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push(it);
    }

    // Sort lines top-to-bottom (descending Y), items left-to-right within each line
    const rawLines: DocLine[] = [];
    for (const [, lineItems] of [...lineMap.entries()].sort(([a], [b]) => b - a)) {
      lineItems.sort((a, b) => a.x - b.x);

      const text = lineItems.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
      if (!text) continue;

      const avgSize = lineItems.reduce((s, it) => s + it.height, 0) / lineItems.length;
      const isHeading = avgSize > bodySize * 1.25 && text.length < 120;

      rawLines.push({ text, fontSize: Math.round(avgSize), isHeading });
    }

    // Join lines where a line ends with a hyphen into the next line
    // (handles words split across visual lines in the PDF)
    const docLines: DocLine[] = [];
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (line.text.endsWith('-') && i + 1 < rawLines.length && !rawLines[i + 1].isHeading) {
        const joined = line.text.slice(0, -1) + rawLines[i + 1].text;
        docLines.push({ text: joined, fontSize: line.fontSize, isHeading: line.isHeading });
        i++; // skip next line — already consumed
      } else {
        docLines.push(line);
      }
    }

    // Render page to PNG if it has image operators (diagrams, photos, etc.)
    // Display at 6 inches wide (96 DPI screen = 576px)
    const image = hasImages ? (await renderPageToPng(page, 576)) ?? undefined : undefined;

    pages.push({ lines: docLines, pageNum: p, image });
  }

  return pages;
};

// Build a DOCX from extracted pages
const buildDocx = async (pages: PageContent[], title: string): Promise<Blob> => {
  const { Document, Packer, Paragraph, TextRun, PageBreak, HeadingLevel, ImageRun } = await import('docx');

  const children = [];

  for (let i = 0; i < pages.length; i++) {
    const { lines, image } = pages[i];
    if (lines.length === 0 && !image) continue;

    // Page break before each page except the first
    if (i > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    for (const line of lines) {
      if (line.isHeading) {
        children.push(
          new Paragraph({
            text: line.text,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line.text })],
            spacing: { after: 100 },
          })
        );
      }
    }

    // Embed rendered page image after text (for pages with diagrams/photos)
    if (image) {
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: image.data,
              transformation: { width: image.width, height: image.height },
              type: 'png',
            }),
          ],
          spacing: { before: 120, after: 120 },
        })
      );
    }
  }

  const doc = new Document({
    creator: 'Universal File Converter',
    title,
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
};

// ── Public converters ────────────────────────────────────────────────────────

const pdfToDocx = async (file: File): Promise<Blob> => {
  const pages = await extractPDFPages(file);
  return buildDocx(pages, file.name.replace(/\.pdf$/i, ''));
};

const pdfToTxt = async (file: File): Promise<Blob> => {
  const pages = await extractPDFPages(file);
  const text = pages
    .map(p => p.lines.map(l => l.text).join('\n'))
    .join('\n\n\n');
  return new Blob([text], { type: 'text/plain' });
};

const pdfToHtml = async (file: File): Promise<Blob> => {
  const pages = await extractPDFPages(file);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const body = pages.map((p, i) => {
    const content = p.lines
      .map(l => l.isHeading ? `  <h2>${esc(l.text)}</h2>` : `  <p>${esc(l.text)}</p>`)
      .join('\n');
    return `<section id="page-${i + 1}">\n${content}\n</section>`;
  }).join('\n\n');

  return new Blob([`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${esc(file.name)}</title></head>
<body>
${body}
</body>
</html>`], { type: 'text/html' });
};

const txtToHtml = async (file: File): Promise<Blob> => {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const text = await file.text();
  const body = text.split('\n').map(l => l.trim() ? `<p>${esc(l)}</p>` : '<br>').join('\n');
  return new Blob([`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${esc(file.name)}</title></head>
<body>
${body}
</body>
</html>`], { type: 'text/html' });
};

const htmlToTxt = async (file: File): Promise<Blob> => {
  const html = await file.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return new Blob([doc.body.textContent ?? ''], { type: 'text/plain' });
};

const retext = async (file: File, mime: string): Promise<Blob> =>
  new Blob([await file.text()], { type: mime });

export const convertDocument = async (
  file: File,
  targetFormat: string
): Promise<Blob> => {
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

  throw new Error(
    `Document conversion from .${src} to .${targetFormat} is not yet supported`
  );
};

// Browser-based document converter
// PDF parsing: pdfjs-dist (loaded lazily)
// DOCX creation: docx

// Extract pages of text from a PDF file using pdfjs-dist
const extractPDFPages = async (file: File): Promise<string[]> => {
  const pdfjsLib = await import('pdfjs-dist');

  // Point the worker at the bundled copy shipped with the package
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Group text items into lines by Y-position (PDF Y is bottom-up)
    const lineMap = new Map<number, string[]>();
    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        const y = Math.round((item.transform[5] as number) / 4) * 4;
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y)!.push(item.str);
      }
    }

    const text = [...lineMap.entries()]
      .sort(([a], [b]) => b - a)           // descending Y = top → bottom
      .map(([, words]) => words.join(' '))
      .join('\n');

    pages.push(text);
  }

  return pages;
};

// PDF → DOCX: extract text and write a Word document
const pdfToDocx = async (file: File): Promise<Blob> => {
  const [pages, { Document, Packer, Paragraph, TextRun }] = await Promise.all([
    extractPDFPages(file),
    import('docx'),
  ]);

  const doc = new Document({
    sections: [{
      children: pages.flatMap((pageText, i) => [
        new Paragraph({
          children: [new TextRun({ text: `— Page ${i + 1} —`, bold: true })],
          spacing: { before: i === 0 ? 0 : 600, after: 240 },
        }),
        ...pageText
          .split('\n')
          .map(line => new Paragraph({
            children: [new TextRun({ text: line })],
            spacing: { after: 120 },
          })),
      ]),
    }],
  });

  return Packer.toBlob(doc);
};

// PDF → TXT
const pdfToTxt = async (file: File): Promise<Blob> => {
  const pages = await extractPDFPages(file);
  return new Blob([pages.join('\n\n\n')], { type: 'text/plain' });
};

// PDF → HTML
const pdfToHtml = async (file: File): Promise<Blob> => {
  const pages = await extractPDFPages(file);
  const body = pages
    .map((page, i) => {
      const paras = page.split('\n').map(l => `  <p>${escapeHtml(l)}</p>`).join('\n');
      return `<section>\n  <h2>Page ${i + 1}</h2>\n${paras}\n</section>`;
    })
    .join('\n\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(file.name)}</title>
</head>
<body>
${body}
</body>
</html>`;
  return new Blob([html], { type: 'text/html' });
};

// TXT → HTML
const txtToHtml = async (file: File): Promise<Blob> => {
  const text = await file.text();
  const paras = text
    .split('\n')
    .map(l => l.trim() ? `<p>${escapeHtml(l)}</p>` : '<br>')
    .join('\n');
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${escapeHtml(file.name)}</title></head>
<body>
${paras}
</body>
</html>`;
  return new Blob([html], { type: 'text/html' });
};

// HTML → TXT: strip all tags
const htmlToTxt = async (file: File): Promise<Blob> => {
  const html = await file.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return new Blob([doc.body.textContent ?? ''], { type: 'text/plain' });
};

// TXT ↔ MD: trivial rename (plain text is valid Markdown and vice-versa)
const retext = async (file: File, mime: string): Promise<Blob> =>
  new Blob([await file.text()], { type: mime });

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
    if (targetFormat === 'txt') return retext(file, 'text/plain');
  }

  if (src === 'html') {
    if (targetFormat === 'txt') return htmlToTxt(file);
  }

  throw new Error(
    `Document conversion from .${src} to .${targetFormat} is not yet supported`
  );
};

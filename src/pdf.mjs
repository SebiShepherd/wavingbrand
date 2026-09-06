/**
 * PDF, written rather than converted.
 *
 * No SVG-to-PDF converter emits DeviceCMYK, and CMYK is the entire reason a
 * printer is given a PDF instead of an SVG. The shapes here are twelve straight
 * segments and some beziers, so the file is written directly: the geometry is
 * already exact and passing it through a rasteriser or a colour-managed
 * converter would only lose the one property the file exists to carry.
 *
 * Uncompressed on purpose. The largest page is a few kilobytes, and a plain
 * content stream is one a printer, or you, can open in a text editor and read.
 */
import { parse } from './path.mjs';

export const MM = 72 / 25.4;
const f = (n) => (Math.round(n * 1000) / 1000).toString();

/**
 * Path segments as PDF operators.
 *
 * `x` and `y` are the shape's top-left corner measured from the page's
 * top-left, because that is how the layouts above are written and how SVG
 * measures. PDF grows up from the bottom left, so y is flipped once, here,
 * rather than in every caller.
 */
function stream(segments, { scale = 1, x = 0, y = 0, height }) {
  const px = (v) => f(x + v * scale);
  const py = (v) => f(height - (y + v * scale));
  const out = [];
  for (const seg of segments) {
    const a = seg.args;
    if (seg.op === 'M') out.push(`${px(a[0])} ${py(a[1])} m`);
    else if (seg.op === 'L') out.push(`${px(a[0])} ${py(a[1])} l`);
    else if (seg.op === 'C')
      out.push(`${px(a[0])} ${py(a[1])} ${px(a[2])} ${py(a[3])} ${px(a[4])} ${py(a[5])} c`);
    else if (seg.op === 'Z') out.push('h');
  }
  return out.join('\n');
}

const cmykOp = ([c, m, y, k]) => `${f(c / 100)} ${f(m / 100)} ${f(y / 100)} ${f(k / 100)} k`;

/**
 * @typedef {{d: string, cmyk: number[], rule?: 'nonzero'|'evenodd', scale?: number, x?: number, y?: number}} Shape
 * @typedef {{x:number,y:number,width:number,height:number,cmyk:number[]}} Rect
 * @typedef {{width:number, height:number, trim?: number, shapes?: Shape[], rects?: Rect[]}} Page
 */

/**
 * @param {Page[]} pages sizes in points
 * @param {{title: string, note?: string}} meta
 */
export function pdf(pages, { title, note = '' }) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  const contents = pages.map((page) => {
    const body = [];
    for (const r of page.rects ?? [])
      body.push(`${cmykOp(r.cmyk)}\n${f(r.x)} ${f(page.height - r.y - r.height)} ${f(r.width)} ${f(r.height)} re f`);
    for (const s of page.shapes ?? []) {
      body.push(cmykOp(s.cmyk));
      body.push(stream(parse(s.d), { scale: s.scale ?? 1, x: s.x ?? 0, y: s.y ?? 0, height: page.height }));
      body.push(s.rule === 'evenodd' ? 'f*' : 'f');
    }
    return body.join('\n');
  });

  const catalog = 1;
  const pagesObj = 2;
  objects.push('', ''); // placeholders for 1 and 2, filled below
  const pageIds = [];
  pages.forEach((page, i) => {
    const contentId = add(`<< /Length ${Buffer.byteLength(contents[i])} >>\nstream\n${contents[i]}\nendstream`);
    // TrimBox is what the guillotine cuts to; MediaBox includes the bleed.
    const trim = page.trim ?? 0;
    const boxes = trim
      ? `/TrimBox [${f(trim)} ${f(trim)} ${f(page.width - trim)} ${f(page.height - trim)}] /BleedBox [0 0 ${f(page.width)} ${f(page.height)}]`
      : '';
    pageIds.push(
      add(
        `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${f(page.width)} ${f(page.height)}] ${boxes} /Contents ${contentId} 0 R /Resources << >> >>`,
      ),
    );
  });
  const infoId = add(
    `<< /Title (${title}) /Creator (wavingbrand src/pdf.mjs) /Producer (wavingbrand) ${note ? `/Subject (${note})` : ''} >>`,
  );
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;

  const chunks = ['%PDF-1.7\n%\xE2\xE3\xCF\xD3\n'];
  const offsets = [];
  let at = Buffer.byteLength(chunks[0], 'binary');
  objects.forEach((body, i) => {
    const text = `${i + 1} 0 obj\n${body}\nendobj\n`;
    offsets.push(at);
    chunks.push(text);
    at += Buffer.byteLength(text, 'binary');
  });
  const xrefAt = at;
  const xref = [
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`,
    ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`),
  ].join('');
  chunks.push(xref);
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
  return Buffer.from(chunks.join(''), 'binary');
}

/**
 * Encapsulated PostScript, for the printers and sign-makers who still ask.
 *
 * Same shapes, same CMYK, one page, and a BoundingBox so it places correctly.
 */
export function eps(page, { title }) {
  const body = [];
  for (const r of page.rects ?? [])
    body.push(
      `${(r.cmyk[0] / 100).toFixed(3)} ${(r.cmyk[1] / 100).toFixed(3)} ${(r.cmyk[2] / 100).toFixed(3)} ${(r.cmyk[3] / 100).toFixed(3)} setcmykcolor`,
      `newpath ${f(r.x)} ${f(page.height - r.y - r.height)} moveto ${f(r.width)} 0 rlineto 0 ${f(r.height)} rlineto ${f(-r.width)} 0 rlineto closepath fill`,
    );
  for (const s of page.shapes ?? []) {
    body.push(
      `${(s.cmyk[0] / 100).toFixed(3)} ${(s.cmyk[1] / 100).toFixed(3)} ${(s.cmyk[2] / 100).toFixed(3)} ${(s.cmyk[3] / 100).toFixed(3)} setcmykcolor`,
      'newpath',
    );
    const scale = s.scale ?? 1;
    const ox = s.x ?? 0;
    const oy = s.y ?? 0;
    for (const seg of parse(s.d)) {
      const a = seg.args;
      const X = (v) => f(ox + v * scale);
      const Y = (v) => f(page.height - (oy + v * scale));
      if (seg.op === 'M') body.push(`${X(a[0])} ${Y(a[1])} moveto`);
      else if (seg.op === 'L') body.push(`${X(a[0])} ${Y(a[1])} lineto`);
      else if (seg.op === 'C') body.push(`${X(a[0])} ${Y(a[1])} ${X(a[2])} ${Y(a[3])} ${X(a[4])} ${Y(a[5])} curveto`);
      else if (seg.op === 'Z') body.push('closepath');
    }
    body.push(s.rule === 'evenodd' ? 'eofill' : 'fill');
  }
  return Buffer.from(
    [
      '%!PS-Adobe-3.0 EPSF-3.0',
      `%%BoundingBox: 0 0 ${Math.ceil(page.width)} ${Math.ceil(page.height)}`,
      `%%HiResBoundingBox: 0 0 ${f(page.width)} ${f(page.height)}`,
      `%%Title: ${title}`,
      '%%Creator: wavingbrand src/pdf.mjs',
      '%%LanguageLevel: 2',
      '%%DocumentProcessColors: Cyan Magenta Yellow Black',
      '%%EndComments',
      ...body,
      'showpage',
      '%%EOF',
      '',
    ].join('\n'),
    'binary',
  );
}

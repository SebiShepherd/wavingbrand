/**
 * Serialising a piece.
 *
 * Three rules, each one a defect in the original files (docs/asset-audit.md
 * section 4): the viewBox is tight on the ink and carries no dead space; there
 * is no background unless the variant is a boxed one; and nothing has an id, so
 * two of these inlined in one page cannot clip each other.
 */
const r = (n) => Math.round(n * 100) / 100;

/**
 * @param {{width:number,height:number,body:Function,boxed?:boolean}} piece
 * @param {{ink:string, surface?:string, type?:string, title:string, pad?:number, style?:string}} opts
 */
export function toSvg(piece, { ink, surface = 'none', type, title, pad = 0, style = '' }) {
  const w = piece.width + pad * 2;
  const h = piece.height + pad * 2;
  const inner = piece.body({ ink, surface, type: type ?? ink });
  const shifted = pad ? `<g transform="translate(${r(pad)} ${r(pad)})">${inner}</g>` : inner;
  const bg = !piece.boxed && surface !== 'none' ? `<rect width="${r(w)}" height="${r(h)}" fill="${surface}"/>` : '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(w)} ${r(h)}" role="img" aria-label="${title}">`,
    `<title>${title}</title>`,
    style ? `<style>${style}</style>` : '',
    bg,
    shifted,
    '</svg>',
  ].join('');
}

/** A minimal ICO container. Modern browsers read PNG payloads inside one. */
export function ico(pngs) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, data }, i) => {
    const at = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, at);
    dir.writeUInt8(size >= 256 ? 0 : size, at + 1);
    dir.writeUInt8(0, at + 2);
    dir.writeUInt8(0, at + 3);
    dir.writeUInt16LE(1, at + 4);
    dir.writeUInt16LE(32, at + 6);
    dir.writeUInt32LE(data.length, at + 8);
    dir.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([head, dir, ...pngs.map((p) => p.data)]);
}

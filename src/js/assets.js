/* Carrega a geometria oficial da marca (icone da vaca e manchas do pattern)
   extraida dos PDFs originais da pasta, e a converte em Path2D reutilizavel. */

let cache = null;

export async function loadBrandGeometry() {
  if (cache) return cache;

  const [icon, manchas] = await Promise.all([
    fetch('assets/brand/palma-icone.json').then((r) => r.json()),
    fetch('assets/brand/palma-manchas.json').then((r) => r.json()),
  ]);

  cache = {
    icon: {
      path: new Path2D(icon.d),
      // caixa real da arte dentro da prancheta de 400x400
      box: { x: icon.bbox[0], y: icon.bbox[1], w: icon.bbox[2], h: icon.bbox[3] },
    },
    manchas: manchas.map((m) => ({
      path: new Path2D(m.d),
      box: { x: m.vb[0], y: m.vb[1], w: m.vb[2], h: m.vb[3] },
      inteira: m.inteira !== false,
    })),
    /* O pattern e um ladrilho sem emenda, entao varias manchas nascem cortadas
       na borda. Soltas no ceu elas denunciam o corte reto. Aqui ficam so as
       inteiras, para quem precisa da forma isolada. */
    inteiras: manchas.map((m, i) => (m.inteira !== false ? i : -1)).filter((i) => i >= 0),
    // dados crus: a composicao em DOM monta SVG a partir daqui
    manchasRaw: manchas,
  };
  return cache;
}

/* Desenha um Path2D encaixado num retangulo destino, preservando proporcao.
   `grow` engorda o traco: mantem legivel a arte de linha em tamanho pequeno. */
export function drawFitted(ctx, shape, x, y, w, h, { color = '#000', grow = 0 } = {}) {
  const s = Math.min(w / shape.box.w, h / shape.box.h);
  ctx.save();
  ctx.translate(x + (w - shape.box.w * s) / 2, y + (h - shape.box.h * s) / 2);
  ctx.scale(s, s);
  ctx.translate(-shape.box.x, -shape.box.y);
  ctx.fillStyle = color;
  ctx.fill(shape.path, 'evenodd');
  if (grow > 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = grow / s;
    ctx.lineJoin = 'round';
    ctx.stroke(shape.path);
  }
  ctx.restore();
}

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
    // cabeca pronta, com o rosto pintado de branco (ver buildHeadSprite)
    headSprite: null,
    // dados crus: a composicao em DOM monta SVG a partir daqui
    manchasRaw: manchas,
  };
  cache.headSprite = buildHeadSprite(cache.icon);
  return cache;
}

/* Monta a cabeca da vaca como sprite, uma vez so.

   Nao da para pintar o rosto de branco trocando a regra de preenchimento: os
   contornos internos do path vem com sentido invertido, entao 'nonzero' e
   'evenodd' dao exatamente o mesmo resultado e os vazados continuam vazados.
   Aqui a arte e desenhada, o exterior e descoberto por inundacao a partir das
   bordas, e tudo que sobrou por dentro vira branco. A arte entra por cima, com
   o antisserrilhado preservado. */
export function buildHeadSprite(icon, { ink = '#100d0b', paper = '#ffffff', w = 512 } = {}) {
  const h = Math.round((w * icon.box.h) / icon.box.w);

  const arte = document.createElement('canvas');
  arte.width = w; arte.height = h;
  const a = arte.getContext('2d', { willReadFrequently: true });
  drawFitted(a, icon, 0, 0, w, h, { color: ink });

  const px = a.getImageData(0, 0, w, h).data;
  const exterior = new Uint8Array(w * h);
  const fila = [];
  for (let x = 0; x < w; x++) fila.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) fila.push(y * w, y * w + w - 1);

  while (fila.length) {
    const i = fila.pop();
    if (exterior[i] || px[i * 4 + 3] >= 128) continue;
    exterior[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) fila.push(i - 1);
    if (x < w - 1) fila.push(i + 1);
    if (y > 0) fila.push(i - w);
    if (y < h - 1) fila.push(i + w);
  }

  const sprite = document.createElement('canvas');
  sprite.width = w; sprite.height = h;
  const s = sprite.getContext('2d');
  const massa = s.createImageData(w, h);
  const m = massa.data;
  const r = parseInt(paper.slice(1, 3), 16);
  const g = parseInt(paper.slice(3, 5), 16);
  const b = parseInt(paper.slice(5, 7), 16);
  for (let i = 0; i < w * h; i++) {
    if (exterior[i]) continue;
    m[i * 4] = r; m[i * 4 + 1] = g; m[i * 4 + 2] = b; m[i * 4 + 3] = 255;
  }
  s.putImageData(massa, 0, 0);
  s.drawImage(arte, 0, 0);
  return sprite;
}

/* Aplica a transformacao que encaixa um Path2D num retangulo destino e chama
   `desenhar(escala)`. Serve para quem precisa fazer mais do que preencher:
   recortar, contornar, empilhar. */
export function withFit(ctx, shape, x, y, w, h, desenhar) {
  const s = Math.min(w / shape.box.w, h / shape.box.h);
  ctx.save();
  ctx.translate(x + (w - shape.box.w * s) / 2, y + (h - shape.box.h * s) / 2);
  ctx.scale(s, s);
  ctx.translate(-shape.box.x, -shape.box.y);
  desenhar(s);
  ctx.restore();
}

/* Desenha um Path2D encaixado num retangulo destino, preservando proporcao.
   `grow` engorda o traco: mantem legivel a arte de linha em tamanho pequeno. */
export function drawFitted(ctx, shape, x, y, w, h, { color = '#000', grow = 0 } = {}) {
  withFit(ctx, shape, x, y, w, h, (s) => {
    ctx.fillStyle = color;
    ctx.fill(shape.path, 'evenodd');
    if (grow > 0) {
      ctx.strokeStyle = color;
      ctx.lineWidth = grow / s;
      ctx.lineJoin = 'round';
      ctx.stroke(shape.path);
    }
  });
}

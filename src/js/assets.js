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

   Nao da para pintar o rosto trocando a regra de preenchimento: os contornos
   internos do path vem com sentido invertido, entao nonzero e evenodd dao
   exatamente o mesmo resultado e os vazados continuam vazados.

   Inundar o exterior a partir da borda tambem nao basta sozinho: o icone e um
   desenho de linha ABERTO, e o exterior escorre para dentro do rosto por uma
   fresta entre a orelha e a cabeca. Medido no sprite publicado: zero pixel
   branco.

   Entao o exterior passa por um fechamento morfologico. A tinta e engrossada
   em r, o exterior e inundado sobre essa barreira grossa e depois devolvido ao
   tamanho original. A fresta fica selada e a silhueta volta ao lugar. O engorda
   existe so para calcular a mascara: a arte desenhada por cima continua sendo a
   original, sem nenhum traco alterado. */
export function buildHeadSprite(icon, { ink = '#100d0b', paper = '#ffffff', w = 384 } = {}) {
  const h = Math.round((w * icon.box.h) / icon.box.w);
  // margem: encostar na borda faria o fechamento inventar miolo fora da arte
  const m = Math.round(w / 32);
  const W = w + m * 2, H = h + m * 2;

  const arte = document.createElement('canvas');
  arte.width = W; arte.height = H;
  const a = arte.getContext('2d', { willReadFrequently: true });
  drawFitted(a, icon, m, m, w, h, { color: ink });

  const px = a.getImageData(0, 0, W, H).data;
  const tinta = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) tinta[i] = px[i * 4 + 3] >= 128 ? 1 : 0;

  const r = Math.max(1, Math.round(w / 64));
  const fora = dilatar(inundarDaBorda(dilatar(tinta, r, W, H), W, H), r, W, H);

  const sprite = document.createElement('canvas');
  sprite.width = w; sprite.height = h;
  const s = sprite.getContext('2d');
  const massa = s.createImageData(w, h);
  const d = massa.data;
  const cr = parseInt(paper.slice(1, 3), 16);
  const cg = parseInt(paper.slice(3, 5), 16);
  const cb = parseInt(paper.slice(5, 7), 16);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (fora[(y + m) * W + (x + m)]) continue;
      const i = (y * w + x) * 4;
      d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = 255;
    }
  }
  s.putImageData(massa, 0, 0);
  s.drawImage(arte, -m, -m);   // a arte original por cima, sem retoque
  return sprite;
}

/* engorda a mascara em r, distancia de Chebyshev, em duas passadas */
function dilatar(m, r, W, H) {
  if (r <= 0) return m;
  const t = new Uint8Array(W * H), out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let k = -r; k <= r && !v; k++) { const xx = x + k; if (xx >= 0 && xx < W && m[y * W + xx]) v = 1; }
      t[y * W + x] = v;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let k = -r; k <= r && !v; k++) { const yy = y + k; if (yy >= 0 && yy < H && t[yy * W + x]) v = 1; }
      out[y * W + x] = v;
    }
  }
  return out;
}

/* tudo que a borda alcanca sem atravessar a barreira */
function inundarDaBorda(barreira, W, H) {
  const e = new Uint8Array(W * H), fila = [];
  for (let x = 0; x < W; x++) fila.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) fila.push(y * W, y * W + W - 1);
  while (fila.length) {
    const i = fila.pop();
    if (e[i] || barreira[i]) continue;
    e[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) fila.push(i - 1);
    if (x < W - 1) fila.push(i + 1);
    if (y > 0) fila.push(i - W);
    if (y < H - 1) fila.push(i + W);
  }
  return e;
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

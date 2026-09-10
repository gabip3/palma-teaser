import { SPAWN, PRODUCTS, RUN, BRAND } from '../config.js';
import { rand, hits } from '../util.js';
import { drawProduct } from './art.js';

/* Produtos Palma ao longo do percurso: as embalagens reais, recortadas sem
   sombra. Se alguma imagem nao carregar, o item cai no desenho vetorial de
   art.js e a partida segue normalmente. */

function carregar(src) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img;
}
const pronta = (img) => img.complete && img.naturalWidth > 0;

/* Tamanho em tela de um item. A embalagem ocupa a mesma AREA de um quadrado
   de lado size, sem distorcer, com teto de altura e de largura: o creme de
   leite alto e o queijo prato deitado ficam com o mesmo peso visual. Sem
   imagem, vale o quadrado do desenho vetorial. */
function medidas(it) {
  const img = it.produto && it.produto.img;
  if (!img || !pronta(img)) return { w: it.size, h: it.size };
  const p = img.naturalWidth / img.naturalHeight;
  const w = it.size * Math.sqrt(p), h = it.size / Math.sqrt(p);
  const k = Math.min(1, (it.size * 1.4) / h, (it.size * 1.3) / w);
  return { w: w * k, h: h * k };
}

export class Collectibles {
  constructor() {
    this.produtos = PRODUCTS.itens.map((p) => ({ ...p, img: carregar(p.src) }));
    this.divino = { ...PRODUCTS.divino, img: carregar(PRODUCTS.divino.src) };
    this.ultimo = null;
    this.reset();
  }

  /* n embalagens diferentes entre si, sem repetir a ultima que apareceu */
  #sortear(n) {
    const pool = this.produtos.filter((p) => p !== this.ultimo);
    const escolha = [];
    while (escolha.length < n && pool.length) {
      escolha.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    }
    this.ultimo = escolha[escolha.length - 1];
    return escolha;
  }

  reset() {
    // O primeiro grupo da partida e sempre um Queijo Divino: quem joga conhece
    // o item mais valioso logo de cara, em vez de depender do sorteio.
    this.primeiroQueijo = true;
    this.list = [];
    this.pops = [];
    this.travel = 0;
    this.nextAt = 0;
    this.t = 0;
    this.seco = 0;   // segundos sem conseguir encaixar produto
  }

  update(dt, speed, v, obstacles) {
    this.t += dt;
    this.seco += dt;
    const move = speed * dt;
    this.travel += move;

    for (const it of this.list) it.x -= move;
    while (this.list.length && this.list[0].x < -v.u) this.list.shift();

    for (const p of this.pops) { p.x -= move; p.life -= dt; }
    this.pops = this.pops.filter((p) => p.life > 0);

    if (this.travel >= this.nextAt) this.#spawn(speed, v, obstacles);
  }

  /* Procura um vao com folga de sobra antes e depois de qualquer obstaculo.
     Devolve null quando nao cabe: naquele trecho a pista tem obstaculo OU
     produto, nunca os dois disputando o mesmo pulo.

     O proximo obstaculo ainda nao existe, mas o spawner sabe exatamente
     quanto falta para ele nascer, entao da para prever onde vai cair. */
  #slot(v, obstacles, speed, half) {
    const antes = speed * SPAWN.itemClearanceBefore;
    const depois = speed * SPAWN.itemClearanceAfter;
    const proximo = v.w + v.u * 0.6 + (obstacles.nextAt - obstacles.travel);
    const xs = [...obstacles.list.map((o) => o.x), proximo].sort((a, b) => a - b);

    let inicio = v.w + v.u * 0.9 + half;
    for (const xo of xs) {
      const fim = xo - depois - half;   // este obstaculo chega DEPOIS do produto
      if (inicio <= fim) return (inicio + fim) / 2;
      inicio = Math.max(inicio, xo + antes + half);   // produto vem depois dele
    }
    return null;
  }

  #spawn(speed, v, obstacles) {
    // o Queijo Divino e raro, vem sozinho e sempre no alto: e o item de risco
    const queijo = this.primeiroQueijo || Math.random() < RUN.queijoChance;
    const size = v.u * (queijo ? 0.7 : 0.6);   // a embalagem real precisa de corpo para ser lida
    const arc = !queijo && Math.random() < SPAWN.arcChance;
    const spread = v.u * 0.85;   // o queijo mais largo nao encosta no vizinho do arco
    const x = this.#slot(v, obstacles, speed, arc ? spread : size * 0.5);

    if (x !== null) {
      this.seco = 0;
      if (queijo) this.primeiroQueijo = false;
      const high = v.groundY - v.u * rand(1.55, 2.05);
      const low = v.groundY - v.u * 0.62;
      const kind = queijo ? 'queijo' : 'produto';
      const valor = queijo ? RUN.queijoValor : RUN.milkPerItem;
      // no arco, tres embalagens diferentes: a linha passa inteira pela tela
      const vitrine = queijo ? [this.divino] : this.#sortear(arc ? 3 : 1);

      if (arc) {
        for (let i = -1; i <= 1; i++) {
          this.list.push({
            x: x + i * spread,
            y: high + Math.abs(i) * v.u * 0.30,
            size, kind, valor, produto: vitrine[i + 1], taken: false,
          });
        }
      } else {
        this.list.push({
          x,
          y: queijo || Math.random() < 0.55 ? high : low,
          size, kind, valor, produto: vitrine[0], taken: false,
        });
      }
    }

    /* Fechou tempo demais: em vez de espremer o produto do lado de um
       obstaculo, pede espaco na pista e espera o vao chegar. */
    if (x === null && this.seco > SPAWN.itemDrySpell) obstacles.pedirVao(SPAWN.itemWindow);

    // quando nao coube, tenta de novo logo adiante em vez de perder a vez
    this.nextAt = this.travel + speed *
      (x === null ? 0.7 : rand(SPAWN.itemGap[0], SPAWN.itemGap[1]));
  }

  /* devolve quantos litros foram coletados neste quadro */
  collect(cowBox) {
    let milk = 0;
    for (const it of this.list) {
      if (it.taken) continue;
      // colisao no formato real da embalagem, levemente menor que o desenho
      const { w, h } = medidas(it);
      if (hits(cowBox, { x: it.x - w * 0.4, y: it.y - h * 0.4, w: w * 0.8, h: h * 0.8 })) {
        it.taken = true;
        milk += it.valor;
        this.pops.push({ x: it.x, y: it.y, life: 0.55, max: 0.55, valor: it.valor, queijo: it.kind === 'queijo' });
      }
    }
    if (milk) this.list = this.list.filter((it) => !it.taken);
    return milk;
  }

  draw(ctx, brand, v) {
    for (const it of this.list) {
      const t = this.t + it.x * 0.01;
      const img = it.produto && it.produto.img;
      if (img && pronta(img)) {
        const { w, h } = medidas(it);
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(Math.sin(t * 2.2) * 0.06);   // o mesmo balanco dos vetores
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
        continue;
      }
      drawProduct(ctx, brand, it.kind === 'queijo' ? 'queijo' : 'garrafa', it.x, it.y, it.size, t);
    }

    // anel + rotulo de coleta: retorno curto, sem exagero
    ctx.save();
    ctx.lineWidth = Math.max(1.5, v.u * 0.028);
    ctx.textAlign = 'center';
    for (const p of this.pops) {
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = (1 - k) * 0.9;
      const cor = p.queijo ? BRAND.queijoDourado : BRAND.blue;
      ctx.strokeStyle = cor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, v.u * (0.22 + k * 0.5), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = cor;
      ctx.font = `800 ${Math.max(11, v.u * 0.21)}px "Palma Sans", system-ui, sans-serif`;
      ctx.fillText(`+${p.valor} L`, p.x, p.y - v.u * (0.38 + k * 0.55));
    }
    ctx.restore();
  }
}

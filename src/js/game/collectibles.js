import { SPAWN, PRODUCTS, RUN, BRAND } from '../config.js';
import { rand, pick, hits } from '../util.js';
import { drawProduct } from './art.js';

/* Produtos Palma ao longo do percurso.
   Enquanto nao houver a arte oficial da embalagem na pasta, o item usa o
   desenho placeholder de art.js (formas da marca + icone oficial).
   Basta preencher PRODUCTS.images para trocar por fotos reais. */

export class Collectibles {
  constructor() {
    this.images = PRODUCTS.images.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
    this.reset();
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
  }

  update(dt, speed, v, obstacles) {
    this.t += dt;
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
    const size = v.u * (queijo ? 0.6 : 0.52);
    const arc = !queijo && Math.random() < SPAWN.arcChance;
    const spread = v.u * 0.7;
    const x = this.#slot(v, obstacles, speed, arc ? spread : size * 0.5);

    if (x !== null) {
      if (queijo) this.primeiroQueijo = false;
      const high = v.groundY - v.u * rand(1.55, 2.05);
      const low = v.groundY - v.u * 0.62;
      const kind = queijo ? 'queijo' : pick(PRODUCTS.placeholderShapes);
      const valor = queijo ? RUN.queijoValor : RUN.milkPerItem;

      if (arc) {
        for (let i = -1; i <= 1; i++) {
          this.list.push({
            x: x + i * spread,
            y: high + Math.abs(i) * v.u * 0.30,
            size, kind, valor, taken: false,
          });
        }
      } else {
        this.list.push({
          x,
          y: queijo || Math.random() < 0.55 ? high : low,
          size, kind, valor, taken: false,
        });
      }
    }

    // quando nao coube, tenta de novo logo adiante em vez de perder a vez
    this.nextAt = this.travel + speed *
      (x === null ? 0.7 : rand(SPAWN.itemGap[0], SPAWN.itemGap[1]));
  }

  /* devolve quantos litros foram coletados neste quadro */
  collect(cowBox) {
    let milk = 0;
    for (const it of this.list) {
      if (it.taken) continue;
      const r = it.size * 0.42;
      if (hits(cowBox, { x: it.x - r, y: it.y - r, w: r * 2, h: r * 2 })) {
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
      if (this.images.length) {
        const img = this.images[0];
        if (img.complete && img.naturalWidth) {
          const h = it.size * 1.15;
          const w = (img.naturalWidth / img.naturalHeight) * h;
          ctx.drawImage(img, it.x - w / 2, it.y - h / 2, w, h);
          continue;
        }
      }
      drawProduct(ctx, brand, it.kind, it.x, it.y, it.size, this.t + it.x * 0.01);
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

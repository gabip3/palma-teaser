/* Cenario continuo: fazenda -> campo/estrada -> cidade -> casa.
   Nao ha troca de fase: cada camada sorteia o proximo elemento com o peso
   do trecho atual, entao o ambiente muda gradualmente enquanto se corre. */

import { BRAND, JOURNEY } from '../config.js';
import { rand, pick, seeded } from '../util.js';
import { drawFarChunk, drawProp, drawGrassClump } from './art.js';
import { drawFitted } from '../assets.js';

const PROPS = {
  fazenda: ['celeiro', 'silo', 'catavento', 'arvore', 'moita', 'celeiro', 'arvore'],
  campo: ['arvore', 'poste', 'placa', 'moita', 'poste', 'placa', 'arvore'],
  cidade: ['predio', 'predio2', 'lampada', 'predio', 'predio2'],
  casa: ['casa', 'casa2', 'correio', 'arvore', 'casa', 'lampada'],
};

/* Quanto o capim rareia em cada trecho: fazenda e campo sao pasto, a cidade
   e quase so calcada. */
const GRASS_GAP = { fazenda: 1, campo: 1.15, cidade: 3.4, casa: 1.7 };

const PARALLAX = { sun: 0.05, cloud: 0.12, far: 0.22, mid: 0.55 };

/* Posicao no percurso: qual cena, qual a proxima e o quanto ja cruzou. */
export function sceneAt(meters) {
  const { cycle, scenes, blend } = JOURNEY;
  const p = ((meters % cycle) + cycle) % cycle / cycle;   // 0..1
  const seg = 1 / scenes.length;
  const i = Math.min(scenes.length - 1, Math.floor(p / seg));
  const local = (p - i * seg) / seg;                      // 0..1 dentro do trecho
  const mix = local > 1 - blend ? (local - (1 - blend)) / blend : 0;
  return { name: scenes[i], next: scenes[(i + 1) % scenes.length], mix, index: i, local };
}

export class World {
  constructor(brand) {
    this.brand = brand;
    this.rndSeed = 1;
    this.reset();
  }

  reset() {
    this.clouds = [];
    this.far = [];
    this.mid = [];
    this.grass = [];
    this.sunX = null;
    this.t = 0;
  }

  /** @param {object} v viewport: {w, h, groundY, u, band} */
  update(dt, speed, meters, v) {
    this.t += dt;
    const move = speed * dt;

    if (this.sunX === null) this.sunX = v.w * 0.78;
    this.sunX -= move * PARALLAX.sun;
    if (this.sunX < -v.h) this.sunX = v.w + v.h * 0.6;

    this.#advance(this.clouds, move * PARALLAX.cloud);
    this.#advance(this.far, move * PARALLAX.far);
    this.#advance(this.mid, move * PARALLAX.mid);
    this.#advance(this.grass, move);

    this.#fillClouds(v);
    this.#fillFar(meters, v);
    this.#fillMid(meters, v);
    this.#fillGrass(meters, v);
  }

  #advance(list, dx) {
    for (const it of list) it.x -= dx;
    while (list.length && list[0].x + list[0].w < -40) list.shift();
  }

  #edge(list, fallback) {
    return list.length ? list[list.length - 1].x + list[list.length - 1].w : fallback;
  }

  /* sorteia a cena com o peso do trecho atual (transicao gradual) */
  #sceneRoll(meters) {
    const s = sceneAt(meters);
    return Math.random() < s.mix ? s.next : s.name;
  }

  /* As proprias manchas do pattern viram nuvens: o ceu alto do celular
     ganha atmosfera sem sair do repertorio grafico da marca. */
  #fillClouds(v) {
    let x = this.#edge(this.clouds, -1);
    while (x < v.w * 1.4) {
      const w = v.u * rand(1.5, 3.1);
      this.clouds.push({
        x, w,
        h: w * rand(0.32, 0.5),
        y: rand(0.06, 0.72),
        i: pick(this.brand.inteiras),
      });
      x += w * rand(0.75, 2.1);
    }
  }

  #fillFar(meters, v) {
    let x = this.#edge(this.far, -1);
    while (x < v.w * 1.4) {
      const w = v.w * 0.55 + Math.random() * v.w * 0.25;
      this.far.push({
        x, w,
        h: v.playH * (0.16 + Math.random() * 0.12),
        scene: this.#sceneRoll(meters),
        seed: (this.rndSeed = (this.rndSeed * 16807) % 2147483647),
      });
      x += w;
    }
  }

  #fillMid(meters, v) {
    let x = this.#edge(this.mid, -1);
    while (x < v.w * 1.35) {
      const kind = pick(PROPS[this.#sceneRoll(meters)]);
      const size = v.u * rand(0.85, 1.35) * (kind === 'moita' ? 0.55 : 1);
      this.mid.push({ x, w: size * 1.3, kind, size });
      x += size * rand(1.6, 3.8);
    }
  }

  #fillGrass(meters, v) {
    const gap = GRASS_GAP[this.#sceneRoll(meters)];
    let x = this.#edge(this.grass, -1);
    while (x < v.w * 1.3) {
      const n = 3 + ((Math.random() * 4) | 0);
      const step = v.u * rand(0.05, 0.085);
      const clump = {
        x, n, step,
        w: step * n,
        h: v.u * rand(0.17, 0.31),
        seed: (this.rndSeed = (this.rndSeed * 16807) % 2147483647),
      };
      this.grass.push(clump);
      x += clump.w + v.u * rand(0.05, 0.3) * gap;
    }
  }

  draw(ctx, v) {
    // sol / disco grafico
    ctx.fillStyle = BRAND.sun;
    ctx.beginPath();
    ctx.arc(this.sunX, v.groundY - v.playH * 0.74, v.playH * 0.13, 0, Math.PI * 2);
    ctx.fill();

    for (const c of this.clouds) {
      drawFitted(ctx, this.brand.manchas[c.i], c.x, v.playH * c.y - c.h / 2,
        c.w, c.h, { color: BRAND.cloud });
    }

    for (const c of this.far) {
      drawFarChunk(ctx, c.scene, c.x, v.groundY, c.w, c.h, seeded(c.seed));
    }
    for (const p of this.mid) {
      drawProp(ctx, p.kind, p.x, v.groundY, p.size, this.t);
    }

    this.#drawGround(ctx, v);
  }

  #drawGround(ctx, v) {
    // faixa de pasto, lisa: as manchas ficam por conta da vaca e da composicao
    ctx.fillStyle = BRAND.ground;
    ctx.fillRect(0, v.groundY, v.w, v.h - v.groundY);

    ctx.fillStyle = BRAND.grass;
    for (const c of this.grass) drawGrassClump(ctx, c, v.groundY, seeded(c.seed));
  }
}

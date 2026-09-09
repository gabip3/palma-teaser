import { SPAWN } from '../config.js';
import { rand, pick, clamp, lerp } from '../util.js';
import { OBSTACLES, drawObstacle } from './art.js';

// so o obstaculo mais baixo forma par: o vao precisa caber num pulo so
const PAIRABLE = ['balde'];

export class Obstacles {
  constructor() { this.reset(); }

  reset() {
    this.list = [];
    this.nextAt = 0;   // em px de mundo percorrido
    this.travel = 0;
    this.vaoPedido = 0;
  }

  /* Reserva um intervalo maior antes do proximo obstaculo. Quem pede e o
     spawner de produtos, quando a pista fecha e nao sobra folga para coletavel
     nenhum. Vale para um intervalo so. */
  pedirVao(segundos) { this.vaoPedido = Math.max(this.vaoPedido, segundos); }

  /* dificuldade 0..1 pelo trecho ja percorrido */
  #difficulty(meters) {
    return clamp(meters / SPAWN.gapTightenOverMeters, 0, 1);
  }

  update(dt, speed, meters, v) {
    const move = speed * dt;
    this.travel += move;

    for (const o of this.list) o.x -= move;
    while (this.list.length && this.list[0].x + this.list[0].w < -v.u) this.list.shift();

    if (this.travel >= this.nextAt) this.#spawn(speed, meters, v);
  }

  #spawn(speed, meters, v) {
    const d = this.#difficulty(meters);
    const vao = this.vaoPedido;
    this.vaoPedido = 0;
    const available = Object.keys(OBSTACLES).filter((k) => meters >= OBSTACLES[k].from);
    const kind = pick(available);
    const spec = OBSTACLES[kind];
    const k = v.u / 100;

    const x = v.w + v.u * 0.6;
    this.list.push({ kind, x, w: spec.w * k, h: spec.h * k });

    // par de obstaculos baixos: ainda transponivel com um pulo so.
    // o par ocupa pista: fica de fora quando o vao seguinte foi reservado.
    if (!vao && PAIRABLE.includes(kind) && Math.random() < SPAWN.pairChanceMax * d) {
      this.list.push({ kind, x: x + spec.w * k * 1.22, w: spec.w * k, h: spec.h * k });
    }

    const lo = lerp(SPAWN.obstacleGapStart[0], SPAWN.obstacleGapEnd[0], d);
    const hi = lerp(SPAWN.obstacleGapStart[1], SPAWN.obstacleGapEnd[1], d);
    this.nextAt = this.travel + speed * Math.max(vao, rand(lo, hi));
  }

  /* caixa de colisao levemente menor que o desenho: perdoa o quase-acerto */
  boxes(v) {
    return this.list.map((o) => ({
      x: o.x - o.w * 0.40,
      y: v.groundY - o.h * 0.90,
      w: o.w * 0.80,
      h: o.h * 0.90,
    }));
  }

  draw(ctx, v) {
    for (const o of this.list) drawObstacle(ctx, o.kind, o.x, v.groundY, v.u);
  }
}

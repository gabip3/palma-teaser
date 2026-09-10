import { BRAND, LAYOUT, PHYSICS, RUN, MILESTONES } from '../config.js';
import { clamp, lerp, smooth, hits, num } from '../util.js';
import { loadBrandGeometry } from '../assets.js';
import * as store from '../storage.js';
import { sfx, unlock } from '../audio.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Obstacles } from './obstacles.js';
import { Collectibles } from './collectibles.js';
import { Hud } from './hud.js';
import { Input } from './input.js';
import { drawCow } from './art.js';

const LAUNCH = 0.95;   // segundos de aceleracao ao sair da abertura
const CRASH = 0.42;    // beat antes da tela de fim

export class Game {
  constructor(els) {
    this.els = els;
    this.canvas = els.canvas;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.state = 'attract';
    this.v = { w: 0, h: 0, u: 0, groundY: 0, playH: 0, band: 0, cowX: 0 };

    this.player = new Player();
    this.obstacles = new Obstacles();
    this.items = new Collectibles();
    this.hud = new Hud();

    this.dist = 0;
    this.milk = 0;
    this.launch = 0;
    this.crashT = 0;
    this.fired = new Set();
    this.msTimer = 0;

    this.input = new Input(els.stage, {
      onPress: () => this.press(),
      isActive: () => this.state === 'playing' || this.state === 'launching',
    });

    /* ResizeObserver no palco em vez de window.resize: pega o caso em que o
       primeiro quadro mede zero e tambem o giro do aparelho. */
    this.ro = new ResizeObserver(([entry]) => this.resize(entry.contentRect));
    this.ro.observe(els.stage);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.last = performance.now();
    });
  }

  async boot() {
    this.brand = await loadBrandGeometry();
    this.world = new World(this.brand);
    this.resize();
    this.hud.set(0, 0, store.get('bestMilk'));
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    return this.brand;
  }

  /* ————— medidas ————— */

  resize(box) {
    const r = box ?? this.els.stage.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    // medida zero acontece no primeiro quadro de alguns contextos: ignorar,
    // em vez de fixar o mundo num canvas de 1x1
    if (w < 2 || h < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, LAYOUT.maxDpr);

    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const v = this.v;
    v.w = w; v.h = h;
    v.u = clamp(
      Math.min(w * LAYOUT.cowWidthFactor, h * LAYOUT.cowMaxOfHeight),
      LAYOUT.cowMin, LAYOUT.cowMax,
    );
    this.player.tune(v.u);
    this.applyCamera();
  }

  applyCamera() {
    const v = this.v;
    v.groundY = Math.round(v.h * LAYOUT.groundRatio);
    v.playH = v.groundY;
    v.band = v.h - v.groundY;
    const estreito = v.w < 760;
    v.cowX = Math.round(v.w * (estreito ? LAYOUT.cowXRatioNarrow : LAYOUT.cowXRatio));
  }

  get speed() {
    const base = this.v.u * RUN.speedInCows;
    const ramp = Math.min(RUN.speedMax, 1 + this.dist * RUN.speedPerMeter);
    const ease = this.state === 'launching' ? lerp(0.45, 1, smooth(this.launch / LAUNCH)) : 1;
    return base * ramp * ease;
  }

  get ppm() { return this.v.u * RUN.pixelsPerMeter; }

  /* ————— fluxo ————— */

  press() {
    this.player.requestJump();
    if (!this.player.airborne) sfx.jump();
    this.hidePlayHint();
  }

  /* A instrucao some no primeiro pulo, ou sozinha depois de alguns segundos. */
  showPlayHint() {
    this.els.playhint.classList.add('is-on');
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.hidePlayHint(), 7000);
  }

  hidePlayHint() {
    clearTimeout(this.hintTimer);
    this.els.playhint.classList.remove('is-on');
  }

  start() {
    unlock();
    this.player.tune(this.v.u);   // seguro: pulo nunca comeca sem calibrar
    this.dist = 0;
    this.milk = 0;
    this.launch = 0;
    this.fired.clear();
    this.player.reset();
    this.obstacles.reset();
    this.items.reset();
    this.world.reset();   // cada partida recomeca na fazenda
    this.hud.reset();
    this.hideMilestone();
    this.state = 'launching';
    this.showPlayHint();
    this.obstacles.nextAt = this.v.w * 0.4;
    this.items.nextAt = this.v.w * 0.9;
    this.hud.set(0, 0, store.get('bestMilk'));
  }

  /* reinicio instantaneo: nada de recarregar cena */
  restart() {
    this.start();
    this.launch = LAUNCH;
    this.state = 'playing';
    this.applyCamera();
  }

  toAttract() {
    // Saindo no meio da corrida (pela logo), o que ela ja fez conta para o
    // recorde. submit guarda sempre o maior valor, entao repetir depois do fim
    // de jogo e inofensivo.
    if (this.state !== 'attract') store.submit(this.milk, Math.floor(this.dist));
    this.hidePlayHint();
    this.state = 'attract';
    this.dist = 0;
    this.launch = 0;
    this.player.reset();
    this.obstacles.reset();
    this.items.reset();
    this.hideMilestone();
    this.applyCamera();
  }

  crash() {
    this.hidePlayHint();
    this.state = 'crash';
    this.crashT = 0;
    sfx.hit();
  }

  /* ————— marcos da marca ————— */

  checkMilestones(dt) {
    for (const m of MILESTONES) {
      if (this.dist >= m.at && !this.fired.has(m.at)) {
        this.fired.add(m.at);
        this.showMilestone(m);
      }
    }
    if (this.msTimer > 0) {
      this.msTimer -= dt * 1000;
      if (this.msTimer <= 0) this.hideMilestone();
    }
  }

  showMilestone(m) {
    const { milestone, msTop, msBottom } = this.els;
    msTop.textContent = m.top.text;
    msTop.className = `milestone__top ${m.top.face}`;
    msBottom.textContent = m.bottom.text;
    msBottom.className = `milestone__bottom ${m.bottom.face}`;
    milestone.classList.add('is-on');
    this.msTimer = m.hold;
    // a mensagem da marca tambem chega a quem usa leitor de tela
    this.els.live.textContent = `${m.top.text} ${m.bottom.text}`;
    sfx.milestone();
  }

  hideMilestone() {
    this.els.milestone.classList.remove('is-on');
    this.msTimer = 0;
  }

  /* ————— laco ————— */

  frame = (now) => {
    this.raf = requestAnimationFrame(this.frame);
    if (document.hidden) { this.last = now; return; }

    let dt = (now - this.last) / 1000;
    this.last = now;
    dt = Math.min(dt, PHYSICS.maxStep);   // aba voltou do background / quadro longo

    if (this.state === 'attract') return;   // canvas escondido: nada a simular
    this.update(dt);
    this.draw();
  };

  update(dt) {
    const v = this.v;
    const playing = this.state === 'playing' || this.state === 'launching';

    if (this.state === 'launching') {
      this.launch += dt;
      this.applyCamera();
      if (this.launch >= LAUNCH) { this.launch = LAUNCH; this.state = 'playing'; }
    }

    if (this.state === 'crash') {
      this.crashT += dt;
      if (this.crashT >= CRASH) this.onGameOver();
      return;
    }
    if (this.state === 'over') return;

    const speed = this.speed;
    this.world.update(dt, speed, this.dist, v);
    this.player.update(dt, speed, v.u);

    if (!playing) return;

    this.dist += (speed * dt) / this.ppm;
    this.obstacles.update(dt, speed, this.dist, v);
    this.items.update(dt, speed, v, this.obstacles);

    const box = this.player.hitbox(v.cowX, v.groundY, v.u);

    const milk = this.items.collect(box);
    if (milk) { this.milk += milk; sfx.collect(); }

    for (const o of this.obstacles.boxes(v)) {
      if (hits(box, o)) { this.crash(); return; }
    }

    this.hud.set(this.dist, this.milk, store.get('bestMilk'));
    this.checkMilestones(dt);
  }

  draw() {
    const { ctx, v } = this;
    ctx.fillStyle = BRAND.paper;
    ctx.fillRect(0, 0, v.w, v.h);

    this.world.draw(ctx, v);
    this.obstacles.draw(ctx, v);
    this.items.draw(ctx, this.brand, v);

    // tombo: a vaca gira onde bateu, nao no chao
    if (this.state === 'crash' || this.state === 'over') {
      const k = smooth(this.crashT / CRASH);
      const feet = v.groundY - this.player.y;
      ctx.save();
      ctx.translate(v.cowX, feet);
      ctx.rotate(-0.36 * k);
      ctx.translate(-v.cowX, -feet);
      drawCow(ctx, this.brand, v.cowX, feet, v.u,
        { run: this.player.run, airborne: false, squash: 0 });
      ctx.restore();
    } else {
      // as patas seguem a altura do pulo: o desenho tem que usar o mesmo y que
      // a fisica e a colisao usam, senao a vaca corre colada no chao
      drawCow(ctx, this.brand, v.cowX, v.groundY - this.player.y, v.u, this.player);
    }
  }

  onGameOver() {
    this.state = 'over';
    const dist = Math.floor(this.dist);
    const record = store.submit(this.milk, dist);
    const best = store.get('bestMilk');

    const e = this.els;
    e.oDist.textContent = `${num(dist)} m`;
    e.oMilk.textContent = `${num(this.milk)} L`;
    e.oBest.textContent = `${num(best)} L`;
    e.overBadge.hidden = !record;
    e.over.hidden = false;
    void e.over.offsetHeight;   // forca o layout: sem isso a transicao nao roda
    e.stage.dataset.state = 'over';
    this.hideMilestone();

    e.live.textContent =
      `Fim de jogo. A vaquinha Palmira percorreu ${num(dist)} metros e coletou ${num(this.milk)} litros.` +
      (record ? ' Novo recorde!' : ` Recorde: ${num(best)} litros.`);

    /* Focar o botao ajuda quem joga no teclado, mas para quem usa mouse ou
       toque o navegador desenha o anel de foco azul em volta do botao preto,
       que fica feio e nao serve para nada. */
    if (this.input.ultimoFoiTeclado) e.again.focus({ preventScroll: true });
  }
}

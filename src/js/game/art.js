/* Vocabulario grafico do jogo.
   Tudo e desenhado em "cu" (cow units): 100 cu = altura da vaca.
   Assim personagem, obstaculos e cenario escalam juntos em qualquer tela. */

import { BRAND } from '../config.js';
import { drawFitted } from '../assets.js';

/* ————————————————— PERSONAGEM ————————————————— */

const bodyPath = (() => {
  const p = new Path2D();
  p.moveTo(-54, -50);
  p.bezierCurveTo(-53, -66, -30, -71, -4, -70);
  p.bezierCurveTo(14, -69, 27, -62, 29, -50);
  p.bezierCurveTo(31, -40, 26, -31, 12, -29);
  p.bezierCurveTo(-10, -26, -36, -27, -46, -31);
  p.bezierCurveTo(-54, -35, -55, -42, -54, -50);
  p.closePath();
  return p;
})();

const HIPS = [
  { x: -38, back: true }, { x: -29, back: true },
  { x: 8, back: false }, { x: 17, back: false },
];

function drawLeg(ctx, hipX, hipY, len, angle, lift) {
  const kx = hipX + Math.sin(angle) * len * 0.52;
  const ky = hipY + Math.cos(angle) * len * 0.52;
  const fx = kx + Math.sin(angle * 0.35) * len * 0.48;
  const fy = ky + Math.cos(angle * 0.35) * len * 0.48 - lift;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kx, ky);
  ctx.lineTo(fx, fy);
  ctx.stroke();
}

/**
 * @param {object} s  estado: run (fase 0..1), airborne, vy, squash (0..1)
 */
export function drawCow(ctx, brand, x, groundY, u, s) {
  const k = u / 100;
  const phase = s.run * Math.PI * 2;
  const bob = s.airborne ? 0 : -Math.abs(Math.sin(phase * 2)) * 2.2;

  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(k, k);

  // agachada rapida ao aterrissar
  if (s.squash > 0) {
    ctx.translate(0, 0);
    ctx.scale(1 + s.squash * 0.1, 1 - s.squash * 0.14);
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ————— patas —————
  ctx.strokeStyle = BRAND.ink;
  ctx.lineWidth = 8.5;
  for (const hip of HIPS) {
    let angle, lift;
    if (s.airborne) {
      // no ar: dianteiras a frente, traseiras recolhidas
      angle = hip.back ? -0.85 : 0.75;
      lift = hip.back ? 7 : 10;
    } else {
      const off = hip.back ? 0 : Math.PI;
      angle = Math.sin(phase + off) * 0.62;
      lift = Math.max(0, Math.sin(phase + off + 1.1)) * 11;
    }
    drawLeg(ctx, hip.x, -32 + bob, 32, angle, lift);
  }

  // ————— rabo —————
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-52, -60 + bob);
  ctx.quadraticCurveTo(-70, -58 + bob, -66, -38 + bob + Math.sin(phase) * 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-66, -33 + bob + Math.sin(phase) * 3, 5, 0, Math.PI * 2);
  ctx.fillStyle = BRAND.ink;
  ctx.fill();

  // ————— ubere —————
  // desenhado antes do corpo: o corpo cobre a parte de cima e sobra so a
  // silhueta abaixo da barriga
  ctx.save();
  ctx.translate(0, bob);
  ctx.fillStyle = BRAND.paper;
  ctx.strokeStyle = BRAND.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(-19, -25, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-25, -17); ctx.lineTo(-26, -12);
  ctx.moveTo(-14, -17); ctx.lineTo(-13, -12);
  ctx.stroke();
  ctx.restore();

  // ————— corpo —————
  ctx.save();
  ctx.translate(0, bob);
  ctx.fillStyle = BRAND.paper;
  ctx.fill(bodyPath);

  // manchas oficiais do pattern, recortadas dentro do corpo
  ctx.save();
  ctx.clip(bodyPath);
  const spots = brand.manchas;
  drawFitted(ctx, spots[0], -44, -66, 34, 26, { color: BRAND.ink });
  drawFitted(ctx, spots[3], -2, -54, 26, 17, { color: BRAND.ink });
  ctx.restore();

  ctx.strokeStyle = BRAND.ink;
  ctx.lineWidth = 4.5;
  ctx.stroke(bodyPath);
  ctx.restore();

  /* ————— cabeca: icone oficial da marca —————
     Sprite pronto: a arte e a do icone, sem nada engrossado, com o rosto e o
     miolo das orelhas pintados de branco. Ver buildHeadSprite em assets.js. */
  const headW = 66, headH = headW / 1.446;
  const tilt = s.airborne ? -0.1 : Math.sin(phase * 2) * 0.035;
  ctx.save();
  ctx.translate(26, -76 + bob);
  ctx.rotate(tilt);
  ctx.drawImage(brand.headSprite, -headW / 2, -headH / 2, headW, headH);
  ctx.restore();

  ctx.restore();
}

export const COW_HITBOX = { x: -34, y: -86, w: 64, h: 84 };

/* ————————————————— OBSTACULOS ————————————————— */

/* Cada obstaculo: [largura, altura] em cu, e o desenho ancorado no chao. */
export const OBSTACLES = {
  balde: { w: 52, h: 50, from: 0 },
  caixa: { w: 60, h: 58, from: 0 },
  fardo: { w: 94, h: 54, from: 0 },
  cerca: { w: 104, h: 60, from: 120 },
  latao: { w: 46, h: 92, from: 220 },
  trator: { w: 98, h: 74, from: 380 },
};

const R = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

export function drawObstacle(ctx, kind, x, groundY, u) {
  const k = u / 100;
  const o = OBSTACLES[kind];
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(k, k);
  ctx.fillStyle = BRAND.ink;
  ctx.strokeStyle = BRAND.paper;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = o.w, h = o.h;

  if (kind === 'fardo') {
    /* Fardo largo e baixo, com topo irregular de palha.
       A silhueta deitada separa ele da caixa, que e quadrada, mesmo a 40 px. */
    const corpo = h - 5;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2, -corpo + 3);
    const lombos = 5, seg = w / lombos;
    for (let i = 0; i < lombos; i++) {
      const x0 = -w / 2 + seg * i;
      ctx.quadraticCurveTo(x0 + seg * 0.5, -h, x0 + seg, -corpo + 3);
    }
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();

    /* Fibras horizontais claras. Cinta vertical foi testada e reprovada: em
       tamanho de jogo ela partia o fardo em blocos separados. */
    ctx.strokeStyle = BRAND.paper;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [ax, ay, len] of [
      [-w * 0.30, -corpo * 0.72, 9], [w * 0.24, -corpo * 0.60, 7],
      [-w * 0.06, -corpo * 0.45, 10], [w * 0.34, -corpo * 0.30, 6],
      [-w * 0.34, -corpo * 0.26, 8], [w * 0.02, -corpo * 0.14, 7],
    ]) {
      ctx.moveTo(ax - len, ay);
      ctx.lineTo(ax + len, ay);
    }
    ctx.stroke();
  } else if (kind === 'caixa') {
    R(ctx, -w / 2, -h, w, h, 5);
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 8, -h + 8); ctx.lineTo(w / 2 - 8, -8);
    ctx.moveTo(w / 2 - 8, -h + 8); ctx.lineTo(-w / 2 + 8, -8);
    ctx.moveTo(-w / 2 + 4, -h + 15); ctx.lineTo(w / 2 - 4, -h + 15);
    ctx.stroke();
  } else if (kind === 'balde') {
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h + 6);
    ctx.lineTo(w / 2, -h + 6);
    ctx.lineTo(w / 2 - 9, 0);
    ctx.lineTo(-w / 2 + 9, 0);
    ctx.closePath();
    ctx.fill();
    R(ctx, -w / 2 - 3, -h, w + 6, 9, 4);
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(0, -h + 4, w * 0.42, Math.PI * 1.08, Math.PI * 1.92);
    ctx.strokeStyle = BRAND.ink;
    ctx.stroke();
    // faixa clara: separa o corpo do balde da faixa preta do chao
    ctx.strokeStyle = BRAND.paper;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, -h + 18); ctx.lineTo(w / 2 - 4, -h + 18);
    ctx.stroke();
  } else if (kind === 'cerca') {
    ctx.lineWidth = 0;
    for (const px of [-w / 2 + 6, 0, w / 2 - 6]) {
      ctx.beginPath();
      ctx.moveTo(px - 6, 0); ctx.lineTo(px - 6, -h + 10);
      ctx.lineTo(px, -h); ctx.lineTo(px + 6, -h + 10); ctx.lineTo(px + 6, 0);
      ctx.closePath(); ctx.fill();
    }
    R(ctx, -w / 2, -h + 18, w, 10, 3); ctx.fill();
    R(ctx, -w / 2, -h + 38, w, 10, 3); ctx.fill();
  } else if (kind === 'latao') {
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2, -h * 0.62);
    ctx.quadraticCurveTo(-w / 2, -h * 0.8, -w * 0.22, -h * 0.86);
    ctx.lineTo(-w * 0.22, -h);
    ctx.lineTo(w * 0.22, -h);
    ctx.lineTo(w * 0.22, -h * 0.86);
    ctx.quadraticCurveTo(w / 2, -h * 0.8, w / 2, -h * 0.62);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();
    R(ctx, -w * 0.34, -h - 7, w * 0.68, 9, 4); ctx.fill();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -h * 0.42); ctx.lineTo(w * 0.34, -h * 0.42);
    ctx.moveTo(-w * 0.34, -h * 0.26); ctx.lineTo(w * 0.34, -h * 0.26);
    ctx.stroke();
  } else if (kind === 'trator') {
    /* Silhueta classica: roda grande atras com a cabine em cima, capo baixo na
       frente. A roda traseira antiga tinha raio 30 num corpo de 74 de altura e
       cobria a propria cabine, entao o trator virava um borrao preto com dois
       pontos brancos. Aqui as pecas nao se comem, e as rodas levam anel claro:
       sem essa separacao nada se le em tamanho de jogo. */
    R(ctx, -w / 2 + 13, -h, 42, 34, 6); ctx.fill();        // cabine
    R(ctx, -w / 2 + 15, -30, 74, 10, 3); ctx.fill();       // chassi
    R(ctx, w / 2 - 41, -42, 34, 14, 4); ctx.fill();        // capo
    R(ctx, w / 2 - 39, -58, 6, 18, 3); ctx.fill();         // escapamento

    ctx.fillStyle = BRAND.paper;
    R(ctx, -w / 2 + 19, -68, 30, 20, 3); ctx.fill();       // vidro da cabine

    // rodas recortadas na linha do chao, para o anel claro nao pingar no pasto
    ctx.save();
    ctx.beginPath(); ctx.rect(-w, -h - 24, w * 2, h + 24); ctx.clip();
    for (const [cx, cy, r] of [[-w / 2 + 25, -22, 22], [w / 2 - 19, -13, 13]]) {
      ctx.fillStyle = BRAND.paper;
      ctx.beginPath(); ctx.arc(cx, cy, r + 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = BRAND.ink;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = BRAND.paper;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = BRAND.ink;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

/* ————————————————— COLETAVEL (PLACEHOLDER) —————————————————
   Sem embalagem oficial na pasta: forma abstrata da marca, sem nome de produto. */

export function drawProduct(ctx, brand, kind, x, y, size, t) {
  const k = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 2.2) * 0.06);
  ctx.scale(k, k);
  ctx.lineJoin = 'round';

  if (kind === 'queijo') {
    /* Queijo Divino: peca redonda, papel creme com manchas de vaca em caramelo
       e o selo dourado no centro, como na embalagem real. */
    ctx.fillStyle = BRAND.queijoCreme;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.clip();
    const m = brand.manchas;
    drawFitted(ctx, m[2], -50, -46, 30, 26, { color: BRAND.queijoMancha });
    drawFitted(ctx, m[5], 22, -40, 28, 24, { color: BRAND.queijoMancha });
    drawFitted(ctx, m[10], -34, 20, 32, 22, { color: BRAND.queijoMancha });
    ctx.restore();

    // contorno: sem ele o creme some contra o ceu branco
    ctx.strokeStyle = BRAND.queijoDourado;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = BRAND.queijoDourado;
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.fill();
    drawFitted(ctx, brand.icon, -22, -12, 44, 24, {
      color: BRAND.queijoCreme, grow: 1.4,
    });
  } else if (kind === 'garrafa') {
    ctx.fillStyle = BRAND.blue;
    ctx.beginPath();
    ctx.moveTo(-26, 46);
    ctx.lineTo(-26, -8);
    ctx.quadraticCurveTo(-26, -22, -12, -30);
    ctx.lineTo(-12, -46);
    ctx.lineTo(12, -46);
    ctx.lineTo(12, -30);
    ctx.quadraticCurveTo(26, -22, 26, -8);
    ctx.lineTo(26, 46);
    ctx.quadraticCurveTo(26, 54, 18, 54);
    ctx.lineTo(-18, 54);
    ctx.quadraticCurveTo(-26, 54, -26, 46);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = BRAND.paper;
    R(ctx, -15, -52, 30, 10, 3); ctx.fill();
    R(ctx, -26, 6, 52, 26, 2); ctx.fill();
    drawFitted(ctx, brand.icon, -20, 8, 40, 22, { color: BRAND.blue, grow: 1.4 });
  } else {
    ctx.fillStyle = BRAND.blue;
    ctx.beginPath();
    ctx.moveTo(-28, 52);
    ctx.lineTo(-28, -26);
    ctx.lineTo(0, -50);
    ctx.lineTo(28, -26);
    ctx.lineTo(28, 52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = BRAND.paper;
    R(ctx, -28, 2, 56, 28, 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-14, -37); ctx.lineTo(0, -48); ctx.lineTo(14, -37);
    ctx.lineTo(14, -31); ctx.lineTo(-14, -31); ctx.closePath();
    ctx.fill();
    drawFitted(ctx, brand.icon, -22, 4, 44, 24, { color: BRAND.blue, grow: 1.4 });
  }
  ctx.restore();
}

/* ————————————————— CENARIO ————————————————— */

/* Capim na linha do chao: tufos de folhas na mesma tinta da faixa, para a
   vaca correr sobre gramado em vez de sobre uma barra lisa. */
export function drawGrassClump(ctx, clump, groundY, rnd) {
  const n = clump.n;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const bx = clump.x + (i - (n - 1) / 2) * clump.step;
    const bh = clump.h * (0.5 + rnd() * 0.5);
    const lean = (rnd() - 0.5) * 1.05;
    const bw = clump.step * 0.68;
    ctx.moveTo(bx - bw / 2, groundY + 2);
    ctx.quadraticCurveTo(
      bx - bw * 0.1 + lean * bh * 0.3, groundY - bh * 0.62,
      bx + lean * bh, groundY - bh,
    );
    ctx.quadraticCurveTo(
      bx + bw * 0.4 + lean * bh * 0.34, groundY - bh * 0.55,
      bx + bw / 2, groundY + 2,
    );
  }
  ctx.fill();
}

/* Silhuetas do fundo distante: blocos largos que se sucedem sem emenda. */
export function drawFarChunk(ctx, scene, x, baseY, w, h, rnd) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.fillStyle = BRAND.far;
  ctx.beginPath();

  if (scene === 'fazenda') {
    // colinas: mamilos largos e macios, nada de picos de montanha
    const mounds = 3 + ((rnd() * 2) | 0);
    const mw = w / mounds;
    const valley = -h * 0.14;
    ctx.moveTo(0, 0);
    ctx.lineTo(0, valley);
    for (let i = 0; i < mounds; i++) {
      const px = mw * i;
      const mh = -h * (0.55 + rnd() * 0.45);
      ctx.bezierCurveTo(px + mw * 0.2, mh, px + mw * 0.8, mh, px + mw, valley);
    }
    ctx.lineTo(w, 0);
  } else if (scene === 'campo') {
    // linha de arvores baixa
    const base = -h * 0.14;
    ctx.moveTo(0, 0);
    ctx.lineTo(0, base);
    let px = 0;
    while (px < w) {
      const r = h * (0.15 + rnd() * 0.2);
      ctx.lineTo(px, base);
      ctx.arc(px + r, base, r, Math.PI, 0);
      px += r * 2 + rnd() * h * 0.14;
    }
    ctx.lineTo(w, base);
    ctx.lineTo(w, 0);
  } else if (scene === 'cidade') {
    ctx.moveTo(0, 0);
    let px = 0;
    while (px < w) {
      const bw = 26 + rnd() * 54;
      const bh = h * (0.34 + rnd() * 0.66);
      ctx.lineTo(px, -bh);
      ctx.lineTo(Math.min(px + bw, w), -bh);
      px += bw + 4;
    }
    ctx.lineTo(w, 0);
  } else {
    ctx.moveTo(0, 0);
    let px = 0;
    while (px < w) {
      const bw = 40 + rnd() * 40;
      const bh = h * (0.2 + rnd() * 0.28);
      ctx.lineTo(px, -bh * 0.5);
      ctx.lineTo(px + bw * 0.5, -bh);
      ctx.lineTo(Math.min(px + bw, w), -bh * 0.5);
      px += bw;
    }
    ctx.lineTo(w, 0);
  }

  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* Props da camada intermediaria. `size` = altura em px. */
export function drawProp(ctx, kind, x, baseY, size, t) {
  const k = size / 100;
  ctx.save();
  ctx.translate(x, baseY);
  ctx.scale(k, k);
  ctx.fillStyle = BRAND.mid;
  ctx.strokeStyle = BRAND.mid;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (kind) {
    case 'celeiro':
      ctx.beginPath();
      ctx.moveTo(-60, 0); ctx.lineTo(-60, -58);
      ctx.lineTo(-34, -86); ctx.lineTo(34, -86); ctx.lineTo(60, -58);
      ctx.lineTo(60, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = BRAND.paper;
      ctx.beginPath();
      ctx.moveTo(-16, 0); ctx.lineTo(-16, -34);
      ctx.quadraticCurveTo(0, -48, 16, -34); ctx.lineTo(16, 0);
      ctx.closePath(); ctx.fill();
      break;

    case 'silo':
      ctx.beginPath();
      ctx.moveTo(-24, 0); ctx.lineTo(-24, -76);
      ctx.quadraticCurveTo(0, -104, 24, -76); ctx.lineTo(24, 0);
      ctx.closePath(); ctx.fill();
      break;

    case 'catavento': {
      // torre trapezoidal + rotor de pas: le como cata-vento mesmo em 60 px
      ctx.beginPath();
      ctx.moveTo(-13, 0); ctx.lineTo(-4, -76);
      ctx.lineTo(4, -76); ctx.lineTo(13, 0);
      ctx.closePath(); ctx.fill();
      ctx.save();
      ctx.translate(0, -80);
      ctx.rotate(t * 0.9);
      for (let i = 0; i < 6; i++) {
        ctx.rotate((Math.PI * 2) / 6);
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-6, -26); ctx.lineTo(6, -26);
        ctx.closePath(); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      break;
    }

    case 'arvore':
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -44); ctx.stroke();
      /* Cada lobo da copa e um caminho proprio. Encadeados no mesmo caminho, o
         canvas liga um ao outro com uma reta; essas retas cruzam a forma e a
         regra nonzero abre falhas dentro da copa. */
      for (const [cx, cy, rx, ry] of [
        [-24, -54, 22, 19], [25, -56, 20, 18], [0, -68, 36, 32],
      ]) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'poste':
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -96);
      ctx.moveTo(-24, -84); ctx.lineTo(24, -84);
      ctx.moveTo(-18, -70); ctx.lineTo(18, -70);
      ctx.stroke();
      break;

    case 'placa':
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -52); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(-28, -84, 56, 32, 4); ctx.fill();
      break;

    case 'predio': {
      ctx.beginPath(); ctx.roundRect(-38, -100, 76, 100, 2); ctx.fill();
      ctx.fillStyle = BRAND.paper;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.beginPath();
          ctx.rect(-26 + c * 20, -88 + r * 18, 11, 10);
          ctx.fill();
        }
      }
      break;
    }

    case 'predio2': {
      ctx.beginPath(); ctx.roundRect(-28, -74, 56, 74, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(-10, -92, 20, 22, 2); ctx.fill();
      ctx.fillStyle = BRAND.paper;
      for (let r = 0; r < 3; r++) {
        ctx.beginPath();
        ctx.rect(-18, -64 + r * 20, 36, 9);
        ctx.fill();
      }
      break;
    }

    case 'lampada':
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, -92);
      ctx.quadraticCurveTo(0, -104, 20, -104);
      ctx.stroke();
      ctx.beginPath(); ctx.roundRect(12, -104, 20, 9, 4); ctx.fill();
      break;

    case 'casa':
      ctx.beginPath();
      ctx.moveTo(-46, 0); ctx.lineTo(-46, -46);
      ctx.lineTo(0, -80); ctx.lineTo(46, -46); ctx.lineTo(46, 0);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.roundRect(20, -74, 14, 26, 2); ctx.fill();
      ctx.fillStyle = BRAND.paper;
      ctx.beginPath(); ctx.rect(-28, -36, 20, 18); ctx.fill();
      ctx.beginPath(); ctx.roundRect(6, -34, 20, 34, 2); ctx.fill();
      break;

    case 'casa2':
      ctx.beginPath();
      ctx.moveTo(-38, 0); ctx.lineTo(-38, -38);
      ctx.lineTo(-54, -38); ctx.lineTo(0, -74); ctx.lineTo(54, -38);
      ctx.lineTo(38, -38); ctx.lineTo(38, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = BRAND.paper;
      ctx.beginPath(); ctx.rect(-20, -30, 18, 16); ctx.fill();
      ctx.beginPath(); ctx.rect(6, -30, 18, 16); ctx.fill();
      break;

    case 'correio':
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -46); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-20, -46);
      ctx.quadraticCurveTo(-20, -68, 4, -68);
      ctx.lineTo(22, -68); ctx.lineTo(22, -46);
      ctx.closePath(); ctx.fill();
      break;

    case 'moita':
      // mesmo cuidado da arvore: um caminho por lobo
      for (const [cx, cy, rx, ry] of [[-12, -8, 16, 13], [10, -11, 19, 16]]) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }
  ctx.restore();
}

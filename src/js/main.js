import { Game } from './game/index.js';
import { mountDecor } from './decor.js';
import { lightUp } from './intro.js';
import * as audio from './audio.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);

const els = {
  stage: $('stage'),
  canvas: $('scene'),
  intro: $('intro'),
  decor: $('decor'),
  hud: $('hud'),
  milestone: $('milestone'),
  msTop: $('ms-top'),
  msBottom: $('ms-bottom'),
  over: $('over'),
  overBadge: $('over-badge'),
  oDist: $('o-dist'),
  oMilk: $('o-milk'),
  oBest: $('o-best'),
  play: $('play'),
  again: $('again'),
  back: $('back'),
  sound: $('sound'),
  muu: $('muu'),
  playhint: $('playhint'),
  live: $('live'),
};

const BUILD = '2026-09-09-e';
console.log('Palma teaser · build ' + BUILD);

const game = new Game(els);

// ?debug=1 expoe a instancia para ajuste fino no console durante o refino
if (new URLSearchParams(location.search).has('debug')) window.palma = game;

/* ————— abertura ————— */

lightUp(els.stage);

game.boot().then((brand) => mountDecor(els.decor, brand.manchasRaw));

/* ————— estados ————— */

function toPlaying(restart) {
  els.over.hidden = true;
  els.stage.dataset.state = 'playing';
  els.hud.setAttribute('aria-hidden', 'false');
  document.activeElement?.blur?.();
  if (restart) game.restart(); else game.start();
}

function toIntro() {
  els.stage.dataset.state = 'intro';
  els.hud.setAttribute('aria-hidden', 'true');
  game.toAttract();
  setTimeout(() => { els.over.hidden = true; }, 340);
  els.play.focus({ preventScroll: true });
}

els.play.addEventListener('click', () => toPlaying(false));
els.again.addEventListener('click', () => toPlaying(true));
els.back.addEventListener('click', toIntro);

/* ————— som ————— */

function paintSound(on) {
  els.sound.setAttribute('aria-pressed', String(on));
  els.sound.setAttribute('aria-label', on ? 'Desativar som do jogo' : 'Ativar som do jogo');
}

paintSound(audio.isOn());
els.sound.addEventListener('click', () => {
  audio.unlock();
  paintSound(audio.toggle());
});

/* ————— o MUU muge —————
   A politica de autoplay do navegador so libera audio depois de um gesto de
   verdade, e passar o mouse nao conta. Por isso destravamos no primeiro
   clique/tecla da pagina, e o proprio toque no MUU tambem serve de gesto. */

window.addEventListener('pointerdown', audio.unlock, { once: true });
window.addEventListener('keydown', audio.unlock, { once: true });

// -Infinity, nao 0: performance.now() conta desde o load, entao começar em zero
// engolia o mugido nos primeiros segundos da pagina, que e justo quando alguem
// passa o mouse pela primeira vez.
let ultimoMugido = -Infinity;
function mugir() {
  const agora = performance.now();
  if (agora - ultimoMugido < 2100) return;   // o clipe tem 2s: nao empilha
  ultimoMugido = agora;
  // tenta destravar aqui tambem: em navegadores de politica mais frouxa isso
  // ja faz o primeiro hover soar, sem precisar de clique antes
  audio.unlock();
  sfx.moo();
  els.muu.classList.remove('is-mooing');
  void els.muu.offsetWidth;
  els.muu.classList.add('is-mooing');
}

els.muu.addEventListener('pointerenter', mugir);

/* ————— higiene de toque no mobile ————— */

// bloqueia o duplo-toque que dispara zoom sobre a area de jogo
els.stage.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

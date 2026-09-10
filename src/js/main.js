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

const BUILD = '2026-09-10-a';
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

/* ————— a Palmira muge sozinha —————
   De tempos em tempos, em qualquer tela. A politica de autoplay dos
   navegadores so libera audio depois de um gesto de verdade (clique, toque ou
   tecla; mouse passando e rolagem nao contam), entao o relogio so comeca no
   primeiro gesto da pagina. Antes disso o site e mudo, e isso nao tem
   contorno legitimo. */

const MUGIDO_PRIMEIRO = 1500;              // ms depois do primeiro gesto
const MUGIDO_INTERVALO = [20000, 32000];   // ms entre um mugido e outro, sorteado

function agendarMugido(ms) { setTimeout(mugirSozinha, ms); }

function mugirSozinha() {
  const [a, b] = MUGIDO_INTERVALO;
  agendarMugido(a + Math.random() * (b - a));
  // aba escondida ou vaca no meio da batida: pula esta vez, sem acumular
  if (document.hidden || game.state === 'crash') return;
  sfx.moo().then((tocou) => {
    if (!tocou || game.state !== 'attract') return;
    // na abertura, o MUUUUITO balanca junto com o som
    els.muu.classList.remove('is-mooing');
    void els.muu.offsetWidth;
    els.muu.classList.add('is-mooing');
  });
}

let relogioLigado = false;
function primeiroGesto() {
  audio.unlock();
  if (relogioLigado) return;
  relogioLigado = true;
  agendarMugido(MUGIDO_PRIMEIRO);
}

window.addEventListener('pointerdown', primeiroGesto, { once: true });
window.addEventListener('keydown', primeiroGesto, { once: true });

/* ————— higiene de toque no mobile ————— */

// bloqueia o duplo-toque que dispara zoom sobre a area de jogo
els.stage.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

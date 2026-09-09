/* Sintese leve via WebAudio: nenhum arquivo para baixar.
   O contexto so e criado depois de um gesto do usuario. */

import * as store from './storage.js';

let ctx = null;
let master = null;
let enabled = store.get('sound') !== false;

/* O mugido vem de arquivo. Os bytes sao buscados assim que o modulo carrega
   (18 KB), mas so podem ser decodificados depois que existe um AudioContext,
   o que a politica de autoplay so permite apos um gesto do usuario. */
const MUGIDO_URL = 'assets/audio/vaca-mugindo.mp3';
const MUGIDO_GANHO = 0.9;   // vai direto na saida, fora do master dos efeitos
let mugido = null;
const mugidoBytes = fetch(MUGIDO_URL)
  .then((r) => (r.ok ? r.arrayBuffer() : null))
  .catch(() => null);

async function prepararMugido() {
  if (mugido || !ctx) return mugido;
  const bytes = await mugidoBytes;
  if (!bytes) return null;
  try {
    // decodeAudioData consome o buffer: sempre passar uma copia
    mugido = await ctx.decodeAudioData(bytes.slice(0));
  } catch {
    mugido = null;
  }
  return mugido;
}

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.16;
  master.connect(ctx.destination);
  return ctx;
}

/** Chamar apenas a partir de um gesto do usuario. */
export function unlock() {
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  prepararMugido();
}

export function isOn() { return enabled; }

export function toggle() {
  enabled = !enabled;
  store.set('sound', enabled);
  if (enabled) unlock();
  return enabled;
}

function tone({ freq, to = freq, dur = 0.12, type = 'sine', gain = 1, delay = 0 }) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  jump: () => tone({ freq: 320, to: 620, dur: 0.14, type: 'triangle', gain: 0.7 }),
  land: () => tone({ freq: 180, to: 110, dur: 0.09, type: 'sine', gain: 0.35 }),
  collect: () => {
    tone({ freq: 880, dur: 0.09, type: 'sine', gain: 0.6 });
    tone({ freq: 1320, dur: 0.11, type: 'sine', gain: 0.4, delay: 0.05 });
  },
  hit: () => {
    tone({ freq: 240, to: 70, dur: 0.34, type: 'sawtooth', gain: 0.55 });
    tone({ freq: 120, to: 55, dur: 0.4, type: 'sine', gain: 0.5, delay: 0.02 });
  },
  milestone: () => {
    [523.25, 659.25, 783.99].forEach((f, i) =>
      tone({ freq: f, dur: 0.5, type: 'sine', gain: 0.34, delay: i * 0.07 }));
  },

  /* Mugido: arquivo real da marca, tocado pelo mesmo mixer dos efeitos,
     entao o botao SOM continua valendo para ele. */
  moo: () => {
    if (!enabled) return;
    // Hover nao conta como gesto para a politica de autoplay do navegador:
    // ate o primeiro clique da pagina, o contexto fica suspenso e nao ha som.
    if (!ctx || ctx.state !== 'running' || !mugido) { prepararMugido(); return; }
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = mugido;
    g.gain.value = MUGIDO_GANHO;
    // direto no destino: o master e calibrado para bipes curtos, nao para voz
    src.connect(g).connect(ctx.destination);
    src.start();
  },
};

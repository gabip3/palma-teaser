/* Manchas de vaca ancoradas nos cantos, sangrando para fora da viewport.
   A geometria vem do "Pattern Palma.pdf" oficial, nao de formas inventadas.

   Cada item: canto de ancoragem mais deslocamento em % da viewport a partir
   dele. Valor negativo empurra a mancha para fora da tela.
   `i` = qual forma do pattern, `d` = profundidade do parallax de ponteiro. */

import { prefersReducedMotion } from './util.js';

const WIDE = [
  { at: 'tl', i: 0, x: -9, y: -11, w: 30, h: 26, rot: -8, d: 1.0 },
  { at: 'tr', i: 2, x: -7, y: -9, w: 22, h: 20, rot: 14, d: 1.3 },
  { at: 'bl', i: 5, x: -4, y: 5, w: 17, h: 16, rot: 24, d: 1.5 },
  { at: 'br', i: 0, x: -4, y: 6, w: 22, h: 19, rot: 166, d: 1.7 },
];

const NARROW = [
  { at: 'tl', i: 0, x: -21, y: -5, w: 46, h: 40, rot: -8, d: 1.0 },
  { at: 'tr', i: 2, x: -12, y: 4, w: 34, h: 30, rot: 14, d: 1.3 },
  { at: 'bl', i: 5, x: -15, y: -1, w: 31, h: 27, rot: 24, d: 1.5 },
  { at: 'br', i: 0, x: -13, y: 1, w: 32, h: 28, rot: 166, d: 1.7 },
];

const SIDES = {
  tl: ['left', 'top'], tr: ['right', 'top'],
  bl: ['left', 'bottom'], br: ['right', 'bottom'],
};

export function mountDecor(root, manchas) {
  let nodes = [];

  function render(set) {
    root.replaceChildren();
    nodes = set.map((cfg, i) => {
      const m = manchas[cfg.i % manchas.length];
      const [hSide, vSide] = SIDES[cfg.at];

      const el = document.createElement('div');
      el.className = 'decor__blob';
      // caixa em vmin: a mancha nao estoura em tela larga nem some em tela alta
      el.style.cssText =
        `${hSide}:${cfg.x}%;${vSide}:${cfg.y}%;width:${cfg.w}vmin;height:${cfg.h}vmin;`;

      const float = document.createElement('span');
      float.className = 'decor__float';
      float.style.animationDuration = `${12 + i * 2.4}s`;
      float.style.animationDelay = `${i * -2.1}s`;
      float.innerHTML =
        `<svg viewBox="${m.vb.join(' ')}" style="transform:rotate(${cfg.rot}deg)" ` +
        `fill="currentColor" aria-hidden="true"><path d="${m.d}"/></svg>`;

      el.append(float);
      root.append(el);
      return { el, d: cfg.d };
    });
    requestAnimationFrame(() => root.classList.add('is-ready'));
  }

  /* A escolha do conjunto vem da largura MEDIDA do palco, nao de matchMedia:
     no primeiro quadro a viewport pode reportar 0 e a tela larga acabaria com a
     composicao de celular para sempre. O observer tambem cobre o giro do
     aparelho e o redimensionamento da janela. */
  let largo = null;
  const ro = new ResizeObserver(([entry]) => {
    const w = entry.contentRect.width;
    if (!w) return;
    const agora = w >= 760;
    if (agora === largo) return;
    largo = agora;
    render(agora ? WIDE : NARROW);
  });
  ro.observe(root);

  if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;

  // parallax discreto: profundidade por movimento, sem sombra nem gradiente
  let raf = 0;
  window.addEventListener('pointermove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const dx = (e.clientX / window.innerWidth - 0.5) * 2;
      const dy = (e.clientY / window.innerHeight - 0.5) * 2;
      for (const n of nodes) {
        n.el.style.transform = `translate3d(${-dx * n.d * 14}px, ${-dy * n.d * 11}px, 0)`;
      }
    });
  }, { passive: true });
}

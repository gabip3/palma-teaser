/* Abertura: MUITO -> MUUUUITO.
   Cascata curta de proposito. O visitante precisa poder jogar quase na hora. */

import { prefersReducedMotion } from './util.js';

const STEPS = [0, 120, 108];   // sobreposicao alta: le como um movimento so

export function lightUp(stage) {
  const us = [...stage.querySelectorAll('.muu__u--anim')];

  requestAnimationFrame(() => stage.classList.add('is-lit'));

  if (prefersReducedMotion()) {
    us.forEach((u) => u.classList.add('is-on'));
    return;
  }

  let t = 360;   // espera o titulo entrar antes de esticar a palavra
  us.forEach((u, i) => {
    t += STEPS[i] ?? 150;
    setTimeout(() => u.classList.add('is-on'), t);
  });
}

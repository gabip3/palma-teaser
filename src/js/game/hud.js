import { num } from '../util.js';

/* Escreve no DOM apenas quando o valor exibido muda: nada de trabalho de
   layout a 60 fps por causa de um numero que ainda nao virou. */
export class Hud {
  constructor() {
    this.dist = document.getElementById('m-dist');
    this.milk = document.getElementById('m-milk');
    this.best = document.getElementById('m-best');
    this.milkBox = this.milk.closest('.hud__metric');
    this.last = { d: -1, m: -1, b: -1 };
  }

  set(distMeters, milkLiters, bestLiters) {
    const d = Math.floor(distMeters);
    if (d !== this.last.d) { this.dist.textContent = num(d); this.last.d = d; }
    if (milkLiters !== this.last.m) {
      this.milk.textContent = num(milkLiters);
      if (this.last.m >= 0) {
        this.milkBox.classList.remove('is-hit');
        void this.milkBox.offsetWidth;   // reinicia a animacao
        this.milkBox.classList.add('is-hit');
      }
      this.last.m = milkLiters;
    }
    if (bestLiters !== this.last.b) { this.best.textContent = num(bestLiters); this.last.b = bestLiters; }
  }

  reset() { this.last = { d: -1, m: -1, b: -1 }; }
}

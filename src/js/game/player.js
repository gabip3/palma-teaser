import { PHYSICS } from '../config.js';
import { COW_HITBOX } from './art.js';

export class Player {
  constructor() {
    this.g = 0;
    this.jumpV = 0;
    this.reset();
  }

  reset() {
    this.y = 0;          // altura acima do chao, em px
    this.vy = 0;
    this.airborne = false;
    this.airT = 0;
    this.run = 0;        // fase do ciclo de corrida, 0..1
    this.squash = 0;
    this.coyote = 0;
    this.buffer = 0;
  }

  /* a fisica acompanha o tamanho do personagem: mesma sensacao em qualquer tela */
  tune(u) {
    const apex = PHYSICS.apexInCows * u;
    const T = PHYSICS.airtime;
    this.g = (8 * apex) / (T * T);
    this.jumpV = (this.g * T) / 2;
  }

  requestJump() {
    this.buffer = PHYSICS.buffer;
  }

  update(dt, speed, u) {
    const grounded = !this.airborne;

    this.coyote = grounded ? PHYSICS.coyote : Math.max(0, this.coyote - dt);
    this.buffer = Math.max(0, this.buffer - dt);

    if (this.buffer > 0 && (grounded || this.coyote > 0)) {
      this.vy = this.jumpV;
      this.airborne = true;
      this.airT = 0;
      this.buffer = 0;
      this.coyote = 0;
    }

    if (this.airborne) {
      this.airT += dt;
      this.vy -= this.g * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.airborne = false;
        this.squash = 1;
      }
    } else {
      this.run = (this.run + (speed * dt) / (u * 2.9)) % 1;
    }

    this.squash = Math.max(0, this.squash - dt * 7);
  }

  hitbox(x, groundY, u) {
    const k = u / 100;
    const feet = groundY - this.y;
    return {
      x: x + COW_HITBOX.x * k,
      y: feet + COW_HITBOX.y * k,
      w: COW_HITBOX.w * k,
      h: COW_HITBOX.h * k,
    };
  }
}

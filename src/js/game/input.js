/* Entrada unica para teclado, mouse e toque. */

const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);

export class Input {
  constructor(surface, { onPress, isActive }) {
    this.onPress = onPress;
    this.isActive = isActive;
    this.ultimoFoiTeclado = false;   // decide se vale mostrar anel de foco
    this.pointers = new Set();

    const press = () => this.onPress();
    const release = () => this.pointers.clear();   // aba perdeu foco

    this.onKeyDown = (e) => {
      if (!JUMP_KEYS.has(e.code)) return;
      // com um botao em foco, Espaco/Enter continua acionando o botao
      if (!this.isActive()) return;
      e.preventDefault();
      if (e.repeat) return;
      this.ultimoFoiTeclado = true;
      press();
    };

    this.onPointerDown = (e) => {
      if (e.target.closest('button, a')) return;
      if (!this.isActive()) return;
      e.preventDefault();
      this.ultimoFoiTeclado = false;
      this.pointers.add(e.pointerId);
      press();
    };
    this.onPointerUp = (e) => {
      this.pointers.delete(e.pointerId);
      if (!this.pointers.size) release();
    };

    window.addEventListener('keydown', this.onKeyDown);
    surface.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('blur', release);
  }
}

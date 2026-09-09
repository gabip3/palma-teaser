import { STORAGE_KEY } from './config.js';

const DEFAULTS = { bestMilk: 0, bestDist: 0, sound: true };

/* localStorage pode lancar (modo privado, cookies bloqueados): nunca deixar
   isso derrubar o jogo. */
function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

let state = read();

export const get = (key) => state[key];

export function set(key, value) {
  state = { ...state, [key]: value };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* sem persistencia: a partida continua normalmente */ }
}

/* Retorna true quando a partida bateu o recorde de leite. */
export function submit(milk, dist) {
  const record = milk > state.bestMilk;
  if (record) set('bestMilk', milk);
  if (dist > state.bestDist) set('bestDist', dist);
  return record;
}

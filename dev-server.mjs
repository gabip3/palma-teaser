// Servidor estatico minimo para desenvolvimento local (sem dependencias).
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 5173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.otf': 'font/otf',
  '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

/* POST /__shot com um dataURL no corpo grava .preview/shot.png.
   Serve para conferir desenho de canvas fora do navegador, quando a captura de
   tela do painel nao esta disponivel. So existe no servidor de desenvolvimento:
   o site publicado e estatico e nao tem nada disso. */
async function gravarCaptura(req, res) {
  const partes = [];
  for await (const p of req) partes.push(p);
  const texto = Buffer.concat(partes).toString('utf8');
  const b64 = texto.slice(texto.indexOf(',') + 1);
  await mkdir(join(ROOT, '.preview'), { recursive: true });
  const destino = join(ROOT, '.preview', 'shot.png');
  await writeFile(destino, Buffer.from(b64, 'base64'));
  res.writeHead(200, { 'content-type': 'text/plain' }).end(destino);
}

/* POST /__salvar?arquivo=assets/produtos/<nome>.webp grava o dataURL do corpo.
   As embalagens do jogo sao reduzidas no proprio navegador, a partir dos
   originais, e salvas por aqui. So aceita assets/produtos/. */
async function salvarProduto(req, res) {
  const arquivo = new URL(req.url, 'http://x').searchParams.get('arquivo') || '';
  if (!/^assets\/produtos\/[a-z0-9-]+\.(webp|png)$/.test(arquivo)) {
    res.writeHead(400).end('caminho recusado'); return;
  }
  const partes = [];
  for await (const p of req) partes.push(p);
  const texto = Buffer.concat(partes).toString('utf8');
  await mkdir(join(ROOT, 'assets', 'produtos'), { recursive: true });
  const bytes = Buffer.from(texto.slice(texto.indexOf(',') + 1), 'base64');
  await writeFile(join(ROOT, arquivo), bytes);
  res.writeHead(200, { 'content-type': 'text/plain' }).end(arquivo + ' ' + bytes.length);
}

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST' && url === '/__shot') { await gravarCaptura(req, res); return; }
  if (req.method === 'POST' && url === '/__salvar') { await salvarProduto(req, res); return; }
  const rel = normalize(url === '/' ? '/index.html' : url).replace(/^[/\\]+/, '');
  const file = join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));

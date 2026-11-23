// Zero-dependency companion server for The Empty Village.
// It serves the built game and keeps the live, persistent village chat log.
// Run with `npm run chat` (after `npm run build` to serve the game too).
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const DATA_DIR = process.env.CHAT_DATA_DIR ? resolve(process.env.CHAT_DATA_DIR) : join(ROOT, 'server', 'data');
const LOG_FILE = join(DATA_DIR, 'chat-history.json');
const PORT = Number(process.env.PORT) || 8787;
const MAX_MESSAGES = 500;
const MAX_PLAYERS = 120;
const MAX_BODY = 8192;
const PLAYER_TTL = 45000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Village-Id, X-Village-Name, X-Village-Room',
  'Cache-Control': 'no-store',
};

let messages = [];
let nextId = 1;
let saveTimer = null;
const players = new Map();
const recentSends = new Map();

const clean = (value, max = 200) => String(value ?? '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);

const json = (response, status, body) => {
  const payload = JSON.stringify(body);
  response.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(payload) });
  response.end(payload);
};

async function loadHistory() {
  try {
    const saved = JSON.parse(await readFile(LOG_FILE, 'utf8'));
    if (Array.isArray(saved?.messages)) {
      messages = saved.messages.filter(m => m && typeof m.id === 'number' && typeof m.text === 'string').slice(-MAX_MESSAGES);
      nextId = messages.reduce((max, m) => Math.max(max, m.id + 1), 1);
    }
  } catch { /* A fresh village has no log yet. */ }
}

function saveHistory() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await mkdir(DATA_DIR, { recursive: true });
      const temp = `${LOG_FILE}.${process.pid}.tmp`;
      await writeFile(temp, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), messages }, null, 2));
      await rename(temp, LOG_FILE);
    } catch (error) {
      console.error('[chat] could not save the log:', error.message);
    }
  }, 350);
}

const decodeHeader = value => {
  const text = clean(value, 200);
  try { return decodeURIComponent(text); } catch { return text; }
};

function touchPlayer(req) {
  const id = clean(req.headers['x-village-id'], 64);
  if (!id) return;
  if (players.size >= MAX_PLAYERS && !players.has(id)) {
    const oldest = [...players.entries()].sort((a, b) => a[1].seen - b[1].seen)[0];
    if (oldest) players.delete(oldest[0]);
  }
  const previous = players.get(id);
  players.set(id, {
    id,
    name: decodeHeader(req.headers['x-village-name']) || previous?.name || 'अजनबी',
    room: decodeHeader(req.headers['x-village-room']) || previous?.room || 'satrod-kalan',
    location: decodeHeader(req.headers['x-village-location']) || previous?.location || '',
    seen: Date.now(),
  });
}

function visiblePlayers() {
  const now = Date.now();
  let changed = false;
  for (const [id, player] of players) if (now - player.seen > PLAYER_TTL) { players.delete(id); changed = true; }
  if (changed) return [...players.values()];
  return [...players.values()];
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > MAX_BODY) { reject(new Error('Message too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolveBody(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, pathname) {
  touchPlayer(req);
  if (pathname === '/api/health') return json(res, 200, { ok: true, messages: messages.length, players: visiblePlayers().length });

  if (pathname === '/api/chat' && req.method === 'GET') {
    const since = Number(new URL(req.url, 'http://localhost').searchParams.get('since')) || 0;
    return json(res, 200, {
      messages: messages.filter(m => m.id > since),
      players: visiblePlayers(),
      cursor: messages.at(-1)?.id ?? since,
      time: Date.now(),
    });
  }

  if (pathname === '/api/chat' && req.method === 'POST') {
    let body;
    try { body = await readBody(req); }
    catch (error) { return json(res, 400, { ok: false, error: error.message }); }
    const id = clean(body.id, 64);
    const text = clean(body.text, 480);
    const name = clean(body.name, 32) || 'अजनबी';
    const room = clean(body.room, 40) || 'satrod-kalan';
    const location = clean(body.location, 60);
    const kind = ['chat', 'whisper', 'system'].includes(body.kind) ? body.kind : 'chat';
    if (!id || !text) return json(res, 400, { ok: false, error: 'Empty message' });
    const now = Date.now();
    if (now - (recentSends.get(id) ?? 0) < 550) return json(res, 429, { ok: false, error: 'Too fast' });
    recentSends.set(id, now);
    const message = { id: nextId++, at: now, name, room, location, kind, sender: id, text };
    messages.push(message);
    if (messages.length > MAX_MESSAGES) messages.splice(0, messages.length - MAX_MESSAGES);
    saveHistory();
    touchPlayer({ headers: { 'x-village-id': id, 'x-village-name': name, 'x-village-room': room, 'x-village-location': location } });
    return json(res, 201, { ok: true, message });
  }

  if (pathname === '/api/log' && req.method === 'GET') {
    return json(res, 200, { version: 1, count: messages.length, messages });
  }

  return json(res, 404, { ok: false, error: 'Not found' });
}

function safeFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = normalize(decoded).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  const target = resolve(DIST, relative);
  if (target !== DIST && !target.startsWith(DIST + sep)) return null;
  return target;
}

async function serveStatic(req, res, pathname) {
  let target = pathname === '/' ? join(DIST, 'index.html') : safeFile(pathname);
  if (!target) { res.writeHead(403, headers); return res.end('Forbidden'); }
  try {
    let data;
    try { data = await readFile(target); }
    catch {
      // Vite's `public/` files are copied into dist, but fall back for dev use.
      target = join(ROOT, 'public', pathname === '/' ? 'index.html' : pathname);
      data = await readFile(target);
    }
    res.writeHead(200, { ...headers, 'Content-Type': MIME[extname(target).toLowerCase()] ?? 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found. Run `npm run build` first to serve the game.');
  }
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); return res.end(); }
  if (pathname.startsWith('/api/')) {
    try { await handleApi(req, res, pathname); }
    catch (error) { json(res, 500, { ok: false, error: error.message }); }
    return;
  }
  await serveStatic(req, res, pathname);
});

await loadHistory();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[chat] village chat + game ready on http://localhost:${PORT}`);
  console.log(`[chat] transcript: http://localhost:${PORT}/api/log · public log: /chat-log.html`);
});

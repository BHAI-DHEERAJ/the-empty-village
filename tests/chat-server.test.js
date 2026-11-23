import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(import.meta.dirname, '..');

async function waitFor(url, attempts = 80) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch { /* Server is still booting. */ }
    await new Promise(done => setTimeout(done, 40));
  }
  throw new Error(`Server never became ready: ${url}`);
}

test('the village chat server stores messages, presence and a public transcript', async t => {
  const dataDir = await mkdtemp(join(tmpdir(), 'village-chat-'));
  const port = 8800 + Math.floor(Math.random() * 600);
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [join(root, 'server', 'chat-server.mjs')], {
    cwd: root,
    env: { ...process.env, PORT: String(port), CHAT_DATA_DIR: dataDir },
    stdio: 'ignore',
  });
  t.after(async () => {
    server.kill('SIGTERM');
    await rm(dataDir, { recursive: true, force: true });
  });

  const health = await waitFor(`${base}/api/health`);
  assert.deepEqual(await health.json(), { ok: true, messages: 0, players: 0 });

  const headers = {
    'Content-Type': 'application/json',
    'X-Village-Id': 'test-traveller',
    'X-Village-Name': encodeURIComponent('कृष'),
    'X-Village-Room': 'satrod-kalan',
    'X-Village-Location': encodeURIComponent('स्कूल'),
  };
  const first = await fetch(`${base}/api/chat`, {
    method: 'POST', headers,
    body: JSON.stringify({ id: 'test-traveller', name: 'कृष', text: 'मिल गया!', room: 'satrod-kalan', location: 'स्कूल' }),
  });
  assert.equal(first.status, 201);
  const sent = await first.json();
  assert.ok(sent.ok && sent.message.id > 0);
  assert.equal(sent.message.text, 'मिल गया!');

  // Rate limiting keeps a stuck client from flooding the archive.
  const flood = await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ id: 'test-traveller', name: 'कृष', text: 'धीरे' }) });
  assert.equal(flood.status, 429);

  const since = await (await fetch(`${base}/api/chat?since=0`, { headers })).json();
  assert.equal(since.messages.length, 1);
  assert.equal(since.messages[0].location, 'स्कूल');
  assert.equal(since.players[0].name, 'कृष');
  assert.ok(since.cursor >= sent.message.id);

  const newer = await (await fetch(`${base}/api/chat?since=${sent.message.id}`, { headers })).json();
  assert.equal(newer.messages.length, 0);

  const log = await (await fetch(`${base}/api/log`)).json();
  assert.equal(log.count, 1);
  assert.match(log.messages[0].text, /मिल गया/);

  const page = await waitFor(`${base}/chat-log.html`);
  assert.match(await page.text(), /सहेजी हुई बातचीत/);

  // The debounced disk write must produce a file another visitor can read.
  let saved = null;
  for (let i = 0; i < 40 && !saved; i++) {
    try { saved = JSON.parse(await readFile(join(dataDir, 'chat-history.json'), 'utf8')); }
    catch { await new Promise(done => setTimeout(done, 35)); }
  }
  assert.equal(saved?.messages.length, 1);
  assert.equal(saved.messages[0].name, 'कृष');
});

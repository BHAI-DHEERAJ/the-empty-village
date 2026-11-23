// Live village radio-chat. Polls the small companion server, keeps an offline
// outbox, and never blocks the game when the server is not running.
const DEFAULT_URL = '/api/chat';
const ID_KEY = 'empty-village-chat-id';
const NAME_KEY = 'empty-village-chat-name';
const OUTBOX_KEY = 'empty-village-chat-outbox';
const WHISPERS = [
  'कृष… तुम वापस क्यों आए?',
  'गाँव में कोई ज़िंदा नहीं है। फिर ये थाली किसने रखी?',
  'जिस तस्वीर में तीन बच्चे थे, अब उसमें दो हैं।',
  'उसने मेरी याद ले ली… मेरा चेहरा नहीं।',
  'रेडियो पर एक आवाज़ आई: “कृष, रवि… कौन बचेगा?”',
  'तीसरा मेहमान पहुँच गया है।',
];

const uid = () => (crypto?.randomUUID?.() ?? `villager-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const clean = (value, max) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export class ChatClient {
  constructor({ url = DEFAULT_URL, character, onMessages = () => {}, onPresence = () => {}, onStatus = () => {} } = {}) {
    this.url = url;
    this.onMessages = onMessages;
    this.onPresence = onPresence;
    this.onStatus = onStatus;
    this.cursor = 0;
    this.running = false;
    this.timer = null;
    this.whisperTimer = null;
    this.sending = false;
    this.status = 'offline';
    this.pending = [];
    try { this.outbox = JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]'); }
    catch { this.outbox = []; }
    if (!Array.isArray(this.outbox)) this.outbox = [];
    let id;
    try { id = localStorage.getItem(ID_KEY); } catch { /* Optional */ }
    this.id = id || uid();
    try { localStorage.setItem(ID_KEY, this.id); } catch { /* Optional */ }
    this.room = 'satrod-kalan';
    this.location = 'गाँव';
    this.setName(character?.name ?? 'कृष');
  }

  setName(name) {
    let saved = null;
    try { saved = localStorage.getItem(NAME_KEY); } catch { /* Optional */ }
    const chosen = clean(saved || name, 24);
    this.name = chosen || 'कृष';
    try { localStorage.setItem(NAME_KEY, this.name); } catch { /* Optional */ }
    this.headers();
  }

  headers() {
    return {
      'Content-Type': 'application/json',
      'X-Village-Id': this.id,
      'X-Village-Name': encodeURIComponent(this.name),
      'X-Village-Room': encodeURIComponent(this.room),
      'X-Village-Location': encodeURIComponent(this.location),
    };
  }

  #status(value) {
    if (this.status === value) return;
    this.status = value;
    this.onStatus(value);
  }

  setLocation(value) {
    const next = clean(value, 60);
    if (next && next !== this.location) this.location = next;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.#poll();
    this.timer = setInterval(() => this.#poll(), 2800);
    this.whisperTimer = setInterval(() => {
      if (this.status !== 'online') return;
      const text = WHISPERS[Math.floor(Math.random() * WHISPERS.length)];
      this.send(text, { kind: 'whisper', name: 'गाँव' }).catch(() => {});
    }, 105000);
  }

  async #poll() {
    if (!this.running) return;
    try {
      const response = await fetch(`${this.url}?since=${this.cursor}`, { headers: this.headers(), cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.#status('online');
      this.onPresence(Array.isArray(data.players) ? data.players : []);
      const incoming = (data.messages ?? []).filter(m => m && typeof m.id === 'number' && typeof m.text === 'string');
      if (incoming.length) {
        this.cursor = Math.max(this.cursor, ...incoming.map(m => m.id));
        this.onMessages(incoming);
      }
      await this.#flush();
    } catch {
      this.#status('offline');
      this.onPresence([]);
    }
  }

  async #flush() {
    while (this.outbox.length && !this.sending) {
      const message = this.outbox[0];
      try {
        this.sending = true;
        const response = await fetch(this.url, { method: 'POST', headers: this.headers(), body: JSON.stringify(message) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.outbox.shift();
        this.#storeOutbox();
      } catch { break; }
      finally { this.sending = false; }
    }
  }

  #storeOutbox() {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(this.outbox.slice(-20))); } catch { /* Optional */ }
  }

  async send(text, { kind = 'chat', name = this.name } = {}) {
    const message = {
      id: this.id,
      text: clean(text, 480),
      name: clean(name, 32),
      room: this.room,
      location: this.location,
      kind: ['chat', 'whisper', 'system'].includes(kind) ? kind : 'chat',
    };
    if (!message.text) return null;
    // Local echo arrives through the next poll; when offline, show it at once.
    if (this.status !== 'online') {
      const local = { ...message, id: 0, at: Date.now(), pending: true };
      this.onMessages([local]);
      this.outbox.push(message);
      this.#storeOutbox();
      return local;
    }
    try {
      const response = await fetch(this.url, { method: 'POST', headers: this.headers(), body: JSON.stringify(message) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.message) this.onMessages([data.message]);
      return data.message ?? null;
    } catch {
      const local = { ...message, id: 0, at: Date.now(), pending: true };
      this.onMessages([local]);
      this.outbox.push(message);
      this.#storeOutbox();
      this.#status('offline');
      return local;
    }
  }

  dispose() {
    this.running = false;
    clearInterval(this.timer);
    clearInterval(this.whisperTimer);
  }
}

export { WHISPERS as VILLAGE_WHISPERS };

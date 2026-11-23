const make = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
};

const clock = at => new Date(at || Date.now()).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });

// In-game chat overlay. Deliberately built with DOM nodes and textContent so a
// message from another player can never inject markup into the game shell.
export class ChatPanel {
  constructor(shell, { client, onOpenChange = () => {}, onUnread = () => {} } = {}) {
    this.client = client;
    this.onOpenChange = onOpenChange;
    this.onUnread = onUnread;
    this.unread = 0;
    this.messages = [];
    this.events = new AbortController();
    const { signal } = this.events;

    this.panel = make('dialog', 'chat-dialog');
    this.panel.id = 'chat-panel';
    this.panel.setAttribute('aria-labelledby', 'chat-title');
    this.panel.innerHTML = `
      <header class="chat-head">
        <div>
          <small class="eyebrow">Satrod Kalan · live line</small>
          <h2 id="chat-title">गाँव की बातचीत</h2>
        </div>
        <button type="button" class="icon-button chat-close" aria-label="चैट बंद करो" autofocus>×</button>
      </header>
      <div class="chat-bar">
        <span class="chat-status" id="chat-status" role="status"><i></i> offline</span>
        <span class="chat-count" id="chat-count">0 खोजी</span>
        <button type="button" class="chat-tab" data-tab="chat" aria-pressed="true">बातचीत</button>
        <button type="button" class="chat-tab" data-tab="players" aria-pressed="false">खोजी</button>
      </div>
      <div class="chat-scroll" id="chat-scroll" role="log" aria-live="polite" aria-relevant="additions"></div>
      <div class="chat-players" id="chat-players" hidden></div>
      <form class="chat-form" id="chat-form">
        <label class="sr-only" for="chat-name">तुम्हारा नाम</label>
        <input id="chat-name" class="chat-name" maxlength="24" autocomplete="off" spellcheck="false" aria-label="तुम्हारा नाम" />
        <div class="chat-compose">
          <label class="sr-only" for="chat-input">संदेश</label>
          <input id="chat-input" class="chat-input" maxlength="480" autocomplete="off" placeholder="यहाँ लिखो… (C बंद करने के लिए)" />
          <button class="chat-send" type="submit" aria-label="संदेश भेजो">भेजो</button>
        </div>
        <small class="chat-foot">संदेश सहेजे जाते हैं। <a href="/chat-log.html" target="_blank" rel="noopener">पूरा लॉग देखो</a> · <kbd>C</kbd> चैट</small>
      </form>`;
    shell.append(this.panel);

    this.scroll = this.panel.querySelector('#chat-scroll');
    this.players = this.panel.querySelector('#chat-players');
    this.status = this.panel.querySelector('#chat-status');
    this.count = this.panel.querySelector('#chat-count');
    this.nameInput = this.panel.querySelector('#chat-name');
    this.input = this.panel.querySelector('#chat-input');
    this.form = this.panel.querySelector('#chat-form');
    this.tabs = [...this.panel.querySelectorAll('.chat-tab')];
    this.tab = 'chat';
    this.nameInput.value = client?.name ?? '';

    this.panel.querySelector('.chat-close').addEventListener('click', () => this.close(), { signal });
    this.nameInput.addEventListener('change', () => {
      client?.setName(this.nameInput.value);
      this.nameInput.value = client?.name ?? this.nameInput.value;
    }, { signal });
    this.form.addEventListener('submit', event => {
      event.preventDefault();
      const text = this.input.value.trim();
      if (!text) return;
      client?.send(text);
      this.input.value = '';
      this.input.focus();
    }, { signal });
    this.tabs.forEach(tab => tab.addEventListener('click', () => this.showTab(tab.dataset.tab), { signal }));
    this.panel.addEventListener('close', () => {
      if (this.panel.open) return;
      this.unread = 0;
      this.onUnread(0);
      this.onOpenChange(false);
      (this.returnFocus ?? shell.querySelector('#chat-button'))?.focus({ preventScroll: true });
    }, { signal });

    if (client) {
      client.onMessages = messages => this.addMessages(messages);
      client.onPresence = players => this.renderPlayers(players);
      client.onStatus = state => {
        this.status.dataset.state = state;
        this.status.lastChild.textContent = ` ${state === 'online' ? 'जीवित लाइन' : 'सिग्नल नहीं · बाद में भेजेंगे'}`;
      };
      this.status.dataset.state = client.status;
    }
    this.addMessages([{ kind: 'system', name: 'फ़ील्ड नोट', text: 'यह लाइन गाँव के सभी खिलाड़ियों के लिए है। संदेश सर्वर पर सहेजे जाते हैं।', at: Date.now() }]);
  }

  get open() { return this.panel.open; }

  showTab(tab) {
    this.tab = tab;
    for (const item of this.tabs) item.setAttribute('aria-pressed', String(item.dataset.tab === tab));
    this.scroll.hidden = tab !== 'chat';
    this.players.hidden = tab !== 'players';
    this.form.hidden = tab !== 'chat';
  }

  toggle() {
    if (this.open) this.close();
    else this.openChat();
  }

  openChat() {
    if (this.open) return;
    this.returnFocus = document.activeElement;
    if (document.pointerLockElement) document.exitPointerLock();
    this.panel.showModal();
    this.unread = 0;
    this.onUnread(0);
    this.showTab('chat');
    this.onOpenChange(true);
    this.input.focus({ preventScroll: true });
  }

  close() { if (this.open) this.panel.close(); }

  addMessages(messages) {
    let added = false;
    for (const message of messages) {
      if (!message || typeof message.text !== 'string') continue;
      const row = make('li', `chat-message chat-${message.kind === 'whisper' ? 'whisper' : message.kind === 'system' ? 'system' : 'chat'}`);
      if (message.pending) row.dataset.pending = 'true';
      const meta = make('div', 'chat-meta');
      const who = make('b', '', message.name || 'अजनबी');
      const when = make('time', '', message.pending ? '…' : clock(message.at));
      meta.append(who, when);
      if (message.location) meta.append(make('span', 'chat-where', `📍 ${message.location}`));
      row.append(meta, make('p', '', message.text));
      this.scroll.append(row);
      added = true;
    }
    while (this.scroll.children.length > 160) this.scroll.firstElementChild.remove();
    if (!added) return;
    this.scroll.scrollTop = this.scroll.scrollHeight;
    if (!this.open) {
      this.unread += messages.length;
      this.onUnread(Math.min(9, this.unread));
    }
  }

  renderPlayers(players) {
    const list = [...players].sort((a, b) => a.name.localeCompare(b.name, 'hi'));
    this.count.textContent = `${list.length} खोजी`;
    this.players.replaceChildren(...(list.length ? list.map(player => {
      const row = make('div', 'chat-player');
      row.append(make('b', '', player.name), make('small', '', player.location || player.room || 'गाँव'));
      return row;
    }) : [make('p', 'chat-empty', 'अभी कोई दूसरा खिलाड़ीonline नहीं। chat server चालू करो: npm run chat')]));
  }

  dispose() {
    this.events.abort();
    this.close();
    this.panel.remove();
  }
}

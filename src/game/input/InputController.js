const movementKeys = new Set(['ShiftLeft', 'ShiftRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);

export function defaultTouchControls(){
  return matchMedia('(pointer: coarse)').matches||navigator.maxTouchPoints>0&&window.innerWidth<1025;
}

export class InputController {
  constructor(canvas, { stick, thumb, jumpButton, useButton, runButton, touch, onMode, onFlashlight, onJournal, onPhone, onMap, onChat, optionsOpen, keepCursor = () => false }) {
    this.canvas = canvas;
    this.stick = stick;
    this.thumb = thumb;
    this.jumpButton = jumpButton;
    this.useButton = useButton;
    this.onMode = onMode;
    this.onFlashlight = onFlashlight;
    this.onJournal = onJournal;
    this.onPhone = onPhone;
    this.onMap = onMap;
    this.onChat = onChat;
    this.optionsOpen = optionsOpen;
    this.keepCursor = keepCursor;
    this.keys = new Set();
    this.mode = touch ? 'touch' : 'ready';
    this.holds=new Map();
    this.jumpQueued = this.useQueued = false;
    this.lookX = this.lookY = 0;
    this.stickX = this.stickY = 0;
    this.lookPointer = this.stickPointer = null;
    this.lockTimer = 0;
    this.events = new AbortController();
    this.#bindEvents();
    this.#holdButton(runButton,'run');
  }

  #bindEvents() {
    const listen = (target, type, listener) => target.addEventListener(type, listener, { signal: this.events.signal });

    listen(window, 'keydown', (event) => {
      const { code } = event;
      if (code === 'Escape' && this.mode === 'drag' && !this.optionsOpen?.()) {
        this.#setMode('ready');
        this.#clear();
      }
      if (event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement) return;
      if (code === 'KeyM') { if (!event.repeat) { event.preventDefault(); this.onMap?.(); } return; }
      if (code === 'KeyP') { if(!event.repeat){event.preventDefault();this.onPhone?.();} return; }
      if (code === 'KeyJ') { if (!event.repeat) { event.preventDefault(); this.onJournal?.(); } return; }
      if (code === 'KeyC') { if (!event.repeat) { event.preventDefault(); this.onChat?.(); } return; }
      if (this.optionsOpen?.()) return;
      if (code === 'KeyF' && !event.repeat) { event.preventDefault(); this.onFlashlight?.(); return; }
      if (code === 'KeyE') { if (!event.repeat) { event.preventDefault(); this.useQueued = true; } return; }
      if (!movementKeys.has(code) && code !== 'Space') return;
      if (code === 'Space' && event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      this.keys.add(code);
      if (code === 'Space' && !event.repeat) this.jumpQueued = true;
    });
    listen(window, 'keyup', (event) => this.keys.delete(event.code));
    listen(window, 'blur', () => this.#clear());
    listen(document, 'visibilitychange', () => { if (document.hidden) this.#clear(); });

    listen(document, 'pointerlockchange', () => {
      clearTimeout(this.lockTimer);
      this.lockTimer = 0;
      this.#clear();
      if (document.pointerLockElement === this.canvas) {
        this.lockedOn = performance.now();
        this.#setMode('locked');
      }
      else if (this.mode === 'locked') this.#setMode('ready');
    });
    listen(document, 'pointerlockerror', () => this.#useDragIfPending());
    listen(document, 'mousemove', (event) => {
      if (this.mode !== 'locked') return;
      // Some browsers report the pointer recentering as an extra mouse move.
      const { movementX, movementY, clientX, clientY } = event;
      if (performance.now() - this.lockedOn < 500 && Math.hypot(movementX,movementY) > 124 &&
          Math.abs(movementX+clientX)<1.5 && Math.abs(movementY+clientY)<1.5) return;
      this.#accumulateLook(event.movementX, event.movementY);
    });

    listen(this.canvas, 'pointerdown', (event) => {
      if (this.optionsOpen?.()) return;
      const isTouch = event.pointerType === 'touch' || event.pointerType === 'pen';
      if (!isTouch && event.button !== 0) return;
      if (isTouch && this.mode !== 'locked') this.#setMode('touch');
      else if (this.mode === 'ready') this.enter();
      if (this.mode !== 'drag' && this.mode !== 'touch') return;
      if (this.lookPointer != null) return;
      this.lookPointer = event.pointerId;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      this.dragDistance=0;
      this.canvas.setPointerCapture(event.pointerId);
    });
    listen(this.canvas, 'pointermove', (event) => {
      if (event.pointerId !== this.lookPointer) return;
      this.dragDistance+=Math.hypot(event.clientX-this.lastX,event.clientY-this.lastY);
      this.#accumulateLook(event.clientX - this.lastX, event.clientY - this.lastY);
      this.lastX = event.clientX;
      this.lastY = event.clientY;
    });
    for (const action of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      listen(this.canvas, action, (event) => {
        if(event.pointerId!==this.lookPointer)return;
        this.lookPointer=null;
        if(action==='pointerup'&&event.pointerType==='mouse'&&this.mode==='drag'&&this.keepCursor()&&this.dragDistance<5&&!this.optionsOpen?.()){
          const r=this.canvas.getBoundingClientRect();
          const x=(event.clientX-r.left)/r.width, y=(event.clientY-r.top)/r.height;
          if(x>=0&&x<=1&&y>=0&&y<=1)this.useQueued={x:x*2-1,y:1-y*2};
        }
      });
      listen(this.stick, action, (event) => {
        if (event.pointerId === this.stickPointer) this.#resetStick();
      });
    }
    listen(this.stick, 'pointerdown', (event) => {
      if (this.stickPointer != null||this.optionsOpen?.()||event.button!==0) return;
      event.preventDefault();
      this.stickPointer = event.pointerId;
      this.stick.toggleAttribute('data-held',true);
      this.stickRect = this.stick.getBoundingClientRect();
      this.stick.setPointerCapture(event.pointerId);
      this.#moveStick(event);
    });
    listen(this.stick, 'pointermove', (event) => {
      if (event.pointerId === this.stickPointer) this.#moveStick(event);
    });
    // Touch browsers need not synthesize a mouse click after a tap. Queue a
    // pointer jump once, and keep click activation for keyboard/assistive use.
    listen(this.jumpButton, 'pointerdown', (event) => {
      if (event.button !== 0 || this.optionsOpen?.()) return;
      event.preventDefault();
      this.jumpQueued = true;
    });
    listen(this.jumpButton, 'click', (event) => {
      if (event.detail === 0 && !this.optionsOpen?.()) this.jumpQueued = true;
    });
    listen(this.useButton, 'pointerdown', (event) => {
      if (event.button !== 0 || this.useButton.disabled || this.optionsOpen?.()) return;
      event.preventDefault();
      this.useQueued = true;
    });
    listen(this.useButton, 'click', (event) => {
      if (event.detail === 0 && !this.useButton.disabled && !this.optionsOpen?.()) this.useQueued = true;
    });
  }

  #holdButton(button,name){
    const {signal}=this.events;
    button.addEventListener('pointerdown',event=>{
      if(event.button!==0||this.optionsOpen?.()||this.holds.has(name))return;
      event.preventDefault();button.setPointerCapture(event.pointerId);
      this.holds.set(name,{id:event.pointerId,button});button.setAttribute('aria-pressed','true');
    },{signal});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{
      if(this.holds.get(name)?.id!==event.pointerId)return;
      this.holds.delete(name);button.setAttribute('aria-pressed','false');
    },{signal});
  }

  setTouch(on){
    this.#clear();
    if(on&&document.pointerLockElement===this.canvas)document.exitPointerLock();
    this.#setMode(on?'touch':this.keepCursor()?'drag':'ready');
  }

  enter() {
    this.canvas.focus({ preventScroll: true });
    if (this.mode === 'locked' || this.mode === 'touch' || this.lockTimer) return;
    if (this.keepCursor() || !this.canvas.requestPointerLock) {
      this.#setMode('drag');
      return;
    }
    this.lockTimer = window.setTimeout(() => this.#useDragIfPending(), 550);
    try {
      const result = this.canvas.requestPointerLock();
      result?.catch(() => this.#useDragIfPending());
    } catch {
      this.#useDragIfPending();
    }
  }

  #useDragIfPending() {
    if (!this.lockTimer) return;
    clearTimeout(this.lockTimer);
    this.lockTimer = 0;
    if (this.mode !== 'locked' && this.mode !== 'touch') this.#setMode('drag');
  }

  #setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.onMode(mode);
  }

  #accumulateLook(dx, dy) {
    const factor = this.mode === 'touch' ? 1.25 : 1;
    this.lookX += Math.max(-160, Math.min(160, dx)) * factor;
    this.lookY += Math.max(-120, Math.min(120, dy)) * factor;
  }

  takeLook() {
    const dx = this.lookX;
    const dy = this.lookY;
    this.lookX = this.lookY = 0;
    return { dx, dy };
  }

  readMovement() {
    const forward = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    const right = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    if (this.optionsOpen?.()) return { forward: 0, right: 0, sprint: false };
    return { forward: forward-this.stickY, right: right+this.stickX, sprint: this.holds.has('run')||this.keys.has('ShiftLeft')||this.keys.has('ShiftRight') };
  }

  takeJump() {
    const jump = this.jumpQueued;
    this.jumpQueued = false;
    return jump;
  }

  takeUse() {
    const use = this.useQueued;
    this.useQueued = false;
    return use;
  }

  releaseControls() { this.#clear(); }

  waitForLock() { if(this.mode!=='touch'){this.#clear();this.#setMode('ready');} }

  preferCursor() {
    this.#clear();
    if(this.mode==='touch')return;
    if(document.pointerLockElement===this.canvas)document.exitPointerLock();
    this.#setMode('drag');
  }

  #moveStick(event) {
    const { left, top, width, height } = this.stickRect;
    // Keep the throw comfortable even when the control's hit area is large.
    const radius = Math.min(36, width * .29), deadZone = 3.5;
    const x = event.clientX - (left + width / 2);
    const y = event.clientY - (top + height / 2);
    const length = Math.hypot(x, y);
    const scale = length > deadZone ? (Math.min(radius,length) - deadZone) / (radius - deadZone) / length : 0;
    this.stickX = x * scale;
    this.stickY = y * scale;
    this.thumb.style.transform = `translate(${this.stickX * radius}px, ${this.stickY * radius}px)`;
  }

  #resetStick() {
    this.stickPointer = null;
    this.stickX = this.stickY = 0;
    this.thumb.style.transform = '';
    this.stick.removeAttribute('data-held');
  }

  #clear() {
    this.keys.clear();
    for(const {button} of this.holds.values())button.setAttribute('aria-pressed','false');
    this.holds.clear();
    this.jumpQueued = this.useQueued = false;
    this.lookX = this.lookY = 0;
    this.lookPointer = null;
    this.#resetStick();
  }

  dispose() {
    this.events.abort();
    clearTimeout(this.lockTimer);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }
}

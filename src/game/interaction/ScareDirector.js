import { Vector3 } from 'three';

// Sudden beats are sparse and coexist with free exploration. None of them
// owns the player's controls, the flashlight, or the Watcher's spawn rules.
export class ScareDirector {
  constructor({ enabled = true, reducedMotion = false, sound = () => {}, random = Math.random } = {}) {
    this.enabled = enabled;
    this.reducedMotion = reducedMotion;
    this.sound = sound;
    this.random = random;
    this.time = 0;
    this.availableAt = 0;
    this.rushing = false;
    this.pending = [];
    this.used = new Set();
    this.look = new Vector3();
    this.to = new Vector3();
    this.level = 0;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) { this.pending.length = 0; this.beat = null; this.rushing = false; this.level = 0; }
  }

  queue(id, kind, at, run = () => {}) {
    if (!this.enabled || this.used.has(id) || this.pending.some((event) => event.id === id)) return;
    const delay = kind === 'swing' ? 1.14 + this.random() * 1.6 : .72;
    this.pending.push({ id, kind, at: at.clone(), run, ready: this.time + delay, end: this.time + (kind === 'swing' ? 13 : 7) });
  }

  reveal(at, distance) {
    if (distance < 7.5 || distance > 26 || this.time < 31 || this.pending.length) return false;
    return this.#fire('eyes', at);
  }

  get canRush() {
    return this.enabled && !this.reducedMotion && !this.rushing && this.time >= this.availableAt && !this.pending.length;
  }

  beginRush() {
    if (!this.canRush) return false;
    this.rushing = true;
    this.#reserve();
    return true;
  }

  finishRush(at) {
    if (!this.rushing) return;
    this.rushing = false;
    if (at && this.enabled) this.#accent('scare-rush', at, .31, .34);
  }

  #reserve() { this.availableAt = this.time + 49 + this.random() * 32; }

  #accent(sound, at, strength, duration = .77) {
    this.beat = { time: this.time, strength, duration };
    this.level = this.reducedMotion ? 0 : strength;
    this.sound(sound, at);
  }

  #fire(kind, at) {
    if (!this.enabled || this.rushing || this.time < this.availableAt) return false;
    this.#reserve();
    if (kind === 'swing') this.#accent('scare-metal', at, .47);
    else if (kind === 'radio') this.#accent('scare-radio', at, .61);
    else if (kind === 'mirror') this.#accent('scare-reverse', at, .58);
    else if (kind === 'child') this.#accent('scare-heartbeat', at, .52);
    else this.#accent('scare-eyes', at, .72);
    return true;
  }

  update(dt, view, { seated = false } = {}) {
    this.time += dt;
    this.level = this.beat && !this.reducedMotion ? this.beat.strength * Math.max(0, 1 - (this.time - this.beat.time) / this.beat.duration) ** 2 : 0;
    if (!this.enabled || !this.pending.length) return this.level;
    view.getWorldDirection(this.look);
    this.pending = this.pending.filter((event) => {
      if (this.time > event.end) return false;
      if (this.time < event.ready || this.time < this.availableAt || seated) return true;
      const delta = this.to.copy(event.at).sub(view.position), length = delta.length();
      if (length > (event.kind === 'swing' ? 10 : 6.5)) return true;
      // The empty swing kicks when the player turns away from it; the radio
      // beat is the response to the last dial turn, not a loose global sound.
      if (event.kind === 'swing' && this.look.dot(delta) / Math.max(.01,length) > .62) return true;
      if (this.#fire(event.kind, event.at)) {
        this.used.add(event.id);
        event.run();
        return false;
      }
      return true;
    });
    return this.level;
  }
}

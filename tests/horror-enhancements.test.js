import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHARACTERS, getCharacter, savedCharacterId, selectCharacter } from '../src/game/story/Characters.js';
import { createVillageSounds } from '../src/game/audio/VillageSounds.js';

test('both investigators are selectable and persist without breaking the default', t => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
  };
  t.after(() => { delete globalThis.localStorage; });
  assert.deepEqual(Object.keys(CHARACTERS), ['krish', 'ravi']);
  assert.equal(getCharacter('ravi').name, 'रवि');
  assert.equal(getCharacter('unknown').id, 'krish');
  assert.equal(savedCharacterId(), 'krish');
  selectCharacter('ravi');
  assert.equal(savedCharacterId(), 'ravi');
  assert.equal(getCharacter(savedCharacterId()).roman, 'Ravi');
  selectCharacter('krish');
  assert.equal(savedCharacterId(), 'krish');
});

test('new nightmare foley is finite, audible and distinct per gesture', () => {
  const kinds = [
    'omen-mirror', 'omen-child', 'omen-statue', 'omen-echo', 'ghost-whisper',
    'child-giggle', 'bone-crack', 'chain-drag', 'scare-heartbeat', 'scare-reverse',
    'stalker-scrape', 'radio-static',
  ];
  const samples = [], signatures = new Set();
  const node = props => ({ connect(next) { return next; }, disconnect() {}, ...props });
  const context = {
    state: 'running', sampleRate: 12000,
    createBuffer(_, length) { const data = new Float32Array(length); return { getChannelData: () => data }; },
    createBufferSource: () => node({ start() {
      const data = this.buffer.getChannelData(0);
      let peak = 0, energy = 0;
      for (const value of data) { assert.ok(Number.isFinite(value)); peak = Math.max(peak, Math.abs(value)); energy += value * value; }
      samples.push(peak);
      signatures.add(`${data.length}/${energy.toFixed(2)}`);
    } }),
    createGain: () => node({ gain: { set value(value) { assert.ok(value > 0 && value < 1); } } }),
    createPanner: () => node({ setPosition() {} }),
  };
  const sound = createVillageSounds(context, node());
  const point = { x: 2, y: 4, z: 6 };
  for (const kind of kinds) sound.cue(kind, point, 1);
  assert.equal(signatures.size, kinds.length);
  assert.ok(samples.every(peak => peak > .06 && peak < 1));
});

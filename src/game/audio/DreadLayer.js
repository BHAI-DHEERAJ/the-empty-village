// A continuous dissonance layer that tightens as the village notices the
// player. All oscillators and noise are local, so it works offline.
const hz = midi => 440 * 2 ** ((midi - 69) / 12);

export function createDreadLayer(context, destination) {
  const mix = context.createGain(); mix.gain.value = 0;
  const low = context.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 720; low.Q.value = .7;
  low.connect(mix).connect(destination);

  const rumble = context.createGain(); rumble.gain.value = .075;
  const a = context.createOscillator(), b = context.createOscillator();
  a.type = 'sawtooth'; a.frequency.value = hz(30);
  b.type = 'sine'; b.frequency.value = hz(31) * 1.031;
  const aLevel = context.createGain(), bLevel = context.createGain();
  aLevel.gain.value = .42; bLevel.gain.value = .31;
  a.connect(aLevel).connect(rumble); b.connect(bLevel).connect(rumble); rumble.connect(low);

  // Slow beating gives the silence a heartbeat even before a scare fires.
  const pulse = context.createOscillator(), depth = context.createGain();
  pulse.frequency.value = .62; depth.gain.value = .036;
  pulse.connect(depth).connect(rumble.gain);

  const length = Math.floor(context.sampleRate * 2.3);
  const noise = context.createBuffer(1, length, context.sampleRate);
  const data = noise.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < length; i++) {
    brown = brown * .967 + (Math.random() * 2 - 1) * .033;
    data[i] = brown * Math.min(1, i / 640, (length - i - 1) / 640);
  }
  const breath = context.createBufferSource(); breath.buffer = noise; breath.loop = true;
  const band = context.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 940; band.Q.value = 1.9;
  const breathGain = context.createGain(); breathGain.gain.value = .035;
  breath.connect(band).connect(breathGain).connect(mix);

  a.start(); b.start(); pulse.start(); breath.start();
  let audible = false, tension = 0;

  return {
    setAudible(on) {
      if (on === audible) return;
      audible = on;
      mix.gain.setTargetAtTime(on ? .58 : 0, context.currentTime, .5);
    },
    setTension(value) {
      const next = Math.max(0, Math.min(1, Number(value) || 0));
      if (Math.abs(next - tension) < .02 && next !== 0) return;
      tension = next;
      const now = context.currentTime;
      low.frequency.setTargetAtTime(460 + next * 1900, now, .7);
      band.frequency.setTargetAtTime(680 + next * 1580, now, .6);
      rumble.gain.setTargetAtTime(.052 + next * .11, now, .6);
      breathGain.gain.setTargetAtTime(.022 + next * .10, now, .5);
      pulse.frequency.setTargetAtTime(.55 + next * 2.4, now, .7);
      b.frequency.setTargetAtTime(hz(31) * (1.031 + next * .022), now, .8);
    },
    dispose() {
      try { a.stop(); b.stop(); pulse.stop(); breath.stop(); } catch { /* Already stopped. */ }
    },
  };
}

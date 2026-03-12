/**
 * LifeMon Sound Engine — Web Audio API synthesized effects
 * No audio files needed — everything generated programmatically
 */
const SoundEngine = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch(e) {
        enabled = false;
      }
    }
    return ctx;
  }

  function resume() {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume();
  }

  // ─── Core synthesis helpers ───

  function playTone(freq, duration, type, volume, rampDown) {
    if (!enabled) return;
    const c = getCtx();
    if (!c) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);

    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(volume || 0.15, c.currentTime);

    if (rampDown !== false) {
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    }

    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }

  function playNoise(duration, volume) {
    if (!enabled) return;
    const c = getCtx();
    if (!c) return;

    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const source = c.createBufferSource();
    source.buffer = buffer;
    const gain = c.createGain();
    source.connect(gain);
    gain.connect(c.destination);
    gain.gain.setValueAtTime(volume || 0.08, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    source.start(c.currentTime);
  }

  // ─── Game sound effects ───

  function hit() {
    resume();
    playNoise(0.15, 0.12);
    playTone(200, 0.08, 'square', 0.1);
    setTimeout(() => playTone(120, 0.1, 'square', 0.08), 50);
  }

  function superEffective() {
    resume();
    playTone(600, 0.1, 'square', 0.12);
    setTimeout(() => playTone(800, 0.1, 'square', 0.12), 80);
    setTimeout(() => playTone(1000, 0.15, 'square', 0.1), 160);
  }

  function notEffective() {
    resume();
    playTone(300, 0.15, 'triangle', 0.08);
    setTimeout(() => playTone(200, 0.2, 'triangle', 0.06), 100);
  }

  function heal() {
    resume();
    playTone(400, 0.12, 'sine', 0.1);
    setTimeout(() => playTone(500, 0.12, 'sine', 0.1), 100);
    setTimeout(() => playTone(600, 0.12, 'sine', 0.1), 200);
    setTimeout(() => playTone(800, 0.2, 'sine', 0.08), 300);
  }

  function victory() {
    resume();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, 'square', 0.1), i * 120);
    });
  }

  function defeat() {
    resume();
    const notes = [400, 350, 300, 200];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.25, 'triangle', 0.08), i * 150);
    });
  }

  function levelUp() {
    resume();
    const notes = [523, 587, 659, 784, 880, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.15, 'square', 0.1), i * 80);
    });
  }

  function evolution() {
    resume();
    // Rising sweep
    const c = getCtx();
    if (!c) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.8);
    gain.gain.setValueAtTime(0.08, c.currentTime);
    gain.gain.setValueAtTime(0.1, c.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.0);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 1.0);

    // Fanfare after sweep
    setTimeout(() => {
      const fanfare = [784, 988, 1175, 1568]; // G5 B5 D6 G6
      fanfare.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.25, 'square', 0.1), i * 100);
      });
    }, 800);
  }

  function encounter() {
    resume();
    playTone(300, 0.1, 'square', 0.1);
    setTimeout(() => playTone(350, 0.1, 'square', 0.1), 80);
    setTimeout(() => playTone(400, 0.15, 'square', 0.1), 160);
    setTimeout(() => playNoise(0.1, 0.06), 240);
  }

  function select() {
    resume();
    playTone(700, 0.06, 'square', 0.06);
  }

  function generate() {
    resume();
    // Mystery/reveal sound
    const c = getCtx();
    if (!c) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, c.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.6);
  }

  function toggle() {
    enabled = !enabled;
    return enabled;
  }

  return {
    hit, superEffective, notEffective, heal, victory, defeat,
    levelUp, evolution, encounter, select, generate, toggle,
    get enabled() { return enabled; },
    resume,
  };
})();

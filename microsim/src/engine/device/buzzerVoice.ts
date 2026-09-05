/**
 * Web Audio-based sound engine for buzzer parts (active + passive).
 * Each buzzer part gets its own oscillator+gain voice, keyed by partId,
 * so multiple buzzers can sound simultaneously and each can be
 * independently started/retuned/stopped as the simulation drives its pins.
 */

interface BuzzerVoice {
  oscillator: OscillatorNode;
  gain: GainNode;
}

let audioCtx: AudioContext | null = null;
const voices = new Map<string, BuzzerVoice>();

const ATTACK_SECONDS = 0.008;
const RELEASE_SECONDS = 0.03;
const PEAK_GAIN = 0.15; // keeps things sane when several buzzers sound at once

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }

  // Browsers start new AudioContexts suspended until a user gesture.
  // runSimulation is always triggered by clicking Run, so this resolves
  // immediately in practice.
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

function ensureVoice(partId: string): BuzzerVoice | null {
  const ctx = getAudioContext();
  if (!ctx) return null;

  let voice = voices.get(partId);
  if (voice) return voice;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "square"; // buzzers are square-wave piezo elements, not sine tones
  oscillator.frequency.value = 440;
  gain.gain.value = 0;

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();

  voice = { oscillator, gain };
  voices.set(partId, voice);
  return voice;
}

/**
 * Starts (or retunes, if already sounding) a buzzer's tone. Safe to call
 * every frame -- retuning a voice that's already ramped up just changes
 * pitch without any audible click; only silence -> sound gets an attack
 * ramp.
 */
export function setBuzzerTone(partId: string, frequencyHz: number): void {
  if (!frequencyHz || frequencyHz <= 0) {
    stopBuzzerTone(partId);
    return;
  }

  const ctx = getAudioContext();
  const voice = ensureVoice(partId);
  if (!ctx || !voice) return;

  const now = ctx.currentTime;
  voice.oscillator.frequency.setValueAtTime(frequencyHz, now);

  if (voice.gain.gain.value < PEAK_GAIN * 0.5) {
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(PEAK_GAIN, now + ATTACK_SECONDS);
  }
}

/**
 * Silences a single buzzer's voice (short release instead of an abrupt
 * cutoff, to avoid a click) without tearing down its oscillator, so it
 * can be re-triggered instantly next frame.
 */
export function stopBuzzerTone(partId: string): void {
  const ctx = audioCtx;
  const voice = voices.get(partId);
  if (!ctx || !voice) return;

  const now = ctx.currentTime;
  voice.gain.gain.cancelScheduledValues(now);
  voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
  voice.gain.gain.linearRampToValueAtTime(0, now + RELEASE_SECONDS);
}

/**
 * Fully tears down every buzzer voice -- call this when the simulation
 * stops or restarts, so a buzzer mid-tone doesn't keep humming after
 * Stop is pressed.
 */
export function stopAllBuzzers(): void {
  for (const partId of voices.keys()) {
    removeBuzzerVoice(partId);
  }
}

/**
 * Removes a single buzzer's voice entirely, e.g. when its part is
 * deleted from the canvas mid-simulation.
 */
export function removeBuzzerVoice(partId: string): void {
  const voice = voices.get(partId);
  if (!voice) return;
  try {
    voice.oscillator.stop();
    voice.oscillator.disconnect();
    voice.gain.disconnect();
  } catch {
    // already stopped -- ignore
  }
  voices.delete(partId);
}
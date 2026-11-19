type UiSound = "hover" | "click" | "success" | "error";
export type ActivitySound = "checking" | "updating" | "ram";

let audioContext: AudioContext | null = null;
let activityTimer: number | null = null;
let activityId = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return null;
  audioContext ??= new window.AudioContext();
  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => undefined);
  }
  return audioContext;
}

function note(
  context: AudioContext,
  frequency: number,
  delay: number,
  duration: number,
  volume: number,
  waveform: OscillatorType = "sine",
  endFrequency?: number
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime + delay;
  const endAt = startAt + duration;

  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  if (endFrequency && endFrequency > 0) {
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, endAt);
  }

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), startAt + Math.min(0.018, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.025);
}

export function playUiSound(sound: UiSound) {
  const context = getAudioContext();
  if (!context) return;

  switch (sound) {
    case "hover":
      note(context, 720, 0, 0.065, 0.012, "sine", 980);
      break;
    case "click":
      note(context, 470, 0, 0.095, 0.026, "triangle", 330);
      note(context, 940, 0.018, 0.055, 0.006, "sine", 700);
      break;
    case "success":
      note(context, 523.25, 0, 0.13, 0.024, "sine");
      note(context, 659.25, 0.085, 0.14, 0.025, "sine");
      note(context, 783.99, 0.17, 0.2, 0.028, "sine");
      break;
    case "error":
      note(context, 330, 0, 0.13, 0.022, "triangle", 247);
      note(context, 247, 0.1, 0.16, 0.018, "triangle", 185);
      break;
  }
}

function playActivityCue(context: AudioContext, activity: ActivitySound) {
  if (context.state !== "running") return;
  if (activity === "checking") {
    note(context, 587.33, 0, 0.14, 0.007, "sine");
    note(context, 783.99, 0.14, 0.16, 0.007, "sine");
    note(context, 987.77, 0.3, 0.19, 0.006, "sine");
    return;
  }
  if (activity === "updating") {
    note(context, 440, 0, 0.16, 0.008, "triangle");
    note(context, 554.37, 0.12, 0.16, 0.008, "triangle");
    note(context, 659.25, 0.24, 0.2, 0.009, "sine");
    return;
  }
  note(context, 392, 0, 0.2, 0.007, "sine");
  note(context, 523.25, 0.18, 0.22, 0.008, "sine");
}

export function startActivitySound(activity: ActivitySound): () => void {
  stopActivitySound();
  const context = getAudioContext();
  if (!context) return () => undefined;

  const currentId = activityId;
  const cue = () => playActivityCue(context, activity);
  cue();
  activityTimer = window.setInterval(cue, activity === "updating" ? 2100 : 2350);

  return () => {
    if (currentId === activityId) stopActivitySound();
  };
}

export function stopActivitySound() {
  activityId += 1;
  if (activityTimer !== null) {
    window.clearInterval(activityTimer);
    activityTimer = null;
  }
}


export interface IntroSoundHandle {
  setMuted(muted: boolean): void;
  stop(): void;
}

function introTone(
  context: AudioContext,
  output: AudioNode,
  frequency: number,
  delay: number,
  duration: number,
  volume: number,
  waveform: OscillatorType = "sine",
  endFrequency?: number
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime + delay;
  const endAt = startAt + duration;

  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  if (endFrequency && endFrequency > 0) {
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, endAt);
  }

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + Math.min(0.035, duration / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gain);
  gain.connect(output);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.04);
}

function introNoise(
  context: AudioContext,
  output: AudioNode,
  delay: number,
  duration: number,
  startFrequency: number,
  endFrequency: number,
  volume: number
) {
  const frameCount = Math.max(1, Math.ceil(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < frameCount; index += 1) {
    const fade = 1 - index / frameCount * 0.22;
    samples[index] = (Math.random() * 2 - 1) * fade;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const startAt = context.currentTime + delay;
  const endAt = startAt + duration;

  source.buffer = buffer;
  filter.type = "lowpass";
  filter.Q.setValueAtTime(0.7, startAt);
  filter.frequency.setValueAtTime(startFrequency, startAt);
  filter.frequency.exponentialRampToValueAtTime(endFrequency, endAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + Math.min(0.2, duration * 0.42));
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  source.start(startAt);
  source.stop(endAt + 0.04);
}

/** Original procedural trailer sound; no external audio assets or network requests. */
export function playIntroTrailerSound(reducedMotion = false): IntroSoundHandle {
  const context = getAudioContext();
  if (!context) return { setMuted: () => undefined, stop: () => undefined };

  const master = context.createGain();
  master.gain.setValueAtTime(0.52, context.currentTime);
  master.connect(context.destination);

  if (reducedMotion) {
    introTone(context, master, 523.25, 0.04, 0.34, 0.018, "sine");
    introTone(context, master, 783.99, 0.19, 0.55, 0.019, "sine");
  } else {
    // Quiet low-end atmosphere and an ascending portal sweep.
    introTone(context, master, 48, 0.02, 4.35, 0.026, "sine", 43);
    introTone(context, master, 92, 0.08, 3.2, 0.012, "triangle", 62);
    introNoise(context, master, 0.12, 1.48, 180, 5200, 0.055);
    introNoise(context, master, 1.08, 0.82, 420, 6800, 0.032);

    // Portal opening: a soft bass impact with a short, airy burst.
    introTone(context, master, 84, 1.43, 0.82, 0.17, "sine", 36);
    introTone(context, master, 164, 1.45, 0.42, 0.052, "triangle", 58);
    introNoise(context, master, 1.43, 0.48, 1900, 135, 0.095);

    // Three bright notes land with the logo reveal, followed by a fading shimmer.
    introTone(context, master, 523.25, 2.13, 0.42, 0.026, "sine");
    introTone(context, master, 659.25, 2.36, 0.47, 0.024, "sine");
    introTone(context, master, 783.99, 2.62, 0.68, 0.026, "sine");
    introTone(context, master, 1046.5, 3.12, 0.72, 0.012, "sine");
    introNoise(context, master, 3.2, 0.92, 4600, 260, 0.022);
    introTone(context, master, 659.25, 4.48, 0.48, 0.009, "sine", 523.25);
  }

  return {
    setMuted(muted: boolean) {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(muted ? 0.0001 : 0.52, now, 0.035);
    },
    stop() {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0.0001, now, 0.035);
      window.setTimeout(() => master.disconnect(), 180);
    }
  };
}

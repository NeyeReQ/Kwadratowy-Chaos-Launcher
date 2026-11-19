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

function introMusicNote(
  context: AudioContext,
  output: AudioNode,
  frequency: number,
  startAt: number,
  duration: number,
  volume: number,
  waveform: OscillatorType = "triangle",
  cutoff = 2600,
  detune = 0
) {
  const oscillator = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const endAt = startAt + duration;
  const release = Math.min(0.28, duration * 0.32);

  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  oscillator.detune.setValueAtTime(detune, startAt);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, startAt);
  filter.frequency.exponentialRampToValueAtTime(Math.max(450, cutoff * 0.62), endAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + Math.min(0.035, duration * 0.18));
  gain.gain.setValueAtTime(volume * 0.86, Math.max(startAt + 0.04, endAt - release));
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.035);
}

function introKick(context: AudioContext, output: AudioNode, startAt: number, volume = 0.23) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const endAt = startAt + 0.2;
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(142, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(43, endAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.009);
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
  oscillator.connect(gain);
  gain.connect(output);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.025);
}

function introNoiseHit(
  context: AudioContext,
  output: AudioNode,
  startAt: number,
  duration: number,
  volume: number,
  filterType: BiquadFilterType,
  cutoff: number
) {
  const frameCount = Math.max(1, Math.ceil(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < frameCount; index += 1) {
    samples[index] = Math.random() * 2 - 1;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const endAt = startAt + duration;
  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(cutoff, startAt);
  filter.Q.setValueAtTime(0.72, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  source.start(startAt);
  source.stop(endAt + 0.025);
}

function introSnare(context: AudioContext, output: AudioNode, startAt: number) {
  introNoiseHit(context, output, startAt, 0.19, 0.105, "highpass", 1050);
  introMusicNote(context, output, 185, startAt, 0.13, 0.048, "triangle", 850);
}

function introHat(context: AudioContext, output: AudioNode, startAt: number, open = false) {
  introNoiseHit(context, output, startAt, open ? 0.16 : 0.055, open ? 0.042 : 0.024, "highpass", 6900);
}

function introBell(
  context: AudioContext,
  output: AudioNode,
  frequency: number,
  startAt: number,
  volume: number,
  duration = 0.82
) {
  const partials = [
    { ratio: 1, level: 1, decay: 1 },
    { ratio: 2.01, level: 0.28, decay: 0.58 },
    { ratio: 3.93, level: 0.095, decay: 0.34 }
  ];

  for (const partial of partials) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    const endAt = startAt + duration * partial.decay;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency * partial.ratio, startAt);
    oscillator.detune.setValueAtTime(partial.ratio === 1 ? -2 : 3, startAt);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(8500, frequency * partial.ratio * 4.2), startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * partial.level), startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.035);
  }
}

/** Original, Windows-startup-inspired chime generated locally with Web Audio. */
export function playIntroTrailerSound(reducedMotion = false): IntroSoundHandle {
  const context = getAudioContext();
  if (!context) return { setMuted: () => undefined, stop: () => undefined };

  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-24, context.currentTime);
  compressor.knee.setValueAtTime(20, context.currentTime);
  compressor.ratio.setValueAtTime(4.2, context.currentTime);
  compressor.attack.setValueAtTime(0.012, context.currentTime);
  compressor.release.setValueAtTime(0.32, context.currentTime);
  master.gain.setValueAtTime(0.84, context.currentTime);
  master.connect(compressor);
  compressor.connect(context.destination);

  if (reducedMotion) {
    const start = context.currentTime + 0.04;
    introBell(context, master, 659.25, start, 0.052, 0.58);
    introBell(context, master, 1046.5, start + 0.24, 0.045, 0.66);
  } else {
    const start = context.currentTime + 0.035;

    // A soft, warm C-major-seven pad slowly blooms underneath the chime.
    const pad = [130.81, 196, 261.63, 329.63, 392, 493.88];
    pad.forEach((frequency, index) => {
      introMusicNote(context, master, frequency, start + index * 0.018, 5.45, index < 2 ? 0.026 : 0.019, "sine", 1800, index % 2 === 0 ? -4 : 4);
      if (index > 1) {
        introMusicNote(context, master, frequency * 2, start + 0.1 + index * 0.018, 4.9, 0.006, "sine", 3400, 2);
      }
    });

    // Airy rising shimmer, more like a computer waking up than a music beat.
    introTone(context, master, 145, 0.08, 2.05, 0.022, "sine", 620);
    introNoise(context, master, 0.06, 1.72, 260, 6200, 0.026);
    introNoise(context, master, 1.32, 0.92, 680, 5100, 0.014);

    // A delicate, ascending glass-bell phrase.
    const melody = [
      { note: 659.25, at: 0.78, volume: 0.064 },
      { note: 783.99, at: 1.43, volume: 0.066 },
      { note: 1046.5, at: 2.08, volume: 0.073 },
      { note: 1318.51, at: 2.73, volume: 0.074 },
      { note: 1567.98, at: 3.38, volume: 0.07 },
      { note: 1318.51, at: 4.03, volume: 0.052 },
      { note: 1046.5, at: 4.62, volume: 0.048 }
    ];
    melody.forEach(({ note, at, volume }) => {
      introBell(context, master, note, start + at, volume);
    });

    // Final warm chord and a small sparkling tail as the logo settles.
    [523.25, 659.25, 783.99, 987.77, 1174.66].forEach((frequency, index) => {
      introBell(context, master, frequency, start + 4.78 + index * 0.026, 0.025, 1.05);
    });
    introNoiseHit(context, master, start + 4.72, 0.58, 0.018, "highpass", 3600);
  }

  return {
    setMuted(muted: boolean) {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(muted ? 0.0001 : 0.84, now, 0.035);
    },
    stop() {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0.0001, now, 0.035);
      window.setTimeout(() => {
        master.disconnect();
        compressor.disconnect();
      }, 240);
    }
  };
}

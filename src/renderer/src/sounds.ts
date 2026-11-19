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

/** Original cinematic synth soundtrack generated locally with Web Audio. */
export function playIntroTrailerSound(reducedMotion = false): IntroSoundHandle {
  const context = getAudioContext();
  if (!context) return { setMuted: () => undefined, stop: () => undefined };

  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-19, context.currentTime);
  compressor.knee.setValueAtTime(18, context.currentTime);
  compressor.ratio.setValueAtTime(5.5, context.currentTime);
  compressor.attack.setValueAtTime(0.004, context.currentTime);
  compressor.release.setValueAtTime(0.22, context.currentTime);
  master.gain.setValueAtTime(0.88, context.currentTime);
  master.connect(compressor);
  compressor.connect(context.destination);

  if (reducedMotion) {
    introMusicNote(context, master, 523.25, context.currentTime + 0.04, 0.34, 0.075, "sine", 2200);
    introMusicNote(context, master, 659.25, context.currentTime + 0.19, 0.4, 0.075, "sine", 2200);
    introMusicNote(context, master, 783.99, context.currentTime + 0.38, 0.52, 0.08, "sine", 2400);
  } else {
    const start = context.currentTime + 0.035;
    const bpm = 148;
    const beat = 60 / bpm;
    const bar = beat * 4;

    // Chord progression: A minor / F / C / G — bright, adventurous and cinematic.
    const chords = [
      { pad: [220, 261.63, 329.63], bass: 55 },
      { pad: [174.61, 220, 261.63], bass: 43.65 },
      { pad: [261.63, 329.63, 392], bass: 65.41 },
      { pad: [196, 246.94, 293.66], bass: 49 }
    ];

    // Wide, filtered synth chords that lift the whole intro.
    chords.forEach((chord, barIndex) => {
      const at = start + barIndex * bar;
      chord.pad.forEach((frequency, voice) => {
        introMusicNote(context, master, frequency, at + 0.015, bar - 0.06, 0.028, "sawtooth", 1550, voice === 1 ? -7 : 5);
        introMusicNote(context, master, frequency * 2, at + 0.035, bar - 0.1, 0.009, "triangle", 3200);
      });
      // A gentle swell before each new chord.
      introNoise(context, master, Math.max(0, at - start + 0.88), 0.68, 260, 4300, 0.032);
    });

    // Pulsing bass follows the chord root and adds movement between the kicks.
    chords.forEach((chord, barIndex) => {
      for (let pulse = 0; pulse < 4; pulse += 1) {
        const at = start + barIndex * bar + pulse * beat;
        introMusicNote(context, master, chord.bass, at, 0.31, pulse % 2 === 0 ? 0.12 : 0.085, "triangle", 620);
        if (pulse === 2) {
          introMusicNote(context, master, chord.bass * 2, at + beat * 0.5, 0.16, 0.045, "sawtooth", 1100);
        }
      }
    });

    // Punchy four-on-the-floor kick, backbeat snare and crisp eighth-note hats.
    for (let step = 0; step < 16; step += 1) {
      const at = start + step * beat;
      const isBackbeat = step % 4 === 1 || step % 4 === 3;
      introKick(context, master, at, isBackbeat ? 0.14 : 0.235);
      if (isBackbeat) introSnare(context, master, at);
      introHat(context, master, at + beat * 0.5, step === 7 || step === 15);
      if (step % 4 === 2) introHat(context, master, at + beat * 0.25);
    }

    // A memorable, rising eight-note motif, repeated with a different resolution each bar.
    const melody = [
      [659.25, 783.99, 880, 1046.5, 880, 783.99, 659.25, 587.33],
      [698.46, 880, 1046.5, 1174.66, 1046.5, 880, 783.99, 698.46],
      [783.99, 1046.5, 1318.51, 1567.98, 1318.51, 1174.66, 1046.5, 783.99],
      [587.33, 783.99, 987.77, 1174.66, 987.77, 880, 783.99, 659.25]
    ];
    melody.forEach((notes, barIndex) => {
      notes.forEach((frequency, noteIndex) => {
        const at = start + barIndex * bar + noteIndex * beat * 0.5 + 0.025;
        const accent = noteIndex === 0 || noteIndex === 3 ? 0.085 : 0.061;
        introMusicNote(context, master, frequency, at, 0.17, accent, "triangle", 4200);
        if (noteIndex === 3 || noteIndex === 7) {
          introMusicNote(context, master, frequency * 2, at + 0.012, 0.115, 0.022, "sine", 5200);
        }
      });
    });

    // Portal impact on the first big downbeat and a final sparkle as the logo settles.
    introNoise(context, master, 1.38, 0.55, 5200, 110, 0.12);
    introMusicNote(context, master, 55, start + bar, 0.72, 0.22, "sine", 260);
    introMusicNote(context, master, 110, start + bar, 0.48, 0.1, "triangle", 700);
    introNoiseHit(context, master, start + bar, 0.75, 0.052, "highpass", 2400);
    introMusicNote(context, master, 1567.98, start + bar * 2.88, 0.72, 0.032, "sine", 5200);
  }

  return {
    setMuted(muted: boolean) {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(muted ? 0.0001 : 0.88, now, 0.035);
    },
    stop() {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0.0001, now, 0.035);
      window.setTimeout(() => {
        master.disconnect();
        compressor.disconnect();
      }, 220);
    }
  };
}

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

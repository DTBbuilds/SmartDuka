/**
 * Audio utilities for barcode scanning feedback
 */

// Base64 encoded beep sound (440Hz sine wave, 200ms)
const BEEP_SOUND_BASE64 =
  "UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==";

let audioContext: AudioContext | null = null;

/**
 * Initialize Web Audio API context
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a beep sound using Web Audio API
 * @param frequency - Frequency in Hz (default: 440Hz - A4 note)
 * @param duration - Duration in milliseconds (default: 200ms)
 * @param volume - Volume level 0-1 (default: 0.3)
 */
export function playBeep(
  frequency: number = 440,
  duration: number = 200,
  volume: number = 0.3,
): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();

      // Create oscillator
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Set parameters
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      // Envelope
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

      // Play
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);

      // Resolve after sound finishes
      setTimeout(resolve, duration);
    } catch (error) {
      console.error("Failed to play beep:", error);
      resolve();
    }
  });
}

/**
 * Play success beep (two beeps)
 */
export async function playSuccessBeep(): Promise<void> {
  await playBeep(440, 150, 0.3); // A4
  await new Promise((resolve) => setTimeout(resolve, 100));
  await playBeep(550, 150, 0.3); // C#5
}

/**
 * Play error beep (low frequency)
 */
export async function playErrorBeep(): Promise<void> {
  await playBeep(220, 300, 0.3); // A3
}

/**
 * Play warning beep (medium frequency)
 */
export async function playWarningBeep(): Promise<void> {
  await playBeep(330, 200, 0.3); // E4
}

/**
 * Resume audio context if suspended (required for user interaction)
 */
export function resumeAudioContext(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
  } catch (error) {
    console.error("Failed to resume audio context:", error);
  }
}

/**
 * Play an MP3 file with volume control
 * @param filePath - Path to MP3 file (e.g., '/store-scanner-beep.mp3')
 * @param volume - Volume level 0-1 (default: 0.5)
 */
export async function playMP3(
  filePath: string,
  volume: number = 0.5,
): Promise<void> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(filePath);
      audio.volume = Math.max(0, Math.min(1, volume));

      // Handle completion and errors
      const cleanup = () => {
        audio.removeEventListener("ended", cleanup);
        audio.removeEventListener("error", cleanup);
        resolve();
      };

      audio.addEventListener("ended", cleanup);
      audio.addEventListener("error", cleanup);

      // Play with error handling
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Audio playback failed:", error);
          resolve();
        });
      }

      // Timeout fallback (in case ended event doesn't fire)
      setTimeout(resolve, 5000);
    } catch (error) {
      console.error("Failed to play MP3:", error);
      resolve();
    }
  });
}

/**
 * Play cart notification sound
 */
export async function playCartNotification(volume: number = 0.5): Promise<void> {
  await playMP3("/store-scanner-beep.mp3", volume);
}

/**
 * Play transaction complete sound
 */
export async function playTransactionComplete(volume: number = 0.5): Promise<void> {
  await playSuccessBeep();
  await new Promise((resolve) => setTimeout(resolve, 200));
  await playMP3("/store-scanner-beep.mp3", volume);
}

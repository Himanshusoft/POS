/**
 * Shared POS Sound Utility
 * 
 * Provides lightweight, zero-dependency audio confirmation chimes using the
 * HTML5 Web Audio API. Designed specifically for point-of-sale tactile feedback
 * (orders fired, bills settled, staff created, tickets completed).
 * 
 * Handles browser audio restrictions safely (autoplay policy, suspended state)
 * without interrupting normal POS workflows.
 */

let audioCtx = null;
let lastPlayedAt = 0;

function getSafeAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  try {
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {
        // Safe catch: autoplay restrictions may defer resume until user interaction
      });
    }
    return audioCtx;
  } catch (err) {
    return null;
  }
}

/**
 * Play a crisp, pleasant POS success confirmation chime (dual harmonic tone).
 * Throttled to prevent audio distortion or duplicate sounds.
 */
export function playSuccessSound() {
  const now = Date.now();
  if (now - lastPlayedAt < 150) {
    return; // Prevent duplicate rapid audio
  }
  lastPlayedAt = now;

  try {
    const ctx = getSafeAudioContext();
    if (!ctx) return;

    // Ensure context is running if resumed after user gesture
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // Harmony: D5 (587.33 Hz) -> A5 (880 Hz) and A5 (880 Hz) -> D6 (1174.66 Hz)
    osc1.frequency.setValueAtTime(587.33, t);
    osc1.frequency.exponentialRampToValueAtTime(880, t + 0.1);

    osc2.frequency.setValueAtTime(880, t);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, t + 0.1);

    // Envelope: soft attack, gentle exponential decay
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.3);
    osc2.stop(t + 0.3);
  } catch (err) {
    // Non-blocking: never break application operations due to audio constraints
    console.debug('POS Audio cue deferred or suppressed:', err?.message || err);
  }
}

// Alias for semantic clarity
export const playConfirmationSound = playSuccessSound;

export default {
  playSuccessSound,
  playConfirmationSound,
};

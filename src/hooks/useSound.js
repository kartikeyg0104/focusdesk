import { useCallback, useEffect, useRef } from 'react';

// All audio is synthesised with Web Audio, so the app ships no sound files and
// works offline. The context is created lazily because browsers only allow
// audio after the user has interacted with the page.

function noiseBuffer(context, kind) {
  const length = context.sampleRate * 4;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (kind === 'brown') {
      // Integrating white noise gives the deeper, softer "brown" rumble.
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white * 0.6;
    }
  }
  return buffer;
}

export function useSound({ enabled, ambient, volume }) {
  const contextRef = useRef(null);
  const ambientRef = useRef(null);

  const getContext = useCallback(() => {
    if (!contextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      contextRef.current = new AudioContextClass();
    }
    if (contextRef.current.state === 'suspended') contextRef.current.resume().catch(() => {});
    return contextRef.current;
  }, []);

  const tone = useCallback(
    (frequency, startOffset, length, peak = 0.16) => {
      const context = getContext();
      if (!context) return;
      const start = context.currentTime + startOffset;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + length + 0.05);
    },
    [getContext]
  );

  const play = useCallback(
    (name) => {
      if (!enabled) return;
      if (name === 'complete') {
        // A rising major triad for a finished focus block.
        tone(523.25, 0, 0.5);
        tone(659.25, 0.14, 0.5);
        tone(783.99, 0.28, 0.9);
      } else if (name === 'break') {
        tone(659.25, 0, 0.45);
        tone(523.25, 0.16, 0.7);
      } else if (name === 'check') {
        tone(880, 0, 0.14, 0.09);
        tone(1318.5, 0.07, 0.2, 0.07);
      } else if (name === 'start') {
        tone(440, 0, 0.18, 0.08);
      }
    },
    [enabled, tone]
  );

  const stopAmbient = useCallback(() => {
    const current = ambientRef.current;
    if (!current) return;
    ambientRef.current = null;
    try {
      current.gain.gain.setTargetAtTime(0.0001, current.context.currentTime, 0.15);
      current.source.stop(current.context.currentTime + 0.6);
    } catch (_error) {
      // The node may already be stopped.
    }
  }, []);

  // active = the timer is running a focus block.
  const setAmbientActive = useCallback(
    (active) => {
      if (!active || ambient === 'off') {
        stopAmbient();
        return;
      }
      if (ambientRef.current?.kind === ambient) return;
      stopAmbient();
      const context = getContext();
      if (!context) return;

      const source = context.createBufferSource();
      source.buffer = noiseBuffer(context, ambient === 'brown' ? 'brown' : 'white');
      source.loop = true;
      const filter = context.createBiquadFilter();
      if (ambient === 'rain') {
        // Band-limited noise reads as steady rain.
        filter.type = 'bandpass';
        filter.frequency.value = 1400;
        filter.Q.value = 0.4;
      } else if (ambient === 'brown') {
        filter.type = 'lowpass';
        filter.frequency.value = 700;
      } else {
        filter.type = 'lowpass';
        filter.frequency.value = 9000;
      }
      const gain = context.createGain();
      gain.gain.value = 0.0001;
      gain.gain.setTargetAtTime((volume / 100) * 0.35, context.currentTime, 0.4);
      source.connect(filter).connect(gain).connect(context.destination);
      source.start();
      ambientRef.current = { kind: ambient, source, gain, context };
    },
    [ambient, getContext, stopAmbient, volume]
  );

  useEffect(() => {
    const current = ambientRef.current;
    if (current) current.gain.gain.setTargetAtTime((volume / 100) * 0.35, current.context.currentTime, 0.1);
  }, [volume]);

  useEffect(() => stopAmbient, [stopAmbient]);

  return { play, setAmbientActive };
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sampleRate = 22050;
const beatsPerMinute = 136;
const beatSeconds = 60 / beatsPerMinute;
const bars = 8;
const beatsPerBar = 4;
const totalBeats = bars * beatsPerBar;
const durationSeconds = totalBeats * beatSeconds;
const sampleCount = Math.ceil(durationSeconds * sampleRate);
const samples = new Float32Array(sampleCount);
const tau = Math.PI * 2;

function midiFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function waveAt(phase, shape) {
  const cycle = phase / tau;
  if (shape === 'square') return cycle % 1 < 0.5 ? 1 : -1;
  if (shape === 'triangle') return 1 - 4 * Math.abs((cycle % 1) - 0.5);
  if (shape === 'saw') return 2 * (cycle % 1) - 1;
  return Math.sin(phase);
}

function mix(timeSeconds, value) {
  const index = Math.floor(timeSeconds * sampleRate);
  if (index >= 0 && index < samples.length) samples[index] += value;
}

function addSynthNote(startBeat, durationBeats, note, voice, volume) {
  const startSeconds = startBeat * beatSeconds;
  const duration = durationBeats * beatSeconds;
  const startSample = Math.max(0, Math.floor(startSeconds * sampleRate));
  const endSample = Math.min(samples.length, Math.ceil((startSeconds + duration) * sampleRate));
  const baseFrequency = midiFrequency(note);

  for (let index = startSample; index < endSample; index += 1) {
    const time = index / sampleRate - startSeconds;
    const progress = time / duration;
    const attackSeconds = voice === 'pad' ? 0.09 : 0.008;
    const releaseSeconds = voice === 'pad' ? 0.24 : 0.055;
    const attack = Math.min(1, time / attackSeconds);
    const release = Math.min(1, (duration - time) / releaseSeconds);
    const envelope = Math.max(0, Math.min(attack, release));
    const vibrato = voice === 'lead' ? Math.sin(time * tau * 5.2) * 2.2 : 0;
    const phase = tau * (baseFrequency + vibrato) * time;
    let value = 0;

    if (voice === 'bass') {
      value = waveAt(phase, 'triangle') * 0.72 + waveAt(phase, 'sine') * 0.28;
    } else if (voice === 'pad') {
      value = waveAt(phase, 'sine') * 0.72 + waveAt(phase, 'triangle') * 0.28;
    } else {
      value = waveAt(phase, 'square') * 0.58
        + waveAt(phase, 'triangle') * 0.27
        + waveAt(phase, 'sine') * 0.15;
      value *= 0.9 + Math.sin(progress * Math.PI) * 0.1;
    }

    samples[index] += value * envelope * volume;
  }
}

function addKick(startBeat, volume = 0.42) {
  const start = Math.floor(startBeat * beatSeconds * sampleRate);
  const length = Math.floor(0.2 * sampleRate);
  for (let offset = 0; offset < length && start + offset < samples.length; offset += 1) {
    const time = offset / sampleRate;
    const frequency = 118 * Math.exp(-time * 17) + 39;
    const envelope = Math.exp(-time * 17);
    samples[start + offset] += Math.sin(tau * frequency * time) * envelope * volume;
  }
}

let noiseSeed = 0x41C64E6D;
function nextNoise() {
  noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0;
  return (noiseSeed / 2147483648) - 1;
}

function addSnare(startBeat, volume = 0.2) {
  const start = Math.floor(startBeat * beatSeconds * sampleRate);
  const length = Math.floor(0.16 * sampleRate);
  for (let offset = 0; offset < length && start + offset < samples.length; offset += 1) {
    const time = offset / sampleRate;
    const envelope = Math.exp(-time * 24);
    const noise = nextNoise();
    const tone = Math.sin(tau * 185 * time) * 0.22;
    samples[start + offset] += (noise * 0.78 + tone) * envelope * volume;
  }
}

function addHat(startBeat, volume = 0.075) {
  const start = Math.floor(startBeat * beatSeconds * sampleRate);
  const length = Math.floor(0.055 * sampleRate);
  let previous = 0;
  for (let offset = 0; offset < length && start + offset < samples.length; offset += 1) {
    const time = offset / sampleRate;
    const noise = nextNoise();
    const highPass = noise - previous * 0.72;
    previous = noise;
    samples[start + offset] += highPass * Math.exp(-time * 55) * volume;
  }
}

function addRiser(startBeat, durationBeats) {
  const startSeconds = startBeat * beatSeconds;
  const duration = durationBeats * beatSeconds;
  const start = Math.floor(startSeconds * sampleRate);
  const end = Math.min(samples.length, Math.ceil((startSeconds + duration) * sampleRate));
  for (let index = start; index < end; index += 1) {
    const time = index / sampleRate - startSeconds;
    const progress = time / duration;
    const frequency = 160 + progress * progress * 1240;
    const envelope = Math.sin(progress * Math.PI) * 0.07;
    samples[index] += Math.sin(tau * frequency * time) * envelope;
  }
}

const progressions = [
  { root: 38, chord: [62, 65, 69] },
  { root: 34, chord: [58, 62, 65] },
  { root: 41, chord: [60, 65, 69] },
  { root: 36, chord: [60, 64, 67] },
];
const melodyPhrases = [
  [74, 77, 81, 79, 77, 74, 72, 69],
  [72, 74, 77, 74, 72, 69, 65, -1],
  [69, 72, 74, 77, 74, 72, 69, 67],
  [65, 69, 72, 74, 72, 69, 65, -1],
];
const arpeggioPattern = [0, 2, 1, 2, 0, 2, 1, 2];

for (let bar = 0; bar < bars; bar += 1) {
  const startBeat = bar * beatsPerBar;
  const progression = progressions[Math.floor(bar / 2)];
  const root = progression.root;
  const chord = progression.chord;
  const phraseIndex = Math.floor(bar / 2);
  const phrase = melodyPhrases[phraseIndex];

  for (const chordNote of chord) {
    addSynthNote(startBeat, beatsPerBar * 0.96, chordNote, 'pad', 0.045);
  }

  for (let beat = 0; beat < beatsPerBar; beat += 1) {
    const bassNote = beat === 1 || beat === 3 ? root + 12 : root;
    addSynthNote(startBeat + beat, 0.58, bassNote, 'bass', beat === 0 ? 0.24 : 0.18);
  }

  for (let eighth = 0; eighth < 8; eighth += 1) {
    const beat = startBeat + eighth * 0.5;
    const chordIndex = arpeggioPattern[(eighth + bar) % arpeggioPattern.length];
    const arpOctave = eighth % 4 === 3 ? 12 : 0;
    addSynthNote(beat, 0.32, chord[chordIndex] + 12 + arpOctave, 'lead', 0.085);

    const melodyNote = phrase[(eighth + (bar % 2 ? 2 : 0)) % phrase.length];
    if (melodyNote > 0) {
      addSynthNote(beat + 0.02, 0.38, melodyNote, 'lead', 0.13);
    }

    addHat(beat, eighth % 2 === 0 ? 0.075 : 0.052);
  }

  for (const kickBeat of [0, 2]) addKick(startBeat + kickBeat);
  addSnare(startBeat + 1, bar % 2 === 0 ? 0.21 : 0.17);
  addSnare(startBeat + 3, bar % 2 === 0 ? 0.2 : 0.16);

  if (bar === 3 || bar === 7) addRiser(startBeat + 3, 1);
}

const edgeFadeSamples = Math.floor(sampleRate * 0.025);
let peak = 0;
for (let index = 0; index < samples.length; index += 1) {
  const edgeFade = Math.min(1, index / edgeFadeSamples, (samples.length - index - 1) / edgeFadeSamples);
  samples[index] *= Math.max(0, edgeFade);
  peak = Math.max(peak, Math.abs(samples[index]));
}

const gain = peak > 0 ? 0.9 / peak : 1;
const dataSize = sampleCount * 2;
const wav = Buffer.alloc(44 + dataSize);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + dataSize, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(dataSize, 40);

for (let index = 0; index < sampleCount; index += 1) {
  const compressed = Math.tanh(samples[index] * gain * 1.3) / Math.tanh(1.3);
  const value = Math.max(-1, Math.min(1, compressed));
  wav.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.resolve(scriptDirectory, '../assets/audio/ashos-arcade-loop.wav');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, wav);
console.log(`Wrote ${(wav.byteLength / 1024).toFixed(1)} KiB of ${durationSeconds.toFixed(1)}s loop music to ${outputPath}`);

import {
  AcousticReceiver,
  classifyIdentity,
  detectTone,
  encodeIdentity,
  preambleMs,
  symbolMs,
  toneFrequencies,
} from "./acoustic";

const identity = Uint8Array.from({ length: 16 }, (_, i) => i * 13);

function receiveWave(sampleRate: number, corrupt = false) {
  const symbols = encodeIdentity(identity);
  if (corrupt) symbols[symbols.length - 1] = ((symbols.at(-1) ?? 0) + 1) % 4;
  const receiver = new AcousticReceiver();
  let received: Uint8Array | null = null;
  const end = preambleMs * 3 + symbols.length * symbolMs;
  for (let now = 0; now < end + 80; now += 16) {
    const samples = Float32Array.from({ length: 2048 }, (_, i) => {
      const time = now - ((2048 - i) / sampleRate) * 1000;
      if (time < 0 || time >= end) return 0;
      const tone =
        time < preambleMs
          ? 4
          : time < preambleMs * 2
            ? 5
            : time < preambleMs * 3
              ? 4
              : symbols[Math.floor((time - preambleMs * 3) / symbolMs)];
      const frequency = toneFrequencies[tone ?? 0] ?? 0;
      return (
        0.04 * Math.sin((2 * Math.PI * frequency * time) / 1000) +
        0.001 * Math.sin(i * 37)
      );
    });
    const result = receiver.read(detectTone(samples, sampleRate), now);
    if (result) received = result;
  }
  return received;
}

it.each([44100, 48000])(
  "decodes a complete acoustic waveform at %s Hz with noise and polling jitter",
  (sampleRate) => {
    expect(receiveWave(sampleRate)).toEqual(identity);
  },
);

it("rejects a waveform with a corrupted checksum rather than identifying another environment", () => {
  expect(receiveWave(48000, true)).toBeNull();
  expect(detectTone(new Float32Array(2048), 48000)).toBeNull();
  const receiver = new AcousticReceiver();
  for (let now = 0; now < 12000; now += 16)
    expect(receiver.read(now % 4, now)).toBeNull();
});

it("never classifies an unreadable local identity as a different environment", () => {
  expect(classifyIdentity(null, identity)).toBeNull();
  expect(classifyIdentity(identity, identity)).toBe("same");
  expect(classifyIdentity(identity, new Uint8Array(16))).toBe("other");
});

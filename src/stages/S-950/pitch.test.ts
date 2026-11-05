import { cents, estimatePitch, PitchHold, strings } from "./pitch";

function tone(frequency: number, rate = 48000, harmonics = [0.3]) {
  return Float32Array.from({ length: 8192 }, (_, i) =>
    harmonics.reduce(
      (sum, amplitude, harmonic) =>
        sum +
        amplitude *
          Math.sin((2 * Math.PI * frequency * (harmonic + 1) * i) / rate + 0.1),
      0,
    ),
  );
}
it("recognizes all six fundamentals at 44.1/48/96 kHz and distinguishes both E octaves", () => {
  for (const rate of [44100, 48000, 96000])
    for (const string of strings) {
      const estimate = estimatePitch(tone(string.frequency, rate), rate);
      expect(estimate).not.toBeNull();
      expect(Math.abs(cents(estimate ?? 0, string.frequency))).toBeLessThan(6);
    }
});
it("keeps a weaker fundamental under strong harmonics and rejects silence, noise, unrelated chords and missing fundamentals", () => {
  for (const string of strings) {
    const estimate = estimatePitch(
      tone(string.frequency, 48000, [0.12, 0.45, 0.09]),
      48000,
    );
    expect(estimate, string.note).not.toBeNull();
    expect(Math.abs(cents(estimate ?? 0, string.frequency))).toBeLessThan(6);
  }
  expect(estimatePitch(new Float32Array(8192), 48000)).toBeNull();
  let seed = 12345;
  const noise = Float32Array.from({ length: 8192 }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed / 2 ** 32 - 0.5) * 0.5;
  });
  expect(estimatePitch(noise, 48000)).toBeNull();
  const chord = tone(110),
    other = tone(146.8324);
  chord.forEach((value, i) => {
    chord[i] = value + (other[i] ?? 0);
  });
  expect(estimatePitch(chord, 48000)).toBeNull();
  expect(estimatePitch(tone(110, 48000, [0, 0.3, 0.3]), 48000)).toBeNull();
});
it("rejects invalid samples and levels without treating missing data as a note", () => {
  const samples = tone(110);
  samples[300] = NaN;
  expect(estimatePitch(samples, 48000)).toBeNull();
  expect(estimatePitch(tone(110, 48000, [0.001]), 48000)).toBeNull();
  expect(estimatePitch(tone(110), 0)).toBeNull();
});
it("requires the same target for 300ms within ±35 cents and resets on gaps, switching, wrong notes or stopped clocks", () => {
  const gate = new PitchHold(),
    note = 110;
  expect(gate.observe(note, 0)).toBeNull();
  expect(gate.observe(note, 100)).toBeNull();
  expect(gate.observe(note, 200)).toBeNull();
  expect(gate.observe(note, 299)).toBeNull();
  expect(gate.observe(note, 300)).toBe(1);
  gate.reset();
  gate.observe(note, 0);
  gate.observe(note, 100);
  expect(gate.observe(note, 400)).toBeNull();
  gate.observe(note, 500);
  expect(gate.observe(note, 500)).toBeNull();
  gate.observe(null, 600);
  expect(gate.observe(note, 700)).toBeNull();
  expect(gate.observe(note * 2 ** (36 / 1200), 800)).toBeNull();
  expect(gate.observe(82.4069, 900)).toBeNull();
});

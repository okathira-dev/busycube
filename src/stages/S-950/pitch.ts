export const strings = [
  { id: "B01", note: "E2", frequency: 82.4069 },
  { id: "B02", note: "A2", frequency: 110 },
  { id: "B03", note: "D3", frequency: 146.8324 },
  { id: "B04", note: "G3", frequency: 195.9977 },
  { id: "B05", note: "B3", frequency: 246.9417 },
  { id: "B06", note: "E4", frequency: 329.6276 },
] as const;
export const toleranceCents = 35;
export const holdMs = 300;
export const cents = (frequency: number, target: number) =>
  1200 * Math.log2(frequency / target);
export function estimatePitch(
  input: Float32Array,
  sampleRate: number,
): number | null {
  if (
    !Number.isFinite(sampleRate) ||
    sampleRate < 8000 ||
    sampleRate > 192000 ||
    input.length < 2048
  )
    return null;
  const step = Math.max(1, Math.floor(sampleRate / 12000));
  const rate = sampleRate / step,
    n = Math.floor(input.length / step);
  const samples = new Float64Array(n);
  let mean = 0;
  for (let i = 0; i < n; i++) {
    let total = 0;
    for (let j = 0; j < step; j++) {
      const value = input[i * step + j];
      if (
        value === undefined ||
        !Number.isFinite(value) ||
        Math.abs(value) > 1.01
      )
        return null;
      total += value;
    }
    const value = total / step;
    samples[i] = value;
    mean += value;
  }
  mean /= n;
  let energy = 0;
  for (let i = 0; i < n; i++) {
    const value = (samples[i] ?? 0) - mean;
    samples[i] = value;
    energy += value * value;
  }
  energy /= n;
  if (energy < 0.000064) return null;
  const min = Math.floor(rate / 400),
    max = Math.min(Math.ceil(rate / 65), Math.floor(n / 3));
  const difference = new Float64Array(max + 1),
    normalized = new Float64Array(max + 1);
  const window = n - max;
  let sum = 0;
  for (let lag = 1; lag <= max; lag++) {
    let value = 0;
    for (let i = 0; i < window; i++) {
      const delta = (samples[i] ?? 0) - (samples[i + lag] ?? 0);
      value += delta * delta;
    }
    difference[lag] = value;
    sum += value;
    normalized[lag] = sum > 0 ? (value * lag) / sum : 1;
  }
  // YIN's first sufficiently periodic local minimum avoids selecting arbitrary
  // autocorrelation multiples. No global-minimum fallback for noise.
  let lag = min;
  for (; lag < max; lag++) {
    if ((normalized[lag] ?? 1) < 0.1) {
      while (
        lag + 1 < max &&
        (normalized[lag + 1] ?? 1) < (normalized[lag] ?? 1)
      )
        lag++;
      break;
    }
  }
  if (lag >= max) return null;
  const frequencyAt = (position: number) => {
    const left = difference[position - 1] ?? 0,
      center = difference[position] ?? 0,
      right = difference[position + 1] ?? 0;
    const divisor = left - 2 * center + right;
    return rate / (position + (divisor ? (0.5 * (left - right)) / divisor : 0));
  };
  const amplitudeAt = (frequency: number) => {
    let sin = 0,
      cos = 0;
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * frequency * i) / rate,
        value = samples[i] ?? 0;
      sin += value * Math.sin(angle);
      cos += value * Math.cos(angle);
    }
    return (2 * Math.hypot(sin, cos)) / n;
  };
  const initial = lag;
  for (let multiple = 2; multiple <= 4; multiple++) {
    const center = initial * multiple;
    if (center + 2 >= max) break;
    let best = center;
    for (let candidate = center - 2; candidate <= center + 2; candidate++)
      if ((normalized[candidate] ?? 1) < (normalized[best] ?? 1))
        best = candidate;
    if (
      (normalized[lag] ?? 0) > 0.003 &&
      (normalized[best] ?? 1) < (normalized[lag] ?? 1) * 0.35 &&
      amplitudeAt(frequencyAt(best)) >= amplitudeAt(frequencyAt(lag)) * 0.12
    )
      lag = best;
  }
  const frequency = frequencyAt(lag);
  if (!Number.isFinite(frequency) || frequency < 70 || frequency > 380)
    return null;
  // Require a real fundamental and mostly one harmonic series. A small target
  // component inside noise or an unrelated chord is insufficient.
  const amplitudes: number[] = [];
  for (let harmonic = 1; harmonic <= 6; harmonic++) {
    amplitudes.push(amplitudeAt(frequency * harmonic));
  }
  const fundamental = amplitudes[0] ?? 0,
    peak = Math.max(...amplitudes);
  const explained = amplitudes.reduce(
    (total, value) => total + (value * value) / 2,
    0,
  );
  if (fundamental < peak * 0.12 || explained / energy < 0.72) return null;
  return frequency;
}
export class PitchHold {
  private index: number | null = null;
  private since = 0;
  private previous: number | null = null;
  reset() {
    this.index = null;
    this.previous = null;
    this.since = 0;
  }
  observe(frequency: number | null, time: number) {
    if (
      frequency === null ||
      !Number.isFinite(frequency) ||
      frequency <= 0 ||
      !Number.isFinite(time) ||
      time < 0
    ) {
      this.reset();
      return null;
    }
    if (
      this.previous !== null &&
      (time <= this.previous || time - this.previous > 150)
    )
      this.reset();
    this.previous = time;
    const index = strings.findIndex(
      (string) =>
        Math.abs(cents(frequency, string.frequency)) <= toleranceCents,
    );
    if (index < 0) {
      this.index = null;
      return null;
    }
    if (this.index !== index) {
      this.index = index;
      this.since = time;
    }
    return time - this.since >= holdMs ? index : null;
  }
}

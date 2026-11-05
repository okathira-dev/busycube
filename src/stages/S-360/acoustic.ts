export const toneFrequencies = [1200, 1600, 2000, 2400, 3200, 800] as const;
export const symbolMs = 120;
export const preambleMs = 240;
const identityBytes = 16;
const packetBytes = 3 + identityBytes + 2;
const packetSymbols = packetBytes * 4;

function checksum(bytes: readonly number[]): number {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

export async function acousticIdentity(
  installationId: string,
): Promise<Uint8Array> {
  if (!installationId) throw new Error("Storage identity unavailable");
  return new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`busycube:S-360:v1:${installationId}`),
    ),
  ).slice(0, identityBytes);
}

export function encodeIdentity(identity: Uint8Array): number[] {
  if (identity.length !== identityBytes) throw new Error("Invalid identity");
  const bytes = [0x42, 0x43, 1, ...identity];
  const crc = checksum(bytes);
  bytes.push(crc >> 8, crc & 255);
  return bytes.flatMap((byte) => [
    byte >> 6,
    (byte >> 4) & 3,
    (byte >> 2) & 3,
    byte & 3,
  ]);
}

export function classifyIdentity(
  own: Uint8Array | null,
  received: Uint8Array,
): "same" | "other" | null {
  if (!own || own.length !== identityBytes || received.length !== identityBytes)
    return null;
  return own.every((byte, index) => byte === received[index])
    ? "same"
    : "other";
}

function decodeIdentity(symbols: readonly number[]): Uint8Array | null {
  if (symbols.length !== packetSymbols) return null;
  const bytes: number[] = [];
  for (let i = 0; i < symbols.length; i += 4) {
    const chunk = symbols.slice(i, i + 4);
    if (chunk.some((symbol) => symbol < 0 || symbol > 3)) return null;
    bytes.push(chunk.reduce((byte, symbol) => (byte << 2) | symbol, 0));
  }
  if (bytes[0] !== 0x42 || bytes[1] !== 0x43 || bytes[2] !== 1) return null;
  const crc = checksum(bytes.slice(0, -2));
  if (bytes.at(-2) !== crc >> 8 || bytes.at(-1) !== (crc & 255)) return null;
  return Uint8Array.from(bytes.slice(3, 3 + identityBytes));
}

export function detectTone(
  samples: Float32Array,
  sampleRate: number,
): number | null {
  let energy = 0;
  for (const value of samples) energy += value * value;
  energy /= samples.length;
  if (energy < 0.000064) return null;
  const powers = toneFrequencies.map((frequency) => {
    const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / sampleRate);
    let previous = 0;
    let older = 0;
    for (const sample of samples) {
      const next = sample + coefficient * previous - older;
      older = previous;
      previous = next;
    }
    return (
      (previous * previous + older * older - coefficient * previous * older) /
      (samples.length * samples.length)
    );
  });
  const ranked = powers
    .map((power, tone) => ({ power, tone }))
    .sort((a, b) => b.power - a.power);
  const first = ranked[0];
  const second = ranked[1];
  return first &&
    second &&
    first.power >= energy * 0.25 &&
    first.power >= second.power * 3
    ? first.tone
    : null;
}

export class AcousticReceiver {
  private phase = 0;
  private toneStarted = 0;
  private previousTone: number | null = null;
  private lastToneAt = 0;
  private symbols: number[] | null = null;
  private sampleAt = 0;

  read(tone: number | null, now: number): Uint8Array | null {
    if (this.symbols) {
      if (now < this.sampleAt) return null;
      if (now - this.sampleAt > 70 || tone === null || tone > 3) {
        this.reset();
        return null;
      }
      this.symbols.push(tone);
      this.sampleAt += symbolMs;
      if (this.symbols.length !== packetSymbols) return null;
      const identity = decodeIdentity(this.symbols);
      this.reset();
      return identity;
    }
    // A window overlapping two tones may briefly have no dominant frequency.
    if (tone === null) {
      if (now - this.lastToneAt > 100) this.reset();
      return null;
    }
    this.lastToneAt = now;
    const before = this.previousTone;
    const duration = now - this.toneStarted;
    if (tone !== before) {
      this.previousTone = tone;
      this.toneStarted = now;
      if (this.phase === 1 && before === 4 && tone === 5 && duration >= 140)
        this.phase = 2;
      else if (
        this.phase === 2 &&
        before === 5 &&
        tone === 4 &&
        duration >= 140
      )
        this.phase = 3;
      else if (
        this.phase === 3 &&
        before === 4 &&
        tone !== null &&
        tone < 4 &&
        duration >= 140
      ) {
        this.symbols = [];
        this.sampleAt = now + 40;
      } else this.phase = tone === 4 ? 1 : 0;
    }
    return null;
  }

  reset() {
    this.phase = 0;
    this.previousTone = null;
    this.symbols = null;
  }
}

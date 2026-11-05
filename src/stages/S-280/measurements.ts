export type Group = "battery" | "device" | "environment" | "fitness";
export type Measurement = {
  service: number;
  characteristic: number;
  notificationsOnly?: boolean;
};

export const measurements: Record<Group, readonly Measurement[]> = {
  battery: [{ service: 0x180f, characteristic: 0x2a19 }],
  device: [0x2a29, 0x2a24].map((characteristic) => ({
    service: 0x180a,
    characteristic,
  })),
  environment: [0x2a6e, 0x2a6f, 0x2a6d].map((characteristic) => ({
    service: 0x181a,
    characteristic,
  })),
  fitness: [
    { service: 0x180d, characteristic: 0x2a37, notificationsOnly: true },
    ...[0x2acd, 0x2ace, 0x2acf, 0x2ad0, 0x2ad1, 0x2ad2].map(
      (characteristic) => ({
        service: 0x1826,
        characteristic,
        notificationsOnly: true,
      }),
    ),
  ],
};

// GATT Specification Supplement (2026-09-09), FTMS data flags and field widths.
// Bit zero is More Data: the base measurement is present when that bit is zero.
const fitnessLayouts: Record<
  number,
  {
    flagBytes: number;
    baseBytes: number;
    widths: readonly number[];
    allowed: number;
  }
> = {
  10957: {
    flagBytes: 2,
    baseBytes: 2,
    widths: [2, 3, 4, 4, 1, 1, 5, 1, 1, 2, 2, 4],
    allowed: 0x1fff,
  },
  10958: {
    flagBytes: 3,
    baseBytes: 2,
    widths: [2, 3, 4, 2, 4, 4, 1, 2, 2, 5, 1, 1, 2, 2],
    allowed: 0xffff,
  },
  10959: {
    flagBytes: 2,
    baseBytes: 4,
    widths: [2, 2, 2, 5, 1, 1, 2, 2],
    allowed: 0x1ff,
  },
  10960: {
    flagBytes: 2,
    baseBytes: 2,
    widths: [2, 2, 2, 2, 5, 1, 1, 2, 2],
    allowed: 0x3ff,
  },
  10961: {
    flagBytes: 2,
    baseBytes: 3,
    widths: [1, 3, 2, 2, 2, 2, 2, 5, 1, 1, 2, 2],
    allowed: 0x1fff,
  },
  10962: {
    flagBytes: 2,
    baseBytes: 2,
    widths: [2, 2, 2, 3, 2, 2, 2, 5, 1, 1, 2, 2],
    allowed: 0x1fff,
  },
};

function validHeartRate(value: DataView) {
  if (value.byteLength < 2) return false;
  const flags = value.getUint8(0);
  if (flags & 0xe0) return false;
  let length = 1 + (flags & 1 ? 2 : 1) + (flags & 8 ? 2 : 0);
  if (value.byteLength < length) return false;
  // RR intervals are a nonempty, even-length array only when flagged.
  if (flags & 16) {
    if (value.byteLength < length + 2 || (value.byteLength - length) % 2)
      return false;
    length = value.byteLength;
  }
  return value.byteLength === length;
}
function validFitness(characteristic: number, value: DataView) {
  const layout = fitnessLayouts[characteristic];
  if (!layout || value.byteLength < layout.flagBytes) return false;
  const flags =
    value.getUint16(0, true) |
    (layout.flagBytes === 3 ? value.getUint8(2) << 16 : 0);
  if (flags & ~layout.allowed) return false;
  let payload = flags & 1 ? 0 : layout.baseBytes;
  for (const [index, width] of layout.widths.entries())
    if (flags & (1 << (index + 1))) payload += width;
  return payload > 0 && value.byteLength === layout.flagBytes + payload;
}

/** Validate the complete received field, without retaining or displaying raw values. */
export function validMeasurement(characteristic: number, value: DataView) {
  switch (characteristic) {
    case 0x2a19:
      return value.byteLength === 1 && value.getUint8(0) <= 100;
    case 0x2a24:
    case 0x2a29: {
      if (!value.byteLength || value.byteLength > 512) return false;
      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(value);
        // biome-ignore lint/suspicious/noControlCharactersInRegex: 空白だけの値と制御文字入りの識別文字列を拒否する。
        return text.trim().length > 0 && !/[\u0000-\u001f\u007f]/.test(text);
      } catch {
        return false;
      }
    }
    case 0x2a6e:
      return value.byteLength === 2 && value.getInt16(0, true) >= -27315;
    case 0x2a6f:
      return value.byteLength === 2 && value.getUint16(0, true) <= 10000;
    case 0x2a6d:
      return value.byteLength === 4;
    case 0x2a37:
      return validHeartRate(value);
    default:
      return validFitness(characteristic, value);
  }
}

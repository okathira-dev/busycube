export const encodingLabels = [
  "utf-8",
  "windows-1252",
  "iso-8859-2",
  "iso-8859-5",
  "shift_jis",
  "windows-1255",
  "gbk",
  "big5",
  "koi8-r",
  "koi8-u",
  "ibm866",
  "macintosh",
  "x-mac-cyrillic",
  "windows-1251",
  "iso-8859-7",
  "windows-874",
] as const;

export type EncodingLabel = (typeof encodingLabels)[number];

type MojibakeEncodingFixture = {
  readonly bytes: readonly number[];
  readonly expectedText: string;
  readonly id: string;
  readonly kind: "mojibake";
  readonly presentedText: string;
  readonly renderedLabel: EncodingLabel;
  readonly sourceLabel: EncodingLabel;
};

export type EncodingFixture = MojibakeEncodingFixture;

export type EncodingFixturePosition = {
  readonly bytes: readonly number[];
  readonly expectedLabel: EncodingLabel;
  readonly expectedText: string;
  readonly id: string;
};

const mojibakeFixture = (
  id: string,
  sourceLabel: EncodingLabel,
  renderedLabel: EncodingLabel,
  bytes: readonly number[],
  expectedText: string,
  presentedText: string,
): MojibakeEncodingFixture => ({
  bytes,
  expectedText,
  id,
  kind: "mojibake",
  presentedText,
  renderedLabel,
  sourceLabel,
});

/** Eight fixed mojibake questions. Each question has an ordered source and
 * display decoder pair; the player submits the recovered text, not a label. */
export const encodingFixtures = [
  mojibakeFixture(
    "M01",
    "utf-8",
    "windows-1252",
    [99, 97, 102, 195, 169, 32, 102, 114, 97, 110, 195, 167, 97, 105, 115],
    "café français",
    "cafÃ© franÃ§ais",
  ),
  mojibakeFixture(
    "M02",
    "koi8-r",
    "windows-1251",
    [205, 193, 212, 210, 163, 219, 203, 193],
    "матрёшка",
    "НБФТЈЫЛБ",
  ),
  mojibakeFixture(
    "M03",
    "koi8-u",
    "ibm866",
    [208, 193, 205, 208, 213, 219, 203, 193],
    "пампушка",
    "╨┴═╨╒█╦┴",
  ),
  mojibakeFixture(
    "M04",
    "macintosh",
    "x-mac-cyrillic",
    [115, 109, 191, 114, 114, 101, 98, 114, 191, 100],
    "smørrebrød",
    "smњrrebrњd",
  ),
  mojibakeFixture(
    "M05",
    "windows-1255",
    "iso-8859-7",
    [231, 240, 229, 235, 228],
    "חנוכה",
    "ηπελδ",
  ),
  mojibakeFixture(
    "M06",
    "windows-874",
    "windows-1252",
    [181, 233, 193, 194, 211, 161, 216, 233, 167],
    "ต้มยำกุ้ง",
    "µéÁÂÓ¡Øé§",
  ),
  mojibakeFixture(
    "M07",
    "iso-8859-2",
    "macintosh",
    [115, 118, 237, 232, 107, 111, 118, 225],
    "svíčková",
    "svÌËkov·",
  ),
  mojibakeFixture("M08", "gbk", "big5", [212, 194, 177, 253], "月饼", "堎欲"),
] as const satisfies readonly EncodingFixture[];

export const encodingFixturePositions = encodingFixtures.flatMap((item) => {
  return [
    {
      bytes: item.bytes,
      expectedLabel: item.sourceLabel,
      expectedText: item.expectedText,
      id: `${item.id}:source`,
    },
    {
      bytes: item.bytes,
      expectedLabel: item.renderedLabel,
      expectedText: item.presentedText,
      id: `${item.id}:rendered`,
    },
  ];
}) satisfies readonly EncodingFixturePosition[];

export function decodeFatal(
  label: EncodingLabel,
  bytes: readonly number[],
): string | undefined {
  try {
    return new TextDecoder(label, { fatal: true }).decode(
      Uint8Array.from(bytes),
    );
  } catch {
    return undefined;
  }
}

export function isVisiblePuzzleText(value: string): boolean {
  return ![...value].some((character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      return true;
    }
    return (
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      (codePoint >= 0x200b && codePoint <= 0x200f) ||
      (codePoint >= 0x202a && codePoint <= 0x202e) ||
      codePoint === 0x2060 ||
      codePoint === 0xfeff ||
      codePoint === 0xfffd ||
      (codePoint >= 0xe000 && codePoint <= 0xf8ff)
    );
  });
}

export function validLabelsForPosition(
  position: EncodingFixturePosition,
): readonly EncodingLabel[] {
  return encodingLabels.filter((label) => {
    const decoded = decodeFatal(label, position.bytes);
    return decoded === position.expectedText && isVisiblePuzzleText(decoded);
  });
}

export function solveEncodingFixtures(): readonly ReadonlyMap<
  string,
  EncodingLabel
>[] {
  return [
    new Map(
      encodingFixturePositions.map((position) => [
        position.id,
        position.expectedLabel,
      ]),
    ),
  ];
}

export function bytesAsBinary(bytes: readonly number[]): string {
  return bytes.map((byte) => byte.toString(2).padStart(8, "0")).join(" ");
}

export function bytesAsHex(bytes: readonly number[]): string {
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
}

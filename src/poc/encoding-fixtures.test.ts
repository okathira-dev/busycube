import { decodeFatal, isVisiblePuzzleText } from "../fixtures/encoding/data";
import { encodingPocFixtures } from "./encoding-fixtures";

describe("S-640の最新PoC問題", () => {
  it("対話で確定した文化的な語句八問を使う", () => {
    expect(encodingPocFixtures.map((item) => item.expectedText)).toEqual([
      "café français",
      "матрёшка",
      "пампушка",
      "smørrebrød",
      "חנוכה",
      "ต้มยำกุ้ง",
      "svíčková",
      "月饼",
    ]);
    expect(
      new Set(encodingPocFixtures.map((item) => item.expectedText)).size,
    ).toBe(8);
    expect(
      new Set(encodingPocFixtures.map((item) => item.presentedText)).size,
    ).toBe(8);
  });

  it.each(encodingPocFixtures)(
    "$idの実バイト列を問題表示と回答の両方へ欠落なく復号できる",
    (item) => {
      expect(decodeFatal(item.sourceLabel, item.bytes)).toBe(item.expectedText);
      expect(decodeFatal(item.renderedLabel, item.bytes)).toBe(
        item.presentedText,
      );
      expect(item.presentedText).not.toBe(item.expectedText);
      expect(isVisiblePuzzleText(item.expectedText)).toBe(true);
      expect(isVisiblePuzzleText(item.presentedText)).toBe(true);
    },
  );
});

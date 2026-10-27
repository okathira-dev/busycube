// @vitest-environment jsdom
import { cipher, copyCipher, decodeCipher, selectedCipher } from "./cipher";

let root: HTMLParagraphElement;
beforeEach(() => {
  document.body.innerHTML = "<p>outside</p><p id='cipher'></p><p>after</p>";
  const node = document.getElementById("cipher");
  if (!(node instanceof HTMLParagraphElement))
    throw new Error("Fixture missing");
  root = node;
  root.textContent = cipher;
});
afterEach(() => {
  document.getSelection()?.removeAllRanges();
  vi.restoreAllMocks();
});
function select(start: number, end: number) {
  const node = root.firstChild;
  const selection = document.getSelection();
  if (!node || !selection) throw new Error("Fixture unavailable");
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  selection.removeAllRanges();
  selection.addRange(range);
  return selection;
}
function event(isTrusted = true) {
  return {
    isTrusted,
    clipboardData: { setData: vi.fn() },
    preventDefault: vi.fn(),
  };
}
it("decodes the selected substring only, preserving spaces and punctuation", () => {
  expect(decodeCipher("exvbfxeh")).toBe("busycube");
  expect(decodeCipher("wkh, txlhw!")).toBe("the, quiet!");
  const start = cipher.indexOf("exvbfxeh");
  const copy = event();
  expect(copyCipher(root, select(start, start + 8), copy)).toBe("busycube");
  expect(copy.clipboardData.setData).toHaveBeenCalledWith(
    "text/plain",
    "busycube",
  );
  expect(copy.preventDefault).toHaveBeenCalledOnce();
  const full = event();
  expect(copyCipher(root, select(0, cipher.length), full)).toBe(
    "follow the quiet marks until busycube appears between the noise",
  );
  expect(full.clipboardData.setData).not.toHaveBeenCalledWith(
    "text/plain",
    "busycube",
  );
});
it("does not intercept collapsed, absent, multi-range or cross-boundary selections", () => {
  expect(selectedCipher(root, select(0, 0))).toBeNull();
  expect(selectedCipher(root, null)).toBeNull();
  const selection = select(0, 3);
  const outside = document.body.firstChild?.firstChild;
  const inside = root.firstChild;
  if (!outside || !inside) throw new Error("Missing fixture");
  const range = document.createRange();
  range.setStart(outside, 1);
  range.setEnd(inside, 4);
  selection.removeAllRanges();
  selection.addRange(range);
  const copy = event();
  expect(copyCipher(root, selection, copy)).toBeNull();
  expect(copy.clipboardData.setData).not.toHaveBeenCalled();
  expect(copy.preventDefault).not.toHaveBeenCalled();
  select(0, 3);
  vi.spyOn(selection, "rangeCount", "get").mockReturnValue(2);
  expect(selectedCipher(root, selection)).toBeNull();
});
it("rejects synthetic copy and clipboard write failure without suppressing the native fallback", () => {
  const selection = select(0, 3);
  const synthetic = event(false);
  expect(copyCipher(root, selection, synthetic)).toBeNull();
  expect(synthetic.clipboardData.setData).not.toHaveBeenCalled();
  const failed = event();
  failed.clipboardData.setData.mockImplementation(() => {
    throw new Error("read only");
  });
  expect(copyCipher(root, selection, failed)).toBeNull();
  expect(failed.preventDefault).not.toHaveBeenCalled();
});

export const cipher =
  "iroorz wkh txlhw pdunv xqwlo exvbfxeh dsshduv ehwzhhq wkh qrlvh";

export function decodeCipher(text: string) {
  return text.replace(/[a-z]/g, (letter) =>
    String.fromCharCode(((letter.charCodeAt(0) - 97 + 23) % 26) + 97),
  );
}

export function selectedCipher(root: HTMLElement, selection: Selection | null) {
  if (selection?.rangeCount !== 1 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  )
    return null;
  const text = range.toString();
  return text.length ? text : null;
}

export function copyCipher(
  root: HTMLElement,
  selection: Selection | null,
  event: {
    isTrusted: boolean;
    clipboardData: Pick<DataTransfer, "setData"> | null;
    preventDefault(): void;
  },
) {
  if (!event.isTrusted || !event.clipboardData) return null;
  const text = selectedCipher(root, selection);
  if (text === null) return null;
  const decoded = decodeCipher(text);
  try {
    event.clipboardData.setData("text/plain", decoded);
    event.preventDefault();
    return decoded;
  } catch {
    return null;
  }
}

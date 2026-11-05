export const pendingKey = "busycube:S-440:round";
export const fileKind = "busycube-file-key";
export function filePayload(round: string) {
  return JSON.stringify({ kind: fileKind, version: 1, round });
}
export function fileRound(text: string): string | null {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null) return null;
    const item = value as Record<string, unknown>;
    return item.kind === fileKind &&
      item.version === 1 &&
      typeof item.round === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        item.round,
      )
      ? item.round
      : null;
  } catch {
    return null;
  }
}
export function fileTarget(target: string, origin: string): boolean {
  try {
    const url = new URL(target);
    return (
      url.origin === origin &&
      url.pathname === "/" &&
      url.searchParams.getAll("stage").length === 1 &&
      url.searchParams.get("stage") === "S-440"
    );
  } catch {
    return false;
  }
}

export type Entrance = "app" | "browser";
export const pendingKeys: Record<Entrance, string> = {
  app: "busycube:S-450:round",
  browser: "busycube:S-450:wtai-round",
};
export function gameUri(entrance: Entrance, round: string) {
  return `${entrance === "app" ? "web+busycube:open" : "wtai:busycube"}?round=${round}`;
}
export function handlerTemplate(origin: string) {
  return `${origin}/?stage=S-450&entry=browser&protocol=%s`;
}
export function receipt(
  target: string,
  origin: string,
): { entrance: Entrance; round: string } | null {
  try {
    const outer = new URL(target);
    if (
      outer.origin !== origin ||
      outer.pathname !== "/" ||
      outer.searchParams.getAll("stage").length !== 1 ||
      outer.searchParams.get("stage") !== "S-450" ||
      outer.searchParams.getAll("entry").length !== 1 ||
      outer.searchParams.getAll("protocol").length !== 1
    )
      return null;
    const entrance = outer.searchParams.get("entry");
    if (entrance !== "app" && entrance !== "browser") return null;
    const uri = outer.searchParams.get("protocol");
    if (!uri) return null;
    // URLSearchParams already decodes the handler substitution once.
    const inner = new URL(uri);
    const round = inner.searchParams.get("round");
    if (
      !round ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        round,
      ) ||
      uri !== gameUri(entrance, round)
    )
      return null;
    return { entrance, round };
  } catch {
    return null;
  }
}
export function appDisplay(): boolean {
  return ["standalone", "minimal-ui", "window-controls-overlay"].some(
    (mode) => matchMedia(`(display-mode: ${mode})`).matches,
  );
}

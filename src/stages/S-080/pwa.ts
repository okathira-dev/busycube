export interface RelatedApp {
  platform?: string;
  id?: string;
  url?: string;
}

export type PwaNavigator = Navigator & {
  getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
  setAppBadge?: (value: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export function isBusycube(app: RelatedApp, origin: string): boolean {
  if (app.platform !== "webapp") return false;
  try {
    // Desktop returns the manifest ID; Android can return only its manifest URL.
    const idMatches =
      app.id === undefined || new URL(app.id, origin).href === `${origin}/`;
    return (
      idMatches &&
      app.url !== undefined &&
      new URL(app.url, origin).href === `${origin}/manifest.webmanifest`
    );
  } catch {
    return false;
  }
}

export function launchSource(
  target: string,
  origin: string,
): "shortcut" | "note" | null {
  try {
    const url = new URL(target);
    if (
      url.origin !== origin ||
      url.pathname !== "/" ||
      url.searchParams.getAll("stage").length !== 1 ||
      url.searchParams.get("stage") !== "S-080" ||
      url.searchParams.getAll("source").length !== 1
    )
      return null;
    const source = url.searchParams.get("source");
    return source === "shortcut" || source === "note" ? source : null;
  } catch {
    return null;
  }
}

export function usableTitlebar(
  overlay: WindowControlsOverlay | undefined,
): DOMRect | null {
  if (!overlay?.visible) return null;
  try {
    const rect = overlay.getTitlebarAreaRect();
    return [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
      rect.x >= 0 &&
      rect.y >= 0 &&
      rect.width >= 64 &&
      rect.height >= 24
      ? rect
      : null;
  } catch {
    return null;
  }
}

// A late set/clear from a departed visit must precede the next visit's badge.
let badgeQueue = Promise.resolve();
export function changeBadge(action: () => Promise<void>): Promise<void> {
  const pending = badgeQueue.then(action);
  badgeQueue = pending.catch(() => undefined);
  return pending;
}

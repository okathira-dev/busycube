export type ArrivalKind = "navigate" | "reload" | "back" | "forward";

export interface StageArrival {
  stageId: string | null;
  kind: ArrivalKind;
  revisit: boolean;
}

export function traversalDirection(from: number, to: number): ArrivalKind {
  if (from < 0 || to < 0 || from === to) return "navigate";
  return to < from ? "back" : "forward";
}

export class NavigationJourney {
  private visited = new Set<string>();
  private lastStage: string | null = null;
  arrival: StageArrival;

  constructor(stageId: string | null, kind: ArrivalKind) {
    this.arrival = { stageId, kind, revisit: false };
    if (stageId) {
      this.visited.add(stageId);
      this.lastStage = stageId;
    }
  }

  enter(stageId: string | null, kind: ArrivalKind): StageArrival {
    const revisit = Boolean(
      stageId && stageId !== this.lastStage && this.visited.has(stageId),
    );
    if (stageId) {
      this.visited.add(stageId);
      this.lastStage = stageId;
    }
    this.arrival = { stageId, kind, revisit };
    return this.arrival;
  }
}

export function documentArrivalKind(): ArrivalKind {
  const timing = performance.getEntriesByType?.("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  const activation = window.navigation?.activation;
  if (activation?.navigationType === "traverse" && activation.from) {
    return traversalDirection(activation.from.index, activation.entry.index);
  }
  if (timing?.type === "reload") return "reload";
  return "navigate";
}

export type MainView = "stages" | "settings" | "about";

export interface AppRoute<TStageId extends string = string> {
  view: MainView;
  stageId: TStageId | null;
}

export function readAppRoute<TStageId extends string>(
  href: string,
  isStageId: (value: string) => value is TStageId,
): AppRoute<TStageId> {
  const url = new URL(href);
  const stageId = url.searchParams.get("stage");
  if (stageId && isStageId(stageId)) {
    return { view: "stages", stageId };
  }
  const view = url.searchParams.get("view");
  return {
    view: view === "settings" || view === "about" ? view : "stages",
    stageId: null,
  };
}

export function appUrlForView(href: string, view: MainView): string {
  const url = new URL(href);
  url.searchParams.delete("stage");
  if (view === "stages") url.searchParams.delete("view");
  else url.searchParams.set("view", view);
  return url.href;
}

export function appUrlForStage(href: string, stageId: string): string {
  const url = new URL(href);
  url.searchParams.delete("view");
  url.searchParams.set("stage", stageId);
  return url.href;
}

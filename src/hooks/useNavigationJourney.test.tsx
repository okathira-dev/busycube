// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { useNavigationJourney } from "./useNavigationJourney";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("tracks real current-entry changes and keeps reload arrival out of subsequent route changes", () => {
  const navigation = Object.assign(new EventTarget(), {
    currentEntry: { index: 2 },
  });
  vi.stubGlobal("navigation", navigation);
  const { result, rerender } = renderHook(
    ({ stageId }: { stageId: string | null }) => useNavigationJourney(stageId),
    { initialProps: { stageId: "S-060" as string | null } },
  );
  const move = (
    stageId: string,
    from: number,
    to: number,
    kind: "push" | "traverse",
  ) => {
    act(() => {
      window.history.pushState({}, "", `/?stage=${stageId}`);
      navigation.currentEntry = { index: to };
      navigation.dispatchEvent(
        Object.assign(new Event("currententrychange"), {
          from: { index: from },
          navigationType: kind,
        }),
      );
    });
    rerender({ stageId });
  };
  move("S-220", 2, 3, "push");
  expect(result.current?.kind).toBe("navigate");
  move("S-060", 3, 2, "traverse");
  expect(result.current).toEqual({
    stageId: "S-060",
    kind: "back",
    revisit: true,
  });
  move("S-220", 2, 3, "traverse");
  expect(result.current?.kind).toBe("forward");
});

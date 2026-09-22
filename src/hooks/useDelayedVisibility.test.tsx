// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { useDelayedVisibility } from "./useDelayedVisibility";

describe("useDelayedVisibility", () => {
  it("appears only after the delay and hides immediately when inactive", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ active }) => useDelayedVisibility(active, 180),
      { initialProps: { active: false } },
    );

    rerender({ active: true });
    act(() => vi.advanceTimersByTime(179));
    expect(result.current).toBe(false);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);

    rerender({ active: false });
    expect(result.current).toBe(false);
    vi.useRealTimers();
  });
});

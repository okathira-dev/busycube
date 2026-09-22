// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { useServiceWorker } from "./useServiceWorker";

describe("useServiceWorker", () => {
  const original = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

  afterEach(() => {
    if (original) {
      Object.defineProperty(navigator, "serviceWorker", original);
    } else {
      Reflect.deleteProperty(navigator, "serviceWorker");
    }
  });

  it("registers the development worker without enabling cache status", async () => {
    const registration = {
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
    };
    const register = vi.fn(async () => registration);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });

    const { result } = renderHook(() => useServiceWorker());
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));

    expect(register).toHaveBeenCalledWith(
      "/service-worker.js?mode=development",
      { scope: "/", updateViaCache: "none" },
    );
    expect(result.current.state).toBe("development");
  });

  it("reports registration failures", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register: vi.fn(async () => Promise.reject(new Error("no"))) },
    });

    const { result } = renderHook(() => useServiceWorker());
    await waitFor(() => expect(result.current.state).toBe("error"));
  });
});

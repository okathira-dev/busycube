// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { MainTabs } from "./MainTabs";

const labels = { stages: "Stages", settings: "Settings", about: "About" };
const hrefs = {
  stages: "/?view=stages",
  settings: "/?view=settings",
  about: "/?view=about",
};

describe("MainTabs", () => {
  it("exposes ordinary links and marks the current page", () => {
    render(
      <MainTabs
        value="settings"
        labels={labels}
        hrefs={hrefs}
        ariaLabel="Primary"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Settings" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "About" }).getAttribute("href"),
    ).toBe("/?view=about");
  });

  it("handles an ordinary click in-app", () => {
    const onChange = vi.fn();
    render(
      <MainTabs
        value="stages"
        labels={labels}
        hrefs={hrefs}
        ariaLabel="Primary"
        onChange={onChange}
      />,
    );
    const settings = screen.getByRole("link", { name: "Settings" });

    fireEvent.click(settings);
    expect(onChange).toHaveBeenCalledWith("settings");
  });
});

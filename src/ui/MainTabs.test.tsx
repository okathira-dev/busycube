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
    const onPreload = vi.fn();
    render(
      <MainTabs
        value="stages"
        labels={labels}
        hrefs={hrefs}
        ariaLabel="Primary"
        onChange={onChange}
        onPreload={onPreload}
      />,
    );
    const settings = screen.getByRole("link", { name: "Settings" });

    fireEvent.pointerEnter(settings);
    fireEvent.focus(settings);
    fireEvent.pointerDown(settings, { button: 2 });
    expect(onPreload).not.toHaveBeenCalled();

    fireEvent.pointerDown(settings, { button: 0 });
    expect(onPreload).toHaveBeenCalledWith("settings");
    fireEvent.click(settings);
    expect(onChange).toHaveBeenCalledWith("settings");

    onPreload.mockClear();
    const about = screen.getByRole("link", { name: "About" });
    fireEvent.keyDown(about, { key: "Enter" });
    expect(onPreload).toHaveBeenCalledWith("about");
  });
});

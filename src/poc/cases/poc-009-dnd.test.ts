import { describe, expect, it } from "vitest";
import fixtures from "../../fixtures/drag-contract.json";
import { evaluateNativeImageDrop } from "./poc-009-dnd";

const pageUrl = "http://127.0.0.1:5173/poc/";

describe("S-510 native image URL + File gate", () => {
  it.each(Object.entries(fixtures))(
    "accepts the observed browser payload for %s",
    (image, fixture) => {
      const checks = evaluateNativeImageDrop(
        new URL(`../${fixture.filename}`, pageUrl).href,
        fixture.sha256,
        pageUrl,
      );
      expect(
        checks.filter((check) => check.accepted).map((check) => check.image),
      ).toEqual([image]);
    },
  );

  it("rejects a saved copy with identical bytes but no Web URL", () => {
    const checks = evaluateNativeImageDrop("", fixtures.file.sha256, pageUrl);
    expect(checks.find((check) => check.image === "file")).toMatchObject({
      hasExpectedWebUrl: false,
      fileContentMatches: true,
      accepted: false,
    });
  });

  it("rejects an opaque iframe URI without a readable File", () => {
    const checks = evaluateNativeImageDrop(
      "http://127.0.0.1:5173/drag-window.png",
      undefined,
      pageUrl,
    );
    expect(checks.find((check) => check.image === "window")).toMatchObject({
      hasExpectedWebUrl: true,
      fileContentMatches: false,
      accepted: false,
    });
  });

  it.each([
    "file:///C:/Downloads/drag-file.png",
    "https://other.example/drag-file.png",
    "drag-file.png",
    "not a URL",
  ])("rejects a nonmatching URI even with matching bytes: %s", (uri) => {
    expect(
      evaluateNativeImageDrop(uri, fixtures.file.sha256, pageUrl).some(
        (check) => check.accepted,
      ),
    ).toBe(false);
  });

  it("does not accept an image URL paired with a different image File", () => {
    expect(
      evaluateNativeImageDrop(
        "http://127.0.0.1:5173/drag-page.png",
        fixtures.file.sha256,
        pageUrl,
      ).some((check) => check.accepted),
    ).toBe(false);
  });

  it("parses URI-list comments and CRLF without accepting a comment as a URL", () => {
    const checks = evaluateNativeImageDrop(
      "# source image\r\nhttp://127.0.0.1:5173/drag-file.png\r\n",
      fixtures.file.sha256,
      pageUrl,
    );
    expect(checks.find((check) => check.image === "file")?.accepted).toBe(true);
    expect(
      evaluateNativeImageDrop(
        "#http://127.0.0.1:5173/drag-file.png",
        fixtures.file.sha256,
        pageUrl,
      ).some((check) => check.accepted),
    ).toBe(false);
  });
});

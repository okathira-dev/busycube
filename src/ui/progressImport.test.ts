import { createProgressDocument } from "../domain/progress";
import { prepareProgressImport } from "./progressImport";

function fileWith(text: () => Promise<string>): File {
  return { text } as File;
}

describe("prepareProgressImport", () => {
  const current = createProgressDocument("en", "current");

  it("previews only additions from a valid document", async () => {
    const imported = createProgressDocument("ja", "imported");
    imported.stages["S-000"] = {
      solvedBoxIds: ["B01"],
      markers: ["seen"],
    };

    await expect(
      prepareProgressImport(
        fileWith(async () => JSON.stringify(imported)),
        current,
      ),
    ).resolves.toMatchObject({
      status: "ready",
      addedBoxes: 1,
      addedMarkers: 1,
    });
  });

  it("distinguishes unreadable, corrupt, and future files", async () => {
    await expect(
      prepareProgressImport(
        fileWith(async () => {
          throw new Error("read");
        }),
        current,
      ),
    ).resolves.toEqual({ status: "read-error" });
    await expect(
      prepareProgressImport(
        fileWith(async () => "not-json"),
        current,
      ),
    ).resolves.toEqual({ status: "corrupt" });
    await expect(
      prepareProgressImport(
        fileWith(async () => JSON.stringify({ schemaVersion: 999 })),
        current,
      ),
    ).resolves.toEqual({ status: "future", version: 999 });
  });
});

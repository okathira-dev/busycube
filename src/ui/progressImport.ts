import {
  countProgressAdditions,
  type ProgressDocument,
  parseProgressDocument,
} from "../domain/progress";

export type ProgressImportResult =
  | {
      status: "ready";
      document: ProgressDocument;
      addedBoxes: number;
      addedMarkers: number;
    }
  | { status: "corrupt" }
  | { status: "read-error" }
  | { status: "future"; version: number };

export async function prepareProgressImport(
  file: File,
  current: ProgressDocument,
): Promise<ProgressImportResult> {
  let source: string;
  try {
    source = await file.text();
  } catch {
    return { status: "read-error" };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    return { status: "corrupt" };
  }
  const parsed = parseProgressDocument(raw);
  if (parsed.status === "corrupt") return { status: "corrupt" };
  if (parsed.status === "future") return parsed;
  return {
    status: "ready",
    document: parsed.document,
    ...countProgressAdditions(current, parsed.document),
  };
}

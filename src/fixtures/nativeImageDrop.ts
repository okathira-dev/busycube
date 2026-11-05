export interface ImageDropFixture {
  filename: string;
  sha256: string;
}
export type ImageDropContract = Readonly<
  Record<"page" | "file" | "window", ImageDropFixture>
>;

export function evaluateImageDrop(
  uriList: string,
  fileDigest: string | undefined,
  assetBase: string,
  contract: ImageDropContract,
) {
  const webUrls = uriList.split(/\r?\n/).flatMap((line) => {
    const value = line.trim();
    if (!value || value.startsWith("#")) return [];
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:"
        ? [url.href]
        : [];
    } catch {
      return [];
    }
  });
  return (["page", "file", "window"] as const).map((image) => {
    const fixture = contract[image];
    const hasExpectedWebUrl = webUrls.includes(
      new URL(fixture.filename, assetBase).href,
    );
    const fileContentMatches = fileDigest === fixture.sha256;
    return {
      image,
      hasExpectedWebUrl,
      fileContentMatches,
      accepted: hasExpectedWebUrl && fileContentMatches,
    };
  });
}

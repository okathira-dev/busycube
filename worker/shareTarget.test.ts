import { app } from "./app";
import { extractSharedMarks, sharedMarksPlaceholder } from "./shareTarget";

const nonce = "12345678-1234-4321-8765-123456789abc";
const mark = `busycube:S240:${nonce}`;
const fetchAsset = vi.fn(
  async (_input: RequestInfo | URL) =>
    new Response(
      `<html><meta name="busycube-shared-marks" content="${sharedMarksPlaceholder}"><script src="/assets/receiver.js"></script></html>`,
      { headers: { "Content-Type": "text/html" } },
    ),
);
const environment = { ASSETS: { fetch: fetchAsset } };
beforeEach(() => {
  fetchAsset.mockClear();
});
it("extracts complete UUID marks from surrounding text without keeping the text", () => {
  expect(extractSharedMarks(`personal text\n${mark}\n${mark} more`)).toEqual([
    nonce,
  ]);
  for (const invalid of [
    `${mark}a`,
    `prefix${mark}`,
    mark.replace("-4321-", "-3321-"),
    "busycube",
    "share-target=1",
  ])
    expect(extractSharedMarks(invalid)).toEqual([]);
});

it("fails without a valid deployed receiver template", async () => {
  for (const response of [
    new Response("missing", { status: 404 }),
    new Response("<html>No placeholder</html>"),
  ]) {
    const received = await app.request(
      "https://busycube.example/share-target",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ text: mark }),
      },
      { ASSETS: { fetch: async () => response } },
    );
    expect(received.status).toBe(503);
    expect(await received.text()).not.toContain(nonce);
  }
});
it("accepts actual encoded POST text and returns only validated marks in the receiver document", async () => {
  const response = await app.request(
    "https://busycube.example/share-target",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        text: `unrelated private material <script>\n${mark}`,
        title: "private title",
        url: "https://private.example/",
      }),
    },
    environment,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const html = await response.text();
  expect(html).toContain(`content="${nonce}"`);
  for (const secret of [
    "private",
    "unrelated",
    sharedMarksPlaceholder,
    "busycube:S240",
  ])
    expect(html).not.toContain(secret);
  expect(fetchAsset).toHaveBeenCalledOnce();
  expect(String(fetchAsset.mock.calls[0]?.[0])).toBe(
    "https://busycube.example/share-target/receive.html",
  );
});
it("does not accept a GET URL, title-only mark, invalid body, wrong encoding or oversized POST", async () => {
  const requests = [
    { url: `https://busycube.example/share-target?text=${mark}`, init: {} },
    {
      url: "https://busycube.example/share-target",
      init: {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: mark,
      },
    },
    ...[
      new URLSearchParams({ title: mark }),
      new URLSearchParams({ text: "wrong" }),
      new URLSearchParams({ text: mark + "x".repeat(65536) }),
    ].map((body) => ({
      url: "https://busycube.example/share-target",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    })),
  ];
  const codes = [];
  for (const request of requests)
    codes.push(
      (await app.request(request.url, request.init, environment)).status,
    );
  expect(codes).toEqual([405, 415, 400, 400, 413]);
  expect(fetchAsset).not.toHaveBeenCalled();
});

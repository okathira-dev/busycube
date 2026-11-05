import { app } from "./app";

it("routes product HEAD/range/methods through Hono without delegating to static assets", async () => {
  const head = await app.request(
    "https://game.example/background-fetch/parcel.bin?bytes=999999999",
    { method: "HEAD" },
  );
  expect(head.status).toBe(200);
  expect(head.headers.get("Content-Length")).toBe("65536");
  expect(head.headers.get("Content-Disposition")).toBe(
    'attachment; filename="busycube-download.bin"',
  );
  expect(head.headers.get("Cache-Control")).toBe("no-store, no-transform");
  const invalid = await app.request(
    "https://game.example/background-fetch/parcel.bin",
    { headers: { Range: "bytes=65536-" } },
  );
  expect(invalid.status).toBe(416);
  const method = await app.request(
    "https://game.example/background-fetch/parcel.bin",
    { method: "POST" },
  );
  expect(method.status).toBe(405);
});

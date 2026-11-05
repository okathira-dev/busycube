import { app } from "./app";
import { securityHeaders } from "./securityHeaders";

describe("Busycube Worker routes", () => {
  it("returns fresh server time without using static assets or a cached response", async () => {
    const now = vi.spyOn(Date, "now");
    try {
      for (const utc of [1793577600000, 1793577630000]) {
        now.mockReturnValue(utc);
        const response = await app.request("https://busycube.example/api/time");
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(await response.json()).toEqual({ unix_ms: utc });
      }
    } finally {
      now.mockRestore();
    }
  });

  it.each([
    ["/payment/method", "/payment/payment-method-manifest.json"],
    ["/poc/payment/method", "/poc/payment/payment-method-manifest.json"],
    [
      "/poc/payment/decoy-method",
      "/poc/payment/decoy-payment-method-manifest.json",
    ],
  ])("publishes a payment manifest Link header for %s", async (route, path) => {
    const response = await app.request(`https://busycube.example${route}`);

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Link")).toBe(
      `<${path}>; rel="payment-method-manifest"`,
    );
    for (const [name, value] of Object.entries(securityHeaders)) {
      expect(response.headers.get(name)).toBe(value);
    }
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("accepts HEAD for a payment manifest URL", async () => {
    const response = await app.request(
      "https://busycube.example/payment/method",
      {
        method: "HEAD",
      },
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it.each(["POST", "OPTIONS"])(
    "rejects unsupported payment manifest method %s",
    async (method) => {
      const response = await app.request(
        "https://busycube.example/payment/method",
        {
          method,
        },
      );

      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("GET, HEAD");
      expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    },
  );

  it("responds to the online probe without cache reuse", async () => {
    const response = await app.request(
      "https://busycube.example/offline-beacon/network-probe",
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

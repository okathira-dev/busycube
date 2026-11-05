import { hasNoSharedS760Properties, matchesS760Card } from "./functions";

describe("S-760 contact result checks", () => {
  it("keeps every field mandatory but accepts any nonempty icon Blob", () => {
    const full = {
      name: ["Busycube Courier"],
      email: ["COURIER@BUSYCUBE.INVALID"],
      tel: ["+81 (3) 0000-0000"],
      address: [
        {
          addressLine: ["1-1-1 Busycube"],
          city: "Tokyo",
          postalCode: "100-0001",
          country: "Japan",
        },
      ],
      icon: [new Blob(["different picture contents"])],
    };
    expect(matchesS760Card(full)).toBe(true);
    for (const field of ["name", "email", "tel", "address", "icon"] as const)
      expect(matchesS760Card({ ...full, [field]: [] })).toBe(false);
    expect(matchesS760Card({ ...full, icon: [new Blob()] })).toBe(false);
    expect(matchesS760Card({ ...full, tel: ["0300000000"] })).toBe(false);
    expect(
      matchesS760Card({ ...full, email: ["someone@busycube.invalid"] }),
    ).toBe(false);
  });
  it("accepts the complete fictional card without storing identity", () => {
    expect(
      matchesS760Card({
        name: ["Busycube Courier"],
        email: ["courier@busycube.invalid"],
        tel: ["+81 3-0000-0000"],
        address: [
          {
            addressLine: ["1-1-1 Busycube"],
            city: "Tokyo",
            postalCode: "100-0001",
            country: "Japan",
          },
        ],
        icon: [new Blob(["icon"])],
      }),
    ).toBe(true);
  });

  it("requires all five properties and distinguishes a selected empty result", () => {
    expect(
      matchesS760Card({
        name: ["Busycube Courier"],
        email: ["courier@busycube.invalid"],
        tel: ["+81 3-0000-0000"],
      }),
    ).toBe(false);
    expect(hasNoSharedS760Properties({})).toBe(true);
    expect(hasNoSharedS760Properties(undefined)).toBe(false);
    expect(hasNoSharedS760Properties({ name: ["Busycube Courier"] })).toBe(
      false,
    );
  });
});

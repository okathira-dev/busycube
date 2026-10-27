import { audioProcessingReport, QuietThenLoud, unweightedRms } from "./rms";

describe("quiet then loud RMS", () => {
  it("computes unweighted signal RMS and rejects unobserved samples", () => {
    expect(unweightedRms([1, -1, 1, -1])).toBe(1);
    expect(unweightedRms([0.1, 0.1])).toBeCloseTo(0.1);
    expect(unweightedRms([])).toBeUndefined();
    expect(unweightedRms([NaN])).toBeUndefined();
  });
  it("does not open in constant noise and opens at loud detection without a final quiet phase", () => {
    const gate = new QuietThenLoud();
    for (let time = 0; time <= 1000; time += 100)
      expect(gate.observe(0.3, time)).toBe(false);
    for (let time = 1100; time <= 1700; time += 100)
      expect(gate.observe(0.01, time)).toBe(false);
    expect(gate.observe(0.2, 1800)).toBe(false);
    expect(gate.observe(0.21, 1900)).toBe(true);
    expect(gate.observe(0.4, 2000)).toBe(false);
  });
  it("resets interrupted silence and gaps rather than accepting a startup zero", () => {
    const gate = new QuietThenLoud();
    expect(gate.observe(0, 0)).toBe(false);
    expect(gate.observe(0.4, 100)).toBe(false);
    for (const time of [200, 300, 400])
      expect(gate.observe(0, time)).toBe(false);
    expect(gate.observe(undefined, 500)).toBe(false);
    expect(gate.observe(0.3, 600)).toBe(false);
    for (const time of [700, 800, 900, 1000, 1100, 1200]) gate.observe(0, time);
    expect(gate.observe(0.4, 1600)).toBe(false);
  });
  it("distinguishes requested support from the reported input settings without device identifiers", () => {
    const report = audioProcessingReport(
      { autoGainControl: true, noiseSuppression: true, echoCancellation: true },
      {
        autoGainControl: false,
        noiseSuppression: false,
        echoCancellation: false,
        deviceId: "never-retain",
      },
    );
    expect(report.state).toBe("disabled");
    expect(JSON.stringify(report)).not.toContain("never-retain");
    expect(audioProcessingReport({}, {}).state).toBe("unknown");
    expect(audioProcessingReport({}, { autoGainControl: true }).state).toBe(
      "enabled",
    );
  });
});

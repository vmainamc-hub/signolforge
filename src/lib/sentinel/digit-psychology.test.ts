import { describe, expect, it } from "vitest";
import {
  canonicalDigitState,
  contractPsychology,
  entryDigitPsychologyBias,
  type CanonicalDigitState,
} from "./digit-psychology";

function biased(n: number, heavy: number, light: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = i % 20;
    if (r < 6) out.push(heavy);
    else if (r === 6) out.push(light === heavy ? (light + 1) % 10 : light);
    else out.push((i * 7 + 3) % 10);
  }
  return out;
}

describe("canonicalDigitState", () => {
  it("reports INSUFFICIENT with a thin buffer", () => {
    const s = canonicalDigitState([1, 2, 3]);
    expect(s.change).toBe("INSUFFICIENT");
    expect(s.green).toBeNull();
  });

  it("assigns green/red from measured frequency with no vetoed digits", () => {
    const s = canonicalDigitState(biased(1000, 3, 8));
    expect(s.n).toBe(1000);
    expect(s.green).toBe(3); // digit 3 is never excluded from a role
    expect(s.secondGreen).not.toBe(s.green);
    expect(s.red).not.toBeNull();
    expect(s.pct.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
  });
});

describe("contractPsychology", () => {
  const state = canonicalDigitState(biased(1000, 3, 8));
  const over4 = contractPsychology(state, {
    label: "OVER 4",
    side: "OVER",
    barrier: 4,
    winners: [5, 6, 7, 8, 9],
  });

  it("derives zones from the contract's own winners", () => {
    expect(over4.winningZone).toEqual([5, 6, 7, 8, 9]);
    expect(over4.losingZone).toEqual([0, 1, 2, 3, 4]);
    expect(over4.positions.length).toBeGreaterThan(0);
  });

  it("keeps the ranking contribution bounded", () => {
    expect(Math.abs(over4.rankingDelta)).toBeLessThanOrEqual(4);
    expect(["SUPPORT", "NEUTRAL", "CONFLICT"]).toContain(over4.verdict);
  });

  it("hard-blocks when RED is strengthening on the losing side", () => {
    const mockState: CanonicalDigitState = {
      n: 1000,
      pct: [10, 10, 5, 10, 10, 15, 10, 10, 10, 10],
      deltaPp: [0, 0, 1.5, 0, 0, 0, 0, 0, 0, 0], // digit 2 is +1.5pp (strengthening)
      recentPct: [100, 100, 50, 100, 100, 150, 100, 100, 100, 100],
      green: 5,
      secondGreen: 0,
      red: 2, // digit 2 is RED, sits in losing zone [0, 1, 2, 3, 4]
      secondRed: 1,
      mostIncreasing: 2,
      mostDecreasing: 4,
      change: "STABLE",
      changeDetail: "Stable",
      summary: "test",
    };

    const res = contractPsychology(mockState, {
      label: "OVER 4",
      side: "OVER",
      barrier: 4,
      winners: [5, 6, 7, 8, 9],
    });

    expect(res.hardBlock).toBe(true);
    expect(res.hardBlockReason).toContain("RED");
    expect(res.hardBlockReason).toContain("strengthening on the losing side");
  });

  it("hard-blocks when GREEN is on the losing side with decay but no winning replacement", () => {
    const mockState: CanonicalDigitState = {
      n: 1000,
      pct: [10, 10, 10, 20, 10, 10, 10, 10, 10, 0],
      deltaPp: [0, 0, 0, -1.0, 0, 0, 0, 0, 0, 0], // green 3 is decaying (-1.0pp), no digit is increasing
      recentPct: [100, 100, 100, 200, 100, 100, 100, 100, 100, 0],
      green: 3, // green sits in losing zone [0, 1, 2, 3, 4]
      secondGreen: 1,
      red: 9,
      secondRed: 8,
      mostIncreasing: null, // no winning-side replacement
      mostDecreasing: 3,
      change: "STABLE",
      changeDetail: "Stable",
      summary: "test",
    };

    const res = contractPsychology(mockState, {
      label: "OVER 4",
      side: "OVER",
      barrier: 4,
      winners: [5, 6, 7, 8, 9],
    });

    expect(res.hardBlock).toBe(true);
    expect(res.hardBlockReason).toContain("GREEN");
    expect(res.hardBlockReason).toContain("lacks a confirmed winning-side replacement");
  });

  it("passes without hardBlock when GREEN on the losing side is decaying with a confirmed winning-side replacement", () => {
    const mockState: CanonicalDigitState = {
      n: 1000,
      pct: [10, 10, 10, 20, 10, 10, 10, 10, 10, 0],
      deltaPp: [0, 0, 0, -1.0, 0, 0, 0, 1.2, 0, 0], // green 3 is decaying (-1.0pp), mostIncreasing is 7 (in winning zone!)
      recentPct: [100, 100, 100, 200, 100, 100, 100, 100, 100, 0],
      green: 3, // green in losing zone [0, 1, 2, 3, 4]
      secondGreen: 1,
      red: 9,
      secondRed: 8,
      mostIncreasing: 7, // 7 is in winning zone [5, 6, 7, 8, 9] -> confirmed replacement
      mostDecreasing: 3,
      change: "STABLE",
      changeDetail: "Stable",
      summary: "test",
    };

    const res = contractPsychology(mockState, {
      label: "OVER 4",
      side: "OVER",
      barrier: 4,
      winners: [5, 6, 7, 8, 9],
    });

    expect(res.hardBlock).toBe(false);
    expect(res.hardBlockReason).toBeNull();
  });

  it("hard-blocks when 2ND RED is building in PressureField on the losing side", () => {
    const mockState: CanonicalDigitState = {
      n: 1000,
      pct: [10, 10, 10, 10, 10, 15, 10, 10, 10, 5],
      deltaPp: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      recentPct: [100, 100, 100, 100, 100, 150, 100, 100, 100, 50],
      green: 5,
      secondGreen: 0,
      red: 9,
      secondRed: 1, // 2nd RED is 1 (losing zone)
      mostIncreasing: null,
      mostDecreasing: null,
      change: "STABLE",
      changeDetail: "Stable",
      summary: "test",
    };

    const mockPressure: any = {
      digits: Array.from({ length: 10 }, (_, d) => ({
        d,
        share: 0.1,
        momentum: d === 1 ? 0.05 : 0,
        accel: 0,
        state: d === 1 ? "dominant" : "fair",
        score: 0,
        detail: "",
      })),
      window: 1000,
      sub: 150,
      distortion: 0.02,
      flow: 0.05,
    };

    const res = contractPsychology(
      mockState,
      {
        label: "OVER 4",
        side: "OVER",
        barrier: 4,
        winners: [5, 6, 7, 8, 9],
      },
      mockPressure,
    );

    expect(res.hardBlock).toBe(true);
    expect(res.hardBlockReason).toContain("2ND RED");
    expect(res.hardBlockReason).toContain("strengthening on the losing side");
  });
});

describe("entryDigitPsychologyBias", () => {
  const state = canonicalDigitState(biased(1000, 3, 8));
  const under5 = contractPsychology(state, {
    label: "UNDER 5",
    side: "UNDER",
    barrier: 5,
    winners: [0, 1, 2, 3, 4],
  });

  it("stays inside ±3 for every digit", () => {
    for (let d = 0; d < 10; d++) {
      expect(Math.abs(entryDigitPsychologyBias(state, under5, d).points)).toBeLessThanOrEqual(3);
    }
  });

  it("has no influence when the canonical window is immature", () => {
    const thin = canonicalDigitState([1, 2, 3, 4]);
    expect(entryDigitPsychologyBias(thin, under5, 3).points).toBe(0);
  });
});

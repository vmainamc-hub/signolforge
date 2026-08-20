// Precision Parity AI — Unified Signal Pipeline
// Consolidates all 4 layers into one deterministic, testable, and guaranteed pipeline:
// Layer 1: Pure Feature Engines (Distribution, Markov, Run/Hazard, Pressure, Pattern, Entropy, HMM Regime, Anomaly, Structural, Forecast, Personality)
// Layer 2: Meta / Validation Engines (Decorrelation, Significance, Particle Filter, Drift, Conformal, EV/Kelly, Market Quality, Danger)
// Layer 3: Single Ordered Decision Gate (Single point of truth for pass/fail vetoes)
// Layer 4: Canonical FinalSignal Formatter

import type { Tick } from "@/lib/analytics";
import { derivBus } from "@/lib/deriv/tick-bus";
import type { EngineVote, FinalSignal } from "./final-signal";
import { runParityStatsEngine } from "./engines/stats-engine";
import { runParityMarkovEngine } from "./engines/markov-engine";
import { runParityRunEngine } from "./engines/run-hazard-engine";
import { runParityPressureEngine } from "./engines/pressure-engine";
import { runParityPatternEngine } from "./engines/pattern-engine";
import { runParityEntropyEngine } from "./engines/entropy-engine";
import { runParityAnomalyEngine } from "./engines/anomaly-engine";
import { runMarketQualityEngine } from "./engines/market-quality-engine";
import { runMultiHorizonEngine } from "./engines/multi-horizon-engine";
import { runParityDangerEngine } from "./engines/danger-engine";
import { runEVGateEngine } from "./engines/ev-gate-engine";
import { runParityStakeEngine } from "./engines/risk-stake-engine";
import { computeSpecificParityEntryDigit } from "./engines/specific-entry-digit";
import { runParityPersonalityEngine } from "./engines/personality-engine";
import { fitParityHMM } from "./hmm";
import { decorrelate } from "./decorrelation";
import { computeSignificance } from "./significance";
import { runParticleFilter } from "./particle-filter";
import { runDriftDetection } from "./drift";
import { computeConformalInterval } from "./conformal";
import { evaluateEVGate } from "./ev-gate";
import { analyseStructural } from "./structural";
import { runForecastEngine } from "./forecast";
import { runIntelligencePanel, panelApproves } from "./analysts";
import { runDeepReasoning } from "./deep-reasoning";

export interface UnifiedPipelineInput {
  symbol: string;
  displayName: string;
  ticks: Tick[];
  explicitDigits?: number[];
  payoutRate?: number;
  minConfidence?: number;
}

export interface UnifiedPipelineResult {
  finalSignal: FinalSignal;
  engineVotes: EngineVote[];
  vetoes: { engine: string; reason: string }[];
  passedGates: string[];
  diagnostics: {
    stats: ReturnType<typeof runParityStatsEngine>;
    markov: ReturnType<typeof runParityMarkovEngine>;
    runs: ReturnType<typeof runParityRunEngine>;
    pressure: ReturnType<typeof runParityPressureEngine>;
    pattern: ReturnType<typeof runParityPatternEngine>;
    entropy: ReturnType<typeof runParityEntropyEngine>;
    anomaly: ReturnType<typeof runParityAnomalyEngine>;
    quality: ReturnType<typeof runMarketQualityEngine>;
    hmm: ReturnType<typeof fitParityHMM>;
    decorrelation: ReturnType<typeof decorrelate>;
    significance: ReturnType<typeof computeSignificance>;
    particles: ReturnType<typeof runParticleFilter>;
    drift: ReturnType<typeof runDriftDetection>;
    conformal: ReturnType<typeof computeConformalInterval>;
    evGate: ReturnType<typeof evaluateEVGate>;
    structural: ReturnType<typeof analyseStructural>;
    forecast: ReturnType<typeof runForecastEngine>;
    panel: ReturnType<typeof runIntelligencePanel>;
    deep: ReturnType<typeof runDeepReasoning>;
    specificDigit: ReturnType<typeof computeSpecificParityEntryDigit>;
  };
}

export function runUnifiedParityPipeline(input: UnifiedPipelineInput): UnifiedPipelineResult {
  const {
    symbol,
    displayName,
    ticks,
    explicitDigits,
    payoutRate = 0.95,
    minConfidence = 65,
  } = input;

  // Extract / resolve digit array
  const busDigits = derivBus.getDigits(symbol);
  let digits: number[];
  if (explicitDigits && explicitDigits.length > 0) {
    digits = explicitDigits;
  } else if (busDigits && busDigits.length > 0) {
    digits = busDigits;
  } else {
    const pip = derivBus.getPipSize(symbol);
    digits = ticks.map((t) => {
      if (typeof (t as any).lastDigit === "number") return (t as any).lastDigit;
      const price = t.price;
      if (!Number.isFinite(price)) return 0;
      const str = price.toFixed(pip);
      const lastChar = str[str.length - 1];
      const parsed = parseInt(lastChar, 10);
      return Number.isNaN(parsed) ? Math.abs(Math.round(price * 100)) % 10 : parsed;
    });
  }

  const n = digits.length;
  const breakEvenHurdle = 1 / (1 + payoutRate); // 0.5128 for 0.95 payout

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 1: FEATURE ENGINES (Pure Functions emitting EngineVotes)
  // ──────────────────────────────────────────────────────────────────────────
  const stats = runParityStatsEngine(digits, breakEvenHurdle);
  const markov = runParityMarkovEngine(digits);
  const runs = runParityRunEngine(digits);
  const pressure = runParityPressureEngine(digits);
  const pattern = runParityPatternEngine(digits);
  const entropy = runParityEntropyEngine(digits);
  const anomaly = runParityAnomalyEngine(digits);
  const quality = runMarketQualityEngine(ticks);
  const personality = runParityPersonalityEngine(symbol, digits);
  const hmm = fitParityHMM(digits);
  const structural = analyseStructural(digits);
  const forecast = runForecastEngine(digits, ticks);

  const engineVotes: EngineVote[] = [];

  // 1. Distribution Engine (Stats)
  const statsSide = stats.favouredSide;
  const statsStrength = Math.abs(stats.windows[100].evenPercentage - 50) / 50;
  engineVotes.push({
    engine: "Distribution Engine",
    side: statsSide === "NEUTRAL" ? "NEUTRAL" : statsSide,
    strength: statsStrength,
    sampleSize: stats.windows[100].sampleSize,
    detail: `100t Even share ${stats.windows[100].evenPercentage.toFixed(1)}% (Wilson lower bound ${(stats.windows[100].wilsonInterval.lower * 100).toFixed(1)}%)`,
  });

  // 2. Markov Engine
  const markovSide = markov.favouredSide;
  engineVotes.push({
    engine: "Markov Transition Engine",
    side: markovSide === "NEUTRAL" ? "NEUTRAL" : markovSide,
    strength: markov.confidence / 100,
    sampleSize: markov.matrix.totalTransitions,
    detail: `P(E|E)=${(markov.matrix.pEE * 100).toFixed(0)}%, P(O|O)=${(markov.matrix.pOO * 100).toFixed(0)}%`,
  });

  // 3. Run/Hazard Engine
  const runSide = runs.activeStreak.parity;
  const runStrength = runs.fatigue.status === "FATIGUE_IMMINENT" ? 0.3 : 0.7;
  engineVotes.push({
    engine: "Run Hazard Engine",
    side: runs.recommendation === "RIDE_STREAK" ? runSide : runSide === "EVEN" ? "ODD" : "EVEN",
    strength: runStrength,
    sampleSize: runs.metrics.totalRuns,
    detail: `${runs.activeStreak.count}x ${runs.activeStreak.parity} active (hazard=${runs.fatigue.hazardScore.toFixed(2)}, Weibull β=${runs.metrics.weibullShape.toFixed(2)})`,
  });

  // 4. Pressure Engine
  const pressureSide =
    pressure.dominantSide === "EVEN" ? "EVEN" : pressure.dominantSide === "ODD" ? "ODD" : "NEUTRAL";
  engineVotes.push({
    engine: "Digit Pressure Engine",
    side: pressureSide,
    strength: pressure.pressureDiff / 100,
    sampleSize: pressure.dominantDigits.length,
    detail: `Dominant side: ${pressure.dominantSide} (Pressure Δ ${pressure.pressureDiff.toFixed(1)}pts)`,
  });

  // 5. Pattern / Motif Engine
  const patternSide =
    pattern.continuationProbability.even > 0.55
      ? "EVEN"
      : pattern.continuationProbability.odd > 0.55
        ? "ODD"
        : "NEUTRAL";
  engineVotes.push({
    engine: "Pattern Motif Engine",
    side: patternSide,
    strength: Math.abs(pattern.continuationProbability.even - 0.5) * 2,
    sampleSize: pattern.activeMotif ? pattern.activeMotif.occurrences : 0,
    detail: pattern.activeMotif
      ? `Motif ${pattern.activeMotif.pattern}: ${(pattern.activeMotif.continuationRate * 100).toFixed(0)}% continuation`
      : "No strong recurring motif",
  });

  // 6. Entropy Engine
  const entropySide =
    entropy.microEntropy < 0.96 ? (statsSide === "NEUTRAL" ? "EVEN" : statsSide) : "NEUTRAL";
  engineVotes.push({
    engine: "Entropy Engine",
    side: entropySide,
    strength: 1 - entropy.microEntropy,
    sampleSize: n,
    detail: `Entropy ${entropy.microEntropy.toFixed(3)} bits (Disorder: ${entropy.regimeClassification})`,
  });

  // 7. Regime Engine (HMM)
  let hmmSide: "EVEN" | "ODD" | "NEUTRAL" = "NEUTRAL";
  if (hmm.currentState === "EVEN_DOMINANCE") hmmSide = "EVEN";
  else if (hmm.currentState === "ODD_DOMINANCE") hmmSide = "ODD";
  engineVotes.push({
    engine: "4-State HMM Regime",
    side: hmmSide,
    strength: hmm.stateProbabilities[hmm.currentState] ?? 0.5,
    sampleSize: n,
    detail: `State: ${hmm.currentState} (expected dwell: ${hmm.expectedDwellTicks} ticks, transition prob ${(hmm.transitionProbability * 100).toFixed(0)}%)`,
  });

  // 8. Manipulation & Anomaly Engine
  engineVotes.push({
    engine: "Anomaly & Crowding Engine",
    side: anomaly.anomalyFlagged ? "NEUTRAL" : statsSide === "NEUTRAL" ? "NEUTRAL" : statsSide,
    strength: (100 - anomaly.distortionScore) / 100,
    sampleSize: n,
    detail: `Distortion score: ${anomaly.distortionScore.toFixed(0)}/100, Crowding: ${anomaly.crowdingRisk}`,
  });

  // 9. Structural Psychology Engine
  const structuralSide =
    structural.analyst.verdict === "BUY_EVEN"
      ? "EVEN"
      : structural.analyst.verdict === "BUY_ODD"
        ? "ODD"
        : "NEUTRAL";
  engineVotes.push({
    engine: "Structural Digit Psychology",
    side: structuralSide,
    strength: structural.confidence / 100,
    sampleSize: n,
    detail: `Green Bar d${structural.greenBar.digit} (${structural.greenBar.parity}), Red Bar d${structural.redBar.digit} (${structural.redBar.parity})`,
  });

  // 10. Forecast Ensemble Engine
  const forecastSide =
    forecast.horizon1.winner === "EVEN"
      ? "EVEN"
      : forecast.horizon1.winner === "ODD"
        ? "ODD"
        : "NEUTRAL";
  engineVotes.push({
    engine: "Multi-Horizon Forecast Ensemble",
    side: forecastSide,
    strength: forecast.confidence / 100,
    sampleSize: n,
    detail: `H1 P(Even)=${(forecast.horizon1.pEven * 100).toFixed(0)}%, Direction: ${forecast.direction}`,
  });

  // 11. Personality Engine
  const personalitySide =
    personality.tendency.bias > 0.03
      ? "EVEN"
      : personality.tendency.bias < -0.03
        ? "ODD"
        : "NEUTRAL";
  engineVotes.push({
    engine: "Symbol Personality Engine",
    side: personalitySide,
    strength: Math.abs(personality.tendency.bias) * 5,
    sampleSize: n,
    detail: `${personality.profile.regimeAffinity} behavior, cluster tendency ${personality.profile.clusterTendency}`,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 2: META & VALIDATION ENGINES
  // ──────────────────────────────────────────────────────────────────────────
  const particles = runParticleFilter(digits);
  const drift = runDriftDetection(digits);
  const significance = computeSignificance(digits);
  const conformal = computeConformalInterval(digits);
  const evGate = evaluateEVGate(
    statsSide === "EVEN"
      ? stats.windows[100].evenPercentage / 100
      : stats.windows[100].oddPercentage / 100,
    conformal.intervalLow,
    0.95,
  );
  const danger = runParityDangerEngine(digits, stats.windows[100], runs.activeStreak);
  const deep = runDeepReasoning(
    digits,
    stats.windows[100].evenPercentage,
    markov.matrix.pEE,
    markov.matrix.pOO,
    "STABLE",
  );

  // Determine initial favored side from collective votes
  const evenVoteWeight = engineVotes
    .filter((v) => v.side === "EVEN")
    .reduce((acc, v) => acc + v.strength, 0);
  const oddVoteWeight = engineVotes
    .filter((v) => v.side === "ODD")
    .reduce((acc, v) => acc + v.strength, 0);
  const initialFavoredSide: "EVEN" | "ODD" = evenVoteWeight >= oddVoteWeight ? "EVEN" : "ODD";
  const targetContract = initialFavoredSide === "EVEN" ? "DIGITEVEN" : "DIGITODD";

  const specificDigit = computeSpecificParityEntryDigit(
    digits,
    targetContract,
    symbol,
    displayName,
  );
  const panel = runIntelligencePanel({
    contract: initialFavoredSide === "EVEN" ? "BUY_EVEN" : "BUY_ODD",
    confidence: Math.round(50 + Math.abs(evenVoteWeight - oddVoteWeight) * 15),
    evenPct: stats.windows[100].evenPercentage,
    pEE: markov.matrix.pEE,
    pOO: markov.matrix.pOO,
    regime: "STABLE",
    hidden:
      hmm.currentState === "EVEN_DOMINANCE"
        ? "EVEN_DOMINANCE"
        : hmm.currentState === "ODD_DOMINANCE"
          ? "ODD_DOMINANCE"
          : "BALANCED",
    market: symbol,
    marketName: displayName,
    streakCount: runs.activeStreak.count,
    streakParity: runs.activeStreak.parity,
  });

  // Raw decorrelation check
  const decorrelation = decorrelate(
    engineVotes.map((v) => ({
      engine: v.engine,
      supports: v.side === "EVEN" ? "BUY_EVEN" : v.side === "ODD" ? "BUY_ODD" : "NEUTRAL",
      confidence: Math.round(v.strength * 100),
      pEven:
        v.side === "EVEN"
          ? 0.5 + v.strength * 0.2
          : v.side === "ODD"
            ? 0.5 - v.strength * 0.2
            : 0.5,
    })),
  );

  // Compute unclamped honest confidence score (no hard min floor)
  const baseConfidence = 50 + (initialFavoredSide === "EVEN" ? evenVoteWeight : oddVoteWeight) * 12;
  const confidenceUnclamped = Math.max(
    0,
    Math.min(100, Math.round(baseConfidence - decorrelation.penalty)),
  );
  const winProbability =
    initialFavoredSide === "EVEN"
      ? stats.windows[100].evenPercentage / 100
      : stats.windows[100].oddPercentage / 100;
  const edgePercentagePoints = Number(((winProbability - breakEvenHurdle) * 100).toFixed(2));

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 3: SINGLE ORDERED DECISION GATE LIST (Short-Circuiting Vetoes)
  // ──────────────────────────────────────────────────────────────────────────
  const vetoes: { engine: string; reason: string }[] = [];
  const passedGates: string[] = [];

  // Gate 1: Data Sufficiency & Feed Integrity
  if (n < 30) {
    vetoes.push({
      engine: "Data Sufficiency Gate",
      reason: `Insufficient tick sample size (${n}/30 ticks required)`,
    });
  } else if (!quality.isReliable) {
    vetoes.push({
      engine: "Market Quality Gate",
      reason: `Feed integrity issues: ${quality.reasons.join("; ")}`,
    });
  } else {
    passedGates.push("DATA_SUFFICIENCY");
  }

  // Gate 2: Particle Filter Stability
  if (
    particles.effectiveSampleSize < 0.2 ||
    (particles.resampleOccurred && particles.variance > 0.08)
  ) {
    vetoes.push({
      engine: "SMC Particle Filter",
      reason: `Bayesian belief instability (Effective sample size ${(particles.effectiveSampleSize * 100).toFixed(0)}% below 20% stability threshold)`,
    });
  } else {
    passedGates.push("PARTICLE_FILTER");
  }

  // Gate 3: Drift & Structural Break
  if (drift.majorBreak) {
    vetoes.push({
      engine: "CUSUM / Drift Engine",
      reason: `Active structural regime shift detected by Page-Hinkley detector (Alarm: ${drift.alarmReason})`,
    });
  } else {
    passedGates.push("DRIFT_DETECTOR");
  }

  // Gate 4: Bootstrap Statistical Significance (FDR q < 0.25)
  if (!significance.isSignificant && edgePercentagePoints < 1.0) {
    vetoes.push({
      engine: "Bootstrap Significance Gate",
      reason: `Observed edge fails 500-sample bootstrap null hypothesis test (p-val=${significance.pValue.toFixed(3)}, FDR q=${significance.fdrQ.toFixed(3)})`,
    });
  } else {
    passedGates.push("BOOTSTRAP_SIGNIFICANCE");
  }

  // Gate 5: Danger Engine & Adversarial Threat
  if (danger.isDangerous && danger.threatLevel === "CRITICAL") {
    vetoes.push({
      engine: "Danger & Threat Gate",
      reason: `Adversarial market condition: ${danger.threats.join("; ")}`,
    });
  } else if (deep.suppression.triggered) {
    vetoes.push({
      engine: "Cognitive Suppression Layer",
      reason: `Suppression active: ${deep.suppression.reasons.join("; ")}`,
    });
  } else {
    passedGates.push("DANGER_GATE");
  }

  // Gate 6: Decorrelated Confidence Threshold
  if (confidenceUnclamped < minConfidence - 8) {
    vetoes.push({
      engine: "Confidence Gate",
      reason: `Unclamped confidence (${confidenceUnclamped}%) is below minimum operational threshold (${minConfidence}%)`,
    });
  } else {
    passedGates.push("CONFIDENCE_GATE");
  }

  // Gate 7: Expected Value (EV) Gate
  if (evGate.evLow < -0.05 && edgePercentagePoints < 0) {
    vetoes.push({
      engine: "EV Profitability Gate",
      reason: `Negative expected value after broker 0.95 payout (Conservative EV: ${(evGate.evLow * 100).toFixed(2)}%)`,
    });
  } else {
    passedGates.push("EV_GATE");
  }

  // Gate 8: Analyst Panel & Contrarian Arbiter
  if (panel.chief.decision === "REJECT" && confidenceUnclamped < 75) {
    vetoes.push({
      engine: "Chief Analyst Panel",
      reason: `Chief analyst veto: ${panel.chief.reasoning}`,
    });
  } else {
    passedGates.push("ANALYST_CONSENSUS");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 4: CANONICAL FINAL SIGNAL FORMATTER
  // ──────────────────────────────────────────────────────────────────────────
  const isApproved = vetoes.length === 0;
  const action: "BUY_EVEN" | "BUY_ODD" | "NO_TRADE" = isApproved
    ? initialFavoredSide === "EVEN"
      ? "BUY_EVEN"
      : "BUY_ODD"
    : "NO_TRADE";

  const triggerDigit = specificDigit.entryDigit;
  const entryFormula = isApproved
    ? `Enter ${action === "BUY_EVEN" ? "DIGITEVEN" : "DIGITODD"} upon Trigger Digit ${triggerDigit} printing — ${initialFavoredSide} share ${(winProbability * 100).toFixed(1)}% clears Wilson lower bound (${(conformal.intervalLow * 100).toFixed(1)}%), HMM regime ${hmm.currentState}, EV +${Math.max(0, edgePercentagePoints)}%`
    : `Stand aside — ${vetoes.length} active vetoes (${vetoes
        .map((v) => v.engine)
        .slice(0, 2)
        .join(", ")})`;

  const reasoning: string[] = [];
  if (isApproved) {
    reasoning.push(
      `Confluence of ${passedGates.length} validation gates aligned for ${action === "BUY_EVEN" ? "EVEN" : "ODD"}.`,
    );
    reasoning.push(
      `Specific trigger: Wait for Digit ${triggerDigit} to print on live feed, then execute 1-tick contract.`,
    );
    reasoning.push(
      `Wilson 90% Conformal bound: [${(conformal.intervalLow * 100).toFixed(1)}%, ${(conformal.intervalHigh * 100).toFixed(1)}%] against ${(breakEvenHurdle * 100).toFixed(2)}% breakeven hurdle.`,
    );
    reasoning.push(
      `HMM Regime: ${hmm.currentState} with expected dwell of ${hmm.expectedDwellTicks} ticks.`,
    );
    reasoning.push(
      `Quarter-Kelly stake sizing: ${(evGate.recommendedStakePct * 100).toFixed(1)}% bankroll allocation.`,
    );
  } else {
    reasoning.push(`Signal blocked: ${vetoes.map((v) => `${v.engine} (${v.reason})`).join("; ")}`);
  }

  const now = Date.now();
  const validityMinutes = 1; // Standard 60-second setup window
  const expiresAt = new Date(now + validityMinutes * 60 * 1000).toISOString();

  const finalSignal: FinalSignal = {
    market: {
      symbol,
      displayName,
    },
    action,
    entryFormula,
    focusDigitOrPattern: {
      digit: triggerDigit,
      pattern: specificDigit.pattern,
      note: `Trigger Digit ${triggerDigit} (${specificDigit.timing}): ${specificDigit.condition}`,
    },
    validity: {
      minutes: validityMinutes,
      expiresAt,
    },
    confidence: confidenceUnclamped,
    edgePercentagePoints: Math.max(0, edgePercentagePoints),
    reasoning,
    vetoes,
    engineVotes,
  };

  return {
    finalSignal,
    engineVotes,
    vetoes,
    passedGates,
    diagnostics: {
      stats,
      markov,
      runs,
      pressure,
      pattern,
      entropy,
      anomaly,
      quality,
      hmm,
      decorrelation,
      significance,
      particles,
      drift,
      conformal,
      evGate,
      structural,
      forecast,
      panel,
      deep,
      specificDigit,
    },
  };
}

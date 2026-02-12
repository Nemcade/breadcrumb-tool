// src/core/generator.ts
import type {
  ContentStore,
  RunConfig,
  JourneyStep,
  BreadcrumbOption,
  ProviderRef,
  StepProvider,
} from "./types";

// --- tiny seeded RNG (mulberry32) ---
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(rng: () => number, items: Array<{ w: number; v: T }>): T | null {
  const total = items.reduce((a, b) => a + Math.max(0, b.w), 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, it.w);
    if (r <= 0) return it.v;
  }
  return items[items.length - 1]?.v ?? null;
}

function providerToStepProvider(ref: ProviderRef): StepProvider {
  if (ref.type === "npc") return { type: "npc", npcId: ref.id };
  return { type: "item", itemId: ref.id };
}

function eligibleOptionsForStage(
  store: ContentStore,
  _cfg: RunConfig,
  stageTag: string,
  usedIds: Set<string>,
  isLast: boolean
): BreadcrumbOption[] {
  // Brother journey ignores player restrictions; but still respects:
  // - isMainJourney
  // - stageTag
  // - not reusing same breadcrumb id
  // - optional factionsPresent filter (dev tooling)
  return store.breadcrumbs.filter((b) => {
    if (!b.isMainJourney) return false;
    if (b.stageTag !== stageTag) return false;
    if (usedIds.has(b.id)) return false;

    // If last step: prefer “hard end” breadcrumbs (no nextStageTags)
    if (isLast && (b.nextStageTags?.length ?? 0) > 0) return false;

    // Optional: if breadcrumb only uses providers from factions that are "present"
    // We do NOT require this to exist, but if cfg.factionsPresent is used elsewhere,
    // keeping it here is harmless and useful.
    // (No-op if you don’t track provider faction on ref level.)
    return true;
  });
}

function chooseProviderForOption(rng: () => number, opt: BreadcrumbOption): StepProvider | null {
  const refs = opt.providerRefs ?? [];
  if (refs.length === 0) return null;

  // For now: uniform random provider from pool
  const idx = Math.floor(rng() * refs.length);
  const ref = refs[idx];
  if (!ref) return null;
  return providerToStepProvider(ref);
}

export function generateJourney(store: ContentStore, cfg: RunConfig): { steps: JourneyStep[]; issues: string[] } {
  const issues: string[] = [];
  const steps: JourneyStep[] = [];

  const rng = mulberry32(Number(cfg.seed ?? 1));

  const usedOptionIds = new Set<string>();
  let stage = cfg.startStageTag;

  for (let i = 0; i < cfg.chainLength; i++) {
    const isLast = i === cfg.chainLength - 1;

    const eligible = eligibleOptionsForStage(store, cfg, stage, usedOptionIds, isLast);

    if (eligible.length === 0) {
      issues.push(`Blocked at step ${i + 1} (stage: ${stage}) — no eligible breadcrumb.`);
      break;
    }

    // Prefer options that actually lead forward on non-last steps
    const weighted = eligible.map((b) => {
      const hasForward = (b.nextStageTags?.length ?? 0) > 0;
      const w = Math.max(0, b.weight ?? 1) * (isLast ? 1 : hasForward ? 2 : 0.25);
      return { w, v: b };
    });

    const chosen = pickWeighted(rng, weighted) ?? eligible[0];
    usedOptionIds.add(chosen.id);

    const provider = chooseProviderForOption(rng, chosen);
const providerFinal: StepProvider = provider ?? { type: "tavernkeeper" };
const usedFallback = provider == null;
if (usedFallback) {
  issues.push(`Breadcrumb "${chosen.title || chosen.id}" has no providers (providerRefs empty).`);
}

steps.push({
  idx: i,
  stageTag: stage,
  optionId: chosen.id,

  provider: providerFinal,
  usedFallback,

  // Provider-authored beat is selected later (or by another pass)
  beatId: null,
  beatKind: null,
  beatMood: null,

  rendered: "",
});



    // Next stage selection:
    if (isLast) break;

    const nextTags = chosen.nextStageTags ?? [];
    const next = nextTags.length > 0 ? nextTags[Math.floor(rng() * nextTags.length)] : null;

    if (!next) {
      issues.push(`Chain ended early at ${i + 1}/${cfg.chainLength} — breadcrumb has no nextStageTags.`);
      break;
    }

    stage = next;
  }

  if (steps.length < cfg.chainLength) {
    issues.push(`Chain ended early at ${steps.length}/${cfg.chainLength}.`);
  }

  return { steps, issues };
}

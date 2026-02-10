import type { BreadcrumbOption, ContentStore, JourneyStep, RunConfig, StepProvider } from "../core/types";

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(rng: () => number, items: Array<{ item: T; weight: number }>) {
  const total = items.reduce((a, b) => a + Math.max(0, b.weight), 0);
  if (total <= 0) return null;

  let r = rng() * total;
  for (const it of items) {
    r -= Math.max(0, it.weight);
    if (r <= 0) return it.item;
  }

  return items[items.length - 1]?.item ?? null;
}

function isFactionPresent(cfg: RunConfig, factionId: string | null) {
  if (!factionId) return true;
  return cfg.factionsPresent[factionId] !== false;
}

/**
 * Brother’s Journey:
 * - ignores requirements and respect entirely
 * - filters only isMainJourney + stageTag rules
 */
function eligibleOptionsForStage(store: ContentStore, stageTag: string) {
  return store.breadcrumbs.filter((o) => {
    if (o.isMainJourney === false) return false;

    // stage match rules:
    // - Exact stageTag matches
    // - "Any" allowed for non-Start stages
    return o.stageTag === stageTag || (o.stageTag === "Any" && stageTag !== "Start");
  });
}

/**
 * Pick one provider witness from the breadcrumb's provider pool.
 * Brother’s Journey ignores tier/respect gating.
 */
function resolveProviderRef(
  store: ContentStore,
  option: BreadcrumbOption,
  cfg: RunConfig,
  rng: () => number
): StepProvider | null {
  const candidates: StepProvider[] = [];

  for (const ref of option.providerRefs) {
    if (ref.type === "npc") {
      const npc = store.npcs.find((n) => n.id === ref.id);
      if (!npc) continue;
      if (!isFactionPresent(cfg, npc.factionId)) continue;
      candidates.push({ type: "npc", npcId: npc.id });
      continue;
    }

    if (ref.type === "item") {
      const item = store.items.find((it) => it.id === ref.id);
      if (!item) continue;
      candidates.push({ type: "item", itemId: item.id });
      continue;
    }
  }

  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)]!;
}

export function generateJourney(store: ContentStore, cfg: RunConfig): { steps: JourneyStep[]; issues: string[] } {
  const rng = mulberry32(cfg.seed);
  const steps: JourneyStep[] = [];
  const issues: string[] = [];

  let stage = cfg.startStageTag;

  // Prevent using the same breadcrumb option more than once in a single generated journey.
  const usedOptionIds = new Set<string>();

  for (let i = 0; i < cfg.chainLength; i++) {
    // Exclude already-used options
    const options = eligibleOptionsForStage(store, stage).filter((o) => !usedOptionIds.has(o.id));
    const weighted = options.map((o) => ({ item: o, weight: o.weight ?? 1 }));

    let chosen: BreadcrumbOption | null = null;
    let provider: StepProvider | null = null;

    // Try a few weighted draws so weight matters, but don't loop forever.
    for (let attempt = 0; attempt < 16; attempt++) {
      const candidate = pickWeighted(rng, weighted);
      if (!candidate) break;

      const prov = resolveProviderRef(store, candidate, cfg, rng);
      if (!prov) continue;

      chosen = candidate;
      provider = prov;
      break;
    }

    if (!chosen || !provider) {
      issues.push(
        `Blocked at step ${i + 1} (stage: ${stage}) — no eligible main breadcrumb/provider (or all options already used).`
      );
      break;
    }

    usedOptionIds.add(chosen.id);

    steps.push({
      idx: i,
      stageTag: stage,
      optionId: chosen.id,
      provider,
      usedFallback: false, // Brother’s Journey never uses fallback logic
    });

    // Advance stage by picking a nextStageTag (if none exist, stay in current stage)
    const next =
      chosen.nextStageTags.length > 0 ? chosen.nextStageTags[Math.floor(rng() * chosen.nextStageTags.length)] : stage;

    stage = next;
  }

  return { steps, issues };
}

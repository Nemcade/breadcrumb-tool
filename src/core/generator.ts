import type { BreadcrumbOption, ContentStore, JourneyStep, NPC, RunConfig, StepProvider } from "./types";

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
 * Brother journey eligibility:
 * - ignores requirements + respect
 * - treats missing isMainJourney as TRUE (only excludes explicit false)
 * - stage matching:
 *   - exact stageTag
 *   - "Any" allowed for non-Start, non-End (mid chain only)
 * - prevents duplicates via usedIds
 * - last step forces stageTag="End"
 * - avoids mute breadcrumbs mid-chain (requires nextStageTags if not last)
 */
function eligibleOptionsForStage(store: ContentStore, stageTag: string, usedIds: Set<string>, isLast: boolean) {
  const options = store.breadcrumbs.filter((o) => {
    if (o.isMainJourney === false) return false; // only explicit false excludes
    if (usedIds.has(o.id)) return false;

    if (isLast) return o.stageTag === "End";

    if (o.stageTag === stageTag) return true;
    if (o.stageTag === "Any" && stageTag !== "Start" && stageTag !== "End") return true;
    return false;
  });

  // Avoid mutes mid-chain
  return options.filter((o) => isLast || (Array.isArray(o.nextStageTags) && o.nextStageTags.length > 0));
}

/**
 * Resolve a provider witness for brother journey:
 * - no tier/respect gating
 * - filters providers whose faction is not present
 */
function resolveProviderForBrother(store: ContentStore, option: BreadcrumbOption, cfg: RunConfig, rng: () => number): StepProvider | null {
  const pool: StepProvider[] = [];

  for (const ref of option.providerRefs) {
    if (ref.type === "npc") {
      const npc: NPC | undefined = store.npcs.find((n) => n.id === ref.id);
      if (!npc) continue;
      if (!isFactionPresent(cfg, npc.factionId)) continue;
      pool.push({ type: "npc", npcId: npc.id });
      continue;
    }

    if (ref.type === "item") {
      const item = store.items.find((it) => it.id === ref.id);
      if (!item) continue;
      pool.push({ type: "item", itemId: item.id });
      continue;
    }
  }

  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}

export function generateJourney(store: ContentStore, cfg: RunConfig): { steps: JourneyStep[]; issues: string[] } {
  const rng = mulberry32(cfg.seed);
  const steps: JourneyStep[] = [];
  const issues: string[] = [];

  const usedIds = new Set<string>();

  let stage = cfg.startStageTag;

  for (let i = 0; i < cfg.chainLength; i++) {
    const isLast = i === cfg.chainLength - 1;
    const effectiveStage = isLast ? "End" : stage;

    const options = eligibleOptionsForStage(store, effectiveStage, usedIds, isLast);

    if (options.length === 0) {
      issues.push(
        isLast
          ? `No eligible End breadcrumb found (stageTag="End", isMainJourney != false).`
          : `Blocked at step ${i + 1} (stage: ${effectiveStage}) — no eligible breadcrumb.`
      );
      break;
    }

    // weight bias towards options that have a resolvable provider
    const weighted = options.map((o) => {
      const hasProvider = resolveProviderForBrother(store, o, cfg, rng) != null;
      const w = (o.weight ?? 1) * (hasProvider ? 1 : 0.15);
      return { item: o, weight: w };
    });

    let chosen: BreadcrumbOption | null = null;
    let provider: StepProvider | null = null;

    for (let attempt = 0; attempt < 24; attempt++) {
      const candidate = pickWeighted(rng, weighted);
      if (!candidate) break;
      chosen = candidate;
      provider = resolveProviderForBrother(store, candidate, cfg, rng);
      break;
    }

    if (!chosen) {
      issues.push(`Blocked at step ${i + 1} (stage: ${effectiveStage}) — no candidate could be selected.`);
      break;
    }

    usedIds.add(chosen.id);

    if (!provider) {
      issues.push(`Breadcrumb "${chosen.title}" (${chosen.id}) has no resolvable providers (missing or faction not present).`);
      provider = { type: "tavernkeeper" }; // placeholder so UI renders
    }

    steps.push({
      idx: i,
      stageTag: effectiveStage,
      optionId: chosen.id,
      provider,
      usedFallback: false,
    });

    if (isLast) break;

    // advance stage
    const next =
      chosen.nextStageTags.length > 0
        ? chosen.nextStageTags[Math.floor(rng() * chosen.nextStageTags.length)]
        : effectiveStage;

    stage = next;
  }

  if (steps.length < cfg.chainLength && (steps[steps.length - 1]?.stageTag ?? "") !== "End") {
    issues.push(`Chain ended early at ${steps.length}/${cfg.chainLength}. Add more main breadcrumbs or ensure nextStageTags lead forward.`);
  }

  return { steps, issues };
}

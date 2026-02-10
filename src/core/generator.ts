import type {
  BreadcrumbOption,
  ContentStore,
  JourneyStep,
  NPC,
  RunConfig,
  StepProvider,
  Tier,
  Requirement,
} from "../core/types";

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

function tierToRespect(tier: Tier) {
  // simple mapping: tier 0..3 == minimum respect required
  return tier;
}

function reqsMet(reqs: Requirement[], cfg: RunConfig, allowBlockedFallbackOnly: boolean) {
  for (const r of reqs) {
    if (r.kind === "always") continue;

    if (r.kind === "blockedFallbackOnly") {
      if (!allowBlockedFallbackOnly) return false;
      continue;
    }

    if (r.kind === "respectAtLeast") {
      if ((cfg.respect[r.factionId] ?? 0) < r.value) return false;
    }
  }
  return true;
}

function isFactionPresent(cfg: RunConfig, factionId: string | null) {
  if (!factionId) return true;
  return cfg.factionsPresent[factionId] !== false;
}

/**
 * Which breadcrumb options can appear at this stage?
 */
function eligibleOptionsForStage(store: ContentStore, cfg: RunConfig, stageTag: string) {
  // We keep the simple stage system:
  // - Exact stageTag matches
  // - "Any" allowed for non-Start stages
  const options = store.breadcrumbs.filter(
    (o) => o.stageTag === stageTag || (o.stageTag === "Any" && stageTag !== "Start")
  );

  // Requirements can be met either normally or via fallback-only rules.
  return options.filter((o) => reqsMet(o.requirements, cfg, false) || reqsMet(o.requirements, cfg, true));
}

/**
 * Resolve a concrete provider for a chosen breadcrumb.
 * - Try breadcrumb.providerRefs in order
 * - If none eligible, use global tavernkeeper fallback (when stageBlocked==true)
 */
function resolveProviderRef(
  store: ContentStore,
  option: BreadcrumbOption,
  cfg: RunConfig,
  stageBlocked: boolean
): { provider: StepProvider; usedFallback: boolean } | null {
  // First: must meet non-fallback requirements
  if (!reqsMet(option.requirements, cfg, false)) {
    // If requirements include blockedFallbackOnly, allow it only in blocked mode
    if (!(stageBlocked && reqsMet(option.requirements, cfg, true))) return null;
  }

  // 1) Try the explicitly listed providers (concrete NPCs / Items)
  for (const ref of option.providerRefs) {
    if (ref.type === "npc") {
      const npc: NPC | undefined = store.npcs.find((n) => n.id === ref.id);
      if (!npc) continue;

      if (!isFactionPresent(cfg, npc.factionId)) continue;

      // NPC tier is a default "min respect" requirement for talking
      if (npc.factionId) {
        const need = tierToRespect(npc.tier);
        if ((cfg.respect[npc.factionId] ?? 0) < need) continue;
      }

      return { provider: { type: "npc", npcId: npc.id }, usedFallback: false };
    }

    if (ref.type === "item") {
      const item = store.items.find((it) => it.id === ref.id);
      if (!item) continue;

      // Items currently have no faction gating (later you can add "guarded by" etc.)
      return { provider: { type: "item", itemId: item.id }, usedFallback: false };
    }
  }

  // 2) If we can’t resolve a provider and we are not blocked, fail
  if (!stageBlocked) return null;

  // 3) Global tavernkeeper fallback:
  // Prefer any NPC with role "tavernkeeper" that is in a present faction (or unaffiliated)
  const inns = store.npcs.filter((n) => Array.isArray(n.roles) && n.roles.includes("tavernkeeper") && isFactionPresent(cfg, n.factionId));
  if (inns[0]) return { provider: { type: "npc", npcId: inns[0].id }, usedFallback: true };

  return { provider: { type: "tavernkeeper" }, usedFallback: true };
}

export function generateJourney(store: ContentStore, cfg: RunConfig): { steps: JourneyStep[]; issues: string[] } {
  const rng = mulberry32(cfg.seed);
  const steps: JourneyStep[] = [];
  const issues: string[] = [];

  let stage = cfg.startStageTag;

  for (let i = 0; i < cfg.chainLength; i++) {
    const options = eligibleOptionsForStage(store, cfg, stage);
    const weighted = options.map((o) => ({ item: o, weight: o.weight ?? 1 }));

    let chosen: BreadcrumbOption | null = null;
    let chosenProv: { provider: StepProvider; usedFallback: boolean } | null = null;

    // Try a few random draws so weight matters, but don’t loop forever
    for (let attempt = 0; attempt < 16; attempt++) {
      const candidate = pickWeighted(rng, weighted);
      if (!candidate) break;

      // First try without fallback; if none, try with fallback
      const normal = resolveProviderRef(store, candidate, cfg, false);
      if (normal) {
        chosen = candidate;
        chosenProv = normal;
        break;
      }

      const fallback = resolveProviderRef(store, candidate, cfg, true);
      if (fallback) {
        chosen = candidate;
        chosenProv = fallback;
        break;
      }
    }

    if (!chosen || !chosenProv) {
      issues.push(`Blocked at step ${i + 1} (stage: ${stage}) — no eligible breadcrumb/provider.`);
      break;
    }

    steps.push({
      idx: i,
      stageTag: stage,
      optionId: chosen.id,
      provider: chosenProv.provider,
      usedFallback: chosenProv.usedFallback,
    });

    const next =
      chosen.nextStageTags.length > 0
        ? chosen.nextStageTags[Math.floor(rng() * chosen.nextStageTags.length)]
        : stage;

    stage = next;
  }

  return { steps, issues };
}

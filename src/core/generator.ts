// src/core/generator.ts
import type {
  ContentStore,
  RunConfig,
  JourneyStep,
  BreadcrumbOption,
  ProviderRef,
  StepProvider,
  ProviderBeat,
  LocationId,
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

type Weighted<T> = { w: number; v: T };

function pickWeighted<T>(rng: () => number, items: Array<Weighted<T>>): T | null {
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
  // - if last step: prefer “hard end” breadcrumbs (no nextStageTags)
  return store.breadcrumbs.filter((b) => {
    if (!b.isMainJourney) return false;
    if (b.stageTag !== stageTag) return false;
    if (usedIds.has(b.id)) return false;
    if (isLast && (b.nextStageTags?.length ?? 0) > 0) return false;
    return true;
  });
}

function chooseProviderForOption(rng: () => number, opt: BreadcrumbOption): StepProvider | null {
  const refs = opt.providerRefs ?? [];
  if (refs.length === 0) return null;

  // uniform random from pool
  const idx = Math.floor(rng() * refs.length);
  const ref = refs[idx];
  if (!ref) return null;
  return providerToStepProvider(ref);
}

function getProviderNameAndLocation(
  store: ContentStore,
  provider: StepProvider
): { name: string; locationId: LocationId | null } {
  if (provider.type === "npc") {
    const npc = store.npcs.find((n) => n.id === provider.npcId);
    return { name: npc?.name ?? provider.npcId, locationId: npc?.locationId ?? null };
  }
  if (provider.type === "item") {
    const it = store.items.find((x) => x.id === provider.itemId);
    return { name: it?.name ?? provider.itemId, locationId: it?.locationId ?? null };
  }
  return { name: "Tavernkeeper", locationId: null };
}

function getLocationName(store: ContentStore, id: LocationId | null): string {
  if (!id) return "";
  return store.locations.find((l) => l.id === id)?.name ?? "";
}

function getProviderBeats(store: ContentStore, provider: StepProvider): ProviderBeat[] {
  if (provider.type === "npc") {
    return store.npcs.find((n) => n.id === provider.npcId)?.brotherBeats ?? [];
  }
  if (provider.type === "item") {
    return store.items.find((it) => it.id === provider.itemId)?.brotherBeats ?? [];
  }
  return [];
}

function renderTokens(template: string, tokens: Record<string, string>): string {
  // lightweight token replace: {token}
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, key: string) => {
    const v = tokens[key];
    return v !== undefined ? v : `{${key}}`;
  });
}

export function generateJourney(
  store: ContentStore,
  cfg: RunConfig
): { steps: JourneyStep[]; issues: string[] } {
  const issues: string[] = [];
  const steps: JourneyStep[] = [];
  const rng = mulberry32(Number(cfg.seed ?? 1));

  const usedOptionIds = new Set<string>();
  let stage = cfg.startStageTag;

  // ---- pass 1: choose breadcrumb options + providers ----
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

      beatId: null,
      beatKind: null,
      beatMood: null,
      rendered: "",
    });

    if (isLast) break;

    const nextTags = chosen.nextStageTags ?? [];
    const next = nextTags.length > 0 ? nextTags[Math.floor(rng() * nextTags.length)] : null;

    if (!next) {
      issues.push(
        `Chain ended early at ${i + 1}/${cfg.chainLength} — breadcrumb has no nextStageTags.`
      );
      break;
    }

    stage = next;
  }

  if (steps.length < cfg.chainLength) {
    issues.push(`Chain ended early at ${steps.length}/${cfg.chainLength}.`);
  }

  // ---- pass 2: roll provider beats + render text ----
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const opt = store.breadcrumbs.find((b) => b.id === s.optionId);
    if (!opt) continue;

    const me = getProviderNameAndLocation(store, s.provider);

    const nextStep = steps[i + 1] ?? null;
    const nextProviderInfo = nextStep ? getProviderNameAndLocation(store, nextStep.provider) : null;
    const nextOpt = nextStep
      ? store.breadcrumbs.find((b) => b.id === nextStep.optionId) ?? null
      : null;

    const tokens: Record<string, string> = {
      me: me.name,
      myLocation: getLocationName(store, me.locationId),

      nextProvider: nextProviderInfo?.name ?? "",
      nextLocation: nextProviderInfo ? getLocationName(store, nextProviderInfo.locationId) : "",
      nextBreadcrumb: nextOpt?.title ?? "",
    };

    const beats = getProviderBeats(store, s.provider);

    if (beats.length > 0) {
      const picked =
        pickWeighted(
          rng,
          beats.map((b) => ({ w: Math.max(0, b.weight ?? 1), v: b }))
        ) ?? beats[0];

      s.beatId = picked.id;
      s.beatKind = picked.kind;
      s.beatMood = picked.mood;

      s.rendered = renderTokens(picked.text ?? "", tokens).trim();
    }

    // fallback if no beat (or beat rendered empty)
    if (!s.rendered) {
      s.rendered = renderTokens(opt.text ?? "", tokens).trim();
    }
  }

  return { steps, issues };
}

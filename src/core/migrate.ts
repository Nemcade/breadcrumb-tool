import type { ContentStore, Location, Connection } from "../core/types";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(2, 6)}`;
}

/**
 * Latest schema version in the content store.
 * v1: original (providers specs in breadcrumbs)
 * v2: adds items[] and providerRefs[] on breadcrumbs
 * v3: locations gain biomeIds + defaultBiomeId, and store gains connections[]
 */
const LATEST_VERSION = 3;

function normalizeLocations(rawLocations: any[]): Location[] {
  const locs = Array.isArray(rawLocations) ? rawLocations : [];
  return locs.map((l: any) => ({
    id: l.id,
    name: l.name ?? "Location",
    kind: l.kind ?? "landmark",
    parentId: l.parentId ?? null,

    // v3 additions
    biomeIds: Array.isArray(l.biomeIds) ? l.biomeIds : [],
    defaultBiomeId: l.defaultBiomeId ?? null,

    tags: Array.isArray(l.tags) ? l.tags : [],
  }));
}

function normalizeConnections(rawConnections: any): Connection[] {
  return Array.isArray(rawConnections) ? rawConnections : [];
}

function migrateV2toV3(v2: any): ContentStore {
  return {
    version: 3,
    factions: Array.isArray(v2.factions) ? v2.factions : [],
    locations: normalizeLocations(v2.locations),
    npcs: Array.isArray(v2.npcs) ? v2.npcs : [],
    items: Array.isArray(v2.items) ? v2.items : [],
    breadcrumbs: Array.isArray(v2.breadcrumbs) ? v2.breadcrumbs : [],
    connections: normalizeConnections(v2.connections),
  };
}

/**
 * Migrates v1 -> v2:
 * - adds items:[]
 * - converts breadcrumb.providers(specs) -> breadcrumb.providerRefs(concrete)
 * Notes:
 * - NPC-role specs are best-effort (picks up to 3 matching NPCs)
 * - chest/note specs become placeholder items with no location (you can relocate them later)
 */
function migrateV1toV2(raw: any): any {
  const items: any[] = [];
  const npcs: any[] = Array.isArray(raw.npcs) ? raw.npcs : [];

  const breadcrumbs = (raw.breadcrumbs ?? []).map((b: any) => {
    const providerRefs: any[] = [];

    // v1 had b.providers: ProviderSpec[]
    const specs: any[] = Array.isArray(b.providers) ? b.providers : [];

    for (const p of specs) {
      if (p?.type === "npc") {
        const rolesAny: string[] = Array.isArray(p.rolesAny) ? p.rolesAny : [];
        const minTier = typeof p.minTier === "number" ? p.minTier : 0;

        const matches = npcs
          .filter((n) => {
            if (typeof n?.tier === "number" && n.tier < minTier) return false;
            if (!rolesAny.length) return true;
            const r = Array.isArray(n.roles) ? n.roles : [];
            return rolesAny.some((x) => r.includes(x));
          })
          .slice(0, 3);

        for (const n of matches) providerRefs.push({ type: "npc", id: n.id });
      }

      if (p?.type === "chest" || p?.type === "note") {
        const id = uid("item");
        items.push({
          id,
          name: p.type === "chest" ? "Chest (migrated)" : "Note (migrated)",
          kind: p.type,
          locationId: null,
          notes: "",
          tags: ["migrated"],
        });
        providerRefs.push({ type: "item", id });
      }

      // tavernkeeper: ignored (global fallback in newer model)
    }

    return {
      id: b.id,
      title: b.title ?? "Breadcrumb",
      stageTag: b.stageTag ?? "Any",
      text: b.text ?? "",
      providerRefs,
      requirements: Array.isArray(b.requirements) ? b.requirements : [],
      nextStageTags: Array.isArray(b.nextStageTags) ? b.nextStageTags : [],
      weight: typeof b.weight === "number" ? b.weight : 1,
    };
  });

  return {
    version: 2,
    factions: raw.factions ?? [],
    locations: raw.locations ?? [],
    npcs: raw.npcs ?? [],
    items,
    breadcrumbs,
  };
}

export function migrateToLatest(raw: any): ContentStore {
  if (!raw?.version) throw new Error("Invalid store");

  if (raw.version >= LATEST_VERSION) return raw as ContentStore;

  // v1 -> v2 -> v3
  if (raw.version === 1) {
    const v2 = migrateV1toV2(raw);
    return migrateV2toV3(v2);
  }

  // v2 -> v3
  if (raw.version === 2) {
    return migrateV2toV3(raw);
  }

  throw new Error(`Unsupported version: ${raw.version}`);
}

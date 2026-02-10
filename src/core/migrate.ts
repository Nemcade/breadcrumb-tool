import type { ContentStore } from "../core/types";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(2, 6)}`;
}

/**
 * Migrates v1 -> v2:
 * - adds items:[]
 * - converts breadcrumb.providers(specs) -> breadcrumb.providerRefs(concrete)
 * Notes:
 * - NPC-role specs are best-effort (picks up to 3 matching NPCs)
 * - chest/note specs become placeholder items with no location (you can relocate them later)
 */
export function migrateToLatest(raw: any): ContentStore {
  if (!raw?.version) throw new Error("Invalid store");

  if (raw.version >= 2) return raw as ContentStore;

  // v1 -> v2
  if (raw.version === 1) {
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

        // tavernkeeper no longer needs to be authored on breadcrumbs in v2 (global fallback),
        // so we ignore it here.
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

    const v2: ContentStore = {
      version: 2,
      factions: raw.factions ?? [],
      locations: raw.locations ?? [],
      npcs: raw.npcs ?? [],
      items,
      breadcrumbs,
    };

    return v2;
  }

  // Unknown older version
  throw new Error(`Unsupported version: ${raw.version}`);
}

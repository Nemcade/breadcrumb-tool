import type { ContentStore } from "../core/types";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(2, 6)}`;
}

export function migrateToLatest(raw: any): ContentStore {
  if (!raw) throw new Error("Invalid store");

  const v = Number(raw.version ?? 1);

  // If already v3+, just ensure missing arrays exist
  if (v >= 3) {
    const s = raw as ContentStore;

    // defensive fills
    s.locations = (s.locations ?? []).map((l: any) => ({
      biomeIds: [],
      defaultBiomeId: null,
      tags: [],
      ...l,
    }));

    s.npcs = (s.npcs ?? []).map((n: any) => ({
      roles: [],
      notes: "",
      brotherBeats: [],
      ...n,
    }));

    s.items = (s.items ?? []).map((it: any) => ({
      notes: "",
      tags: [],
      brotherBeats: [],
      ...it,
    }));

    s.breadcrumbs = (s.breadcrumbs ?? []).map((b: any) => ({
      text: "",
      requirements: [],
      nextStageTags: [],
      weight: 1,
      isMainJourney: true,
      ...b,
    }));

    s.connections = s.connections ?? [];
    s.version = Math.max(3, s.version ?? 3);

    return s;
  }

  // v1/v2 → v3 (normalize everything)
  const factions = raw.factions ?? [];
  const locations = (raw.locations ?? []).map((l: any) => ({
    id: l.id,
    name: l.name ?? "Location",
    kind: l.kind ?? "landmark",
    parentId: l.parentId ?? null,
    biomeIds: Array.isArray(l.biomeIds) ? l.biomeIds : [],
    defaultBiomeId: l.defaultBiomeId ?? null,
    tags: Array.isArray(l.tags) ? l.tags : [],
  }));

  const npcs = (raw.npcs ?? []).map((n: any) => ({
    id: n.id ?? uid("npc"),
    name: n.name ?? "NPC",
    factionId: n.factionId ?? null,
    roles: Array.isArray(n.roles) ? n.roles : [],
    tier: typeof n.tier === "number" ? n.tier : 0,
    locationId: n.locationId ?? null,
    notes: n.notes ?? "",
    brotherBeats: Array.isArray(n.brotherBeats) ? n.brotherBeats : [],
  }));

  const items = (raw.items ?? []).map((it: any) => ({
    id: it.id ?? uid("item"),
    name: it.name ?? "Item",
    kind: it.kind ?? "other",
    locationId: it.locationId ?? null,
    notes: it.notes ?? "",
    tags: Array.isArray(it.tags) ? it.tags : [],
    brotherBeats: Array.isArray(it.brotherBeats) ? it.brotherBeats : [],
  }));

  // If v1 had breadcrumb.providers, best-effort convert → providerRefs
  const breadcrumbs = (raw.breadcrumbs ?? []).map((b: any) => {
    const providerRefs: any[] = Array.isArray(b.providerRefs) ? b.providerRefs : [];

    if (!providerRefs.length && Array.isArray(b.providers)) {
      // legacy v1 conversion
      for (const p of b.providers) {
        if (p?.type === "npc") {
          // keep it minimal; legacy role specs are no longer primary
          const matches = npcs.slice(0, 2);
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
            brotherBeats: [],
          });
          providerRefs.push({ type: "item", id });
        }
      }
    }

    return {
      id: b.id ?? uid("bc"),
      title: b.title ?? "Breadcrumb",
      stageTag: b.stageTag ?? "Any",
      text: b.text ?? "",
      providerRefs,
      requirements: Array.isArray(b.requirements) ? b.requirements : [],
      nextStageTags: Array.isArray(b.nextStageTags) ? b.nextStageTags : [],
      weight: typeof b.weight === "number" ? b.weight : 1,
      isMainJourney: typeof b.isMainJourney === "boolean" ? b.isMainJourney : true,
    };
  });

  const connections = raw.connections ?? [];

  const out: ContentStore = {
    version: 3,
    factions,
    locations,
    npcs,
    items,
    breadcrumbs,
    connections,
  };

  return out;
}

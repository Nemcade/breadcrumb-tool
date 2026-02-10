import type { ContentStore, Indexes } from "../core/types";

export function buildIndexes(store: ContentStore): Indexes {
  return {
  factionsById: new Map(store.factions.map((f) => [f.id, f])),
  locationsById: new Map(store.locations.map((l) => [l.id, l])),
  npcsById: new Map(store.npcs.map((n) => [n.id, n])),
  itemsById: new Map(store.items.map((it) => [it.id, it])),
  breadcrumbsById: new Map(store.breadcrumbs.map((b) => [b.id, b])),
};

}

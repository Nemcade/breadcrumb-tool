import { useEffect, useMemo, useState } from "react";
import type {
  ContentStore,
  Indexes,
  BreadcrumbId,
  LocationId,
  NPCId,
  ItemId,
  FactionId,
} from "../core/types";
import ProviderLibraryPanel from "../components/ProviderLibraryPanel";
import ProviderEditor from "../components/ProviderEditor";

const ANY = "any";
const NONE = "__none__";

export default function ProvidersPage({
  store,
  setStore,
  ix,
  selectedProvider,
  setSelectedProvider,
  nav,
}: {
  store: ContentStore;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  ix: Indexes;
  selectedProvider: { type: "npc"; id: NPCId } | { type: "item"; id: ItemId } | null;
  setSelectedProvider: (p: { type: "npc"; id: NPCId } | { type: "item"; id: ItemId } | null) => void;
  nav: {
    openBreadcrumb: (id: BreadcrumbId) => void;
    openLocation: (id: LocationId) => void;
    openProvider: (ref: { type: "npc"; id: NPCId } | { type: "item"; id: ItemId }) => void;
  };
}) {
  const selected =
    selectedProvider ?? (store.npcs[0] ? ({ type: "npc", id: store.npcs[0].id } as const) : null);

  // keep selection valid
  useEffect(() => {
    if (!selected) return;

    const ok =
      selected.type === "npc"
        ? store.npcs.some((n) => n.id === selected.id)
        : store.items.some((it) => it.id === selected.id);

    if (ok) return;

    if (store.npcs[0]) setSelectedProvider({ type: "npc", id: store.npcs[0].id });
    else if (store.items[0]) setSelectedProvider({ type: "item", id: store.items[0].id });
    else setSelectedProvider(null);
  }, [selected, store.npcs, store.items, setSelectedProvider]);

  const [providersTab, setProvidersTab] = useState<"npcs" | "items" | "locations">("npcs");

  // Filters (controlled by page so Add can prefill)
  const [filterFactionId, setFilterFactionId] = useState<FactionId | typeof ANY | typeof NONE>(ANY);
  const [filterLocationId, setFilterLocationId] = useState<LocationId | typeof ANY | typeof NONE>(ANY);
  const [filterTier, setFilterTier] = useState<number | typeof ANY>(ANY);

  const [filterItemKind, setFilterItemKind] = useState<string | typeof ANY>(ANY);

  function addNPC() {
    const id = `npc_${Math.random().toString(36).slice(2, 9)}`;

    const factionId =
      filterFactionId === ANY ? null : filterFactionId === NONE ? null : filterFactionId;

    const locationId =
      filterLocationId === ANY ? null : filterLocationId === NONE ? null : filterLocationId;

    const tier = filterTier === ANY ? 0 : filterTier;

    setStore((s) => ({
      ...s,
      npcs: [
        ...s.npcs,
        {
          id,
          name: "New NPC",
          factionId,
          roles: [],
          tier,
          locationId,
          notes: "",
          brotherBeats: [],
        },
      ],
    }));
    setSelectedProvider({ type: "npc", id });
  }

  function addItem() {
    const id = `item_${Math.random().toString(36).slice(2, 9)}`;

    const locationId =
      filterLocationId === ANY ? null : filterLocationId === NONE ? null : filterLocationId;

    // Keep repo default "note" unless user has filtered a kind
    const kind = (filterItemKind === ANY ? "note" : filterItemKind) as any;

    setStore((s) => ({
      ...s,
      items: [
        ...s.items,
        {
          id,
          name: "New Item",
          kind,
          locationId,
          notes: "",
          tags: [],
          brotherBeats: [],
        },
      ],
    }));
    setSelectedProvider({ type: "item", id });
  }

  function deleteSelected() {
    if (!selected) return;
    if (!confirm("Delete selected provider?")) return;

    setStore((s) => {
      const next = { ...s };

      if (selected.type === "npc") next.npcs = next.npcs.filter((n) => n.id !== selected.id);
      else next.items = next.items.filter((it) => it.id !== selected.id);

      // Also remove from breadcrumbs provider pools
      next.breadcrumbs = next.breadcrumbs.map((b) => ({
        ...b,
        providerRefs: b.providerRefs.filter((p) => !(p.type === selected.type && p.id === selected.id)),
      }));

      return next;
    });

    setSelectedProvider(null);
  }

  const counts = useMemo(
    () => ({ npcs: store.npcs.length, items: store.items.length }),
    [store.npcs.length, store.items.length]
  );

  // For item kind filter options: use actual kinds in your data (plus "note" safety)
  const itemKindOptions = useMemo(() => {
    const set = new Set<string>();
    set.add("note");
    for (const it of store.items) set.add((it as any).kind);
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [store.items]);

  return (
    <div className="grid2" style={{ gap: 12, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="primary" onClick={addNPC}>
            + NPC
          </button>
          <button className="primary" onClick={addItem}>
            + Item
          </button>
          <button onClick={deleteSelected} disabled={!selected}>
            Delete
          </button>
          <span className="muted" style={{ marginLeft: 8 }}>
            NPCs: {counts.npcs} · Items: {counts.items}
          </span>
        </div>

        <ProviderLibraryPanel
          store={store}
          ix={ix}
          selected={selected}
          onSelect={setSelectedProvider}
          tab={providersTab}
          setTab={setProvidersTab}
          filterFactionId={filterFactionId}
          setFilterFactionId={setFilterFactionId}
          filterLocationId={filterLocationId}
          setFilterLocationId={setFilterLocationId}
          filterTier={filterTier}
          setFilterTier={setFilterTier}
          filterItemKind={filterItemKind}
          setFilterItemKind={setFilterItemKind}
          itemKindOptions={itemKindOptions}
        />
      </div>

      <ProviderEditor store={store} ix={ix} selected={selected} setStore={setStore} nav={nav} />
    </div>
  );
}

import { useEffect } from "react";
import type { ContentStore, Indexes, BreadcrumbId, LocationId, LocationKind, NPCId, ItemId } from "../core/types";
import LocationLibraryPanel from "../components/LocationLibraryPanel";
import LocationEditor from "../components/LocationEditor";

function uid(prefix = "loc") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function LocationsPage({
  store,
  setStore,
  ix,
  selectedLocationId,
  setSelectedLocationId,
  nav,
}: {
  store: ContentStore;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  ix: Indexes;
  selectedLocationId: LocationId | null;
  setSelectedLocationId: (id: LocationId | null) => void;
  nav: {
    openBreadcrumb: (id: BreadcrumbId) => void;
    openLocation: (id: LocationId) => void;
    openProvider: (ref: { type: "npc"; id: NPCId } | { type: "item"; id: ItemId }) => void;
  };
}) {
  const selectedId: LocationId | null = selectedLocationId ?? (store.locations[0]?.id ?? null);

  // keep selection valid
  useEffect(() => {
    if (!selectedId) {
      if (store.locations[0]) setSelectedLocationId(store.locations[0].id);
      return;
    }
    if (store.locations.some((l) => l.id === selectedId)) return;
    setSelectedLocationId(store.locations[0]?.id ?? null);
  }, [selectedId, store.locations, setSelectedLocationId]);

  function addLocation(kind: LocationKind) {
    const id = uid("loc");
    setStore((s) => ({
      ...s,
      locations: [
        ...s.locations,
        { id, name: `New ${kind}`, kind, parentId: null, biomeIds: [], defaultBiomeId: null, tags: [] },
      ],
    }));
    setSelectedLocationId(id);
  }

  function deleteSelected() {
    if (!selectedId) return;

    setStore((s) => ({
      ...s,
      locations: s.locations
        .filter((l) => l.id !== selectedId)
        .map((l) => (l.parentId === selectedId ? { ...l, parentId: null } : l)),
      connections: (s.connections ?? []).filter((c) => c.fromId !== selectedId && c.toId !== selectedId),
    }));
    setSelectedLocationId(null);
  }

  return (
    <div className="grid2" style={{ gap: 12, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="primary" onClick={() => addLocation("region")}>
            + Region
          </button>
          <button className="primary" onClick={() => addLocation("biome")}>
            + Biome
          </button>
          <button className="primary" onClick={() => addLocation("settlement")}>
            + Settlement
          </button>
          <button className="primary" onClick={() => addLocation("landmark")}>
            + Landmark
          </button>
          <button onClick={deleteSelected} disabled={!selectedId}>
            Delete
          </button>
        </div>

        <LocationLibraryPanel store={store} ix={ix} selectedId={selectedId} onSelect={setSelectedLocationId} />
      </div>

      <LocationEditor
        store={store}
        ix={ix}
        selectedId={selectedId}
        setStore={setStore}
        onSelectLocation={(id) => setSelectedLocationId(id)}
        nav={nav}
      />
    </div>
  );
}

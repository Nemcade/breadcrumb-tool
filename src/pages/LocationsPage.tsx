import { useMemo, useState } from "react";
import type { ContentStore, Indexes, LocationId, LocationKind } from "../core/types";
import LocationLibraryPanel from "../components/LocationLibraryPanel";
import LocationEditor from "../components/LocationEditor";

function uid(prefix = "loc") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function LocationsPage({
  store,
  setStore,
  ix,
}: {
  store: ContentStore;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  ix: Indexes;
}) {
  const [selectedId, setSelectedId] = useState<LocationId | null>(() => store.locations[0]?.id ?? null);

  // keep selection valid
  useMemo(() => {
    if (!selectedId) {
      if (store.locations[0]) setSelectedId(store.locations[0].id);
      return;
    }
    if (store.locations.some((l) => l.id === selectedId)) return;
    setSelectedId(store.locations[0]?.id ?? null);
  }, [selectedId, store.locations]);

  function addLocation(kind: LocationKind) {
    const id = uid("loc");
    setStore((s) => ({
      ...s,
      locations: [
  ...s.locations,
  { id, name: `New ${kind}`, kind, parentId: null, biomeIds: [], defaultBiomeId: null, tags: [] },
],


    }));
    setSelectedId(id);
  }

  function deleteSelected() {
    if (!selectedId) return;

    // Note: we don't cascade-delete children here. We just orphan them.
    setStore((s) => ({
      ...s,
      locations: s.locations
        .filter((l) => l.id !== selectedId)
        .map((l) => (l.parentId === selectedId ? { ...l, parentId: null } : l)),
    }));
    setSelectedId(null);
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

        <LocationLibraryPanel store={store} ix={ix} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      <LocationEditor
  store={store}
  ix={ix}
  selectedId={selectedId}
  setStore={setStore}
  onSelectLocation={setSelectedId}
/>

    </div>
  );
}

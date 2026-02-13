import { useEffect, useMemo, useState } from "react";
import type {
  ContentStore,
  Indexes,
  BreadcrumbId,
  LocationId,
  LocationKind,
  NPCId,
  ItemId,
} from "../core/types";
import LocationLibraryPanel from "../components/LocationLibraryPanel";
import LocationEditor from "../components/LocationEditor";

function uid(prefix = "loc") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const ANY = "";
const NONE = "__none__";

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
  const selectedId: LocationId | null =
    selectedLocationId ?? (store.locations[0]?.id ?? null);

  // Filters (lifted up so "Add" can prefill)
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"" | LocationKind>(ANY);
  const [parentFilter, setParentFilter] = useState<string>(ANY); // ANY | NONE | LocationId
  const [biomeFilter, setBiomeFilter] = useState<string>(ANY); // ANY | NONE | LocationId (kind=biome)

  const filtersActive =
    q.trim() !== "" || kind !== ANY || parentFilter !== ANY || biomeFilter !== ANY;

  const kindMatches = (k: LocationKind) => kind === ANY || kind === k;

  // keep selection valid
  useEffect(() => {
    if (!selectedId) {
      if (store.locations[0]) setSelectedLocationId(store.locations[0].id);
      return;
    }
    if (store.locations.some((l) => l.id === selectedId)) return;
    setSelectedLocationId(store.locations[0]?.id ?? null);
  }, [selectedId, store.locations, setSelectedLocationId]);

  const filteredRows = useMemo(() => {
    const order: Record<LocationKind, number> = {
      region: 0,
      biome: 1,
      settlement: 2,
      landmark: 3,
    };

    const qq = q.trim().toLowerCase();

    const out = store.locations.filter((l) => {
      if (kind && l.kind !== kind) return false;

      if (parentFilter !== ANY) {
        if (parentFilter === NONE) {
          if (l.parentId) return false;
        } else {
          if (l.parentId !== parentFilter) return false;
        }
      }

      if (biomeFilter !== ANY) {
        if (biomeFilter === NONE) {
          if (l.defaultBiomeId) return false;
        } else {
          if (l.defaultBiomeId !== biomeFilter) return false;
        }
      }

      if (!qq) return true;

      const parent = l.parentId ? ix.locationsById.get(l.parentId)?.name ?? "" : "";
      const hay = `${l.name} ${l.kind} ${parent} ${l.tags.join(" ")}`.toLowerCase();
      return hay.includes(qq);
    });

    out.sort((a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name));
    return out;
  }, [store.locations, ix, q, kind, parentFilter, biomeFilter]);

  function addLocation(kindToAdd: LocationKind) {
    const id = uid("loc");

    // Prefill ONLY when filters are active, and only when kind matches current kind filter (or kind filter is "All")
    const shouldPrefill = filtersActive && kindMatches(kindToAdd);

    const parentId: LocationId | null = shouldPrefill
      ? parentFilter === ANY
        ? null
        : parentFilter === NONE
          ? null
          : (parentFilter as LocationId)
      : null;

    const defaultBiomeId: LocationId | null = shouldPrefill
      ? biomeFilter === ANY
        ? null
        : biomeFilter === NONE
          ? null
          : (biomeFilter as LocationId)
      : null;

    const biomeIds: LocationId[] = defaultBiomeId ? [defaultBiomeId] : [];

    setStore((s) => ({
      ...s,
      locations: [
        ...s.locations,
        {
          id,
          name: `New ${kindToAdd}`,
          kind: kindToAdd,
          parentId,
          biomeIds,
          defaultBiomeId,
          tags: [],
        },
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
      connections: (s.connections ?? []).filter(
        (c) => c.fromId !== selectedId && c.toId !== selectedId
      ),
    }));

    setSelectedLocationId(null);
  }

  return (
    <>
      <div className="row">
        <button onClick={() => addLocation("region")}>+ Region</button>
        <button onClick={() => addLocation("biome")}>+ Biome</button>
        <button onClick={() => addLocation("settlement")}>+ Settlement</button>
        <button onClick={() => addLocation("landmark")}>+ Landmark</button>
        <button onClick={deleteSelected}>Delete</button>
      </div>

      {/* IMPORTANT: repo layout expects gridPage for left library + right editor */}
      <div className="gridPage">
        <LocationLibraryPanel
          store={store}
          ix={ix}
          selectedId={selectedId}
          onSelect={(id) => setSelectedLocationId(id)}
          rows={filteredRows}
          q={q}
          setQ={setQ}
          kind={kind}
          setKind={setKind}
          parentFilter={parentFilter}
          setParentFilter={setParentFilter}
          biomeFilter={biomeFilter}
          setBiomeFilter={setBiomeFilter}
        />

        {/* IMPORTANT: these prop names must match LocationEditor in your repo */}
        <LocationEditor
          store={store}
          ix={ix}
          selectedId={selectedId}
          setStore={setStore}
          onSelectLocation={(id: LocationId) => setSelectedLocationId(id)}
          nav={nav}
        />
      </div>
    </>
  );
}

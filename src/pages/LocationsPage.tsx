import React, { useMemo, useState } from "react";
import type { ContentStore, Indexes, LocationKind } from "../core/types";
import Chip from "../ui/Chip";
import Select from "../ui/Select";
import CsvInput from "../ui/CsvInput";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(2, 6)}`;
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
  const [filter, setFilter] = useState({ text: "", kind: "" as LocationKind | "", parentId: "" as string | "", tag: "" });

  const filtered = useMemo(() => {
    return store.locations.filter((l) => {
      if (filter.text && !l.name.toLowerCase().includes(filter.text.toLowerCase())) return false;
      if (filter.kind !== "" && l.kind !== filter.kind) return false;
      if (filter.parentId !== "" && (l.parentId ?? "") !== filter.parentId) return false;
      if (filter.tag && !l.tags.includes(filter.tag)) return false;
      return true;
    });
  }, [store.locations, filter]);

  function addLocation() {
    setStore((s) => ({ ...s, locations: [...s.locations, { id: uid("loc"), name: "New Location", kind: "landmark", parentId: null, tags: [] }] }));
  }

  return (
    <section className="gridPage">
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Filters</h3>

        <label>Name contains</label>
        <input value={filter.text} onChange={(e) => setFilter((x) => ({ ...x, text: e.target.value }))} />

        <div style={{ height: 8 }} />

        <label>Kind</label>
        <select value={filter.kind} onChange={(e) => setFilter((x) => ({ ...x, kind: (e.target.value as any) || "" }))}>
          <option value="">Any</option>
          <option value="region">Region</option>
          <option value="biome">Biome</option>
          <option value="settlement">Settlement</option>
          <option value="landmark">Landmark</option>
        </select>

        <div style={{ height: 8 }} />

        <label>Parent</label>
        <Select
          value={filter.parentId}
          onChange={(v) => setFilter((x) => ({ ...x, parentId: v }))}
          placeholder="Any"
          options={store.locations.map((l) => ({ value: l.id, label: `${l.name} (${l.kind})` }))}
        />

        <div style={{ height: 8 }} />

        <label>Tag</label>
        <input value={filter.tag} onChange={(e) => setFilter((x) => ({ ...x, tag: e.target.value }))} placeholder="hub" />

        <div style={{ height: 12 }} />

        <button className="primary" onClick={addLocation}>
          + Add Location
        </button>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Locations</h3>

        {filtered.length === 0 ? (
          <div className="muted">No locations match filters.</div>
        ) : (
          filtered.map((l) => {
            const parentName = l.parentId ? ix.locationsById.get(l.parentId)?.name ?? l.parentId : "—";

            return (
              <div className="card" key={l.id}>
                <div className="cardHeader">
                  <input
                    className="cardTitleInput"
                    value={l.name}
                    onChange={(e) => setStore((s) => ({ ...s, locations: s.locations.map((x) => (x.id === l.id ? { ...x, name: e.target.value } : x)) }))}
                  />
                  <button onClick={() => setStore((s) => ({ ...s, locations: s.locations.filter((x) => x.id !== l.id) }))}>Delete</button>
                </div>

                <div className="grid2" style={{ marginTop: 10 }}>
                  <div>
                    <label>Kind</label>
                    <select value={l.kind} onChange={(e) => setStore((s) => ({ ...s, locations: s.locations.map((x) => (x.id === l.id ? { ...x, kind: e.target.value as any } : x)) }))}>
                      <option value="region">Region</option>
                      <option value="biome">Biome</option>
                      <option value="settlement">Settlement</option>
                      <option value="landmark">Landmark</option>
                    </select>
                  </div>

                  <div>
                    <label>Parent</label>
                    <select
                      value={l.parentId ?? ""}
                      onChange={(e) =>
                        setStore((s) => ({
                          ...s,
                          locations: s.locations.map((x) => (x.id === l.id ? { ...x, parentId: e.target.value === "" ? null : e.target.value } : x)),
                        }))
                      }
                    >
                      <option value="">—</option>
                      {store.locations
                        .filter((cand) => cand.id !== l.id)
                        .map((cand) => (
                          <option key={cand.id} value={cand.id}>
                            {cand.name} ({cand.kind})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label>Tags</label>
<CsvInput
  value={l.tags}
  onChange={(tags) => setStore((s) => ({ ...s, locations: s.locations.map((x) => (x.id === l.id ? { ...x, tags } : x)) }))}
  placeholder="hub, gate"
/>

                </div>

                <div className="muted" style={{ marginTop: 8 }}>
                  <b>Parent:</b> {parentName}
                </div>

                <div style={{ marginTop: 8 }}>
                  {l.tags.map((t) => (
                    <Chip key={t} text={t} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

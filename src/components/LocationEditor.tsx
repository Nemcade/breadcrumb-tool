import { useMemo } from "react";
import type {
  ContentStore,
  Indexes,
  LocationId,
  LocationKind,
  Connection,
  Gate,
  ItemId,
  FactionId,
} from "../core/types";
import CsvInput from "../ui/CsvInput";
import DropZone from "../ui/DropZone";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default function LocationEditor({
  store,
  ix,
  selectedId,
  setStore,
  onSelectLocation,
}: {
  store: ContentStore;
  ix: Indexes;
  selectedId: LocationId | null;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  onSelectLocation: (id: LocationId) => void;
}) {
  const loc = useMemo(() => (selectedId ? ix.locationsById.get(selectedId) ?? null : null), [selectedId, ix]);

  const children = useMemo(() => {
    if (!loc) return [];
    return store.locations.filter((l) => l.parentId === loc.id).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [store.locations, loc]);

  const outgoing = useMemo(() => {
    if (!loc) return [];
    return (store.connections ?? []).filter((c) => c.fromId === loc.id);
  }, [store.connections, loc]);

  function locName(id: LocationId | null) {
    if (!id) return "—";
    return ix.locationsById.get(id)?.name ?? id;
  }

  function update(patch: Partial<{ name: string; kind: LocationKind; parentId: LocationId | null; tags: string[]; biomeIds: LocationId[]; defaultBiomeId: LocationId | null }>) {
    if (!loc) return;
    setStore((s) => ({
      ...s,
      locations: s.locations.map((x) => (x.id === loc.id ? { ...x, ...patch } : x)),
    }));
  }

  function setParentOf(childId: LocationId, parentId: LocationId | null) {
    setStore((s) => ({
      ...s,
      locations: s.locations.map((l) => (l.id === childId ? { ...l, parentId } : l)),
    }));
  }

  function onDropParent(rawId: string) {
    if (!loc) return;
    const parentId = rawId as LocationId;

    if (parentId === loc.id) return;

    // cycle check: parent cannot be a descendant of loc
    let cur: LocationId | null = parentId;
    while (cur) {
      if (cur === loc.id) return;
      cur = ix.locationsById.get(cur)?.parentId ?? null;
    }

    update({ parentId });
  }

  function onDropMakeChild(rawId: string) {
    if (!loc) return;
    const childId = rawId as LocationId;
    if (childId === loc.id) return;

    // cycle check: child cannot be an ancestor of loc
    let cur: LocationId | null = loc.parentId;
    while (cur) {
      if (cur === childId) return;
      cur = ix.locationsById.get(cur)?.parentId ?? null;
    }

    setParentOf(childId, loc.id);
  }

  function isBiome(id: LocationId) {
    return ix.locationsById.get(id)?.kind === "biome";
  }

  function onDropBiome(rawId: string) {
    if (!loc) return;
    const biomeId = rawId as LocationId;
    if (!isBiome(biomeId)) return;
    update({ biomeIds: uniq([...(loc.biomeIds ?? []), biomeId]) });
  }

  function removeBiome(biomeId: LocationId) {
    if (!loc) return;
    update({ biomeIds: (loc.biomeIds ?? []).filter((x) => x !== biomeId) });
  }

  function onDropDefaultBiome(rawId: string) {
    if (!loc) return;
    const biomeId = rawId as LocationId;
    if (!isBiome(biomeId)) return;
    update({ defaultBiomeId: biomeId });
  }

  function effectiveDefaultBiomeId(startId: LocationId | null): LocationId | null {
    let cur = startId;
    while (cur) {
      const l = ix.locationsById.get(cur);
      if (!l) return null;
      if (l.defaultBiomeId) return l.defaultBiomeId;
      cur = l.parentId ?? null;
    }
    return null;
  }

  const effectiveBiome = useMemo(() => {
    if (!loc) return "—";
    const own = (loc.biomeIds ?? []).map((id) => locName(id));
    if (own.length) return own.join(", ");
    const inherited = effectiveDefaultBiomeId(loc.parentId);
    if (inherited) return `${locName(inherited)} (inherited)`;
    return "—";
  }, [loc, store.locations]);

  function addConnection(toId: LocationId) {
    if (!loc) return;
    const id = uid("conn");
    const c: Connection = { id, fromId: loc.id, toId, gate: { kind: "open" }, notes: "" };
    setStore((s) => ({ ...s, connections: [...(s.connections ?? []), c] }));
  }

  function updateConnection(connId: string, patch: Partial<Connection>) {
    setStore((s) => ({
      ...s,
      connections: (s.connections ?? []).map((c) => (c.id === connId ? { ...c, ...patch } : c)),
    }));
  }

  function deleteConnection(connId: string) {
    setStore((s) => ({ ...s, connections: (s.connections ?? []).filter((c) => c.id !== connId) }));
  }

  if (!selectedId) {
    return (
      <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)" }}>
        <div className="muted">Select a location from the library (left) to edit it.</div>
      </section>
    );
  }

  if (!loc) {
    return (
      <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)" }}>
        <div className="muted">Location not found.</div>
      </section>
    );
  }

  const biomeOptions = store.locations.filter((l) => l.kind === "biome").slice().sort((a, b) => a.name.localeCompare(b.name));
  const locationOptions = store.locations.filter((l) => l.id !== loc.id).slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)", overflow: "auto" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h2 style={{ margin: 0 }}>{loc.name || "Location"}</h2>
        <div className="muted" style={{ fontSize: 12 }}>
          ID: {loc.id}
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <div>
          <label>Name</label>
          <input value={loc.name} onChange={(e) => update({ name: e.target.value })} />
        </div>

        <div>
          <label>Kind</label>
          <select value={loc.kind} onChange={(e) => update({ kind: e.target.value as LocationKind })}>
            <option value="region">region</option>
            <option value="biome">biome</option>
            <option value="settlement">settlement</option>
            <option value="landmark">landmark</option>
          </select>
        </div>
      </div>

      {/* Parent */}
      <div style={{ marginTop: 12 }}>
        <label>Parent (hierarchy)</label>
        <div className="muted" style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }}>
          {locName(loc.parentId)}
        </div>

        <DropZone title="Drop parent here" hint="Drag a location from the library. Cycle-safe." acceptPrefix="location:" onDropId={onDropParent} />

        <button style={{ marginTop: 8 }} onClick={() => update({ parentId: null })}>
          Clear parent
        </button>
      </div>

      {/* Children */}
      <div style={{ marginTop: 14 }}>
        <label>Children</label>
        <div className="muted" style={{ marginTop: 4 }}>
          Children are locations that have this as parent. Drop to re-parent quickly.
        </div>

        {children.length === 0 ? (
          <div className="muted" style={{ marginTop: 8 }}>
            No children.
          </div>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {children.map((c) => (
              <div key={c.id} className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                <button onClick={() => onSelectLocation(c.id)} style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 800 }}>{c.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {c.kind}
                  </div>
                </button>
                <button onClick={() => setParentOf(c.id, null)} title="Remove from parent">
                  Unparent
                </button>
              </div>
            ))}
          </div>
        )}

        <DropZone title="Drop location to make it a child" hint="Sets dropped location’s parent to this location." acceptPrefix="location:" onDropId={onDropMakeChild} />
      </div>

      {/* Biomes */}
      <div style={{ marginTop: 14 }}>
        <label>Biomes (overlay)</label>
        <div className="muted" style={{ marginTop: 4 }}>
          Any location can have multiple biomes. If empty, it inherits region default biome (if any).
        </div>

        <div className="muted" style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }}>
          Effective: {effectiveBiome}
        </div>

        {(loc.biomeIds ?? []).length > 0 && (
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {(loc.biomeIds ?? []).map((id) => (
              <div key={id} className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>{locName(id)}</div>
                <button onClick={() => removeBiome(id)} title="Remove biome">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <DropZone title="Drop biome here" hint="Only locations of kind=biome are accepted." acceptPrefix="location:" onDropId={onDropBiome} />

        {(loc.biomeIds ?? []).length > 0 && (
          <button style={{ marginTop: 8 }} onClick={() => update({ biomeIds: [] })}>
            Clear biomes
          </button>
        )}

        {loc.kind === "region" && (
          <div style={{ marginTop: 12 }}>
            <label>Region default biome</label>
            <select
              value={loc.defaultBiomeId ?? ""}
              onChange={(e) => update({ defaultBiomeId: e.target.value === "" ? null : (e.target.value as LocationId) })}
            >
              <option value="">—</option>
              {biomeOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <DropZone title="Drop default biome here" hint="Only kind=biome accepted. Used by descendants if they have no explicit biomes." acceptPrefix="location:" onDropId={onDropDefaultBiome} />
          </div>
        )}
      </div>

      {/* Tags */}
      <div style={{ marginTop: 12 }}>
        <CsvInput label="Tags" values={loc.tags ?? []} onChange={(tags) => update({ tags })} placeholder="e.g. bastion, depths, pipewright" />
      </div>

      {/* Connections */}
      <div style={{ marginTop: 16 }}>
        <label>Connections (outgoing)</label>
        <div className="muted" style={{ marginTop: 4 }}>
          Connections define traversal between areas and their gates.
        </div>

        <div style={{ marginTop: 8 }} className="row">
          <select
            defaultValue=""
            onChange={(e) => {
              const toId = e.target.value as LocationId;
              if (!toId) return;
              addConnection(toId);
              e.currentTarget.value = "";
            }}
          >
            <option value="">+ Add connection to…</option>
            {locationOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.kind})
              </option>
            ))}
          </select>
        </div>

        {outgoing.length === 0 ? (
          <div className="muted" style={{ marginTop: 8 }}>
            No outgoing connections.
          </div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {outgoing.map((c) => (
              <div key={c.id} style={{ padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.03)" }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>
                    → {locName(c.toId)}
                  </div>
                  <button onClick={() => deleteConnection(c.id)}>Delete</button>
                </div>

                <div className="grid2" style={{ marginTop: 8 }}>
                  <div>
                    <label>Gate</label>
                    <select
                      value={c.gate.kind}
                      onChange={(e) => {
                        const k = e.target.value as Gate["kind"];
                        let gate: Gate = { kind: "open" };
                        if (k === "key") gate = { kind: "key", keyItemId: "" as ItemId };
                        if (k === "respect") gate = { kind: "respect", factionId: "" as FactionId, value: 0 };
                        if (k === "power") gate = { kind: "power", powerId: "" };
                        updateConnection(c.id, { gate });
                      }}
                    >
                      <option value="open">open</option>
                      <option value="key">key</option>
                      <option value="respect">respect</option>
                      <option value="power">power</option>
                    </select>

                    {c.gate.kind === "key" && (
                      <div style={{ marginTop: 6 }}>
                        <label>Key Item</label>
                        <select
                          value={c.gate.keyItemId}
                          onChange={(e) =>
  updateConnection(c.id, {
    gate: { kind: "key", keyItemId: e.target.value as ItemId },
  })
}

                        >
                          <option value="">—</option>
                          {store.items
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((it) => (
                              <option key={it.id} value={it.id}>
                                {it.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {c.gate.kind === "respect" && (
                      <div style={{ marginTop: 6 }} className="grid2">
                        <div>
                          <label>Faction</label>
                          <select
                            value={c.gate.factionId}
                            onChange={(e) =>
  updateConnection(c.id, {
    gate: { kind: "respect", factionId: e.target.value as FactionId, value: c.gate.kind === "respect" ? c.gate.value : 0 },
  })
}

                          >
                            <option value="">—</option>
                            {store.factions.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label>Value</label>
                          <input
                            type="number"
                            min={0}
                            value={c.gate.value}
                            onChange={(e) =>
  updateConnection(c.id, {
    gate: { kind: "respect", factionId: c.gate.kind === "respect" ? c.gate.factionId : ("" as FactionId), value: Number(e.target.value) },
  })
}

                          />
                        </div>
                      </div>
                    )}

                    {c.gate.kind === "power" && (
                      <div style={{ marginTop: 6 }}>
                        <label>Power ID</label>
                        <input
                          value={c.gate.powerId}
                          onChange={(e) =>
  updateConnection(c.id, {
    gate: { kind: "power", powerId: e.target.value },
  })
}

                          placeholder="e.g. reactor_online"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label>Notes</label>
                    <textarea
                      rows={3}
                      value={c.notes}
                      onChange={(e) => updateConnection(c.id, { notes: e.target.value })}
                      placeholder="Optional design notes"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

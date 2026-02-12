import { useMemo } from "react";
import type {
  ContentStore,
  Indexes,
  LocationId,
  LocationKind,
  Connection,
  NPCId,
  ItemId,
  BreadcrumbId,
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
  nav,
}: {
  store: ContentStore;
  ix: Indexes;
  selectedId: LocationId | null;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  onSelectLocation: (id: LocationId) => void;
  nav: {
    openBreadcrumb: (id: BreadcrumbId) => void;
    openLocation: (id: LocationId) => void;
    openProvider: (ref: { type: "npc"; id: NPCId } | { type: "item"; id: ItemId }) => void;
  };
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

  function update(
    patch: Partial<{
      name: string;
      kind: LocationKind;
      parentId: LocationId | null;
      tags: string[];
      biomeIds: LocationId[];
      defaultBiomeId: LocationId | null;
    }>
  ) {
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

  const providersHere = useMemo(() => {
    if (!loc) return { npcs: [], items: [] };

    const npcs = store.npcs
      .filter((n) => n.locationId === loc.id)
      .map((n) => ({
        id: n.id,
        name: n.name,
        faction: n.factionId ? ix.factionsById.get(n.factionId)?.name ?? n.factionId : "Unaff",
        tier: n.tier,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const items = store.items
      .filter((it) => it.locationId === loc.id)
      .map((it) => ({
        id: it.id,
        name: it.name,
        kind: it.kind,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { npcs, items };
  }, [loc, store.npcs, store.items, ix]);

  const breadcrumbsHere = useMemo(() => {
    if (!loc) return [];
    const set = new Set<string>();

    // any breadcrumb that references an NPC/Item whose locationId is this loc
    for (const b of store.breadcrumbs) {
      for (const ref of b.providerRefs) {
        if (ref.type === "npc") {
          const n = ix.npcsById.get(ref.id);
          if (n?.locationId === loc.id) set.add(b.id);
        } else {
          const it = ix.itemsById.get(ref.id);
          if (it?.locationId === loc.id) set.add(b.id);
        }
      }
    }

    return [...set]
      .map((id) => ix.breadcrumbsById.get(id))
      .filter(Boolean)
      .map((b) => ({ id: b!.id, title: b!.title, stageTag: b!.stageTag }))
      .sort((a, c) => (a.stageTag + a.title).localeCompare(c.stageTag + c.title));
  }, [loc, store.breadcrumbs, ix]);

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

      <div style={{ marginTop: 12 }}>
        <CsvInput label="Tags" values={loc.tags} onChange={(tags) => update({ tags })} placeholder="e.g. safe, hostile, hub" />
      </div>

      {/* Parent */}
      <div style={{ marginTop: 12 }}>
        <label>Parent (hierarchy)</label>
        <div className="row" style={{ gap: 8 }}>
          <div className="muted" style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }}>
            {locName(loc.parentId)}
          </div>
          {loc.parentId && (
            <button onClick={() => nav.openLocation(loc.parentId!)} title="Open parent">
              Open
            </button>
          )}
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

        <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {(loc.biomeIds ?? []).map((bid) => (
            <button key={bid} onClick={() => removeBiome(bid)} title="Remove biome">
              {locName(bid)} ✕
            </button>
          ))}
        </div>

        <DropZone title="Drop biome here" hint="Drag a biome location from the library." acceptPrefix="location:" onDropId={onDropBiome} />

        <div style={{ marginTop: 10 }}>
          <label>Default biome (for children)</label>
          <div className="row" style={{ gap: 8 }}>
            <div className="muted" style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }}>
              {locName(loc.defaultBiomeId)}
            </div>
            {loc.defaultBiomeId && (
              <button onClick={() => nav.openLocation(loc.defaultBiomeId!)} title="Open biome">
                Open
              </button>
            )}
          </div>

          <DropZone title="Drop biome as default" hint="Sets this location's default biome." acceptPrefix="location:" onDropId={onDropDefaultBiome} />

          <button style={{ marginTop: 8 }} onClick={() => update({ defaultBiomeId: null })}>
            Clear default biome
          </button>
        </div>

        {biomeOptions.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <label>Quick add biome</label>
            <select
              value=""
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                update({ biomeIds: uniq([...(loc.biomeIds ?? []), val]) });
              }}
            >
              <option value="">Select biome…</option>
              {biomeOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Providers in this location */}
      <div style={{ marginTop: 14 }}>
        <label>Providers here</label>

        {providersHere.npcs.length === 0 && providersHere.items.length === 0 ? (
          <div className="muted" style={{ marginTop: 6 }}>
            None.
          </div>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {providersHere.npcs.map((n) => (
              <button key={n.id} onClick={() => nav.openProvider({ type: "npc", id: n.id })} style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 800 }}>{n.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  NPC · {n.faction} · T{n.tier}
                </div>
              </button>
            ))}
            {providersHere.items.map((it) => (
              <button key={it.id} onClick={() => nav.openProvider({ type: "item", id: it.id })} style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 800 }}>{it.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Item · {it.kind}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Breadcrumbs referencing providers in this location */}
      <div style={{ marginTop: 14 }}>
        <label>Breadcrumbs in this location</label>

        {breadcrumbsHere.length === 0 ? (
          <div className="muted" style={{ marginTop: 6 }}>
            None.
          </div>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {breadcrumbsHere.map((b) => (
              <button key={b.id} onClick={() => nav.openBreadcrumb(b.id)} style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 800 }}>{b.title || "(untitled)"}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {b.stageTag} · {b.id}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Connections */}
      <div style={{ marginTop: 14 }}>
        <label>Connections (outgoing)</label>
        <div className="muted" style={{ marginTop: 4 }}>
          Connect this location to others; gates model traversal restrictions later.
        </div>

        {outgoing.length === 0 ? (
          <div className="muted" style={{ marginTop: 8 }}>
            No outgoing connections.
          </div>
        ) : (
          <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
            {outgoing.map((c) => (
              <div key={c.id} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{locName(c.toId)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      To: {c.toId}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button onClick={() => nav.openLocation(c.toId)}>Open</button>
                    <button onClick={() => deleteConnection(c.id)}>Delete</button>
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <label>Gate</label>
                  <select
                    value={c.gate.kind}
                    onChange={(e) => updateConnection(c.id, { gate: { ...c.gate, kind: e.target.value as any } })}
                  >
                    <option value="open">open</option>
                    <option value="key">key</option>
                    <option value="respect">respect</option>
                    <option value="power">power</option>
                    <option value="challenge">challenge</option>
                  </select>
                </div>

                <div style={{ marginTop: 8 }}>
                  <label>Notes</label>
                  <textarea value={c.notes ?? ""} rows={2} onChange={(e) => updateConnection(c.id, { notes: e.target.value })} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <label>Add connection</label>
          <select
            value=""
            onChange={(e) => {
              const toId = e.target.value as LocationId;
              if (!toId) return;
              addConnection(toId);
            }}
          >
            <option value="">Select destination…</option>
            {locationOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.kind})
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

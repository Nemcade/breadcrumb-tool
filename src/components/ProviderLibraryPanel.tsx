import { useMemo, useState } from "react";
import type { ContentStore, Indexes, NPCId, ItemId, LocationId, FactionId } from "../core/types";

const ANY = "any";
const NONE = "__none__";

function includes(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function beatsSummary(beats: any[] | undefined) {
  const n = Array.isArray(beats) ? beats.length : 0;
  return `Beats:${n}`;
}

export default function ProviderLibraryPanel({
  store,
  ix,
  selected,
  onSelect,
  tab,
  setTab,

  filterFactionId,
  setFilterFactionId,
  filterLocationId,
  setFilterLocationId,

  filterTier,
  setFilterTier,

  filterItemKind,
  setFilterItemKind,
  itemKindOptions,
}: {
  store: ContentStore;
  ix: Indexes;
  selected: { type: "npc"; id: NPCId } | { type: "item"; id: ItemId } | null;
  onSelect: (p: { type: "npc"; id: NPCId } | { type: "item"; id: ItemId } | null) => void;

  tab: "npcs" | "items" | "locations";
  setTab: (t: "npcs" | "items" | "locations") => void;

  filterFactionId: FactionId | typeof ANY | typeof NONE;
  setFilterFactionId: (id: FactionId | typeof ANY | typeof NONE) => void;

  filterLocationId: LocationId | typeof ANY | typeof NONE;
  setFilterLocationId: (id: LocationId | typeof ANY | typeof NONE) => void;

  filterTier: number | typeof ANY;
  setFilterTier: (v: number | typeof ANY) => void;

  filterItemKind: string | typeof ANY;
  setFilterItemKind: (v: string | typeof ANY) => void;

  itemKindOptions: string[];
}) {
  const [q, setQ] = useState("");

  const npcs = useMemo(() => {
    const rows = store.npcs.filter((n) => {
      if (filterFactionId !== ANY) {
        if (filterFactionId === NONE) {
          if (n.factionId) return false;
        } else {
          if (n.factionId !== filterFactionId) return false;
        }
      }

      if (filterLocationId !== ANY) {
        if (filterLocationId === NONE) {
          if (n.locationId) return false;
        } else {
          if (n.locationId !== filterLocationId) return false;
        }
      }

      if (filterTier !== ANY && n.tier !== filterTier) return false;

      if (!q.trim()) return true;

      const fac = n.factionId ? ix.factionsById.get(n.factionId)?.name ?? "" : "unaff";
      const loc = n.locationId ? ix.locationsById.get(n.locationId)?.name ?? "" : "";
      return includes(`${n.name} ${fac} ${loc} ${n.roles.join(" ")} ${n.notes}`, q);
    });

    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [store.npcs, ix, q, filterFactionId, filterLocationId, filterTier]);

  const items = useMemo(() => {
    const rows = store.items.filter((it) => {
      if (filterLocationId !== ANY) {
        if (filterLocationId === NONE) {
          if ((it as any).locationId) return false;
        } else {
          if ((it as any).locationId !== filterLocationId) return false;
        }
      }

      if (filterItemKind !== ANY && (it as any).kind !== filterItemKind) return false;

      if (!q.trim()) return true;

      const loc = (it as any).locationId ? ix.locationsById.get((it as any).locationId)?.name ?? "" : "";
      return includes(`${it.name} ${(it as any).kind} ${loc} ${(it as any).tags?.join(" ") ?? ""} ${(it as any).notes ?? ""}`, q);
    });

    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [store.items, ix, q, filterLocationId, filterItemKind]);

  const locations = useMemo(() => {
    const rows = store.locations.filter((l) => {
      if (!q.trim()) return true;
      return includes(`${l.name} ${l.kind} ${l.tags.join(" ")}`, q);
    });

    const order: Record<string, number> = { region: 0, biome: 1, settlement: 2, landmark: 3 };
    rows.sort((a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name));
    return rows;
  }, [store.locations, q]);

  function locLabel(id: LocationId | null) {
    if (!id) return "—";
    return ix.locationsById.get(id)?.name ?? id;
  }

  function factionLabel(id: FactionId | null) {
    if (!id) return "Unaff";
    return ix.factionsById.get(id)?.name ?? id;
  }

  const tierOptions = [0, 1, 2, 3, 4, 5];

  return (
    <aside className="card" style={{ padding: 12, height: "calc(100vh - 24px)", overflow: "auto" }}>
      <div className="row" style={{ gap: 8 }}>
        <button className={tab === "npcs" ? "primary" : ""} onClick={() => setTab("npcs")} style={{ flex: 1 }}>
          NPCs
        </button>
        <button className={tab === "items" ? "primary" : ""} onClick={() => setTab("items")} style={{ flex: 1 }}>
          Items
        </button>
        <button className={tab === "locations" ? "primary" : ""} onClick={() => setTab("locations")} style={{ flex: 1 }}>
          Locations
        </button>
      </div>

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />

        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {tab === "npcs" && (
            <>
              <select
                value={filterFactionId}
                onChange={(e) => setFilterFactionId(e.target.value as any)}
                title="Filter NPCs by faction"
              >
                <option value={ANY}>All factions</option>
                <option value={NONE}>Unaffiliated</option>
                {store.factions
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>

              <select
                value={filterTier}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilterTier(v === ANY ? ANY : Number(v));
                }}
                title="Filter NPCs by tier"
              >
                <option value={ANY}>All tiers</option>
                {tierOptions.map((t) => (
                  <option key={t} value={t}>
                    T{t}
                  </option>
                ))}
              </select>
            </>
          )}

          {tab !== "locations" && (
            <select
              value={filterLocationId}
              onChange={(e) => setFilterLocationId(e.target.value as any)}
              title="Filter by location"
            >
              <option value={ANY}>All locations</option>
              <option value={NONE}>No location</option>
              {store.locations
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.kind})
                  </option>
                ))}
            </select>
          )}

          {tab === "items" && (
            <select
              value={filterItemKind}
              onChange={(e) => setFilterItemKind(e.target.value as any)}
              title="Filter items by kind"
            >
              <option value={ANY}>All kinds</option>
              {itemKindOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setFilterFactionId(ANY);
              setFilterLocationId(ANY);
              setFilterTier(ANY);
              setFilterItemKind(ANY);
            }}
            title="Clear filters"
          >
            Clear
          </button>
        </div>
      </div>

      {tab === "npcs" && (
        <div style={{ marginTop: 10 }}>
          {npcs.map((n) => (
            <button
              key={n.id}
              className={selected?.type === "npc" && selected.id === n.id ? "primary" : ""}
              onClick={() => onSelect({ type: "npc", id: n.id })}
              style={{ width: "100%", textAlign: "left", marginBottom: 6 }}
              title="Select to edit"
            >
              <div style={{ fontWeight: 700 }}>{n.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {factionLabel(n.factionId)} · T{n.tier} · {locLabel(n.locationId)} ·{" "}
                {beatsSummary((n as any).brotherBeats ?? (n as any).brotherLeads)}
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === "items" && (
        <div style={{ marginTop: 10 }}>
          {items.map((it) => (
            <button
              key={it.id}
              className={selected?.type === "item" && selected.id === it.id ? "primary" : ""}
              onClick={() => onSelect({ type: "item", id: it.id })}
              style={{ width: "100%", textAlign: "left", marginBottom: 6 }}
              title="Select to edit"
            >
              <div style={{ fontWeight: 700 }}>{it.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                Item({(it as any).kind}) · {locLabel((it as any).locationId ?? null)} ·{" "}
                {beatsSummary((it as any).brotherBeats ?? (it as any).brotherLeads)}
              </div>
            </button>
          ))}
        </div>
      )}

      {tab === "locations" && (
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ marginBottom: 8 }}>
            Drag a location onto the provider editor to assign location.
          </div>

          {locations.map((l) => (
            <div
              key={l.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", `location:${l.id}`);
                e.dataTransfer.effectAllowed = "copy";
              }}
              className="row"
              style={{
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 10px",
                marginBottom: 6,
                borderRadius: 10,
                background: "rgba(255,255,255,0.03)",
                cursor: "grab",
              }}
              title="Drag me"
            >
              <div>
                <div style={{ fontWeight: 700 }}>{l.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {l.kind}
                </div>
              </div>
              <div className="muted">⤓</div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

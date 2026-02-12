import { useMemo, useState } from "react";
import type { ContentStore, Indexes, NPCId, ItemId, LocationId } from "../core/types";

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
}: {
  store: ContentStore;
  ix: Indexes;
  selected: { type: "npc"; id: NPCId } | { type: "item"; id: ItemId } | null;
  onSelect: (p: { type: "npc"; id: NPCId } | { type: "item"; id: ItemId } | null) => void;
}) {
  const [tab, setTab] = useState<"npcs" | "items" | "locations">("npcs");
  const [q, setQ] = useState("");

  const npcs = useMemo(() => {
    const rows = store.npcs.filter((n) => {
      if (!q.trim()) return true;
      const fac = n.factionId ? ix.factionsById.get(n.factionId)?.name ?? "" : "unaff";
      const loc = n.locationId ? ix.locationsById.get(n.locationId)?.name ?? "" : "";
      return includes(`${n.name} ${fac} ${loc} ${n.roles.join(" ")} ${n.notes}`, q);
    });
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [store.npcs, ix, q]);

  const items = useMemo(() => {
    const rows = store.items.filter((it) => {
      if (!q.trim()) return true;
      const loc = it.locationId ? ix.locationsById.get(it.locationId)?.name ?? "" : "";
      return includes(`${it.name} ${it.kind} ${loc} ${it.tags.join(" ")} ${it.notes}`, q);
    });
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [store.items, ix, q]);

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

  function factionLabel(id: string | null) {
    if (!id) return "Unaff";
    return ix.factionsById.get(id)?.name ?? id;
  }

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

      <div style={{ marginTop: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
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
                {factionLabel(n.factionId)} · T{n.tier} · {locLabel(n.locationId)} · {beatsSummary((n as any).brotherBeats ?? (n as any).brotherLeads)}
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
                Item({it.kind}) · {locLabel(it.locationId)} · {beatsSummary((it as any).brotherBeats ?? (it as any).brotherLeads)}
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

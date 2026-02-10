import { useMemo, useState } from "react";
import type { ContentStore, Indexes, LocationId, LocationKind } from "../core/types";

function includes(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

export default function LocationLibraryPanel({
  store,
  ix,
  selectedId,
  onSelect,
}: {
  store: ContentStore;
  ix: Indexes;
  selectedId: LocationId | null;
  onSelect: (id: LocationId) => void;
}) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<LocationKind | "">("");

  const rows = useMemo(() => {
    const order: Record<LocationKind, number> = { region: 0, biome: 1, settlement: 2, landmark: 3 };

    const out = store.locations.filter((l) => {
      if (kind && l.kind !== kind) return false;
      if (!q.trim()) return true;
      const parent = l.parentId ? ix.locationsById.get(l.parentId)?.name ?? "" : "";
      return includes(`${l.name} ${l.kind} ${parent} ${l.tags.join(" ")}`, q);
    });

    out.sort((a, b) => (order[a.kind] - order[b.kind]) || a.name.localeCompare(b.name));
    return out;
  }, [store.locations, ix, q, kind]);

  function parentLabel(parentId: LocationId | null) {
    if (!parentId) return "—";
    return ix.locationsById.get(parentId)?.name ?? parentId;
  }

  return (
    <aside className="card" style={{ padding: 12, height: "calc(100vh - 24px)", overflow: "auto" }}>
      <div className="row" style={{ gap: 8 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ flex: 1 }} />
        <select value={kind} onChange={(e) => setKind(e.target.value as any)} title="Filter by kind">
          <option value="">All</option>
          <option value="region">region</option>
          <option value="biome">biome</option>
          <option value="settlement">settlement</option>
          <option value="landmark">landmark</option>
        </select>
      </div>

      <div className="muted" style={{ marginTop: 10, marginBottom: 8 }}>
        Drag locations into the editor to set parent.
      </div>

      {rows.map((l) => (
        <div
          key={l.id}
          className="row"
          style={{
            justifyContent: "space-between",
            gap: 10,
            padding: "8px 10px",
            marginBottom: 6,
            borderRadius: 10,
            background: selectedId === l.id ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
          }}
        >
          <button
            className={selectedId === l.id ? "primary" : ""}
            onClick={() => onSelect(l.id)}
            style={{ flex: 1, textAlign: "left" }}
            title="Select to edit"
          >
            <div style={{ fontWeight: 800 }}>{l.name}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {l.kind} · parent: {parentLabel(l.parentId)}
            </div>
          </button>

          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", `location:${l.id}`);
              e.dataTransfer.effectAllowed = "copy";
            }}
            title="Drag me"
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: "grab",
              userSelect: "none",
            }}
            className="muted"
          >
            ⤓
          </div>
        </div>
      ))}
    </aside>
  );
}

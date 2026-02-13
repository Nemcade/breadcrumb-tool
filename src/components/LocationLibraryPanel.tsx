import type { ContentStore, Indexes, LocationId, LocationKind } from "../core/types";

const ANY = "";
const NONE = "__none__";

export default function LocationLibraryPanel({
  store,
  ix,
  selectedId,
  onSelect,

  // controlled filters + filtered rows from LocationsPage
  rows,
  q,
  setQ,
  kind,
  setKind,
  parentFilter,
  setParentFilter,
  biomeFilter,
  setBiomeFilter,
}: {
  store: ContentStore;
  ix: Indexes;
  selectedId: LocationId | null;
  onSelect: (id: LocationId) => void;

  rows: Array<{
    id: LocationId;
    name: string;
    kind: LocationKind;
    parentId: LocationId | null;
    defaultBiomeId: LocationId | null;
    tags: string[];
  }>;

  q: string;
  setQ: (v: string) => void;

  kind: "" | LocationKind;
  setKind: (v: "" | LocationKind) => void;

  parentFilter: string; // ANY | NONE | LocationId
  setParentFilter: (v: string) => void;

  biomeFilter: string; // ANY | NONE | LocationId (biome)
  setBiomeFilter: (v: string) => void;
}) {
  function parentLabel(parentId: LocationId | null) {
    if (!parentId) return "—";
    return ix.locationsById.get(parentId)?.name ?? parentId;
  }

  const parentOptions = store.locations
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const biomeOptions = store.locations
    .filter((l) => l.kind === "biome")
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="panel">
      <div className="row" style={{ gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          style={{ flex: 1 }}
        />

        <select value={kind} onChange={(e) => setKind(e.target.value as any)} title="Filter by kind">
          <option value={ANY}>All</option>
          <option value="region">region</option>
          <option value="biome">biome</option>
          <option value="settlement">settlement</option>
          <option value="landmark">landmark</option>
        </select>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <select value={parentFilter} onChange={(e) => setParentFilter(e.target.value)} title="Filter by parent">
          <option value={ANY}>Any parent</option>
          <option value={NONE}>No parent</option>
          {parentOptions.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.kind})
            </option>
          ))}
        </select>

        <select value={biomeFilter} onChange={(e) => setBiomeFilter(e.target.value)} title="Filter by default biome">
          <option value={ANY}>Any biome</option>
          <option value={NONE}>No default biome</option>
          {biomeOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setQ("");
            setKind(ANY as any);
            setParentFilter(ANY);
            setBiomeFilter(ANY);
          }}
          title="Clear filters"
        >
          Clear
        </button>
      </div>

      <div className="muted" style={{ marginTop: 10 }}>
        Drag locations into the editor to set parent.
      </div>

      <div style={{ marginTop: 10 }}>
        {rows.map((l) => (
          <div key={l.id} className="row" style={{ gap: 8, marginBottom: 6 }}>
            <button
              onClick={() => onSelect(l.id)}
              style={{
                flex: 1,
                textAlign: "left",
                border: l.id === selectedId ? "1px solid rgba(255,255,255,0.35)" : undefined,
              }}
              title="Select to edit"
            >
              <div style={{ fontWeight: 600 }}>{l.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {l.kind} · parent: {parentLabel(l.parentId)}
                {l.defaultBiomeId
                  ? ` · biome: ${ix.locationsById.get(l.defaultBiomeId)?.name ?? l.defaultBiomeId}`
                  : ""}
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
      </div>
    </div>
  );
}

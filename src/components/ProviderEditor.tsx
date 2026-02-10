import { useMemo } from "react";
import type { ContentStore, Indexes, NPCId, ItemId, Tier, ItemKind } from "../core/types";
import CsvInput from "../ui/CsvInput";
import DropZone from "../ui/DropZone";

export default function ProviderEditor({
  store,
  ix,
  selected,
  setStore,
}: {
  store: ContentStore;
  ix: Indexes;
  selected: { kind: "npc"; id: NPCId } | { kind: "item"; id: ItemId } | null;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
}) {
  const npc = useMemo(() => (selected?.kind === "npc" ? ix.npcsById.get(selected.id) ?? null : null), [selected, ix]);
  const item = useMemo(() => (selected?.kind === "item" ? ix.itemsById.get(selected.id) ?? null : null), [selected, ix]);

  function locName(id: string | null) {
    if (!id) return "—";
    return ix.locationsById.get(id)?.name ?? id;
  }

  function onDropLocation(locationId: string) {
    if (!selected) return;
    if (selected.kind === "npc") {
      setStore((s) => ({
        ...s,
        npcs: s.npcs.map((n) => (n.id === selected.id ? { ...n, locationId } : n)),
      }));
    } else {
      setStore((s) => ({
        ...s,
        items: s.items.map((it) => (it.id === selected.id ? { ...it, locationId } : it)),
      }));
    }
  }

  if (!selected) {
    return (
      <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)" }}>
        <div className="muted">Select an NPC or Item from the library (left) to edit it.</div>
      </section>
    );
  }

  if (selected.kind === "npc") {
    if (!npc) {
      return (
        <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)" }}>
          <div className="muted">NPC not found.</div>
        </section>
      );
    }

    return (
      <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)", overflow: "auto" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h2 style={{ margin: 0 }}>{npc.name || "NPC"}</h2>
          <div className="muted" style={{ fontSize: 12 }}>
            ID: {npc.id}
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 12 }}>
          <div>
            <label>Name</label>
            <input
              value={npc.name}
              onChange={(e) =>
                setStore((s) => ({ ...s, npcs: s.npcs.map((n) => (n.id === npc.id ? { ...n, name: e.target.value } : n)) }))
              }
            />
          </div>

          <div>
            <label>Faction</label>
            <select
              value={npc.factionId ?? ""}
              onChange={(e) =>
                setStore((s) => ({
                  ...s,
                  npcs: s.npcs.map((n) => (n.id === npc.id ? { ...n, factionId: e.target.value === "" ? null : e.target.value } : n)),
                }))
              }
            >
              <option value="">Unaffiliated</option>
              {store.factions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 12 }}>
          <div>
            <label>Tier (respect gate)</label>
            <select
              value={npc.tier}
              onChange={(e) =>
                setStore((s) => ({
                  ...s,
                  npcs: s.npcs.map((n) => (n.id === npc.id ? { ...n, tier: Number(e.target.value) as Tier } : n)),
                }))
              }
            >
              <option value={0}>T0</option>
              <option value={1}>T1</option>
              <option value={2}>T2</option>
              <option value={3}>T3</option>
            </select>
          </div>

          <div>
            <label>Location</label>
            <div className="muted" style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }}>
              {locName(npc.locationId)}
            </div>

            <DropZone
              title="Drop location here"
              hint="Drag a location from Library → Locations."
              acceptPrefix="location:"
              onDropId={onDropLocation}
            />

            <button
              style={{ marginTop: 8 }}
              onClick={() =>
                setStore((s) => ({
                  ...s,
                  npcs: s.npcs.map((n) => (n.id === npc.id ? { ...n, locationId: null } : n)),
                }))
              }
            >
              Clear location
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <CsvInput
            label="Roles"
            values={npc.roles ?? []}
            placeholder="e.g. merchant, tavernkeeper, guard"
            onChange={(roles) => setStore((s) => ({ ...s, npcs: s.npcs.map((n) => (n.id === npc.id ? { ...n, roles } : n)) }))}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Notes</label>
          <textarea
            rows={5}
            value={npc.notes}
            onChange={(e) => setStore((s) => ({ ...s, npcs: s.npcs.map((n) => (n.id === npc.id ? { ...n, notes: e.target.value } : n)) }))}
          />
        </div>
      </section>
    );
  }

  // ITEM EDITOR
  if (!item) {
    return (
      <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)" }}>
        <div className="muted">Item not found.</div>
      </section>
    );
  }

  return (
    <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)", overflow: "auto" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h2 style={{ margin: 0 }}>{item.name || "Item"}</h2>
        <div className="muted" style={{ fontSize: 12 }}>
          ID: {item.id}
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <div>
          <label>Name</label>
          <input
            value={item.name}
            onChange={(e) => setStore((s) => ({ ...s, items: s.items.map((it) => (it.id === item.id ? { ...it, name: e.target.value } : it)) }))}
          />
        </div>

        <div>
          <label>Kind</label>
          <select
            value={item.kind}
            onChange={(e) =>
              setStore((s) => ({
                ...s,
                items: s.items.map((it) => (it.id === item.id ? { ...it, kind: e.target.value as ItemKind } : it)),
              }))
            }
          >
            <option value="note">note</option>
            <option value="chest">chest</option>
            <option value="letter">letter</option>
            <option value="corpse">corpse</option>
            <option value="relic">relic</option>
            <option value="other">other</option>
          </select>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <div>
          <label>Location</label>
          <div className="muted" style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }}>
            {locName(item.locationId)}
          </div>

          <DropZone
            title="Drop location here"
            hint="Drag a location from Library → Locations."
            acceptPrefix="location:"
            onDropId={onDropLocation}
          />

          <button
            style={{ marginTop: 8 }}
            onClick={() => setStore((s) => ({ ...s, items: s.items.map((it) => (it.id === item.id ? { ...it, locationId: null } : it)) }))}
          >
            Clear location
          </button>
        </div>

        <div>
          <CsvInput
            label="Tags"
            values={item.tags ?? []}
            placeholder="e.g. rumor, key, graahl"
            onChange={(tags) => setStore((s) => ({ ...s, items: s.items.map((it) => (it.id === item.id ? { ...it, tags } : it)) }))}
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Notes</label>
        <textarea
          rows={5}
          value={item.notes}
          onChange={(e) => setStore((s) => ({ ...s, items: s.items.map((it) => (it.id === item.id ? { ...it, notes: e.target.value } : it)) }))}
        />
      </div>
    </section>
  );
}

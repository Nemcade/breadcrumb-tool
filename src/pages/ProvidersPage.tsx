import { useMemo, useState } from "react";
import type { ContentStore, Indexes, NPCId, ItemId } from "../core/types";
import ProviderLibraryPanel from "../components/ProviderLibraryPanel";
import ProviderEditor from "../components/ProviderEditor";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function ProvidersPage({
  store,
  setStore,
  ix,
}: {
  store: ContentStore;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  ix: Indexes;
}) {
  const [selected, setSelected] = useState<{ kind: "npc"; id: NPCId } | { kind: "item"; id: ItemId } | null>(() => {
    if (store.npcs[0]) return { kind: "npc", id: store.npcs[0].id };
    if (store.items[0]) return { kind: "item", id: store.items[0].id };
    return null;
  });

  // keep selection valid
  useMemo(() => {
    if (!selected) return;
    if (selected.kind === "npc" && store.npcs.some((n) => n.id === selected.id)) return;
    if (selected.kind === "item" && store.items.some((it) => it.id === selected.id)) return;

    if (store.npcs[0]) setSelected({ kind: "npc", id: store.npcs[0].id });
    else if (store.items[0]) setSelected({ kind: "item", id: store.items[0].id });
    else setSelected(null);
  }, [selected, store.npcs, store.items]);

  function addNPC() {
    const id = uid("npc");
    setStore((s) => ({
      ...s,
      npcs: [
        ...s.npcs,
        {
          id,
          name: "New NPC",
          factionId: null,
          roles: [],
          tier: 0,
          locationId: null,
          notes: "",
        },
      ],
    }));
    setSelected({ kind: "npc", id });
  }

  function addItem() {
    const id = uid("item");
    setStore((s) => ({
      ...s,
      items: [
        ...s.items,
        {
          id,
          name: "New Item",
          kind: "note",
          locationId: null,
          notes: "",
          tags: [],
        },
      ],
    }));
    setSelected({ kind: "item", id });
  }

  function deleteSelected() {
    if (!selected) return;

    if (selected.kind === "npc") {
      setStore((s) => ({ ...s, npcs: s.npcs.filter((n) => n.id !== selected.id) }));
    } else {
      setStore((s) => ({ ...s, items: s.items.filter((it) => it.id !== selected.id) }));
    }
    setSelected(null);
  }

  return (
    <div className="grid2" style={{ gap: 12, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <button className="primary" onClick={addNPC} style={{ flex: 1 }}>
            + Add NPC
          </button>
          <button className="primary" onClick={addItem} style={{ flex: 1 }}>
            + Add Item
          </button>
          <button onClick={deleteSelected} disabled={!selected}>
            Delete
          </button>
        </div>

        <ProviderLibraryPanel
          store={store}
          ix={ix}
          selected={selected}
          onSelectNPC={(id) => setSelected({ kind: "npc", id })}
          onSelectItem={(id) => setSelected({ kind: "item", id })}
        />
      </div>

      <ProviderEditor store={store} ix={ix} selected={selected} setStore={setStore} />
    </div>
  );
}

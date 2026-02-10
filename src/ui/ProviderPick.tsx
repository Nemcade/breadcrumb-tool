import { useMemo } from "react";
import MultiPick from "./MultiPick";
import type { ContentStore } from "../core/types";

type Ref = { type: "npc"; id: string } | { type: "item"; id: string };

function toKey(r: Ref) {
  return `${r.type}:${r.id}`;
}
function fromKey(k: string): Ref | null {
  const [type, id] = k.split(":");
  if (!id) return null;
  if (type === "npc") return { type: "npc", id };
  if (type === "item") return { type: "item", id };
  return null;
}

export default function ProviderPick({
  store,
  selected,
  onChange,
}: {
  store: ContentStore;
  selected: Ref[];
  onChange: (next: Ref[]) => void;
}) {
  const items = useMemo(() => {
    const npcItems = store.npcs.map((n) => ({
      id: `npc:${n.id}`,
      label: `${n.name} (NPC)`,
    }));

    const itemItems = store.items.map((it) => ({
      id: `item:${it.id}`,
      label: `${it.name} (Item:${it.kind})`,
    }));

    return [...npcItems, ...itemItems];
  }, [store.npcs, store.items]);

  const selectedKeys = selected.map(toKey);

  return (
    <MultiPick
      label="Providers (NPCs / Items)"
      items={items}
      selected={selectedKeys}
      onChange={(keys) => {
        const refs = keys.map(fromKey).filter(Boolean) as Ref[];
        onChange(refs);
      }}
      placeholder="Search NPC or item…"
    />
  );
}

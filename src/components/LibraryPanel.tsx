import { useMemo, useState } from "react";
import type { ContentStore, Indexes, ProviderRef, BreadcrumbId } from "../core/types";

function includes(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function providerLabel(store: ContentStore, ix: Indexes, ref: ProviderRef): string {
  if (ref.type === "npc") {
    const n = ix.npcsById.get(ref.id);
    if (!n) return `NPC:${ref.id}`;
    const faction = n.factionId ? ix.factionsById.get(n.factionId)?.name ?? n.factionId : "Unaff";
    const loc = n.locationId ? ix.locationsById.get(n.locationId)?.name ?? n.locationId : "—";
    return `${n.name}  · NPC · ${faction} · T${n.tier} · ${loc}`;
  } else {
    const it = ix.itemsById.get(ref.id);
    if (!it) return `Item:${ref.id}`;
    const loc = it.locationId ? ix.locationsById.get(it.locationId)?.name ?? it.locationId : "—";
    return `${it.name}  · Item(${it.kind}) · ${loc}`;
  }
}

export default function LibraryPanel({
  store,
  ix,
  selectedBreadcrumbId,
  onSelectBreadcrumb,
  onAddProviderToSelected,
  onAddNextFromBreadcrumb,
}: {
  store: ContentStore;
  ix: Indexes;
  selectedBreadcrumbId: BreadcrumbId | null;
  onSelectBreadcrumb: (id: BreadcrumbId) => void;
  onAddProviderToSelected: (ref: ProviderRef) => void;
  onAddNextFromBreadcrumb: (breadcrumbId: BreadcrumbId) => void;
}) {
  const [tab, setTab] = useState<"breadcrumbs" | "providers">("breadcrumbs");
  const [q, setQ] = useState("");

  const breadcrumbRows = useMemo(() => {
    const rows = store.breadcrumbs
      .map((b) => ({
        id: b.id,
        title: b.title,
        stageTag: b.stageTag,
        pCount: b.providerRefs.length,
        nCount: b.nextStageTags.length,
      }))
      .filter((r) => {
        if (!q.trim()) return true;
        return includes(r.title, q) || includes(r.stageTag, q);
      });

    // stable sorting: stageTag then title
    rows.sort((a, b) => (a.stageTag + a.title).localeCompare(b.stageTag + b.title));
    return rows;
  }, [store.breadcrumbs, q]);

  const providerRows = useMemo(() => {
    const npcRefs: ProviderRef[] = store.npcs.map((n) => ({ type: "npc", id: n.id }));
    const itemRefs: ProviderRef[] = store.items.map((it) => ({ type: "item", id: it.id }));

    const refs = [...npcRefs, ...itemRefs].filter((ref) => {
      if (!q.trim()) return true;
      const label = providerLabel(store, ix, ref);
      return includes(label, q);
    });

    // tiny bias: NPCs first, then items, then alphabetical
    refs.sort((a, b) => {
      const ak = a.type === "npc" ? "0" : "1";
      const bk = b.type === "npc" ? "0" : "1";
      if (ak !== bk) return ak.localeCompare(bk);
      return providerLabel(store, ix, a).localeCompare(providerLabel(store, ix, b));
    });

    return refs;
  }, [store, ix, q]);

  const canEdit = !!selectedBreadcrumbId;

  return (
    <aside className="card" style={{ padding: 12, height: "calc(100vh - 24px)", overflow: "auto" }}>
      <div className="row" style={{ gap: 8 }}>
        <button className={tab === "breadcrumbs" ? "primary" : ""} onClick={() => setTab("breadcrumbs")} style={{ flex: 1 }}>
          Breadcrumbs
        </button>
        <button className={tab === "providers" ? "primary" : ""} onClick={() => setTab("providers")} style={{ flex: 1 }}>
          Providers
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
      </div>

      {tab === "breadcrumbs" ? (
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ marginBottom: 8 }}>
            Click to select. Click <b>+</b> to add as “next” (adds its stageTag).
          </div>

          {breadcrumbRows.map((r) => (
            <div
  key={r.id}
  className="row"
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData("text/plain", `breadcrumb:${r.id}`);
    e.dataTransfer.effectAllowed = "copy";
  }}
  style={{
    justifyContent: "space-between",
    gap: 8,
    padding: "6px 6px",
    borderRadius: 8,
    background: r.id === selectedBreadcrumbId ? "rgba(255,255,255,0.06)" : "transparent",
    cursor: "grab",
  }}
>

              <button
                style={{ textAlign: "left", flex: 1 }}
                className={r.id === selectedBreadcrumbId ? "primary" : ""}
                onClick={() => onSelectBreadcrumb(r.id)}
              >
                <div style={{ fontWeight: 700 }}>{r.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {r.stageTag} · P:{r.pCount} · N:{r.nCount}
                </div>
              </button>

              <button disabled={!canEdit} title={canEdit ? "Add as next" : "Select a breadcrumb first"} onClick={() => onAddNextFromBreadcrumb(r.id)}>
                +
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ marginBottom: 8 }}>
            Click a provider to add it to selected breadcrumb’s provider pool.
          </div>

          {providerRows.map((ref) => {
  const key = `${ref.type}:${ref.id}`;
  return (
    <div
      key={key}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", `provider:${key}`);
        e.dataTransfer.effectAllowed = "copy";
      }}
      style={{ cursor: "grab" }}
      title={canEdit ? "Drag into editor, or click to add" : "Select a breadcrumb first"}
    >
      <button
        disabled={!canEdit}
        onClick={() => onAddProviderToSelected(ref)}
        style={{ width: "100%", textAlign: "left", marginBottom: 6 }}
      >
        <div style={{ fontSize: 13 }}>{providerLabel(store, ix, ref)}</div>
      </button>
    </div>
  );
})}

        </div>
      )}
    </aside>
  );
}

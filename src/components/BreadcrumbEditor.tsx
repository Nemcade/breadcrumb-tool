// src/components/BreadcrumbEditor.tsx
import { useMemo } from "react";
import type { ContentStore, Indexes, BreadcrumbId, ProviderRef, BreadcrumbOption } from "../core/types";
import DropZone from "../ui/DropZone";

function providerShortLabel(ix: Indexes, ref: ProviderRef): string {
  if (ref.type === "npc") {
    const n = ix.npcsById.get(ref.id);
    if (!n) return `NPC:${ref.id}`;
    const fac = n.factionId ? ix.factionsById.get(n.factionId)?.name ?? n.factionId : "Unaff";
    return `${n.name} · NPC · ${fac} · T${n.tier}`;
  } else {
    const it = ix.itemsById.get(ref.id);
    if (!it) return `Item:${ref.id}`;
    return `${it.name} · Item(${it.kind})`;
  }
}

function stageTagSummary(store: ContentStore, stageTag: string): string {
  const count = store.breadcrumbs.filter((b) => b.stageTag === stageTag).length;
  return count > 1 ? `${stageTag} (x${count})` : stageTag;
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function firstBreadcrumbForStage(store: ContentStore, stageTag: string): BreadcrumbId | null {
  const matches = store.breadcrumbs
    .filter((b) => b.stageTag === stageTag)
    .slice()
    .sort((a, b) => (a.title + a.id).localeCompare(b.title + b.id));
  return matches[0]?.id ?? null;
}


export default function BreadcrumbEditor({
  store,
  ix,
  breadcrumbId,
  setStore,
  nav,
}: {
  store: ContentStore;
  ix: Indexes;
  breadcrumbId: BreadcrumbId | null;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  nav: {
    openBreadcrumb: (id: BreadcrumbId) => void;
    openLocation: (id: string) => void;
    openProvider: (ref: { type: "npc" | "item"; id: string }) => void;
  };
}) {

  const b = useMemo(() => {
    if (!breadcrumbId) return null;
    return store.breadcrumbs.find((x) => x.id === breadcrumbId) ?? null;
  }, [store.breadcrumbs, breadcrumbId]);

  const derivedLocationIds = useMemo(() => {
    if (!b) return [];
    const locIds = new Set<string>();
    for (const ref of b.providerRefs) {
      if (ref.type === "npc") {
        const n = ix.npcsById.get(ref.id);
        if (n?.locationId) locIds.add(n.locationId);
      } else {
        const it = ix.itemsById.get(ref.id);
        if (it?.locationId) locIds.add(it.locationId);
      }
    }
    return [...locIds];
  }, [b, ix]);

  function update(patch: Partial<BreadcrumbOption>) {
    if (!b) return;
    setStore((s) => ({
      ...s,
      breadcrumbs: s.breadcrumbs.map((x) => (x.id === b.id ? { ...x, ...patch } : x)),
    }));
  }

  function addProviderRef(ref: ProviderRef) {
    if (!b) return;
    const exists = b.providerRefs.some((x) => x.type === ref.type && x.id === ref.id);
    if (exists) return;
    update({ providerRefs: [...b.providerRefs, ref] });
  }

  function onDropProvider(encoded: string) {
    // encoded is like "npc:<id>" or "item:<id>"
    const [type, id] = encoded.split(":");
    if (type !== "npc" && type !== "item") return;
    addProviderRef({ type: type as "npc" | "item", id });
  }

  function addNextStageTag(stageTag: string) {
    if (!b) return;
    const next = uniq([...(b.nextStageTags ?? []), stageTag]);
    update({ nextStageTags: next });
  }

  function removeNextStageTag(stageTag: string) {
    if (!b) return;
    update({ nextStageTags: (b.nextStageTags ?? []).filter((t) => t !== stageTag) });
  }

  function onDropBreadcrumbId(id: string) {
    const src = store.breadcrumbs.find((x) => x.id === id);
    if (!src?.stageTag) return;
    addNextStageTag(src.stageTag);
  }

  if (!b) {
    return (
      <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)" }}>
        <div className="muted">Select a breadcrumb from the library (left) to edit it.</div>
      </section>
    );
  }

  return (
    <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)", overflow: "auto" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h2 style={{ margin: 0 }}>{b.title || "Breadcrumb"}</h2>
        <div className="muted" style={{ fontSize: 12 }}>
          ID: {b.id}
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <div>
          <label>Title</label>
          <input value={b.title} onChange={(e) => update({ title: e.target.value })} />
        </div>
        <div>
          <label>Stage Tag</label>
          <input value={b.stageTag} onChange={(e) => update({ stageTag: e.target.value })} placeholder="e.g. Start" />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Text</label>
        <textarea value={b.text} rows={4} onChange={(e) => update({ text: e.target.value })} />
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <div>
          <label>Weight</label>
          <input type="number" min={0} value={b.weight} onChange={(e) => update({ weight: Number(e.target.value) })} />
        </div>

        <div>
          <label>Derived Locations</label>
          <div className="muted" style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }}>
            {derivedLocationIds.length ? (
  <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
    {derivedLocationIds.map((id) => (
      <button
        key={id}
        onClick={() => nav.openLocation(id)}
        title="Open location"
        style={{ textAlign: "left" }}
      >
        {ix.locationsById.get(id)?.name ?? id}
      </button>
    ))}
  </div>
) : (
  "—"
)}

          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <b>Main Journey</b>
        <div className="row" style={{ gap: 10, marginTop: 8, alignItems: "center" }}>
          <label className="row" style={{ gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={b.isMainJourney} onChange={(e) => update({ isMainJourney: e.target.checked })} />
            <span>Allowed in main journey</span>
          </label>

          <label className="row" style={{ gap: 8, alignItems: "center" }}>
            <input
  type="checkbox"
  checked={!!b.isEnd}
  onChange={(e) => update({ isEnd: e.target.checked })}
/>

            <span>Hard end</span>
          </label>
        </div>
      </div>

      {/* Providers */}
      <div style={{ marginTop: 14 }}>
        <b>Providers (pool)</b>
        <div className="muted" style={{ marginTop: 4 }}>
          Add via Library (Providers tab) or drag-drop. Generator picks one eligible provider from this pool.
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ fontSize: 12 }}>
            Pool size: <b>{b.providerRefs.length}</b>
          </div>

          {b.providerRefs.length === 0 ? (
            <div className="muted" style={{ marginTop: 8 }}>
              No providers yet.
            </div>
          ) : (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {b.providerRefs.map((ref) => (
  <div
    key={`${ref.type}:${ref.id}`}
    className="row"
    style={{ justifyContent: "space-between", gap: 10 }}
  >
    <div style={{ fontSize: 13 }}>{providerShortLabel(ix, ref)}</div>

    <div className="row" style={{ gap: 8 }}>
      <button
        onClick={() => nav.openProvider({ type: ref.type, id: ref.id })}
        title="Open provider"
      >
        Open
      </button>
      <button
        onClick={() =>
          update({
            providerRefs: b.providerRefs.filter(
              (x) => !(x.type === ref.type && x.id === ref.id)
            ),
          })
        }
        title="Remove"
      >
        Remove
      </button>
    </div>
  </div>
))}

            </div>
          )}

          <DropZone
            title="Drop providers here"
            hint="Drag NPCs/items from the library."
            acceptPrefix="provider:"
            onDropId={onDropProvider}
          />
        </div>
      </div>

      {/* Next */}
      <div style={{ marginTop: 14 }}>
        <b>Next</b>
        <div className="muted" style={{ marginTop: 4 }}>
          Add next steps from the library (+ button) or drag-drop breadcrumbs here. Next uses stage tags.
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ fontSize: 12 }}>
            Next tags: <b>{(b.nextStageTags ?? []).length}</b>
          </div>

          {(b.nextStageTags ?? []).length === 0 ? (
            <div className="muted" style={{ marginTop: 8 }}>
              No next tags yet.
            </div>
          ) : (
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {(b.nextStageTags ?? []).map((t) => {
  const targetId = firstBreadcrumbForStage(store, t);

  return (
    <div
      key={t}
      className="row"
      style={{ justifyContent: "space-between", gap: 10 }}
    >
      <div style={{ fontSize: 13 }}>{stageTagSummary(store, t)}</div>

      <div className="row" style={{ gap: 8 }}>
        <button
          disabled={!targetId}
          onClick={() => targetId && nav.openBreadcrumb(targetId)}
          title={targetId ? "Open a breadcrumb in this stage" : "No breadcrumbs found for this stageTag"}
        >
          Open
        </button>
        <button onClick={() => removeNextStageTag(t)} title="Remove">
          Remove
        </button>
      </div>
    </div>
  );
})}

            </div>
          )}

          <DropZone
            title="Drop breadcrumbs here"
            hint="Adds the breadcrumb’s stageTag to Next. (Or press + in the library.)"
            acceptPrefix="breadcrumb:"
            onDropId={onDropBreadcrumbId}
          />
        </div>
      </div>
    </section>
  );
}

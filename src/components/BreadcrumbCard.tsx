import React from "react";
import type { ContentStore, Indexes, BreadcrumbOption } from "../core/types";
import RequirementEditor from "./RequirementEditor";
import CsvInput from "../ui/CsvInput";
import ProviderPick from "../ui/ProviderPick";

export default function BreadcrumbCard({
  b,
  store,
  setStore,
  ix,
}: {
  b: BreadcrumbOption;
  store: ContentStore;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  ix: Indexes;
}) {
  function update(patch: Partial<BreadcrumbOption>) {
    setStore((s) => ({
      ...s,
      breadcrumbs: s.breadcrumbs.map((x) => (x.id === b.id ? { ...x, ...patch } : x)),
    }));
  }

  const derivedLocationIds = (() => {
    const locIds = new Set<string>();

    for (const ref of b.providerRefs) {
      if (ref.type === "npc") {
        const npc = ix.npcsById.get(ref.id);
        if (npc?.locationId) locIds.add(npc.locationId);
      } else {
        const it = ix.itemsById.get(ref.id);
        if (it?.locationId) locIds.add(it.locationId);
      }
    }

    return [...locIds];
  })();

  const derivedLocationNames =
    derivedLocationIds.length === 0
      ? "—"
      : derivedLocationIds.map((id) => ix.locationsById.get(id)?.name ?? id).join(", ");

  const providerSummary = (() => {
    if (b.providerRefs.length === 0) return "—";
    const parts: string[] = [];
    for (const ref of b.providerRefs) {
      if (ref.type === "npc") {
        const npc = ix.npcsById.get(ref.id);
        parts.push(npc ? `${npc.name} (NPC)` : `${ref.id} (NPC)`);
      } else {
        const it = ix.itemsById.get(ref.id);
        parts.push(it ? `${it.name} (Item:${it.kind})` : `${ref.id} (Item)`);
      }
    }
    return parts.join(", ");
  })();

  return (
    <div className="card">
      <div className="cardHeader">
        <input
          className="cardTitleInput"
          value={b.title}
          onChange={(e) => update({ title: e.target.value })}
        />
        <button
          onClick={() =>
            setStore((s) => ({
              ...s,
              breadcrumbs: s.breadcrumbs.filter((x) => x.id !== b.id),
            }))
          }
        >
          Delete
        </button>
      </div>

      <div className="grid2" style={{ marginTop: 10 }}>
        <div>
          <label>Stage tag</label>
          <input value={b.stageTag} onChange={(e) => update({ stageTag: e.target.value })} />
        </div>

        <div>
          <label>Weight</label>
          <input
            type="number"
            value={b.weight}
            onChange={(e) => update({ weight: Number(e.target.value) })}
          />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Text</label>
        <textarea value={b.text} rows={3} onChange={(e) => update({ text: e.target.value })} />
      </div>

      <div style={{ marginTop: 10 }}>
        <label>Next stage tags</label>
        <CsvInput
  label="Next Stage Tags"
  values={b.nextStageTags}
  onChange={(nextStageTags) => update({ nextStageTags })}
  placeholder="e.g. GetKey, PipeLead"
/>

      </div>

      <div style={{ marginTop: 12 }}>
        <label>Providers</label>
        <ProviderPick
          store={store}
          selected={b.providerRefs}
          onChange={(providerRefs) => update({ providerRefs })}
        />

        <div className="muted" style={{ marginTop: 8 }}>
          <b>Provider summary:</b> {providerSummary}
        </div>

        <div className="muted" style={{ marginTop: 6 }}>
          <b>Derived locations:</b> {derivedLocationNames}
        </div>

        <div className="muted" style={{ marginTop: 6 }}>
          Breadcrumb locations are derived from provider placements (NPC / Item). No manual breadcrumb
          location fields.
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Requirements</label>
        <RequirementEditor
  requirements={b.requirements}
  setRequirements={(requirements) => update({ requirements })}
  store={store}
/>

      </div>

      <div className="muted" style={{ marginTop: 10 }}>
        <b>ID:</b> {b.id}
      </div>
    </div>
  );
}

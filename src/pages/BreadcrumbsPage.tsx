import { useMemo, useState } from "react";
import type { ContentStore, Indexes, ProviderRef, BreadcrumbId } from "../core/types";
import BreadcrumbEditor from "../components/BreadcrumbEditor";
import LibraryPanel from "../components/LibraryPanel";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function BreadcrumbsPage({
  store,
  setStore,
  ix,
}: {
  store: ContentStore;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  ix: Indexes;
}) {
  const [selectedId, setSelectedId] = useState<BreadcrumbId | null>(store.breadcrumbs[0]?.id ?? null);

  // Keep selection valid if breadcrumb deleted
  useMemo(() => {
    if (selectedId && store.breadcrumbs.some((b) => b.id === selectedId)) return;
    setSelectedId(store.breadcrumbs[0]?.id ?? null);
  }, [store.breadcrumbs, selectedId]);

  function addBreadcrumb() {
    const id = uid("bc");
    setStore((s) => ({
      ...s,
      breadcrumbs: [
        ...s.breadcrumbs,
        {
          id,
          title: "New Breadcrumb",
          stageTag: "Any",
          text: "",
          providerRefs: [],
          requirements: [],
          nextStageTags: [],
          weight: 1,
		  isMainJourney: true,
        },
      ],
    }));
    setSelectedId(id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    setStore((s) => ({ ...s, breadcrumbs: s.breadcrumbs.filter((b) => b.id !== selectedId) }));
    setSelectedId(null);
  }

  function addProviderToSelected(ref: ProviderRef) {
    if (!selectedId) return;
    setStore((s) => ({
      ...s,
      breadcrumbs: s.breadcrumbs.map((b) => {
        if (b.id !== selectedId) return b;
        const exists = b.providerRefs.some((x) => x.type === ref.type && x.id === ref.id);
        return exists ? b : { ...b, providerRefs: [...b.providerRefs, ref] };
      }),
    }));
  }

  function addNextFromBreadcrumb(breadcrumbId: BreadcrumbId) {
    if (!selectedId) return;
    const src = store.breadcrumbs.find((b) => b.id === breadcrumbId);
    if (!src) return;
    const tag = src.stageTag;
    if (!tag) return;

    setStore((s) => ({
      ...s,
      breadcrumbs: s.breadcrumbs.map((b) => {
        if (b.id !== selectedId) return b;
        const next = Array.from(new Set([...(b.nextStageTags ?? []), tag]));
        return { ...b, nextStageTags: next };
      }),
    }));
  }

  return (
    <div className="grid2" style={{ gap: 12, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <button className="primary" onClick={addBreadcrumb} style={{ flex: 1 }}>
            + Add Breadcrumb
          </button>
          <button onClick={deleteSelected} disabled={!selectedId}>
            Delete
          </button>
        </div>

        <LibraryPanel
          store={store}
          ix={ix}
          selectedBreadcrumbId={selectedId}
          onSelectBreadcrumb={setSelectedId}
          onAddProviderToSelected={addProviderToSelected}
          onAddNextFromBreadcrumb={addNextFromBreadcrumb}
        />
      </div>

      <BreadcrumbEditor store={store} ix={ix} breadcrumbId={selectedId} setStore={setStore} />
    </div>
  );
}

import { useMemo } from "react";
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
  selectedBreadcrumbId,
  setSelectedBreadcrumbId,
  nav,
}: {
  store: ContentStore;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  ix: Indexes;
  selectedBreadcrumbId: BreadcrumbId | null;
  setSelectedBreadcrumbId: (id: BreadcrumbId | null) => void;
  nav: {
    openBreadcrumb: (id: BreadcrumbId) => void;
    openLocation: (id: string) => void; // LocationId, but string is fine here if your types are annoying
    openProvider: (ref: { type: "npc" | "item"; id: string }) => void;
  };
}) {
  const selectedId: BreadcrumbId | null = selectedBreadcrumbId ?? (store.breadcrumbs[0]?.id ?? null);


  // Keep selection valid if breadcrumb deleted
  useMemo(() => {
  if (!selectedId) {
    if (store.breadcrumbs[0]) setSelectedBreadcrumbId(store.breadcrumbs[0].id);
    return;
  }
  if (store.breadcrumbs.some((b) => b.id === selectedId)) return;
  setSelectedBreadcrumbId(store.breadcrumbs[0]?.id ?? null);
}, [store.breadcrumbs, selectedId, setSelectedBreadcrumbId]);


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
    setSelectedBreadcrumbId(id);
  }

  function deleteSelected() {
    if (!selectedId) return;
    setStore((s) => ({ ...s, breadcrumbs: s.breadcrumbs.filter((b) => b.id !== selectedId) }));
    setSelectedBreadcrumbId(null);
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
          onSelectBreadcrumb={(id) => setSelectedBreadcrumbId(id)}
          onAddProviderToSelected={addProviderToSelected}
          onAddNextFromBreadcrumb={addNextFromBreadcrumb}
        />
      </div>

      <BreadcrumbEditor
  store={store}
  ix={ix}
  breadcrumbId={selectedId}
  setStore={setStore}
  nav={nav} />
    </div>
  );
}

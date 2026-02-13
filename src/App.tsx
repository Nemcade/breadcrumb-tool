import { useEffect, useMemo, useState } from "react";
import type { BreadcrumbId, ContentStore, ItemId, LocationId, NPCId, RunConfig, Tab } from "./core/types";
import { loadStore, saveStore } from "./core/store";
import { defaultContent } from "./core/defaultContent";
import { buildIndexes } from "./core/indexes";

import Tabs from "./ui/Tabs";
import GeneratePage from "./pages/GeneratePage";
import ProvidersPage from "./pages/ProvidersPage";
import LocationsPage from "./pages/LocationsPage";
import BreadcrumbsPage from "./pages/BreadcrumbsPage";
import DataPage from "./pages/DataPage";

export default function App() {
  const [tab, setTab] = useState<Tab>("generate");
  const [store, setStore] = useState<ContentStore>(() => loadStore());

  // Selection state (lets editors deep-link between tabs)
  const [selectedBreadcrumbId, setSelectedBreadcrumbId] = useState<BreadcrumbId | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<LocationId | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<{ type: "npc"; id: NPCId } | { type: "item"; id: ItemId } | null>(null);

  // persist store
  useEffect(() => {
    saveStore(store);
  }, [store]);

  // fast lookup tables (rebuilt only when store changes)
  const ix = useMemo(() => buildIndexes(store), [store]);

  const [cfg, setCfg] = useState<RunConfig>(() => {
    const present: Record<string, boolean> = {};
    const respect: Record<string, number> = {};
    const base = loadStore();
    for (const f of base.factions) {
      present[f.id] = true;
      respect[f.id] = 0;
    }
    return {
      seed: 12345,
      chainLength: 6,
      startStageTag: "Start",
      factionsPresent: present,
      respect,
    };
  });

  // keep run-config in sync with factions list
  useEffect(() => {
    setCfg((c) => {
      const nextPresent = { ...c.factionsPresent };
      const nextRespect = { ...c.respect };

      for (const f of store.factions) {
        if (nextPresent[f.id] === undefined) nextPresent[f.id] = true;
        if (nextRespect[f.id] === undefined) nextRespect[f.id] = 0;
      }

      for (const key of Object.keys(nextPresent)) {
        if (!store.factions.some((f) => f.id === key)) delete (nextPresent as any)[key];
      }
      for (const key of Object.keys(nextRespect)) {
        if (!store.factions.some((f) => f.id === key)) delete (nextRespect as any)[key];
      }

      return { ...c, factionsPresent: nextPresent, respect: nextRespect };
    });
  }, [store.factions]);

  function resetToDefaults() {
    if (!confirm('Reset content to defaults? This overwrites local edits.')) return;
    const d = defaultContent();
    setStore(d);
    saveStore(d);
  }
  
  const resetToCodeDefaults = resetToDefaults;
const resetToTemplate = resetToDefaults; // or your real template reset, if you have one


  const nav = useMemo(
    () => ({
      openBreadcrumb: (id: BreadcrumbId) => {
  setSelectedBreadcrumbId(id);
  setTab("breadcrumbs");
},


      openLocation: (id: LocationId) => {
        setSelectedLocationId(id);
        setTab("locations");
      },
      openProvider: (ref: { type: "npc"; id: NPCId } | { type: "item"; id: ItemId }) => {
        setSelectedProvider(ref);
        setTab("providers");
      },
    }),
    []
  );

  return (
    <div className="app">
      <header className="appHeader">
        <h2 className="appTitle">Breadcrumb Tool</h2>
        <Tabs tab={tab} setTab={setTab} />
      </header>

      {tab === "generate" && <GeneratePage store={store} setStore={setStore} ix={ix} cfg={cfg} setCfg={setCfg} />}

      {tab === "providers" && (
        <ProvidersPage
          store={store}
          setStore={setStore}
          ix={ix}
          selectedProvider={selectedProvider}
          setSelectedProvider={setSelectedProvider}
          nav={nav}
        />
      )}

      {tab === "locations" && (
        <LocationsPage
          store={store}
          setStore={setStore}
          ix={ix}
          selectedLocationId={selectedLocationId}
          setSelectedLocationId={setSelectedLocationId}
          nav={nav}
        />
      )}
	  
	  {tab === "breadcrumbs" && (
  <BreadcrumbsPage
  store={store}
  setStore={setStore}
  ix={ix}
  selectedBreadcrumbId={selectedBreadcrumbId}
  setSelectedBreadcrumbId={setSelectedBreadcrumbId}
  nav={nav}
/>

)}



      {tab === "data" && (
  <DataPage
    store={store}
    setStore={setStore}
    resetToTemplate={resetToTemplate}
    resetToCodeDefaults={resetToCodeDefaults}
  />
)}



      
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import type { Tab, RunConfig, ContentStore } from "./core/types";
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
    if (!confirm("Reset content to defaults? This overwrites local edits.")) return;
    const d = defaultContent();
    setStore(d);
    saveStore(d);
  }

  return (
    <div className="app">
      <header className="appHeader">
        <h2 className="appTitle">Breadcrumb Tool</h2>
        <Tabs tab={tab} setTab={setTab} />
      </header>

      {tab === "generate" && <GeneratePage store={store} setStore={setStore} ix={ix} cfg={cfg} setCfg={setCfg} />}
      {tab === "providers" && <ProvidersPage store={store} setStore={setStore} ix={ix} />}
      {tab === "locations" && <LocationsPage store={store} setStore={setStore} ix={ix} />}
      {tab === "breadcrumbs" && <BreadcrumbsPage store={store} setStore={setStore} ix={ix} />}
      {tab === "data" && <DataPage store={store} setStore={setStore} resetToDefaults={resetToDefaults} />}
    </div>
  );
}

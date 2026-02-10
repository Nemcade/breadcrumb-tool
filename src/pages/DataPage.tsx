import React from "react";
import type { ContentStore } from "../core/types";

export default function DataPage({
  store,
  setStore,
  resetToDefaults,
}: {
  store: ContentStore;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  resetToDefaults: () => void;
}) {
  function addFaction() {
    const f = { id: `fac_${Math.random().toString(36).slice(2, 9)}`, name: "New Faction" };
    setStore((s) => ({ ...s, factions: [...s.factions, f] }));
  }

  function exportContent() {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "breadcrumb-content.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Factions</h3>
        <div className="row">
          <button className="primary" onClick={addFaction}>+ Add Faction</button>
          <button onClick={resetToDefaults}>Reset to Defaults</button>
        </div>

        <div style={{ height: 12 }} />

        {store.factions.map((f) => (
          <div key={f.id} className="row" style={{ marginBottom: 6 }}>
            <input value={f.name} onChange={(e) => setStore((s) => ({ ...s, factions: s.factions.map((x) => (x.id === f.id ? { ...x, name: e.target.value } : x)) }))} />
            <button onClick={() => setStore((s) => ({ ...s, factions: s.factions.filter((x) => x.id !== f.id) }))}>Delete</button>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Export / Import</h3>

        <button className="primary" onClick={exportContent}>Export content.json</button>

        <label style={{ marginTop: 12 }}>Import content.json</label>
        <input
          type="file"
          accept="application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const parsed = JSON.parse(String(reader.result));
                if (!parsed?.version) throw new Error("bad file");
                setStore(parsed);
              } catch {
                alert("Failed to import JSON.");
              }
            };
            reader.readAsText(file);
          }}
        />

        <h4 style={{ marginTop: 12 }}>Raw JSON</h4>
        <textarea value={JSON.stringify(store, null, 2)} readOnly rows={18} />
      </div>
    </section>
  );
}

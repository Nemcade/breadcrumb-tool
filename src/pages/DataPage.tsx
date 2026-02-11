import React from "react";
import type { ContentStore } from "../core/types";
import { migrateToLatest } from "../core/migrate";

export default function DataPage({
  store,
  setStore,
  resetToTemplate,
  resetToCodeDefaults,
}: {
  store: ContentStore;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  resetToTemplate: () => void;
  resetToCodeDefaults: () => void;
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
          <button className="primary" onClick={addFaction}>
            + Add Faction
          </button>
          <button onClick={resetToTemplate}>Reset to Template</button>
          <button onClick={resetToCodeDefaults}>Reset to Code Defaults</button>
        </div>

        <div style={{ height: 12 }} />

        {store.factions.map((f) => (
          <div key={f.id} className="row" style={{ marginBottom: 6 }}>
            <input
              value={f.name}
              onChange={(e) =>
                setStore((s) => ({
                  ...s,
                  factions: s.factions.map((x) => (x.id === f.id ? { ...x, name: e.target.value } : x)),
                }))
              }
            />
            <button onClick={() => setStore((s) => ({ ...s, factions: s.factions.filter((x) => x.id !== f.id) }))}>
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Export / Import</h3>

        <button className="primary" onClick={exportContent}>
          Export content.json
        </button>

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
                const migrated = migrateToLatest(parsed);
                if (!migrated?.version) throw new Error("bad file");
                setStore(migrated);
              } catch {
                alert("Failed to import JSON.");
              }
            };
            reader.readAsText(file);
          }}
        />

        <div className="muted" style={{ marginTop: 10 }}>
          Tip: export your current store and save it as <b>public/defaultContent.json</b> to make it the app template.
        </div>

        <h4 style={{ marginTop: 12 }}>Raw JSON</h4>
        <textarea value={JSON.stringify(store, null, 2)} readOnly rows={18} />
      </div>
    </section>
  );
}

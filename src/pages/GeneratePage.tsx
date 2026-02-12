import React, { useState } from "react";
import type { ContentStore, Indexes, RunConfig, JourneyStep } from "../core/types";
import { generateJourney } from "../core/generator";

function randomSeed() {
  // 1..2^31-1-ish
  return Math.floor(Math.random() * 2147483000) + 1;
}

export default function GeneratePage({
  store,
  ix,
  cfg,
  setCfg,
}: {
  store: ContentStore;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  ix: Indexes;
  cfg: RunConfig;
  setCfg: React.Dispatch<React.SetStateAction<RunConfig>>;
}) {
  const [journey, setJourney] = useState<JourneyStep[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [autoSeed, setAutoSeed] = useState(true);

  function onGenerate() {
    const nextCfg = autoSeed ? { ...cfg, seed: randomSeed() } : cfg;
    if (autoSeed) setCfg(nextCfg);
    const res = generateJourney(store, nextCfg);
    setJourney(res.steps);
    setIssues(res.issues);
  }

  function exportJson() {
    const payload = { runConfig: cfg, steps: journey, issues, contentVersion: store.version };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brother-journey-seed-${cfg.seed}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="gridPage">
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Run Config</h3>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <input type="checkbox" checked={autoSeed} onChange={(e) => setAutoSeed(e.target.checked)} />
          <span>Randomize seed on Generate</span>
        </label>

        <label>Seed</label>
        <div className="row" style={{ gap: 8 }}>
          <input
            type="number"
            value={cfg.seed}
            onChange={(e) => setCfg((c) => ({ ...c, seed: Number(e.target.value) }))}
            style={{ flex: 1 }}
            disabled={autoSeed}
          />
          <button onClick={() => setCfg((c) => ({ ...c, seed: randomSeed() }))} disabled={autoSeed} title="Roll a new seed">
            🎲
          </button>
        </div>

        <div style={{ height: 8 }} />

        <label>Chain length</label>
        <input type="number" min={1} max={50} value={cfg.chainLength} onChange={(e) => setCfg((c) => ({ ...c, chainLength: Number(e.target.value) }))} />

        <div style={{ height: 8 }} />

        <label>Start stage tag</label>
        <input value={cfg.startStageTag} onChange={(e) => setCfg((c) => ({ ...c, startStageTag: e.target.value }))} />

        <h4>Factions present</h4>
        {store.factions.map((f) => (
          <label key={f.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>{f.name}</span>
            <input
              type="checkbox"
              checked={cfg.factionsPresent[f.id] ?? true}
              onChange={(e) => setCfg((c) => ({ ...c, factionsPresent: { ...c.factionsPresent, [f.id]: e.target.checked } }))}
            />
          </label>
        ))}

        <h4 style={{ marginTop: 12 }}>Respect (sim)</h4>
        {store.factions.map((f) => (
          <div key={f.id} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{f.name}</span>
              <span>{cfg.respect[f.id] ?? 0}</span>
            </div>
            <input
              type="range"
              min={-3}
              max={3}
              step={1}
              value={cfg.respect[f.id] ?? 0}
              onChange={(e) => setCfg((c) => ({ ...c, respect: { ...c.respect, [f.id]: Number(e.target.value) } }))}
            />
          </div>
        ))}

        <div className="row" style={{ marginTop: 12 }}>
          <button className="primary" onClick={onGenerate} style={{ flex: 1 }}>
            Generate
          </button>
          <button onClick={exportJson} disabled={!journey.length} style={{ flex: 1 }}>
            Export JSON
          </button>
        </div>

        {issues.length > 0 && (
          <div style={{ marginTop: 12, color: "#b00" }}>
            <b>Issues</b>
            <ul>
              {issues.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Generated Journey</h3>
        {journey.length === 0 ? (
          <div className="muted">Generate a run to see the brother’s path steps.</div>
        ) : (
          <ol style={{ paddingLeft: 18 }}>
            {journey.map((s) => {
              const opt = ix.breadcrumbsById.get(s.optionId);
              if (!opt) return null;

              const providerStr =
                s.provider.type === "npc"
                  ? ix.npcsById.get(s.provider.npcId)?.name ?? s.provider.npcId
                  : s.provider.type;

              return (
                <li key={s.idx} style={{ marginBottom: 12 }}>
                  <div>
                    <b>{opt.title}</b> {s.usedFallback ? <span style={{ color: "#b00" }}>(fallback)</span> : null}
                  </div>
                  <div className="muted">{opt.text}</div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    <b>Stage:</b> {s.stageTag} · <b>Provider:</b> {providerStr} · <b>Next:</b>{" "}
                    {opt.nextStageTags.join(", ") || "—"}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

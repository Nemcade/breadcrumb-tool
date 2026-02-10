import type { ContentStore, Requirement } from "../core/types";

/**
 * RequirementEditor v2
 * - Controlled: requirements + setRequirements
 * - Keeps UI small and simple.
 */
export default function RequirementEditor({
  requirements,
  setRequirements,
  store,
}: {
  requirements: Requirement[];
  setRequirements: (reqs: Requirement[]) => void;
  store: ContentStore;
}) {
  function addAlways() {
    setRequirements([...(requirements ?? []), { kind: "always" }]);
  }

  function addBlockedFallbackOnly() {
    setRequirements([...(requirements ?? []), { kind: "blockedFallbackOnly" }]);
  }

  function addRespectAtLeast() {
    const firstFaction = store.factions[0]?.id ?? "";
    setRequirements([...(requirements ?? []), { kind: "respectAtLeast", factionId: firstFaction, value: 1 }]);
  }

  function removeAt(i: number) {
    setRequirements((requirements ?? []).filter((_, idx) => idx !== i));
  }

  function updateAt(i: number, next: Requirement) {
    setRequirements((requirements ?? []).map((r, idx) => (idx === i ? next : r)));
  }

  return (
    <div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button onClick={addAlways}>+ always</button>
        <button onClick={addRespectAtLeast}>+ respectAtLeast</button>
        <button onClick={addBlockedFallbackOnly}>+ blockedFallbackOnly</button>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {(requirements ?? []).length === 0 ? (
          <div className="muted">No requirements.</div>
        ) : (
          (requirements ?? []).map((r, i) => (
            <div key={i} className="card" style={{ padding: 10 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                <b>{r.kind}</b>
                <button onClick={() => removeAt(i)}>Delete</button>
              </div>

              {r.kind === "respectAtLeast" && (
                <div className="grid2" style={{ marginTop: 8 }}>
                  <div>
                    <label>Faction</label>
                    <select
                      value={r.factionId}
                      onChange={(e) => updateAt(i, { ...r, factionId: e.target.value })}
                    >
                      {store.factions.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Value</label>
                    <input
                      type="number"
                      min={0}
                      value={r.value}
                      onChange={(e) => updateAt(i, { ...r, value: Number(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              {r.kind === "blockedFallbackOnly" && (
                <div className="muted" style={{ marginTop: 8 }}>
                  Used only when breadcrumb is blocked (legacy support).
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

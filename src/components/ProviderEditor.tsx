import { useMemo, useState } from "react";
import type {
  ContentStore,
  Indexes,
  NPCId,
  ItemId,
  LocationId,
  ProviderBeat,
  BeatKind,
  BeatMood,
} from "../core/types";
import DropZone from "../ui/DropZone";

type SelectedProvider = { type: "npc"; id: NPCId } | { type: "item"; id: ItemId } | null;

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function weightClamp(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(999, n));
}

function beatLabel(kind: BeatKind) {
  switch (kind) {
    case "witness":
      return "Witness";
    case "trade":
      return "Trade";
    case "fight":
      return "Fight";
    case "letter":
      return "Letter";
    case "party":
      return "Party";
    case "other":
      return "Other";
  }
}

function moodLabel(m: BeatMood) {
  switch (m) {
    case "neutral":
      return "Neutral";
    case "friendly":
      return "Friendly";
    case "hostile":
      return "Hostile";
    case "mysterious":
      return "Mysterious";
  }
}

function compactLocation(ix: Indexes, id: LocationId | null) {
  if (!id) return "—";
  const l = ix.locationsById.get(id);
  return l ? `${l.name} (${l.kind})` : id;
}

function ProviderBeatsEditor({
  beats,
  onChange,
}: {
  beats: ProviderBeat[];
  onChange: (next: ProviderBeat[]) => void;
}) {
  function addBeat() {
    const b: ProviderBeat = {
      id: uid("beat"),
      kind: "witness",
      mood: "neutral",
      text: "{me} saw your brother near {nextLocation}.",
      weight: 1,
      respectDelta: 0,
    };
    onChange([...(beats ?? []), b]);
  }

  function removeBeat(id: string) {
    onChange((beats ?? []).filter((b) => b.id !== id));
  }

  function patchBeat(id: string, patch: Partial<ProviderBeat>) {
    onChange((beats ?? []).map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <b>Brother Beats</b>
        <button onClick={addBeat}>+ Beat</button>
      </div>

      <div className="muted" style={{ fontSize: 12, lineHeight: 1.35 }}>
        Provider-authored “what your brother did to me”. Tokens:{" "}
        <code>{"{me}"}</code> <code>{"{myLocation}"}</code> <code>{"{nextProvider}"}</code>{" "}
        <code>{"{nextLocation}"}</code> <code>{"{nextBreadcrumb}"}</code>
      </div>

      {(beats ?? []).length === 0 ? (
        <div className="muted">No beats yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(beats ?? []).map((b) => (
            <div key={b.id} className="card" style={{ padding: 12 }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontWeight: 700 }}>
                  {beatLabel(b.kind)} · {moodLabel(b.mood)}
                </div>
                <button onClick={() => removeBeat(b.id)} title="Delete beat">
                  Delete
                </button>
              </div>

              <div className="grid2" style={{ marginTop: 10 }}>
                <div>
                  <label>Kind</label>
                  <select value={b.kind} onChange={(e) => patchBeat(b.id, { kind: e.target.value as BeatKind })}>
                    <option value="witness">Witness</option>
                    <option value="trade">Trade</option>
                    <option value="fight">Fight</option>
                    <option value="letter">Letter</option>
                    <option value="party">Party</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label>Mood</label>
                  <select value={b.mood} onChange={(e) => patchBeat(b.id, { mood: e.target.value as BeatMood })}>
                    <option value="neutral">Neutral</option>
                    <option value="friendly">Friendly</option>
                    <option value="hostile">Hostile</option>
                    <option value="mysterious">Mysterious</option>
                  </select>
                </div>
              </div>

              <div className="grid2" style={{ marginTop: 10 }}>
                <div>
                  <label>Weight</label>
                  <input
                    type="number"
                    min={0}
                    value={b.weight}
                    onChange={(e) => patchBeat(b.id, { weight: weightClamp(Number(e.target.value)) })}
                  />
                </div>

                <div>
                  <label>Respect delta (future sim)</label>
                  <input
                    type="number"
                    value={b.respectDelta ?? 0}
                    onChange={(e) => patchBeat(b.id, { respectDelta: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Text</label>
                <textarea value={b.text} rows={3} onChange={(e) => patchBeat(b.id, { text: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProviderEditor({
  store,
  setStore,
  ix,
  selected,
  nav,
}: {
  store: ContentStore;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  ix: Indexes;
  selected: SelectedProvider;
  nav?: {
    openBreadcrumb: (id: string) => void;
    openLocation: (id: string) => void;
    openProvider: (ref: { type: "npc"; id: string } | { type: "item"; id: string }) => void;
  };
}) {
  const onOpenLocation = nav?.openLocation;
  const onOpenBreadcrumb = nav?.openBreadcrumb;

  const npc = useMemo(() => {
    if (!selected || selected.type !== "npc") return null;
    return store.npcs.find((n) => n.id === selected.id) ?? null;
  }, [selected, store.npcs]);

  const item = useMemo(() => {
    if (!selected || selected.type !== "item") return null;
    return store.items.find((it) => it.id === selected.id) ?? null;
  }, [selected, store.items]);

  const [locDropNonce, setLocDropNonce] = useState(0);

  function onDropLocation(locationId: string) {
    if (!selected) return;
    if (selected.type === "npc") {
      setStore((s) => ({
        ...s,
        npcs: s.npcs.map((n) => (n.id === selected.id ? { ...n, locationId } : n)),
      }));
    } else {
      setStore((s) => ({
        ...s,
        items: s.items.map((it) => (it.id === selected.id ? { ...it, locationId } : it)),
      }));
    }
    setLocDropNonce((x) => x + 1);
  }

  const providerBreadcrumbs = useMemo(() => {
    if (!selected) return [];
    return store.breadcrumbs.filter((b) => b.providerRefs.some((p) => p.type === selected.type && p.id === selected.id));
  }, [selected, store.breadcrumbs]);

  if (!selected) {
    return (
      <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)" }}>
        <div className="muted">Select a provider from the library to edit it.</div>
      </section>
    );
  }

  if (selected.type === "npc" && npc) {
    const facName = npc.factionId ? ix.factionsById.get(npc.factionId)?.name ?? npc.factionId : "Unaffiliated";

    return (
      <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)", overflow: "auto" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h2 style={{ margin: 0 }}>{npc.name || "NPC"}</h2>
          <div className="muted" style={{ fontSize: 12 }}>
            ID: {npc.id}
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 12 }}>
          <div>
            <label>Name</label>
            <input
              value={npc.name}
              onChange={(e) =>
                setStore((s) => ({ ...s, npcs: s.npcs.map((n) => (n.id === npc.id ? { ...n, name: e.target.value } : n)) }))
              }
            />
          </div>

          <div>
            <label>Tier</label>
            <select
              value={npc.tier}
              onChange={(e) =>
                setStore((s) => ({ ...s, npcs: s.npcs.map((n) => (n.id === npc.id ? { ...n, tier: Number(e.target.value) as any } : n)) }))
              }
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 12 }}>
          <div>
            <label>Faction</label>
            <div className="muted" style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }}>
              {facName}
            </div>
          </div>

          <div>
            <label>Location</label>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <div className="muted" style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }}>
                {compactLocation(ix, npc.locationId)}
              </div>

              {npc.locationId && (
                <button onClick={() => npc.locationId && onOpenLocation?.(npc.locationId)} title="Open location">
                  Open
                </button>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <DropZone
                title="Drop location"
                hint="Drag a location from Locations library."
                acceptPrefix="location:"
                onDropId={onDropLocation}
                key={`npcLocDrop_${locDropNonce}`}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Notes</label>
          <textarea
            value={npc.notes}
            rows={3}
            onChange={(e) => setStore((s) => ({ ...s, npcs: s.npcs.map((n) => (n.id === npc.id ? { ...n, notes: e.target.value } : n)) }))}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <ProviderBeatsEditor
            beats={npc.brotherBeats ?? []}
            onChange={(brotherBeats) =>
              setStore((s) => ({
                ...s,
                npcs: s.npcs.map((n) => (n.id === npc.id ? { ...n, brotherBeats } : n)),
              }))
            }
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <b>Used by breadcrumbs</b>
          <div className="muted" style={{ marginTop: 4 }}>
            {providerBreadcrumbs.length ? `${providerBreadcrumbs.length} breadcrumb(s)` : "None"}
          </div>

          {providerBreadcrumbs.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {providerBreadcrumbs
                .slice()
                .sort((a, b) => (a.stageTag + a.title).localeCompare(b.stageTag + b.title))
                .map((b) => (
                  <button
                    key={b.id}
                    style={{ textAlign: "left", padding: 10, borderRadius: 12 }}
                    onClick={() => onOpenBreadcrumb?.(b.id)}
                    title="Open breadcrumb"
                  >
                    <div style={{ fontWeight: 700 }}>{b.title || "(untitled)"}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {b.stageTag} · {b.id} · {b.isMainJourney ? "Main" : "Side"}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (selected.type === "item" && item) {
    return (
      <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)", overflow: "auto" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h2 style={{ margin: 0 }}>{item.name || "Item"}</h2>
          <div className="muted" style={{ fontSize: 12 }}>
            ID: {item.id}
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 12 }}>
          <div>
            <label>Name</label>
            <input
              value={item.name}
              onChange={(e) => setStore((s) => ({ ...s, items: s.items.map((it) => (it.id === item.id ? { ...it, name: e.target.value } : it)) }))}
            />
          </div>

          <div>
            <label>Kind</label>
            <select
              value={item.kind}
              onChange={(e) => setStore((s) => ({ ...s, items: s.items.map((it) => (it.id === item.id ? { ...it, kind: e.target.value as any } : it)) }))}
            >
              <option value="note">note</option>
              <option value="chest">chest</option>
              <option value="letter">letter</option>
              <option value="corpse">corpse</option>
              <option value="relic">relic</option>
              <option value="other">other</option>
            </select>
          </div>
        </div>

        <div className="grid2" style={{ marginTop: 12 }}>
          <div>
            <label>Location</label>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <div className="muted" style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }}>
                {compactLocation(ix, item.locationId)}
              </div>
              {item.locationId && (
                <button onClick={() => item.locationId && onOpenLocation?.(item.locationId)} title="Open location">
                  Open
                </button>
              )}
            </div>

            <div style={{ marginTop: 8 }}>
              <DropZone
                title="Drop location"
                hint="Drag a location from Locations library."
                acceptPrefix="location:"
                onDropId={onDropLocation}
                key={`itemLocDrop_${locDropNonce}`}
              />
            </div>
          </div>

          <div>
            <label>Tags</label>
            <input
              value={(item.tags ?? []).join(", ")}
              onChange={(e) =>
                setStore((s) => ({
                  ...s,
                  items: s.items.map((it) =>
                    it.id === item.id
                      ? { ...it, tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }
                      : it
                  ),
                }))
              }
              placeholder="comma-separated"
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label>Notes</label>
          <textarea
            value={item.notes}
            rows={3}
            onChange={(e) => setStore((s) => ({ ...s, items: s.items.map((it) => (it.id === item.id ? { ...it, notes: e.target.value } : it)) }))}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <ProviderBeatsEditor
            beats={item.brotherBeats ?? []}
            onChange={(brotherBeats) =>
              setStore((s) => ({
                ...s,
                items: s.items.map((it) => (it.id === item.id ? { ...it, brotherBeats } : it)),
              }))
            }
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <b>Used by breadcrumbs</b>
          <div className="muted" style={{ marginTop: 4 }}>
            {providerBreadcrumbs.length ? `${providerBreadcrumbs.length} breadcrumb(s)` : "None"}
          </div>

          {providerBreadcrumbs.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {providerBreadcrumbs
                .slice()
                .sort((a, b) => (a.stageTag + a.title).localeCompare(b.stageTag + b.title))
                .map((b) => (
                  <button
                    key={b.id}
                    style={{ textAlign: "left", padding: 10, borderRadius: 12 }}
                    onClick={() => onOpenBreadcrumb?.(b.id)}
                    title="Open breadcrumb"
                  >
                    <div style={{ fontWeight: 700 }}>{b.title || "(untitled)"}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {b.stageTag} · {b.id} · {b.isMainJourney ? "Main" : "Side"}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="card" style={{ padding: 16, height: "calc(100vh - 24px)" }}>
      <div className="muted">Selected provider not found.</div>
    </section>
  );
}

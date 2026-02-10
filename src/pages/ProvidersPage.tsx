import React, { useMemo, useState } from "react";
import type { ContentStore, Indexes, Tier, ItemKind, ItemProvider } from "../core/types";
import Chip from "../ui/Chip";
import Select from "../ui/Select";
import CsvInput from "../ui/CsvInput";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(2, 6)}`;
}

export default function ProvidersPage({
  store,
  setStore,
  ix,
}: {
  store: ContentStore;
  setStore: React.Dispatch<React.SetStateAction<ContentStore>>;
  ix: Indexes;
}) {
  const [mode, setMode] = useState<"npcs" | "items">("npcs");

  const [npcFilter, setNpcFilter] = useState({
    text: "",
    factionId: "" as string | "",
    role: "",
    tier: "" as "" | Tier,
    locationId: "" as string | "",
  });

  const [itemFilter, setItemFilter] = useState({
    text: "",
    kind: "" as "" | ItemKind,
    tag: "",
    locationId: "" as string | "",
  });

  const filteredNPCs = useMemo(() => {
    return store.npcs.filter((n) => {
      if (npcFilter.text && !n.name.toLowerCase().includes(npcFilter.text.toLowerCase())) return false;
      if (npcFilter.factionId !== "" && (n.factionId ?? "") !== npcFilter.factionId) return false;
      if (npcFilter.role && !n.roles.includes(npcFilter.role)) return false;
      if (npcFilter.tier !== "" && n.tier !== npcFilter.tier) return false;
      if (npcFilter.locationId !== "" && (n.locationId ?? "") !== npcFilter.locationId) return false;
      return true;
    });
  }, [store.npcs, npcFilter]);

  const filteredItems = useMemo(() => {
    return store.items.filter((it) => {
      if (itemFilter.text && !it.name.toLowerCase().includes(itemFilter.text.toLowerCase())) return false;
      if (itemFilter.kind !== "" && it.kind !== itemFilter.kind) return false;
      if (itemFilter.tag && !it.tags.some((t) => t.toLowerCase().includes(itemFilter.tag.toLowerCase()))) return false;
      if (itemFilter.locationId !== "" && (it.locationId ?? "") !== itemFilter.locationId) return false;
      return true;
    });
  }, [store.items, itemFilter]);

  function addNPC() {
    setStore((s) => ({
      ...s,
      npcs: [...s.npcs, { id: uid("npc"), name: "New NPC", factionId: null, roles: [], tier: 0, locationId: null, notes: "" }],
    }));
  }

  function addItem() {
    const it: ItemProvider = {
      id: uid("item"),
      name: "New Item",
      kind: "note",
      locationId: null,
      notes: "",
      tags: [],
    };
    setStore((s) => ({ ...s, items: [...s.items, it] }));
  }

  return (
    <section className="gridPage">
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Mode</h3>

        <div className="row" style={{ marginTop: 12 }}>
          <button className={mode === "npcs" ? "primary" : ""} onClick={() => setMode("npcs")} style={{ flex: 1 }}>
            NPCs
          </button>
          <button className={mode === "items" ? "primary" : ""} onClick={() => setMode("items")} style={{ flex: 1 }}>
            Items
          </button>
        </div>

        <div style={{ height: 14 }} />

        {mode === "npcs" ? (
          <>
            <h3 style={{ marginTop: 0 }}>Filters</h3>

            <label>Name contains</label>
            <input value={npcFilter.text} onChange={(e) => setNpcFilter((x) => ({ ...x, text: e.target.value }))} />

            <div style={{ height: 8 }} />

            <label>Faction</label>
            <Select
              value={npcFilter.factionId}
              onChange={(v) => setNpcFilter((x) => ({ ...x, factionId: v }))}
              placeholder="Any (incl. unaffiliated)"
              options={store.factions.map((f) => ({ value: f.id, label: f.name }))}
            />

            <div style={{ height: 8 }} />

            <label>Role tag</label>
            <input value={npcFilter.role} onChange={(e) => setNpcFilter((x) => ({ ...x, role: e.target.value }))} placeholder="chieftain" />

            <div style={{ height: 8 }} />

            <label>Tier</label>
            <select
              value={npcFilter.tier === "" ? "" : String(npcFilter.tier)}
              onChange={(e) => setNpcFilter((x) => ({ ...x, tier: e.target.value === "" ? "" : (Number(e.target.value) as Tier) }))}
            >
              <option value="">Any</option>
              <option value="0">0 (free)</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>

            <div style={{ height: 8 }} />

            <label>Location</label>
            <Select
              value={npcFilter.locationId}
              onChange={(v) => setNpcFilter((x) => ({ ...x, locationId: v }))}
              placeholder="Any"
              options={store.locations.map((l) => ({ value: l.id, label: `${l.name} (${l.kind})` }))}
            />

            <div style={{ height: 12 }} />

            <button className="primary" onClick={addNPC}>
              + Add NPC
            </button>
          </>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>Filters</h3>

            <label>Name contains</label>
            <input value={itemFilter.text} onChange={(e) => setItemFilter((x) => ({ ...x, text: e.target.value }))} />

            <div style={{ height: 8 }} />

            <label>Kind</label>
            <select value={itemFilter.kind} onChange={(e) => setItemFilter((x) => ({ ...x, kind: (e.target.value as any) || "" }))}>
              <option value="">Any</option>
              <option value="note">note</option>
              <option value="chest">chest</option>
              <option value="letter">letter</option>
              <option value="corpse">corpse</option>
              <option value="relic">relic</option>
              <option value="other">other</option>
            </select>

            <div style={{ height: 8 }} />

            <label>Tag contains</label>
            <input value={itemFilter.tag} onChange={(e) => setItemFilter((x) => ({ ...x, tag: e.target.value }))} placeholder="key, clue" />

            <div style={{ height: 8 }} />

            <label>Location</label>
            <Select
              value={itemFilter.locationId}
              onChange={(v) => setItemFilter((x) => ({ ...x, locationId: v }))}
              placeholder="Any"
              options={store.locations.map((l) => ({ value: l.id, label: `${l.name} (${l.kind})` }))}
            />

            <div style={{ height: 12 }} />

            <button className="primary" onClick={addItem}>
              + Add Item
            </button>
          </>
        )}
      </div>

      <div className="panel">
        {mode === "npcs" ? (
          <>
            <h3 style={{ marginTop: 0 }}>NPCs</h3>

            {filteredNPCs.length === 0 ? (
              <div className="muted">No NPCs match filters.</div>
            ) : (
              filteredNPCs.map((n) => {
                const factionName = n.factionId ? ix.factionsById.get(n.factionId)?.name ?? n.factionId : "Unaffiliated";
                const locName = n.locationId ? ix.locationsById.get(n.locationId)?.name ?? n.locationId : "—";

                return (
                  <div className="card" key={n.id}>
                    <div className="cardHeader">
                      <input
                        className="cardTitleInput"
                        value={n.name}
                        onChange={(e) =>
                          setStore((s) => ({ ...s, npcs: s.npcs.map((x) => (x.id === n.id ? { ...x, name: e.target.value } : x)) }))
                        }
                      />
                      <button onClick={() => setStore((s) => ({ ...s, npcs: s.npcs.filter((x) => x.id !== n.id) }))}>Delete</button>
                    </div>

                    <div className="grid2" style={{ marginTop: 10 }}>
                      <div>
                        <label>Faction</label>
                        <select
                          value={n.factionId ?? ""}
                          onChange={(e) =>
                            setStore((s) => ({
                              ...s,
                              npcs: s.npcs.map((x) => (x.id === n.id ? { ...x, factionId: e.target.value === "" ? null : e.target.value } : x)),
                            }))
                          }
                        >
                          <option value="">Unaffiliated</option>
                          {store.factions.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label>Tier (respect needed)</label>
                        <select
                          value={String(n.tier)}
                          onChange={(e) =>
                            setStore((s) => ({
                              ...s,
                              npcs: s.npcs.map((x) => (x.id === n.id ? { ...x, tier: Number(e.target.value) as Tier } : x)),
                            }))
                          }
                        >
                          <option value="0">0</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                        </select>
                      </div>

                      <div>
                        <label>Location</label>
                        <select
                          value={n.locationId ?? ""}
                          onChange={(e) =>
                            setStore((s) => ({
                              ...s,
                              npcs: s.npcs.map((x) => (x.id === n.id ? { ...x, locationId: e.target.value === "" ? null : e.target.value } : x)),
                            }))
                          }
                        >
                          <option value="">—</option>
                          {store.locations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name} ({l.kind})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label>Roles</label>
                        <CsvInput
                          value={n.roles}
                          onChange={(roles) => setStore((s) => ({ ...s, npcs: s.npcs.map((x) => (x.id === n.id ? { ...x, roles } : x)) }))}
                          placeholder="merchant, chieftain"
                        />
                      </div>
                    </div>

                    <div className="muted" style={{ marginTop: 10 }}>
                      <b>Summary:</b> {factionName} · Tier {n.tier} · {locName}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      {n.roles.map((r) => (
                        <Chip key={r} text={r} />
                      ))}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <label>Notes / Lore</label>
                      <textarea
                        value={n.notes}
                        rows={3}
                        onChange={(e) =>
                          setStore((s) => ({ ...s, npcs: s.npcs.map((x) => (x.id === n.id ? { ...x, notes: e.target.value } : x)) }))
                        }
                      />
                    </div>

                    <div className="muted" style={{ marginTop: 10 }}>
                      <b>ID:</b> {n.id}
                    </div>
                  </div>
                );
              })
            )}
          </>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>Items</h3>

            {filteredItems.length === 0 ? (
              <div className="muted">No items match filters.</div>
            ) : (
              filteredItems.map((it) => {
                const locName = it.locationId ? ix.locationsById.get(it.locationId)?.name ?? it.locationId : "—";
                return (
                  <div className="card" key={it.id}>
                    <div className="cardHeader">
                      <input
                        className="cardTitleInput"
                        value={it.name}
                        onChange={(e) =>
                          setStore((s) => ({ ...s, items: s.items.map((x) => (x.id === it.id ? { ...x, name: e.target.value } : x)) }))
                        }
                      />
                      <button onClick={() => setStore((s) => ({ ...s, items: s.items.filter((x) => x.id !== it.id) }))}>Delete</button>
                    </div>

                    <div className="grid2" style={{ marginTop: 10 }}>
                      <div>
                        <label>Kind</label>
                        <select
                          value={it.kind}
                          onChange={(e) =>
                            setStore((s) => ({ ...s, items: s.items.map((x) => (x.id === it.id ? { ...x, kind: e.target.value as ItemKind } : x)) }))
                          }
                        >
                          <option value="note">note</option>
                          <option value="chest">chest</option>
                          <option value="letter">letter</option>
                          <option value="corpse">corpse</option>
                          <option value="relic">relic</option>
                          <option value="other">other</option>
                        </select>
                      </div>

                      <div>
                        <label>Location</label>
                        <select
                          value={it.locationId ?? ""}
                          onChange={(e) =>
                            setStore((s) => ({
                              ...s,
                              items: s.items.map((x) => (x.id === it.id ? { ...x, locationId: e.target.value === "" ? null : e.target.value } : x)),
                            }))
                          }
                        >
                          <option value="">—</option>
                          {store.locations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name} ({l.kind})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label>Tags</label>
                        <CsvInput
                          value={it.tags}
                          onChange={(tags) => setStore((s) => ({ ...s, items: s.items.map((x) => (x.id === it.id ? { ...x, tags } : x)) }))}
                          placeholder="clue, key, graahl"
                        />
                      </div>

                      <div>
                        <label>&nbsp;</label>
                        <div className="muted">Placed at: {locName}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 8 }}>
                      {it.tags.map((t) => (
                        <Chip key={t} text={t} />
                      ))}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <label>Notes / Lore</label>
                      <textarea
                        value={it.notes}
                        rows={3}
                        onChange={(e) =>
                          setStore((s) => ({ ...s, items: s.items.map((x) => (x.id === it.id ? { ...x, notes: e.target.value } : x)) }))
                        }
                      />
                    </div>

                    <div className="muted" style={{ marginTop: 10 }}>
                      <b>ID:</b> {it.id}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </section>
  );
}

import { useMemo, useState } from "react";

type Item = { id: string; label: string };

export default function MultiPick({
  label,
  items,
  selected,
  onChange,
  placeholder = "Search…",
}: {
  label: string;
  items: Item[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) => it.label.toLowerCase().includes(qq) || it.id.toLowerCase().includes(qq));
  }, [items, q]);

  function toggle(id: string) {
    if (selectedSet.has(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  }

  return (
    <div>
      <label>{label}</label>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
        <button type="button" onClick={() => setQ("")}>Clear</button>
      </div>

      <div style={{ marginTop: 8 }}>
        {selected.length === 0 ? (
          <div className="muted">None selected.</div>
        ) : (
          selected.map((id) => {
            const it = items.find((x) => x.id === id);
            return (
              <span key={id} className="chip" style={{ cursor: "pointer" }} onClick={() => toggle(id)} title="Click to remove">
                {it?.label ?? id} ✕
              </span>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 8, maxHeight: 170, overflow: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8, background: "white" }}>
        {filtered.map((it) => (
          <label key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
            <span>{it.label}</span>
            <input type="checkbox" checked={selectedSet.has(it.id)} onChange={() => toggle(it.id)} />
          </label>
        ))}
      </div>
    </div>
  );
}

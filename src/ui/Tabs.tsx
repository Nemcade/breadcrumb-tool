import type { Tab } from "../core/types";

export default function Tabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: Array<[Tab, string]> = [
    ["generate", "Generate"],
    ["providers", "Providers (NPCs)"],
    ["locations", "Locations"],
    ["breadcrumbs", "Breadcrumbs"],
    ["data", "Data"],
  ];

  return (
    <nav className="tabs">
      {items.map(([k, label]) => (
        <button key={k} className={`tabBtn ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
          {label}
        </button>
      ))}
    </nav>
  );
}

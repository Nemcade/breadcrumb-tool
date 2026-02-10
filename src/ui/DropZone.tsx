import { useState } from "react";

export default function DropZone({
  title,
  hint,
  acceptPrefix,
  onDropId,
}: {
  title: string;
  hint: string;
  acceptPrefix: string; // e.g. "provider:" or "breadcrumb:"
  onDropId: (id: string) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        const dt = e.dataTransfer;
        if (dt.types.includes("text/plain")) e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const raw = e.dataTransfer.getData("text/plain");
        if (!raw || !raw.startsWith(acceptPrefix)) return;
        onDropId(raw.slice(acceptPrefix.length));
      }}
      style={{
        marginTop: 10,
        padding: "14px 14px",
        borderRadius: 14,
        border: `2px dashed ${over ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.28)"}`,
        background: over ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
      }}
      title="Drag from the library and drop here"
    >
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>{title}</div>
        <div className="muted" style={{ fontSize: 18, lineHeight: 1 }}>
          ⤓
        </div>
      </div>
      <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
        {hint}
      </div>
    </div>
  );
}

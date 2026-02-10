import { useEffect, useMemo, useState } from "react";

function toCsv(values: string[] | undefined | null): string {
  return (values ?? []).join(", ");
}

function parseCsv(text: string): string[] {
  // Split by comma, trim, drop empties, dedupe (stable)
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of text.split(",")) {
    const v = raw.trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }

  return out;
}

/**
 * CsvInput
 * - lets user type commas naturally
 * - commits parsed values on blur (and Enter)
 * - defensive: values can be undefined/null
 */
export default function CsvInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values?: string[]; // can be undefined when older content is loaded
  onChange: (vals: string[]) => void;
  placeholder?: string;
}) {
  const initial = useMemo(() => toCsv(values), [values]);
  const [draft, setDraft] = useState<string>(initial);

  // Keep draft synced if external values change (e.g. switching breadcrumb)
  useEffect(() => {
    setDraft(toCsv(values));
  }, [values]);

  function commit() {
    onChange(parseCsv(draft));
  }

  return (
    <div>
      <label>{label}</label>
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
      />
    </div>
  );
}

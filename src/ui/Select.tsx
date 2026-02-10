
export default function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: T | "";
  onChange: (v: T | "") => void;
  options: Array<{ value: T; label: string }>;
  placeholder?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange((e.target.value as T) || "")}>
      <option value="">{placeholder ?? "—"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

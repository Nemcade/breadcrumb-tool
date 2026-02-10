import type { ContentStore } from "../core/types";
import { defaultContent } from "./defaultContent";
import { migrateToLatest } from "./migrate";

const STORE_KEY = "breadcrumb-tool-content-v1";

export function loadStore(): ContentStore {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return defaultContent();
  try {
const parsed = JSON.parse(raw);
const migrated = migrateToLatest(parsed);
return migrated;
  } catch {
    return defaultContent();
  }
}

export function saveStore(s: ContentStore) {
  localStorage.setItem(STORE_KEY, JSON.stringify(s, null, 2));
}

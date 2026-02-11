import type { ContentStore } from "./types";
import { defaultContent } from "./defaultContent";
import { migrateToLatest } from "./migrate";

export const STORE_KEY = "breadcrumb-tool-content-v1";

/** Returns true if localStorage contains a store payload. */
export function hasStoredStore(): boolean {
  return localStorage.getItem(STORE_KEY) != null;
}

function safeParseAndMigrate(raw: string): ContentStore | null {
  try {
    const parsed = JSON.parse(raw);
    return migrateToLatest(parsed);
  } catch {
    return null;
  }
}

/** Synchronous load (localStorage only). Falls back to code default if missing/bad. */
export function loadStore(): ContentStore {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return defaultContent();

  const migrated = safeParseAndMigrate(raw);
  return migrated ?? defaultContent();
}

/** Save to localStorage. */
export function saveStore(s: ContentStore) {
  localStorage.setItem(STORE_KEY, JSON.stringify(s, null, 2));
}

/**
 * Load the template JSON from /defaultContent.json (public/) and migrate it.
 * Falls back to code defaultContent() if missing or invalid.
 */
export async function loadTemplateStore(): Promise<ContentStore> {
  try {
    const res = await fetch("/defaultContent.json", { cache: "no-store" });
    if (!res.ok) return defaultContent();

    const json = await res.json();
    const migrated = migrateToLatest(json);
    return migrated ?? defaultContent();
  } catch {
    return defaultContent();
  }
}

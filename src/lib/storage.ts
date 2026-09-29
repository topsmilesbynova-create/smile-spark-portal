// SSR-safe localStorage access for per-browser conveniences and fictional demo data.
// Every read and write can fail (private mode, quota, blocked storage), so callers
// always get a value back.
const PREFIX = "tsn:v3:";

// Keys written by the original mock. The old booking draft held patient
// photos as data URLs, so these are cleared rather than migrated.
const LEGACY_KEYS = [
  "tsn-bookings",
  "tsn-services",
  "tsn-payments",
  "tsn-fields",
  "tsn-booking-draft",
];

export function removeLegacyKeys() {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_KEYS) window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable; nothing to remove.
  }
}

export function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(PREFIX + key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Returns false when the value could not be persisted (e.g. quota exceeded by images). */
export function writeStored<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Storage unavailable; nothing to remove.
  }
}

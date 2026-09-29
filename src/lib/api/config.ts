/** Trailing slashes removed. Empty string means the app runs against the local mock API. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

export const API_MODE: "http" | "mock" = API_BASE_URL ? "http" : "mock";

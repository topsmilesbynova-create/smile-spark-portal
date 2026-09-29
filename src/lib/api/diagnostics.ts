// Development-only connectivity probe for the NestJS API. Independent of API_MODE:
// the app keeps using the mock until modules are switched over (see
// docs/IMPLEMENTATION_PLAN.md, "Moving modules from mock to real").
import { API_BASE_URL } from "./config";

/** Where the probe points: the configured API, or the local default. */
export const DIAGNOSTICS_BASE_URL = API_BASE_URL || "http://localhost:3000/api";

export type ProbeResult = {
  url: string;
  ok: boolean;
  status?: number;
  body?: unknown;
  requestId?: string;
  ms: number;
  /** Set when the browser could not read a response at all (API down, or CORS blocked it). */
  networkError?: string;
};

/** Calls the API the same way the real client does (credentials included, JSON). */
export async function probe(path: string): Promise<ProbeResult> {
  const url = `${DIAGNOSTICS_BASE_URL}${path}`;
  const started = performance.now();
  try {
    const response = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const text = await response.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      // Leave non-JSON bodies as text.
    }
    return {
      url,
      ok: response.ok,
      status: response.status,
      body,
      requestId: response.headers.get("x-request-id") ?? undefined,
      ms: Math.round(performance.now() - started),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      ms: Math.round(performance.now() - started),
      networkError: error instanceof Error ? error.message : String(error),
    };
  }
}

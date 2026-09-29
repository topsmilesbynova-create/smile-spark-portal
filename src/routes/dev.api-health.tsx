import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { API_MODE } from "@/lib/api";
import { DIAGNOSTICS_BASE_URL, probe, type ProbeResult } from "@/lib/api/diagnostics";
import { cn } from "@/lib/utils";

// Developer diagnostics. Exists only in `bun run dev`; production builds return 404.
export const Route = createFileRoute("/dev/api-health")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({
    meta: [{ title: "API connectivity — dev" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: ApiHealth,
});

const probes = [
  ["Liveness", "/health"],
  ["Readiness", "/health/ready"],
] as const;

const probeAll = () => Promise.all(probes.map(([, path]) => probe(path)));

function ApiHealth() {
  const [origin, setOrigin] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ProbeResult[]>();
  const run = async () => {
    setRunning(true);
    setResults(await probeAll());
    setRunning(false);
  };
  useEffect(() => {
    setOrigin(window.location.origin);
    let active = true;
    void probeAll().then((r) => active && setResults(r));
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow">Developer diagnostics</p>
      <h1 className="mt-3 font-display text-4xl">API connectivity</h1>
      <dl className="mt-6 grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
        <dt className="text-muted-foreground">API base URL</dt>
        <dd>
          <code>{DIAGNOSTICS_BASE_URL}</code>
        </dd>
        <dt className="text-muted-foreground">Browser origin</dt>
        <dd>
          <code>{origin}</code>
        </dd>
        <dt className="text-muted-foreground">App data source</dt>
        <dd>
          {API_MODE === "mock"
            ? "Mock API (VITE_API_BASE_URL is empty). This check does not change that."
            : "HTTP API"}
        </dd>
      </dl>
      <Button className="mt-6" onClick={() => void run()} disabled={running}>
        {running ? "Checking…" : "Check again"}
      </Button>
      <div className="mt-8 space-y-4">
        {probes.map(([label], i) => {
          const r = results?.[i];
          return (
            <section key={label} className="border border-border bg-surface p-5" data-probe={label}>
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold">{label}</h2>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs",
                    !r && "border-border text-muted-foreground",
                    r?.ok && "border-success/30 bg-success/10 text-success",
                    r && !r.ok && "border-destructive/30 bg-destructive/10 text-destructive",
                  )}
                  data-testid={`status-${label}`}
                >
                  {!r ? "…" : r.networkError ? "No response" : `HTTP ${r.status}`}
                </span>
              </div>
              {r && (
                <>
                  <p className="mt-2 text-xs text-muted-foreground">
                    GET {r.url} · {r.ms} ms{r.requestId && ` · request ${r.requestId}`}
                  </p>
                  {r.networkError ? (
                    <p className="mt-3 text-sm text-destructive">
                      The browser could not read a response ({r.networkError}). Check that the API
                      is running and that its CORS_ORIGINS includes <code>{origin}</code>.
                    </p>
                  ) : (
                    <pre className="mt-3 overflow-x-auto bg-background p-3 text-xs">
                      {JSON.stringify(r.body, null, 2)}
                    </pre>
                  )}
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

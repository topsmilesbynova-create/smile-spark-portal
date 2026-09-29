import { useEffect, useState } from "react";
import { createFileRoute, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { ApiError } from "@/lib/api/http";
import { getStaffSession, type StaffSession } from "@/lib/auth/client";
import { AdminShell } from "@/components/admin-dashboard";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — TopSmilesNova" },
      { name: "description", content: "TopSmilesNova staff workspace." },
      { property: "og:title", content: "Admin — TopSmilesNova" },
      { property: "og:description", content: "TopSmilesNova staff workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const router = useRouter();
  const [staff, setStaff] = useState<StaffSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pathname === "/admin/login") return;
    let cancelled = false;
    getStaffSession()
      .then((session) => {
        if (!cancelled) {
          setStaff(session);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        if (caught instanceof ApiError && (caught.status === 401 || caught.status === 0)) {
          void router.navigate({
            to: "/admin/login",
            search: { redirect: pathname },
          });
          return;
        }
        setError(caught instanceof Error ? caught.message : "Could not check your session.");
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (pathname === "/admin/login") return <Outlet />;
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="max-w-md text-center text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }
  if (!ready || !staff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </div>
    );
  }
  return (
    <AdminShell staff={staff}>
      <Outlet />
    </AdminShell>
  );
}

import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ApiError } from "@/lib/api/http";
import { loginStaff } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginSearch = { redirect?: string };

function safeNext(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/admin") || value.startsWith("//") || value.startsWith("/admin/login")) {
    return undefined;
  }
  return value;
}

export const Route = createFileRoute("/admin/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: safeNext(search.redirect),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — TopSmilesNova Admin" },
      { name: "description", content: "Staff sign-in for TopSmilesNova." },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const search = Route.useSearch();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await loginStaff(email, password);
      if (search.redirect) await router.history.push(search.redirect);
      else await router.navigate({ to: "/admin" });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Sign-in failed. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md border border-border bg-surface p-8">
        <p className="text-xs tracking-[0.2em] text-primary uppercase">TopSmilesNova</p>
        <h1 className="mt-3 font-display text-4xl">Staff sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Booking data on this screen is still the local demo until the API serves it. Sign-in is
          the live admin account.
        </p>
        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-11"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="min-h-11 w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          <Link to="/" className="underline-offset-4 hover:underline">
            Back to the site
          </Link>
        </p>
      </div>
    </div>
  );
}

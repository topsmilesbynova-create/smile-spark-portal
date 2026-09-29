// Staff sign-in talks to the NestJS API directly.
// Leaving VITE_API_BASE_URL empty keeps every other screen on the mock.
import { API_BASE_URL } from "@/lib/api/config";
import { ApiError } from "@/lib/api/http";

/** Local API when the rest of the app is still on the mock. */
export const AUTH_BASE_URL = API_BASE_URL || "http://localhost:3000/api";

export type StaffRole = "owner" | "staff";

export type StaffSession = {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
  csrfToken: string;
};

type SessionBody = {
  admin: { id: string; email: string; displayName: string; role: StaffRole };
  csrfToken: string;
};

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "The admin service is not reachable. Start the API and try again.");
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, body);
  }
  return body as T;
}

export async function getStaffSession(): Promise<StaffSession> {
  const body = await authRequest<SessionBody>("/admin/me");
  return { ...body.admin, csrfToken: body.csrfToken };
}

export async function loginStaff(email: string, password: string): Promise<StaffSession> {
  const csrf = await authRequest<{ csrfToken: string }>("/auth/csrf");
  const body = await authRequest<SessionBody>("/auth/login", {
    method: "POST",
    headers: { "X-CSRF-Token": csrf.csrfToken },
    body: JSON.stringify({ email, password }),
  });
  return { ...body.admin, csrfToken: body.csrfToken };
}

export async function logoutStaff(csrfToken: string): Promise<void> {
  await authRequest<void>("/admin/logout", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

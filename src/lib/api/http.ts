// REST implementation of TopSmilesApi for the NestJS backend.
// Paths follow the endpoint table in docs/IMPLEMENTATION_PLAN.md and are
// proposed until the backend publishes its OpenAPI document.
import type { TopSmilesApi } from "./client";
import { API_BASE_URL } from "./config";
import type { VisitorEvent } from "./contracts";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    // Admin sessions will use an HTTP-only cookie set by the API.
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    // Non-JSON (e.g. a proxy error page). Never treat it as data.
    if (response.ok) throw new ApiError(response.status, "The server sent an unexpected response.");
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

const get = <T>(path: string) => request<T>(path);
const send = <T>(method: "POST" | "PUT" | "PATCH", path: string, body?: unknown) =>
  request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
const enc = encodeURIComponent;

export const httpApi: TopSmilesApi = {
  public: {
    listServices: () => get("/services"),
    listPaymentMethods: () => get("/payment-methods"),
    getPublishedForm: () => get("/forms/consultation/published"),
    getAvailability: () => get("/availability"),
    getSlots: (date) => get(`/availability/slots?date=${enc(date)}`),
    reserveBookingReference: () => send("POST", "/bookings/reservations"),
    uploadFile: (file, kind) => {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      return request("/uploads", { method: "POST", body });
    },
    createBooking: (req) => send("POST", "/bookings", req),
    getBookingStatus: async (reference) => {
      try {
        return await get(`/bookings/status/${enc(reference)}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    resubmitPaymentProof: (req) =>
      send("POST", `/bookings/status/${enc(req.reference)}/payment-proof`, req),
  },
  admin: {
    listBookings: () => get("/admin/bookings"),
    confirmBooking: (id) => send("POST", `/admin/bookings/${enc(id)}/confirm`),
    rescheduleBooking: (id, req) => send("POST", `/admin/bookings/${enc(id)}/reschedule`, req),
    cancelBooking: (id, req) => send("POST", `/admin/bookings/${enc(id)}/cancel`, req),
    verifyPayment: (id, req) => send("POST", `/admin/bookings/${enc(id)}/payment/verify`, req),
    rejectPayment: (id, req) => send("POST", `/admin/bookings/${enc(id)}/payment/reject`, req),

    listServices: () => get("/admin/services"),
    saveServices: (services) => send("PUT", "/admin/services", services),
    getAvailability: () => get("/admin/availability"),
    saveAvailability: (settings) => send("PUT", "/admin/availability", settings),

    listPaymentMethods: () => get("/admin/payment-methods"),
    savePaymentMethods: (methods) => send("PUT", "/admin/payment-methods", methods),

    getPublishedForm: () => get("/admin/forms/consultation/published"),
    getFormVersion: (version) => get(`/admin/forms/consultation/versions/${version}`),
    getFormDraft: () => get("/admin/forms/consultation/draft"),
    saveFormDraft: (fields) => send("PUT", "/admin/forms/consultation/draft", { fields }),
    publishForm: (fields) => send("POST", "/admin/forms/consultation/publish", { fields }),

    listNotifications: () => get("/admin/notifications"),
    markNotificationsRead: () => send("POST", "/admin/notifications/read"),

    listVisitors: () => get("/admin/visitors"),
    subscribeVisitors: (onEvent) => {
      const source = new EventSource(`${API_BASE_URL}/admin/visitors/stream`, {
        withCredentials: true,
      });
      source.onmessage = (message) => onEvent(JSON.parse(message.data) as VisitorEvent);
      return () => source.close();
    },
  },
};

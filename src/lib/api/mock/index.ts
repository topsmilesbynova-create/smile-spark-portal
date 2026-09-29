// In-browser mock of the TopSmilesNova API. Fictional data only.
// State lives in localStorage (per browser) with an in-memory fallback, so admin
// changes in one screen are visible to the patient flow in the same browser.
import { nowInZone } from "@/lib/datetime";
import type { TopSmilesApi } from "../client";
import type {
  AdminNotification,
  AvailabilitySettings,
  Booking,
  BookingEvent,
  FormDraft,
  FormField,
  NotificationType,
  PaymentMethod,
  PublicBookingStatus,
  PublishedForm,
  Service,
  TimeSlot,
  UploadRef,
  VisitorEvent,
  VisitorSession,
} from "../contracts";
import { isBookableDate } from "@/lib/availability";
import { readStored, removeLegacyKeys, writeStored } from "@/lib/storage";
import {
  seedAvailability,
  seedBookings,
  seedFields,
  seedForm,
  seedNotifications,
  seedPaymentMethods,
  seedServices,
} from "./seed";

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();
const clone = <T>(value: T): T => structuredClone(value);

// ---------- Persistence ----------

removeLegacyKeys();

const memory = new Map<string, unknown>();
const unpersisted = new Set<string>();

function load<T>(key: string, seed: () => T): T {
  if (unpersisted.has(key) || typeof window === "undefined") {
    if (!memory.has(key)) memory.set(key, seed());
    return clone(memory.get(key) as T);
  }
  const stored = readStored<T | undefined>(key, undefined);
  if (stored !== undefined) return stored;
  const value = seed();
  save(key, value);
  return clone(value);
}

function save<T>(key: string, value: T) {
  memory.set(key, clone(value));
  if (writeStored(key, value)) unpersisted.delete(key);
  else {
    // Usually the storage quota being exceeded by uploaded images. Keep the
    // change for this tab so the demo keeps working.
    if (!unpersisted.has(key)) console.warn(`[mock-api] "${key}" kept in memory only`);
    unpersisted.add(key);
  }
}

const store = {
  services: () => load<Service[]>("services", () => seedServices),
  paymentMethods: () => load<PaymentMethod[]>("payment-methods", () => seedPaymentMethods),
  availability: () => load<AvailabilitySettings>("availability", () => seedAvailability),
  forms: () => load<PublishedForm[]>("form-versions", () => [seedForm()]),
  draft: () => load<FormDraft | null>("form-draft", () => null),
  bookings: () => load<Booking[]>("bookings", seedBookings),
  notifications: () => load<AdminNotification[]>("notifications", seedNotifications),
  reservations: () => load<Record<string, string>>("reservations", () => ({})),
  receiptSequence: () => load<number>("receipt-sequence", () => 18),
};

// Uploaded files stay in memory until a booking references them.
const uploads = new Map<string, UploadRef>();

// ---------- Helpers ----------

function fail(message: string): never {
  throw new Error(message);
}

function notify(type: NotificationType, title: string, bookingReference?: string) {
  const items = store.notifications();
  const item: AdminNotification = {
    id: crypto.randomUUID(),
    type,
    title,
    bookingReference,
    createdAt: now(),
    read: false,
  };
  save("notifications", [item, ...items].slice(0, 50));
}

function event(type: BookingEvent["type"], actor: BookingEvent["actor"], message: string) {
  return { at: now(), actor, type, message } satisfies BookingEvent;
}

function updateBooking(id: string, change: (booking: Booking) => Booking): Booking {
  const items = store.bookings();
  const current = items.find((b) => b.id === id) ?? fail("Booking not found");
  const next = { ...change(current), updatedAt: now() };
  save(
    "bookings",
    items.map((b) => (b.id === id ? next : b)),
  );
  return next;
}

function toPublic(booking: Booking): PublicBookingStatus {
  return {
    reference: booking.reference,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    serviceName: booking.serviceName,
    appointment: booking.appointment,
    receipt: booking.receipt,
    amount: booking.payment.amount,
    currency: booking.payment.currency,
    methodName: booking.payment.snapshot?.methodName,
    rejectionReason: booking.payment.rejectionReason,
  };
}

/** Deterministic pseudo-occupancy so the demo calendar shows some full slots. */
function simulatedFull(date: string, time: string) {
  let hash = 0;
  for (const char of date + time) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 4 === 0;
}

function computeSlots(date: string, ignoreBookingId?: string): TimeSlot[] {
  const settings = store.availability();
  if (!isBookableDate(date, settings)) return [];
  const clinicNow = nowInZone(settings.timeZone);
  const taken = new Set(
    store
      .bookings()
      .filter(
        (b) =>
          b.id !== ignoreBookingId &&
          b.appointment.date === date &&
          b.status !== "cancelled" &&
          b.status !== "expired",
      )
      .map((b) => b.appointment.time),
  );
  return [...settings.slotTimes].sort().map((time) => ({
    time,
    available:
      !taken.has(time) &&
      !simulatedFull(date, time) &&
      !(date === clinicNow.date && time <= clinicNow.time),
  }));
}

function assertSlotAvailable(date: string, time: string, ignoreBookingId?: string) {
  const slot = computeSlots(date, ignoreBookingId).find((s) => s.time === time);
  if (!slot?.available) fail("That time is no longer available. Please choose another.");
}

function takeUpload(id: string, kind: UploadRef["kind"]): UploadRef {
  const upload = uploads.get(id);
  if (!upload || upload.kind !== kind) fail("An uploaded file is missing. Please upload it again.");
  return upload;
}

function currentForm() {
  const forms = store.forms();
  return forms[forms.length - 1]!;
}

function validateFields(fields: FormField[]) {
  const ids = new Set<string>();
  for (const field of fields) {
    if (!field.label.trim()) fail("Every question needs a label.");
    if (ids.has(field.id)) fail("Question ids must be unique.");
    ids.add(field.id);
    if (
      ["select", "radio", "checkbox"].includes(field.type) &&
      !field.options?.filter(Boolean).length
    )
      fail(`“${field.label}” needs at least one option.`);
  }
  for (const protectedField of seedFields.filter((f) => f.protected)) {
    const field = fields.find((f) => f.id === protectedField.id);
    if (!field)
      fail(`“${protectedField.label}” is a protected workflow field and cannot be removed.`);
    if (field.type !== protectedField.type) fail(`“${field.label}” cannot change type.`);
  }
}

// ---------- Simulated visitor presence ----------

const pages = ["/", "/services", "/gallery", "/about", "/contact", "/book", "/booking-policies"];
const listeners = new Set<(event: VisitorEvent) => void>();
let visitors: VisitorSession[] | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

function initialVisitors(): VisitorSession[] {
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
  return [
    {
      id: "v-a7f2",
      label: "Visitor A7F2",
      currentPath: "/services",
      arrivedAt: minutesAgo(4),
      lastSeenAt: minutesAgo(0),
      state: "active",
    },
    {
      id: "v-c19b",
      label: "Visitor C19B",
      currentPath: "/book",
      arrivedAt: minutesAgo(6),
      lastSeenAt: minutesAgo(1),
      state: "active",
    },
    {
      id: "v-8d44",
      label: "Visitor 8D44",
      currentPath: "/gallery",
      arrivedAt: minutesAgo(12),
      lastSeenAt: minutesAgo(9),
      state: "offline",
    },
  ];
}

function emit(event: VisitorEvent) {
  for (const listener of listeners) listener(event);
}

function scheduleArrival(ms: number) {
  timer = setTimeout(() => {
    const list = visitors ?? initialVisitors();
    const label = Math.floor(Math.random() * 0xffff)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0");
    const visitor: VisitorSession = {
      id: `v-${label.toLowerCase()}-${Date.now()}`,
      label: `Visitor ${label}`,
      currentPath: pages[Math.floor(Math.random() * pages.length)]!,
      arrivedAt: now(),
      lastSeenAt: now(),
      state: "active",
    };
    // Older sessions drift offline so the list stays realistic.
    visitors = [
      visitor,
      ...list.map((v, i) => (i >= 3 ? { ...v, state: "offline" as const } : v)),
    ].slice(0, 12);
    notify("visitor_arrived", `Visitor arrived on ${visitor.currentPath}`);
    emit({ type: "arrived", visitor });
    emit({ type: "snapshot", visitors });
    scheduleArrival(20000 + Math.random() * 15000);
  }, ms);
}

// ---------- API ----------

export const mockApi: TopSmilesApi = {
  public: {
    async listServices() {
      await delay(150);
      return store.services().filter((s) => s.enabled);
    },
    async listPaymentMethods() {
      await delay(150);
      return store.paymentMethods().filter((m) => m.enabled);
    },
    async getPublishedForm() {
      await delay(150);
      return currentForm();
    },
    async getAvailability() {
      await delay(100);
      return store.availability();
    },
    async getSlots(date) {
      await delay(200);
      return computeSlots(date);
    },
    async reserveBookingReference() {
      await delay(150);
      const used = new Set(store.bookings().map((b) => b.reference));
      const reservations = store.reservations();
      let reference: string;
      do reference = `TSN-${Math.floor(10000 + Math.random() * 89999)}`;
      while (used.has(reference) || reservations[reference]);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      save("reservations", { ...reservations, [reference]: expiresAt });
      return { reference, expiresAt };
    },
    async uploadFile(file, kind) {
      if (!file.type.startsWith("image/")) fail("Please upload an image file.");
      if (file.size > 10 * 1024 * 1024) fail("Images must be 10 MB or smaller.");
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("The file could not be read."));
        reader.readAsDataURL(file);
      });
      await delay(400);
      const upload: UploadRef = {
        id: crypto.randomUUID(),
        kind,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        url,
      };
      uploads.set(upload.id, upload);
      return upload;
    },
    async createBooking(request) {
      await delay(600);
      const service =
        store.services().find((s) => s.id === request.serviceId && s.enabled) ??
        fail("This service is no longer available.");
      const reservations = store.reservations();
      if (!reservations[request.reference])
        fail("Your booking reference has expired. Please try again.");
      if (store.bookings().some((b) => b.reference === request.reference))
        fail("This booking has already been submitted.");
      assertSlotAvailable(request.appointment.date, request.appointment.time);
      const form = store.forms().find((f) => f.version === request.formVersion);
      if (!form) fail("The consultation form has changed. Please review your answers.");

      const requiresPayment = service.fee > 0;
      let snapshot: Booking["payment"]["snapshot"];
      let proof: UploadRef | undefined;
      if (requiresPayment) {
        const paymentRequest =
          request.payment ?? fail("Payment proof is required for this service.");
        const method =
          store.paymentMethods().find((m) => m.id === paymentRequest.methodId && m.enabled) ??
          fail("That payment method is no longer available.");
        proof = takeUpload(paymentRequest.proofId, "payment_proof");
        snapshot = {
          methodId: method.id,
          methodName: method.name,
          accountHolder: method.accountHolder,
          identifier: method.identifier,
          instructions: method.instructions,
          amount: service.fee,
          currency: service.currency,
          capturedAt: now(),
        };
      }
      const photos = request.photoIds.map((id) => takeUpload(id, "dental_photo"));
      const activity = [event("created", "patient", "Booking request submitted")];
      if (proof) activity.push(event("proof_submitted", "patient", "Payment proof uploaded"));

      const booking: Booking = {
        id: crypto.randomUUID(),
        reference: request.reference,
        createdAt: now(),
        updatedAt: now(),
        status: requiresPayment ? "payment_under_review" : "pending_review",
        paymentStatus: requiresPayment ? "proof_submitted" : "not_required",
        serviceId: service.id,
        serviceName: service.name,
        appointment: { ...request.appointment, timeZone: store.availability().timeZone },
        patient: request.patient,
        answers: request.answers,
        formVersion: request.formVersion,
        photos,
        payment: {
          amount: service.fee,
          currency: service.currency,
          paymentLabel: service.paymentLabel,
          snapshot,
          proof,
          transactionRef: request.payment?.transactionRef || undefined,
          payerName: request.payment?.payerName || undefined,
          submittedAt: proof ? now() : undefined,
        },
        activity,
      };
      save("bookings", [booking, ...store.bookings()]);
      delete reservations[request.reference];
      save("reservations", reservations);
      for (const photo of photos) uploads.delete(photo.id);
      if (proof) uploads.delete(proof.id);
      notify("booking_created", "New booking request", booking.reference);
      if (proof) notify("proof_submitted", "New payment proof", booking.reference);
      return toPublic(booking);
    },
    async getBookingStatus(reference) {
      await delay(250);
      const booking = store
        .bookings()
        .find((b) => b.reference.toLowerCase() === reference.trim().toLowerCase());
      return booking ? toPublic(booking) : null;
    },
    async resubmitPaymentProof(request) {
      await delay(500);
      const booking =
        store.bookings().find((b) => b.reference === request.reference) ??
        fail("Booking not found");
      if (booking.paymentStatus !== "rejected") fail("This booking is not waiting for new proof.");
      const proof = takeUpload(request.proofId, "payment_proof");
      const next = updateBooking(booking.id, (b) => ({
        ...b,
        status: "payment_under_review",
        paymentStatus: "proof_submitted",
        payment: {
          ...b.payment,
          proof,
          transactionRef: request.transactionRef || b.payment.transactionRef,
          payerName: request.payerName || b.payment.payerName,
          submittedAt: now(),
          rejectionReason: undefined,
        },
        activity: [
          ...b.activity,
          event("proof_resubmitted", "patient", "New payment proof uploaded"),
        ],
      }));
      uploads.delete(proof.id);
      notify("proof_submitted", "Payment proof resubmitted", next.reference);
      return toPublic(next);
    },
  },

  admin: {
    async listBookings() {
      await delay();
      return store.bookings();
    },
    async confirmBooking(id) {
      await delay();
      return updateBooking(id, (b) => {
        if (b.paymentStatus !== "verified" && b.paymentStatus !== "not_required")
          fail("Verify the payment before confirming this booking.");
        if (b.status === "cancelled" || b.status === "expired") fail("This booking is closed.");
        return {
          ...b,
          status: "confirmed",
          activity: [...b.activity, event("confirmed", "staff", "Appointment confirmed")],
        };
      });
    },
    async rescheduleBooking(id, request) {
      await delay();
      assertSlotAvailable(request.date, request.time, id);
      return updateBooking(id, (b) => ({
        ...b,
        appointment: { ...b.appointment, date: request.date, time: request.time },
        staffNote: request.note || b.staffNote,
        activity: [
          ...b.activity,
          event(
            "rescheduled",
            "staff",
            `Rescheduled to ${request.date} ${request.time}${request.note ? ` · ${request.note}` : ""}`,
          ),
        ],
      }));
    },
    async cancelBooking(id, request) {
      await delay();
      return updateBooking(id, (b) => ({
        ...b,
        status: "cancelled",
        staffNote: request.reason || "Cancelled by clinic",
        activity: [
          ...b.activity,
          event("cancelled", "staff", request.reason || "Cancelled by clinic"),
        ],
      }));
    },
    async verifyPayment(id, request) {
      await delay();
      const sequence = store.receiptSequence() + 1;
      const next = updateBooking(id, (b) => {
        if (b.paymentStatus !== "proof_submitted") fail("There is no submitted proof to verify.");
        const receipt = {
          number: `RCP-${String(sequence).padStart(6, "0")}`,
          bookingReference: b.reference,
          patientName: b.patient.fullName,
          serviceName: b.serviceName,
          amount: b.payment.amount,
          currency: b.payment.currency,
          methodName: b.payment.snapshot?.methodName ?? "Manual payment",
          issuedAt: now(),
        };
        // Verifying payment and confirming the appointment are separate staff decisions:
        // the booking returns to review until someone confirms it.
        return {
          ...b,
          status: "pending_review",
          paymentStatus: "verified",
          payment: {
            ...b.payment,
            verifiedAt: now(),
            verificationNotes: request.notes || undefined,
          },
          receipt,
          activity: [
            ...b.activity,
            event(
              "payment_verified",
              "staff",
              `Payment verified · receipt ${receipt.number} issued`,
            ),
          ],
        };
      });
      save("receipt-sequence", sequence);
      notify("payment_verified", "Payment verified", next.reference);
      return next;
    },
    async rejectPayment(id, request) {
      await delay();
      const reason = request.reason.trim() || fail("A rejection reason is required.");
      const next = updateBooking(id, (b) => {
        if (b.paymentStatus !== "proof_submitted") fail("There is no submitted proof to reject.");
        return {
          ...b,
          status: "action_needed",
          paymentStatus: "rejected",
          payment: { ...b.payment, rejectionReason: reason },
          activity: [...b.activity, event("proof_rejected", "staff", `Proof rejected: ${reason}`)],
        };
      });
      notify("proof_rejected", "Payment proof rejected", next.reference);
      return next;
    },

    async listServices() {
      await delay(150);
      return store.services();
    },
    async saveServices(services) {
      await delay();
      for (const s of services) {
        if (!s.name.trim()) fail("Every service needs a name.");
        if (!(s.duration > 0)) fail(`“${s.name}” needs a duration.`);
        if (!(s.fee >= 0)) fail(`“${s.name}” has an invalid fee.`);
        if (!/^[A-Z]{3}$/.test(s.currency)) fail(`“${s.name}” needs a 3-letter currency code.`);
      }
      const normalised = services.map((s) => ({
        ...s,
        paymentLabel:
          s.fee === 0
            ? ("Free" as const)
            : s.paymentLabel === "Free"
              ? ("Consultation fee" as const)
              : s.paymentLabel,
      }));
      save("services", normalised);
      return normalised;
    },
    async getAvailability() {
      await delay(100);
      return store.availability();
    },
    async saveAvailability(settings) {
      await delay();
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: settings.timeZone });
      } catch {
        fail("Enter a valid IANA time zone, such as America/New_York.");
      }
      if (settings.slotTimes.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))
        fail("Slot times must use 24-hour HH:mm, e.g. 09:00, 14:30.");
      if (settings.blackoutDates.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d)))
        fail("Blackout dates must use YYYY-MM-DD.");
      if (!settings.workingDays.length) fail("Choose at least one working day.");
      const clean = { ...settings, slotTimes: [...new Set(settings.slotTimes)].sort() };
      save("availability", clean);
      return clean;
    },

    async listPaymentMethods() {
      await delay(150);
      return store.paymentMethods();
    },
    async savePaymentMethods(methods) {
      await delay();
      for (const m of methods) {
        if (!m.name.trim()) fail("Every payment method needs a name.");
        if (m.enabled && (!m.identifier.trim() || !m.accountHolder.trim()))
          fail(`“${m.name}” needs an account holder and identifier before it can be enabled.`);
      }
      // Existing bookings keep their own instruction snapshot, so this never rewrites history.
      save("payment-methods", methods);
      return methods;
    },

    async getPublishedForm() {
      await delay(150);
      return currentForm();
    },
    async getFormVersion(version) {
      await delay(100);
      return store.forms().find((f) => f.version === version) ?? null;
    },
    async getFormDraft() {
      await delay(100);
      return store.draft();
    },
    async saveFormDraft(fields) {
      await delay();
      const draft: FormDraft = { fields, basedOnVersion: currentForm().version, savedAt: now() };
      save("form-draft", draft);
      return draft;
    },
    async publishForm(fields) {
      await delay();
      validateFields(fields);
      const forms = store.forms();
      const form: PublishedForm = {
        version: currentForm().version + 1,
        fields: fields.map((f) => ({ ...f, options: f.options?.filter(Boolean) })),
        publishedAt: now(),
      };
      // Earlier versions are kept so existing bookings show the questions they answered.
      save("form-versions", [...forms, form]);
      save("form-draft", null);
      return form;
    },

    async listNotifications() {
      await delay(100);
      return store.notifications();
    },
    async markNotificationsRead() {
      await delay(100);
      save(
        "notifications",
        store.notifications().map((n) => ({ ...n, read: true })),
      );
    },

    async listVisitors() {
      await delay(100);
      return visitors ?? initialVisitors();
    },
    subscribeVisitors(onEvent) {
      visitors ??= initialVisitors();
      listeners.add(onEvent);
      onEvent({ type: "snapshot", visitors });
      if (listeners.size === 1) scheduleArrival(4000);
      return () => {
        listeners.delete(onEvent);
        if (!listeners.size && timer) {
          clearTimeout(timer);
          timer = undefined;
        }
      };
    },
  },
};

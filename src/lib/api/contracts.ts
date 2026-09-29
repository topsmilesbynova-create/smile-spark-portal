// Typed contracts shared by the mock API and the future NestJS REST API.
// Keep these in step with the backend DTOs; see docs/IMPLEMENTATION_PLAN.md.

// ---------- Status codes ----------

export type BookingStatus =
  | "pending_review"
  | "awaiting_payment"
  | "payment_under_review"
  | "action_needed"
  | "confirmed"
  | "cancelled"
  | "expired";

export type PaymentStatus =
  "not_required" | "awaiting_proof" | "proof_submitted" | "verified" | "rejected";

export type StatusTone = "good" | "warning" | "bad" | "neutral";

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending_review: "Under review",
  awaiting_payment: "Awaiting payment",
  payment_under_review: "Payment under review",
  action_needed: "Action needed",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  not_required: "Not required",
  awaiting_proof: "Awaiting proof",
  proof_submitted: "Proof submitted",
  verified: "Verified",
  rejected: "Proof rejected",
};

export const statusTones: Record<BookingStatus | PaymentStatus, StatusTone> = {
  pending_review: "warning",
  awaiting_payment: "warning",
  payment_under_review: "warning",
  action_needed: "bad",
  confirmed: "good",
  cancelled: "bad",
  expired: "bad",
  not_required: "neutral",
  awaiting_proof: "warning",
  proof_submitted: "warning",
  verified: "good",
  rejected: "bad",
};

export const bookingStatuses = Object.keys(bookingStatusLabels) as BookingStatus[];

// ---------- Catalogue and settings ----------

export type PaymentLabel = "Consultation fee" | "Deposit" | "Down payment" | "Free";

export type Service = {
  id: string;
  name: string;
  description: string;
  /** Minutes. */
  duration: number;
  format: string;
  /** Amount due at booking in major units. 0 means no payment is required. */
  fee: number;
  currency: string;
  paymentLabel: PaymentLabel;
  enabled: boolean;
};

export type PaymentMethod = {
  id: string;
  name: string;
  accountHolder: string;
  /** Cash App tag, Zelle email/phone, or account identifier shown to the patient. */
  identifier: string;
  instructions: string;
  enabled: boolean;
};

/** What the patient was shown when they paid. Never changes after capture. */
export type PaymentInstructionSnapshot = {
  methodId: string;
  methodName: string;
  accountHolder: string;
  identifier: string;
  instructions: string;
  amount: number;
  currency: string;
  capturedAt: string;
};

export type AvailabilitySettings = {
  /** IANA time zone, e.g. America/New_York. Slot times are wall-clock times in this zone. */
  timeZone: string;
  /** 0 = Sunday … 6 = Saturday. */
  workingDays: number[];
  /** "HH:mm", clinic local time. */
  slotTimes: string[];
  /** "YYYY-MM-DD", clinic local date. */
  blackoutDates: string[];
  /** How far ahead patients can book. */
  bookingWindowDays: number;
};

export type TimeSlot = { time: string; available: boolean };

// ---------- Consultation form ----------

export type FieldType =
  "text" | "textarea" | "select" | "radio" | "checkbox" | "date" | "consent" | "file";

export const fieldTypes: FieldType[] = [
  "text",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "date",
  "consent",
  "file",
];

export type FormField = {
  id: string;
  label: string;
  help?: string;
  type: FieldType;
  required: boolean;
  visible: boolean;
  /** Essential workflow fields cannot be deleted or change type. */
  protected?: boolean;
  options?: string[];
};

export type PublishedForm = { version: number; fields: FormField[]; publishedAt: string };

export type FormDraft = { fields: FormField[]; basedOnVersion: number; savedAt: string };

export type AnswerValue = string | string[] | boolean;

// ---------- Uploads ----------

export type UploadKind = "dental_photo" | "payment_proof";

export type UploadRef = {
  id: string;
  kind: UploadKind;
  fileName: string;
  contentType: string;
  size: number;
  /** Mock: data URL. Backend: short-lived signed URL. */
  url: string;
};

// ---------- Bookings ----------

export type Appointment = { date: string; time: string; timeZone: string };

export type PatientContact = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
};

export type Receipt = {
  number: string;
  bookingReference: string;
  patientName: string;
  serviceName: string;
  amount: number;
  currency: string;
  methodName: string;
  issuedAt: string;
};

export type BookingEvent = {
  at: string;
  actor: "patient" | "staff" | "system";
  type:
    | "created"
    | "proof_submitted"
    | "proof_rejected"
    | "proof_resubmitted"
    | "payment_verified"
    | "confirmed"
    | "rescheduled"
    | "cancelled"
    | "expired";
  message: string;
};

export type BookingPayment = {
  amount: number;
  currency: string;
  paymentLabel: PaymentLabel;
  snapshot?: PaymentInstructionSnapshot;
  proof?: UploadRef;
  transactionRef?: string;
  payerName?: string;
  submittedAt?: string;
  rejectionReason?: string;
  verifiedAt?: string;
  verificationNotes?: string;
};

export type Booking = {
  id: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  serviceId: string;
  serviceName: string;
  appointment: Appointment;
  patient: PatientContact;
  /** Keyed by FormField.id of the form version the patient saw. */
  answers: Record<string, AnswerValue>;
  formVersion: number;
  photos: UploadRef[];
  payment: BookingPayment;
  receipt?: Receipt;
  activity: BookingEvent[];
  staffNote?: string;
};

/** What the public status page may see. Excludes contact details, answers and photos. */
export type PublicBookingStatus = Pick<
  Booking,
  "reference" | "status" | "paymentStatus" | "serviceName" | "appointment" | "receipt"
> & {
  amount: number;
  currency: string;
  methodName?: string;
  rejectionReason?: string;
};

// ---------- Admin notifications and presence ----------

export type NotificationType =
  "booking_created" | "proof_submitted" | "proof_rejected" | "payment_verified" | "visitor_arrived";

export type AdminNotification = {
  id: string;
  type: NotificationType;
  title: string;
  bookingReference?: string;
  createdAt: string;
  read: boolean;
};

export type VisitorSession = {
  id: string;
  /** Anonymous label. Never a name, email, or IP address. */
  label: string;
  currentPath: string;
  arrivedAt: string;
  lastSeenAt: string;
  state: "active" | "offline";
};

export type VisitorEvent =
  { type: "snapshot"; visitors: VisitorSession[] } | { type: "arrived"; visitor: VisitorSession };

// ---------- Requests ----------

export type ReservedReference = { reference: string; expiresAt: string };

export type CreateBookingRequest = {
  reference: string;
  serviceId: string;
  appointment: { date: string; time: string };
  patient: PatientContact;
  answers: Record<string, AnswerValue>;
  formVersion: number;
  photoIds: string[];
  consentAccepted: true;
  policyAccepted: true;
  payment?: {
    methodId: string;
    proofId: string;
    transactionRef?: string;
    payerName?: string;
  };
};

export type SubmitPaymentProofRequest = {
  reference: string;
  proofId: string;
  transactionRef?: string;
  payerName?: string;
};

export type RescheduleBookingRequest = { date: string; time: string; note?: string };
export type CancelBookingRequest = { reason?: string };
export type VerifyPaymentRequest = { notes?: string };
export type RejectPaymentRequest = { reason: string };

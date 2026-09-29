// Fictional demo data only. Identifiers, names and contact details are invented.
import { addDays, format, subMinutes } from "date-fns";
import type {
  AdminNotification,
  AvailabilitySettings,
  Booking,
  FormField,
  PaymentMethod,
  PublishedForm,
  Service,
  UploadRef,
} from "../contracts";

const veneer = (id: string, count: 10 | 20, material: "composite" | "porcelain"): Service => ({
  id,
  name: `${count} ${material}`,
  description: `${count} ${material} veneers. A $500 down payment schedules the appointment and is not the full treatment price.`,
  duration: 60,
  format: "In clinic",
  fee: 500,
  currency: "USD",
  paymentLabel: "Down payment",
  enabled: true,
});

export const seedServices: Service[] = [
  veneer("composite-10", 10, "composite"),
  veneer("composite-20", 20, "composite"),
  veneer("porcelain-10", 10, "porcelain"),
  veneer("porcelain-20", 20, "porcelain"),
];

export const seedPaymentMethods: PaymentMethod[] = [
  {
    id: "zelle",
    name: "Zelle",
    accountHolder: "TopSmilesNova Demo",
    identifier: "payments@example.demo",
    instructions:
      "Send the exact $500 down payment and add your booking reference to the memo. This address is fictional.",
    enabled: true,
  },
  {
    id: "cashapp",
    name: "Cash App",
    accountHolder: "TopSmilesNova Demo",
    identifier: "$TSN-DEMO-ONLY",
    instructions:
      "Send the exact $500 down payment and include your booking reference in the note. This tag is fictional.",
    enabled: true,
  },
  {
    id: "chime",
    name: "Chime",
    accountHolder: "TopSmilesNova Demo",
    identifier: "$TSN-CHIME-DEMO",
    instructions:
      "Send the exact $500 down payment and include your booking reference. This tag is fictional.",
    enabled: true,
  },
  {
    id: "applepay",
    name: "Apple Pay",
    accountHolder: "TopSmilesNova Demo",
    identifier: "pay@example.demo",
    instructions:
      "Send the exact $500 down payment and include your booking reference. This address is fictional.",
    enabled: true,
  },
];

export const seedAvailability: AvailabilitySettings = {
  timeZone: "America/New_York",
  workingDays: [1, 2, 3, 4, 5, 6],
  slotTimes: ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"],
  blackoutDates: [],
  bookingWindowDays: 45,
};

/** Fields the booking flow lays out itself. They can be relabelled but not deleted. */
export const seedFields: FormField[] = [
  {
    id: "fullName",
    label: "Full name",
    type: "text",
    required: true,
    visible: true,
    protected: true,
  },
  { id: "email", label: "Email", type: "text", required: true, visible: true, protected: true },
  {
    id: "phone",
    label: "Phone number",
    type: "text",
    required: true,
    visible: true,
    protected: true,
  },
  {
    id: "instagram",
    label: "Instagram handle",
    help: "Your Instagram username, with or without @.",
    type: "text",
    required: true,
    visible: true,
    protected: true,
  },
  { id: "city", label: "City", type: "text", required: false, visible: false, protected: true },
  {
    id: "country",
    label: "Country",
    type: "text",
    required: false,
    visible: false,
    protected: true,
  },
  {
    id: "goals",
    label: "What would you like to change about your smile?",
    help: "Share what matters most to you.",
    type: "textarea",
    required: false,
    visible: false,
    protected: true,
  },
  {
    id: "procedures",
    label: "Previous dental procedures",
    help: "Select all that apply.",
    type: "checkbox",
    required: false,
    visible: false,
    options: ["Braces or aligners", "Veneers", "Implants", "Whitening", "Other"],
  },
  {
    id: "otherProcedure",
    label: "Tell us about the other procedure",
    help: "Shown when “Other” is selected.",
    type: "text",
    required: false,
    visible: false,
  },
  {
    id: "photos",
    label: "Smile photos",
    help: "Add four clear photos of your smile in natural light.",
    type: "file",
    required: true,
    visible: true,
    protected: true,
  },
  {
    id: "consent",
    label: "I consent to the use of my information for this consultation request.",
    type: "consent",
    required: true,
    visible: true,
    protected: true,
  },
];

export const seedForm = (): PublishedForm => ({
  version: 1,
  fields: seedFields,
  publishedAt: subMinutes(new Date(), 60 * 24 * 7).toISOString(),
});

function demoScreenshot(id: string, label: string): UploadRef {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640"><rect width="360" height="640" fill="#181A1E"/><text x="180" y="280" fill="#D6B981" font-family="sans-serif" font-size="22" text-anchor="middle">Demo screenshot</text><text x="180" y="320" fill="#A9ADB5" font-family="sans-serif" font-size="16" text-anchor="middle">${label}</text><text x="180" y="360" fill="#A9ADB5" font-family="sans-serif" font-size="12" text-anchor="middle">Fictional placeholder</text></svg>`;
  return {
    id,
    kind: "payment_proof",
    fileName: `${id}.svg`,
    contentType: "image/svg+xml",
    size: svg.length,
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  };
}

const day = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");
const ago = (minutes: number) => subMinutes(new Date(), minutes).toISOString();

export function seedBookings(): Booking[] {
  const zelle = seedPaymentMethods[0]!;
  const cashApp = seedPaymentMethods[1]!;
  const chime = seedPaymentMethods[2]!;
  const snapshot = (method: PaymentMethod, amount: number, capturedAt: string) => ({
    methodId: method.id,
    methodName: method.name,
    accountHolder: method.accountHolder,
    identifier: method.identifier,
    instructions: method.instructions,
    amount,
    currency: "USD",
    capturedAt,
  });
  return [
    {
      id: "demo-1",
      reference: "TSN-24091",
      createdAt: ago(40),
      updatedAt: ago(3),
      status: "payment_under_review",
      paymentStatus: "proof_submitted",
      serviceId: "composite-10",
      serviceName: "10 composite",
      appointment: { date: day(1), time: "10:30", timeZone: "America/New_York" },
      patient: {
        fullName: "Amara D.",
        email: "amara@example.demo",
        phone: "+1 555 0142",
        city: "",
        country: "",
      },
      answers: { instagram: "amara.demo" },
      formVersion: 1,
      photos: [],
      payment: {
        amount: 500,
        currency: "USD",
        paymentLabel: "Down payment",
        snapshot: snapshot(cashApp, 500, ago(40)),
        proof: demoScreenshot("demo-proof-1", "TSN-24091 · $500"),
        transactionRef: "DEMO-2381",
        submittedAt: ago(3),
      },
      activity: [
        { at: ago(40), actor: "patient", type: "created", message: "Booking request submitted" },
        {
          at: ago(3),
          actor: "patient",
          type: "proof_submitted",
          message: "Payment proof uploaded",
        },
      ],
    },
    {
      id: "demo-2",
      reference: "TSN-24088",
      createdAt: ago(60 * 26),
      updatedAt: ago(18),
      status: "confirmed",
      paymentStatus: "verified",
      serviceId: "porcelain-20",
      serviceName: "20 porcelain",
      appointment: { date: day(1), time: "14:00", timeZone: "America/New_York" },
      patient: {
        fullName: "Jordan K.",
        email: "jordan@example.demo",
        phone: "+1 555 0137",
        city: "",
        country: "",
      },
      answers: { instagram: "jordan.demo" },
      formVersion: 1,
      photos: [],
      payment: {
        amount: 500,
        currency: "USD",
        paymentLabel: "Down payment",
        snapshot: snapshot(zelle, 500, ago(60 * 26)),
        submittedAt: ago(60 * 25),
        verifiedAt: ago(18),
        verificationNotes: "Funds seen in demo account.",
      },
      receipt: {
        number: "RCP-000018",
        bookingReference: "TSN-24088",
        patientName: "Jordan K.",
        serviceName: "20 porcelain",
        amount: 500,
        currency: "USD",
        methodName: "Zelle",
        issuedAt: ago(18),
      },
      activity: [
        {
          at: ago(60 * 26),
          actor: "patient",
          type: "created",
          message: "Booking request submitted",
        },
        {
          at: ago(60 * 25),
          actor: "patient",
          type: "proof_submitted",
          message: "Payment proof uploaded",
        },
        {
          at: ago(18),
          actor: "staff",
          type: "payment_verified",
          message: "Payment verified · receipt RCP-000018 issued",
        },
      ],
    },
    {
      id: "demo-3",
      reference: "TSN-24076",
      createdAt: ago(60 * 30),
      updatedAt: ago(60 * 5),
      status: "action_needed",
      paymentStatus: "rejected",
      serviceId: "composite-20",
      serviceName: "20 composite",
      appointment: { date: day(3), time: "09:00", timeZone: "America/New_York" },
      patient: {
        fullName: "Mina R.",
        email: "mina@example.demo",
        phone: "+1 555 0181",
        city: "",
        country: "",
      },
      answers: { instagram: "mina.demo" },
      formVersion: 1,
      photos: [],
      payment: {
        amount: 500,
        currency: "USD",
        paymentLabel: "Down payment",
        snapshot: snapshot(chime, 500, ago(60 * 30)),
        proof: demoScreenshot("demo-proof-3", "Reference not visible"),
        submittedAt: ago(60 * 29),
        rejectionReason: "The amount and reference are not visible in the screenshot.",
      },
      activity: [
        {
          at: ago(60 * 30),
          actor: "patient",
          type: "created",
          message: "Booking request submitted",
        },
        {
          at: ago(60 * 29),
          actor: "patient",
          type: "proof_submitted",
          message: "Payment proof uploaded",
        },
        {
          at: ago(60 * 5),
          actor: "staff",
          type: "proof_rejected",
          message: "Proof rejected: amount and reference not visible",
        },
      ],
    },
  ];
}

export function seedNotifications(): AdminNotification[] {
  return [
    {
      id: "n-1",
      type: "proof_submitted",
      title: "New payment proof",
      bookingReference: "TSN-24091",
      createdAt: ago(3),
      read: false,
    },
    {
      id: "n-2",
      type: "payment_verified",
      title: "Payment verified",
      bookingReference: "TSN-24088",
      createdAt: ago(18),
      read: false,
    },
    {
      id: "n-3",
      type: "booking_created",
      title: "New booking request",
      bookingReference: "TSN-24091",
      createdAt: ago(40),
      read: true,
    },
  ];
}

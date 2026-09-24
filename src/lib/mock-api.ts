export type BookingStatus = "Awaiting payment" | "Payment under review" | "Action needed" | "Confirmed" | "Cancelled" | "Expired";
export type Service = { id: string; name: string; description: string; duration: number; format: string; fee: number; currency: string; paymentLabel: "Consultation fee" | "Deposit" | "Free"; enabled: boolean };
export type PaymentMethod = { id: string; name: string; accountHolder: string; identifier: string; instructions: string; enabled: boolean };
export type FormField = { id: string; label: string; help?: string; type: "text" | "textarea" | "select" | "radio" | "checkbox" | "date" | "consent" | "file"; required: boolean; visible: boolean; protected?: boolean; options?: string[] };
export type Booking = { id: string; reference: string; patient: string; email: string; phone: string; service: string; date: string; time: string; status: BookingStatus; paymentStatus: string; amount: number; currency: string; method: string; transactionRef?: string; proof?: string; notes?: string; formVersion: number; receipt?: string };

export const services: Service[] = [
  { id: "virtual", name: "Virtual smile consultation", description: "A focused video consultation to discuss your goals and suitable next steps.", duration: 30, format: "Video call", fee: 50, currency: "USD", paymentLabel: "Consultation fee", enabled: true },
  { id: "studio", name: "In-studio smile assessment", description: "An in-person consultation with a guided visual assessment.", duration: 45, format: "In clinic", fee: 100, currency: "USD", paymentLabel: "Deposit", enabled: true },
  { id: "discovery", name: "Introductory discovery call", description: "A brief call to understand which consultation is right for you.", duration: 15, format: "Phone call", fee: 0, currency: "USD", paymentLabel: "Free", enabled: true },
];
export const paymentMethods: PaymentMethod[] = [
  { id: "cashapp", name: "Cash App", accountHolder: "TopSmilesNova Demo", identifier: "$TSN-DEMO-ONLY", instructions: "Send the exact amount and include your booking reference in the note.", enabled: true },
  { id: "bank", name: "Bank transfer", accountHolder: "TopSmilesNova Demo Account", identifier: "DEMO-001-8820", instructions: "Use your booking reference as the transfer description. This identifier is fictional.", enabled: true },
];
export const initialFields: FormField[] = [
  { id: "goals", label: "What would you like to change about your smile?", help: "Share what matters most to you.", type: "textarea", required: true, visible: true, protected: true },
  { id: "procedures", label: "Previous dental procedures", help: "Select all that apply.", type: "checkbox", required: false, visible: true, options: ["Braces or aligners", "Veneers", "Implants", "Whitening", "Other"] },
  { id: "otherProcedure", label: "Tell us about the other procedure", type: "text", required: false, visible: true },
  { id: "photos", label: "Guided dental photos", help: "Add a front smile and side view in clear natural light.", type: "file", required: false, visible: true, protected: true },
  { id: "consent", label: "I consent to the use of my information for this consultation request.", type: "consent", required: true, visible: true, protected: true },
];
export const initialBookings: Booking[] = [
  { id: "1", reference: "TSN-24091", patient: "Amara D.", email: "amara@example.demo", phone: "+1 555 0142", service: "Virtual smile consultation", date: "Sep 25, 2026", time: "10:30 AM", status: "Payment under review", paymentStatus: "Proof submitted", amount: 50, currency: "USD", method: "Cash App", transactionRef: "DEMO-2381", proof: "demo", formVersion: 1 },
  { id: "2", reference: "TSN-24088", patient: "Jordan K.", email: "jordan@example.demo", phone: "+1 555 0137", service: "In-studio smile assessment", date: "Sep 25, 2026", time: "2:00 PM", status: "Confirmed", paymentStatus: "Verified", amount: 100, currency: "USD", method: "Bank transfer", receipt: "RCP-260924-18", formVersion: 1 },
  { id: "3", reference: "TSN-24076", patient: "Mina R.", email: "mina@example.demo", phone: "+1 555 0181", service: "Virtual smile consultation", date: "Sep 27, 2026", time: "9:00 AM", status: "Action needed", paymentStatus: "Proof rejected", amount: 50, currency: "USD", method: "Cash App", notes: "The amount and reference are not visible in the screenshot.", formVersion: 1 },
];

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
const read = <T,>(key: string, fallback: T): T => { if (typeof window === "undefined") return fallback; try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
const write = <T,>(key: string, value: T) => { if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value)); };

export const mockApi = {
  async getBookings() { await delay(); return read("tsn-bookings", initialBookings); },
  async saveBookings(items: Booking[]) { await delay(220); write("tsn-bookings", items); return items; },
  async getServices() { await delay(180); return read("tsn-services", services); },
  async saveServices(items: Service[]) { await delay(220); write("tsn-services", items); return items; },
  async getPaymentMethods() { await delay(180); return read("tsn-payments", paymentMethods); },
  async savePaymentMethods(items: PaymentMethod[]) { await delay(220); write("tsn-payments", items); return items; },
  async getFields() { await delay(180); return read("tsn-fields", initialFields); },
  async saveFields(items: FormField[]) { await delay(220); write("tsn-fields", items); return items; },
  async submitBooking(data: Partial<Booking>) { await delay(700); const reference = `TSN-${Math.floor(10000 + Math.random() * 89999)}`; const booking: Booking = { id: crypto.randomUUID(), reference, patient: data.patient ?? "Guest", email: data.email ?? "", phone: data.phone ?? "", service: data.service ?? "Consultation", date: data.date ?? "To be arranged", time: data.time ?? "", status: data.amount === 0 ? "Confirmed" : "Payment under review", paymentStatus: data.amount === 0 ? "Not required" : "Proof submitted", amount: data.amount ?? 0, currency: data.currency ?? "USD", method: data.method ?? "Not required", formVersion: 1 }; const items = read("tsn-bookings", initialBookings); write("tsn-bookings", [booking, ...items]); return booking; },
};

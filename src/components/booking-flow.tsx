import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel, UploadBox, CopyButton } from "@/components/shared";
import { cn } from "@/lib/utils";
import {
  api,
  type AnswerValue,
  type FormField,
  type PaymentMethod,
  type PublicBookingStatus,
  type Service,
  type UploadRef,
} from "@/lib/api";
import {
  useAvailability,
  usePaymentMethods,
  usePublishedForm,
  useServices,
  useSlots,
} from "@/lib/api/hooks";
import { errorMessage } from "@/lib/api/queries";
import { isBookableDate } from "@/lib/availability";
import { formatDate, formatTime, fromDateKey, toDateKey, zoneAbbreviation } from "@/lib/datetime";
import { readStored, removeStored, writeStored } from "@/lib/storage";

/** Text-only draft kept in this browser. Photos and payment proof are never stored in it. */
type Draft = {
  serviceId: string;
  date?: string;
  time: string;
  fullName: string;
  email: string;
  phone: string;
  instagram: string;
  city: string;
  country: string;
  goals: string;
  procedures: string[];
  otherProcedure: string;
  custom: Record<string, AnswerValue>;
  consent: boolean;
  policy: boolean;
  paymentMethod: string;
  transactionRef: string;
  payerName: string;
  reference?: string;
  referenceExpiresAt?: string;
};
const SMILE_PHOTOS = [
  { key: "front", label: "Front smile" },
  { key: "left", label: "Left side" },
  { key: "right", label: "Right side" },
  { key: "close", label: "Close-up" },
] as const;
type SmilePhotoKey = (typeof SMILE_PHOTOS)[number]["key"];
type Uploads = {
  smile: Partial<Record<SmilePhotoKey, UploadRef>>;
  proof?: UploadRef;
  custom: Record<string, UploadRef>;
};
type Update = <K extends keyof Draft>(key: K, value: Draft[K]) => void;

const DRAFT_KEY = "booking-draft";
const blank: Draft = {
  serviceId: "",
  time: "",
  fullName: "",
  email: "",
  phone: "",
  instagram: "",
  city: "",
  country: "",
  goals: "",
  procedures: [],
  otherProcedure: "",
  custom: {},
  consent: false,
  policy: false,
  paymentMethod: "",
  transactionRef: "",
  payerName: "",
};
/** Fields laid out by this component; everything else in the published form renders generically. */
const CORE_FIELDS = new Set([
  "fullName",
  "email",
  "phone",
  "instagram",
  "city",
  "country",
  "goals",
  "procedures",
  "otherProcedure",
  "photos",
  "consent",
]);
const detailsSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(30),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
  policy: z.literal(true, { errorMap: () => ({ message: "Please accept the booking policies" }) }),
});
const steps = ["Veneers", "Appointment", "Your details", "Payment", "Review"];

function loadDraft(): Draft {
  const saved = readStored<Partial<Draft> | null>(DRAFT_KEY, null);
  if (!saved) return blank;
  const draft = { ...blank, ...saved };
  if (draft.referenceExpiresAt && new Date(draft.referenceExpiresAt) < new Date()) {
    draft.reference = undefined;
    draft.referenceExpiresAt = undefined;
  }
  return draft;
}

function isEmptyAnswer(value: AnswerValue | undefined) {
  return (
    value === undefined ||
    value === false ||
    (Array.isArray(value) ? !value.length : !String(value).trim())
  );
}

export function BookingFlow() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(blank);
  const [loaded, setLoaded] = useState(false);
  const [uploads, setUploads] = useState<Uploads>({ smile: {}, custom: {} });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [booking, setBooking] = useState<PublicBookingStatus>();
  const services = useServices();
  const methods = usePaymentMethods();
  const form = usePublishedForm();
  const availability = useAvailability();
  const slots = useSlots(draft.date);

  useEffect(() => {
    setDraft(loadDraft());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) writeStored(DRAFT_KEY, draft);
  }, [draft, loaded]);

  const service = services.data?.find((s) => s.id === draft.serviceId);
  const enabledMethods = methods.data ?? [];
  const method = enabledMethods.find((m) => m.id === draft.paymentMethod) ?? enabledMethods[0];
  const free = service?.fee === 0;
  const timeZone = availability.data?.timeZone;
  const update: Update = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  // The reference is issued before payment so the patient can quote it in the transfer note.
  const needsReference = (step === 3 || step === 4) && !draft.reference;
  useEffect(() => {
    if (!needsReference) return;
    let active = true;
    api.public
      .reserveBookingReference()
      .then((r) => {
        if (active)
          setDraft((d) => ({ ...d, reference: r.reference, referenceExpiresAt: r.expiresAt }));
      })
      .catch((error: unknown) => toast.error(errorMessage(error)));
    return () => {
      active = false;
    };
  }, [needsReference]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (step === 0 && !service) next.serviceId = "Choose a veneer type to continue";
    if (step === 1) {
      if (!draft.date) next.date = "Choose a date";
      if (!draft.time) next.time = "Choose an available time";
      else if (slots.data && !slots.data.some((s) => s.time === draft.time && s.available))
        next.time = "That time is no longer available";
    }
    if (step === 2) {
      const result = detailsSchema.safeParse(draft);
      if (!result.success)
        result.error.issues.forEach((i) => (next[String(i.path[0])] = i.message));
      const published = form.data?.fields ?? [];
      const shown = (id: string) => published.find((f) => f.id === id)?.visible !== false;
      if (shown("instagram")) {
        const handle = draft.instagram.trim().replace(/^@+/, "");
        if (!handle) next.instagram = "Enter your Instagram handle";
        else if (handle.length > 30 || !/^[A-Za-z0-9._]+$/.test(handle))
          next.instagram = "Use only letters, numbers, periods, and underscores";
      }
      if (shown("city") && draft.city.trim().length < 2) next.city = "Enter your city";
      if (shown("country") && draft.country.trim().length < 2) next.country = "Enter your country";
      if (shown("goals") && draft.goals.trim().length < 10)
        next.goals = "Tell us a little more about your goals";
      const otherVisible = published.some((f) => f.id === "otherProcedure" && f.visible);
      if (otherVisible && draft.procedures.includes("Other") && !draft.otherProcedure.trim())
        next.otherProcedure = "Tell us which procedure";
      const photos = published.find((f) => f.id === "photos");
      if (photos?.visible !== false && photos?.required) {
        for (const slot of SMILE_PHOTOS) {
          if (!uploads.smile[slot.key])
            next[`photo.${slot.key}`] = `Add a ${slot.label.toLowerCase()} photo`;
        }
      }
      for (const field of customFields(form.data?.fields)) {
        const value = field.type === "file" ? uploads.custom[field.id]?.id : draft.custom[field.id];
        if (field.required && isEmptyAnswer(value))
          next[`custom.${field.id}`] = "This field is required";
      }
    }
    if (step === 3 && !free) {
      if (!method)
        next.paymentMethod = "No payment method is available. Please contact the clinic.";
      if (!uploads.proof) next.paymentProof = "Upload payment proof to continue";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const next = () => {
    if (!validate()) return;
    if (step === 2 && free) setStep(4);
    else setStep((s) => Math.min(4, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    if (step === 4 && free) setStep(2);
    else setStep((s) => Math.max(0, s - 1));
  };
  const submit = async () => {
    if (!service || !draft.date || !draft.reference || !form.data) return;
    if (!free && (!method || !uploads.proof)) {
      setStep(3);
      return;
    }
    setSending(true);
    try {
      const answers: Record<string, AnswerValue> = {
        instagram: draft.instagram.trim().replace(/^@+/, ""),
      };
      if (draft.goals.trim()) answers.goals = draft.goals.trim();
      if (draft.procedures.length) answers.procedures = draft.procedures;
      if (draft.procedures.includes("Other")) answers.otherProcedure = draft.otherProcedure.trim();
      for (const field of customFields(form.data.fields)) {
        const value =
          field.type === "file" ? uploads.custom[field.id]?.fileName : draft.custom[field.id];
        if (value !== undefined && !isEmptyAnswer(value)) answers[field.id] = value;
      }
      const item = await api.public.createBooking({
        reference: draft.reference,
        serviceId: service.id,
        appointment: { date: draft.date, time: draft.time },
        patient: {
          fullName: draft.fullName.trim(),
          email: draft.email.trim(),
          phone: draft.phone.trim(),
          city: draft.city.trim(),
          country: draft.country.trim(),
        },
        answers,
        formVersion: form.data.version,
        photoIds: [
          ...SMILE_PHOTOS.map((slot) => uploads.smile[slot.key]),
          ...Object.values(uploads.custom),
        ]
          .filter((u): u is UploadRef => Boolean(u))
          .map((u) => u.id),
        consentAccepted: true,
        policyAccepted: true,
        payment:
          free || !method || !uploads.proof
            ? undefined
            : {
                methodId: method.id,
                proofId: uploads.proof.id,
                transactionRef: draft.transactionRef.trim() || undefined,
                payerName: draft.payerName.trim() || undefined,
              },
      });
      setBooking(item);
      removeStored(DRAFT_KEY);
      void queryClient.invalidateQueries({ queryKey: ["slots"] });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  if (booking) {
    const paid = booking.paymentStatus !== "not_required";
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
          <Check className="size-7" />
        </div>
        <p className="eyebrow mt-8">Request received · {booking.reference}</p>
        <h1 className="mt-4 font-display text-5xl">Your booking is under review.</h1>
        <p className="mx-auto mt-5 max-w-xl leading-7 text-muted-foreground">
          {paid
            ? "Your booking request and payment proof have been submitted for review."
            : "Your booking request has been submitted for review."}
        </p>
        <div className="mt-9 border border-border bg-surface p-6 text-left">
          <p className="text-sm text-muted-foreground">
            {paid
              ? "This is a submission acknowledgement, not a verified payment receipt. Confirmation follows after review."
              : "This is a submission acknowledgement. Confirmation follows after review."}
          </p>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild>
            <Link to="/booking-status" search={{ ref: booking.reference }}>
              View booking status
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Return home</Link>
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-8 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Schedule your veneers</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">Book your appointment</h1>
        </div>
        {timeZone && (
          <p className="text-sm text-muted-foreground">
            Clinic time zone: {timeZone} ({zoneAbbreviation(timeZone)})
          </p>
        )}
      </div>
      <div className="my-8 grid grid-cols-5 gap-1" aria-label="Booking progress">
        {steps.map((s, i) => (
          <div key={s}>
            <div className={cn("h-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
            <p
              className={cn(
                "mt-2 hidden text-xs sm:block",
                i === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {i + 1}. {s}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <section className="min-w-0">
          <h2 className="font-display text-3xl">{steps[step]}</h2>
          <div className="mt-7">
            {step === 0 && (
              <div className="grid gap-4">
                {services.isPending &&
                  [0, 1, 2].map((i) => (
                    <div key={i} className="h-40 animate-pulse rounded-md bg-surface" />
                  ))}
                {services.isError && (
                  <ErrorText>Services could not be loaded. Please refresh.</ErrorText>
                )}
                {services.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No veneer options are open for booking right now.
                  </p>
                )}
                {services.data?.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => update("serviceId", s.id)}
                    className={cn(
                      "w-full rounded-md border p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      draft.serviceId === s.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <h3 className="font-display text-2xl">{s.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {s.description}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "mt-1 size-5 shrink-0 rounded-full border",
                          draft.serviceId === s.id && "border-[6px] border-primary",
                        )}
                      />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-3 py-1">{s.duration} min</span>
                      <span className="rounded-full bg-muted px-3 py-1">{s.format}</span>
                      <span className="rounded-full bg-muted px-3 py-1">
                        {s.fee
                          ? `${s.paymentLabel}: $${s.fee} ${s.currency}`
                          : "No payment required"}
                      </span>
                    </div>
                  </button>
                ))}
                <p className="text-sm text-muted-foreground">
                  A $500 down payment schedules the appointment. It is not the full treatment price.
                </p>
                {errors.serviceId && <ErrorText>{errors.serviceId}</ErrorText>}
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <FieldLabel required>Choose a date</FieldLabel>
                  <div className="overflow-x-auto border border-border bg-surface p-2">
                    <Calendar
                      mode="single"
                      selected={draft.date ? fromDateKey(draft.date) : undefined}
                      onSelect={(d) => {
                        update("date", d ? toDateKey(d) : undefined);
                        update("time", "");
                      }}
                      disabled={(d) =>
                        !availability.data || !isBookableDate(toDateKey(d), availability.data)
                      }
                      className="mx-auto"
                    />
                  </div>
                  {errors.date && <ErrorText>{errors.date}</ErrorText>}
                </div>
                <div>
                  <FieldLabel required>Available times</FieldLabel>
                  {!draft.date ? (
                    <div className="flex min-h-60 items-center justify-center border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Choose a date to see its available times.
                    </div>
                  ) : slots.isPending ? (
                    <div className="flex min-h-60 items-center justify-center text-muted-foreground">
                      <Loader2 className="animate-spin" />
                    </div>
                  ) : slots.isError ? (
                    <ErrorText>Times could not be loaded. Please choose the date again.</ErrorText>
                  ) : !slots.data?.some((s) => s.available) ? (
                    <div className="flex min-h-60 items-center justify-center border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No times are available on this date. Please choose another day.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {slots.data.map((slot) => (
                        <Button
                          type="button"
                          key={slot.time}
                          variant={draft.time === slot.time ? "default" : "outline"}
                          disabled={!slot.available}
                          onClick={() => update("time", slot.time)}
                          className="h-12"
                        >
                          {formatTime(slot.time)}
                          {!slot.available && " · Full"}
                        </Button>
                      ))}
                    </div>
                  )}
                  {errors.time && <ErrorText>{errors.time}</ErrorText>}
                  {timeZone && (
                    <p className="mt-5 text-xs text-muted-foreground">
                      All appointment times are shown in {timeZone} ({zoneAbbreviation(timeZone)}).
                    </p>
                  )}
                </div>
              </div>
            )}
            {step === 2 &&
              (form.data ? (
                <DetailsStep
                  draft={draft}
                  update={update}
                  errors={errors}
                  fields={form.data.fields}
                  uploads={uploads}
                  setUploads={setUploads}
                />
              ) : form.isError ? (
                <ErrorText>The consultation form could not be loaded. Please refresh.</ErrorText>
              ) : (
                <div className="h-96 animate-pulse bg-surface" />
              ))}
            {step === 3 && !free && (
              <div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {enabledMethods.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => update("paymentMethod", m.id)}
                      className={cn(
                        "rounded-md border p-4 text-left",
                        method?.id === m.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-surface",
                      )}
                    >
                      <CreditCard className="mb-5 text-primary" />
                      <p className="font-semibold">{m.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Manual transfer</p>
                    </button>
                  ))}
                </div>
                {errors.paymentMethod && <ErrorText>{errors.paymentMethod}</ErrorText>}
                {method && (
                  <div className="mt-6 border border-border bg-surface p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="eyebrow">Send exactly</p>
                        <p className="mt-2 font-display text-4xl">
                          ${service?.fee} {service?.currency}
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs">
                        Reference: {draft.reference ?? "Generating…"}
                      </span>
                    </div>
                    <dl className="mt-6 grid gap-4 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Account holder</dt>
                        <dd className="mt-1">{method.accountHolder}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{method.name} identifier</dt>
                        <dd className="mt-1 flex items-center justify-between gap-3">
                          <code>{method.identifier}</code>
                          <CopyButton value={method.identifier} />
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-5 border-t border-border pt-5 text-sm leading-6 text-muted-foreground">
                      {method.instructions}
                    </p>
                  </div>
                )}
                <div className="mt-6">
                  <FieldLabel required>Payment screenshot</FieldLabel>
                  <UploadBox
                    label="Upload payment screenshot"
                    kind="payment_proof"
                    value={uploads.proof}
                    onChange={(v) => setUploads((u) => ({ ...u, proof: v }))}
                  />
                  {errors.paymentProof && <ErrorText>{errors.paymentProof}</ErrorText>}
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Transaction reference (optional)</FieldLabel>
                      <Input
                        value={draft.transactionRef}
                        maxLength={100}
                        onChange={(e) => update("transactionRef", e.target.value)}
                      />
                    </div>
                    <div>
                      <FieldLabel>Payer name, if different</FieldLabel>
                      <Input
                        value={draft.payerName}
                        maxLength={100}
                        onChange={(e) => update("payerName", e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="mt-4 flex gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="size-4 shrink-0 text-primary" /> Uploading proof does
                    not verify payment. Staff must confirm funds arrived.
                  </p>
                </div>
              </div>
            )}
            {step === 4 && (
              <Review
                draft={draft}
                service={service}
                method={method}
                proof={uploads.proof}
                free={Boolean(free)}
              />
            )}
          </div>
          <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
            <Button variant="ghost" size="lg" onClick={back} disabled={step === 0}>
              <ArrowLeft /> Back
            </Button>
            {step < 4 ? (
              <Button size="lg" onClick={next}>
                Continue <ArrowRight />
              </Button>
            ) : (
              <Button size="lg" onClick={submit} disabled={sending || !draft.reference}>
                {sending ? "Submitting…" : "Submit booking request"}
              </Button>
            )}
          </div>
        </section>
        <Summary draft={draft} service={service} />
      </div>
    </div>
  );
}
function customFields(fields: FormField[] = []) {
  return fields.filter((f) => f.visible && !CORE_FIELDS.has(f.id));
}
function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-sm text-destructive" role="alert">
      {children}
    </p>
  );
}
function DetailsStep({
  draft,
  update,
  errors,
  fields,
  uploads,
  setUploads,
}: {
  draft: Draft;
  update: Update;
  errors: Record<string, string>;
  fields: FormField[];
  uploads: Uploads;
  setUploads: React.Dispatch<React.SetStateAction<Uploads>>;
}) {
  const field = (id: string) => fields.find((f) => f.id === id);
  const goals = field("goals");
  const procedures = field("procedures");
  const other = field("otherProcedure");
  const photos = field("photos");
  const toggle = (x: string) =>
    update(
      "procedures",
      draft.procedures.includes(x)
        ? draft.procedures.filter((p) => p !== x)
        : [...draft.procedures, x],
    );
  const contact = (
    [
      ["fullName", "text"],
      ["email", "email"],
      ["phone", "tel"],
      ["instagram", "text"],
      ["city", "text"],
      ["country", "text"],
    ] as const
  ).filter(([key]) => field(key)?.visible !== false);
  return (
    <div className="space-y-7">
      <div className="grid gap-5 sm:grid-cols-2">
        {contact.map(([key, type]) => (
          <div key={key} className={key === "fullName" ? "sm:col-span-2" : ""}>
            <FieldLabel required={field(key)?.required !== false}>
              {field(key)?.label ?? key}
            </FieldLabel>
            {field(key)?.help && (
              <p className="mb-2 text-xs text-muted-foreground">{field(key)?.help}</p>
            )}
            <Input
              type={type}
              value={draft[key]}
              maxLength={key === "email" ? 255 : 100}
              onChange={(e) => update(key, e.target.value)}
            />
            {errors[key] && <ErrorText>{errors[key]}</ErrorText>}
          </div>
        ))}
      </div>
      {goals?.visible && (
        <div>
          <FieldLabel required={goals.required}>{goals.label}</FieldLabel>
          {goals.help && <p className="mb-2 text-xs text-muted-foreground">{goals.help}</p>}
          <Textarea
            rows={5}
            maxLength={1500}
            value={draft.goals}
            onChange={(e) => update("goals", e.target.value)}
          />
          {errors.goals && <ErrorText>{errors.goals}</ErrorText>}
        </div>
      )}
      {procedures?.visible && (
        <fieldset>
          <legend className="mb-3 text-sm font-medium">{procedures.label}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {procedures.options?.map((o) => (
              <label
                key={o}
                className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-surface px-4"
              >
                <Checkbox
                  checked={draft.procedures.includes(o)}
                  onCheckedChange={() => toggle(o)}
                />
                <span className="text-sm">{o}</span>
              </label>
            ))}
          </div>
          {other?.visible && draft.procedures.includes("Other") && (
            <div className="mt-4">
              <FieldLabel required>{other.label}</FieldLabel>
              <Input
                value={draft.otherProcedure}
                maxLength={200}
                onChange={(e) => update("otherProcedure", e.target.value)}
              />
              {errors.otherProcedure && <ErrorText>{errors.otherProcedure}</ErrorText>}
            </div>
          )}
        </fieldset>
      )}
      {photos?.visible !== false && (
        <div>
          <FieldLabel required={photos?.required}>{photos?.label ?? "Smile photos"}</FieldLabel>
          <p className="mb-3 text-xs text-muted-foreground">{photos?.help}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SMILE_PHOTOS.map((slot) => (
              <div key={slot.key}>
                <UploadBox
                  label={`Add ${slot.label.toLowerCase()}`}
                  kind="dental_photo"
                  value={uploads.smile[slot.key]}
                  onChange={(v) =>
                    setUploads((u) => {
                      const smile = { ...u.smile };
                      if (v) smile[slot.key] = v;
                      else delete smile[slot.key];
                      return { ...u, smile };
                    })
                  }
                />
                {errors[`photo.${slot.key}`] && (
                  <ErrorText>{errors[`photo.${slot.key}`]}</ErrorText>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {customFields(fields).map((f) => (
        <CustomField
          key={f.id}
          field={f}
          value={draft.custom[f.id]}
          onChange={(v) => update("custom", { ...draft.custom, [f.id]: v })}
          upload={uploads.custom[f.id]}
          onUpload={(v) =>
            setUploads((u) => {
              const custom = { ...u.custom };
              if (v) custom[f.id] = v;
              else delete custom[f.id];
              return { ...u, custom };
            })
          }
          error={errors[`custom.${f.id}`]}
        />
      ))}
      <label className="flex gap-3 border-t border-border pt-5">
        <Checkbox checked={draft.consent} onCheckedChange={(v) => update("consent", v === true)} />
        <span className="text-sm leading-6">{field("consent")?.label}</span>
      </label>
      {errors.consent && <ErrorText>{errors.consent}</ErrorText>}
      <label className="flex gap-3">
        <Checkbox checked={draft.policy} onCheckedChange={(v) => update("policy", v === true)} />
        <span className="text-sm leading-6">
          I accept the{" "}
          <Link to="/booking-policies" className="text-primary underline">
            booking policies
          </Link>
          .
        </span>
      </label>
      {errors.policy && <ErrorText>{errors.policy}</ErrorText>}
    </div>
  );
}
/** Renders an admin-defined question from the published form. */
function CustomField({
  field,
  value,
  onChange,
  upload,
  onUpload,
  error,
}: {
  field: FormField;
  value?: AnswerValue;
  onChange: (value: AnswerValue) => void;
  upload?: UploadRef;
  onUpload: (value?: UploadRef) => void;
  error?: string;
}) {
  const id = `field-${field.id}`;
  const options = field.options?.filter(Boolean) ?? [];
  const selected = Array.isArray(value) ? value : [];
  if (field.type === "consent")
    return (
      <div>
        <label className="flex gap-3">
          <Checkbox checked={value === true} onCheckedChange={(v) => onChange(v === true)} />
          <span className="text-sm leading-6">
            {field.label}
            {field.required && <span className="ml-1 text-primary">*</span>}
          </span>
        </label>
        {error && <ErrorText>{error}</ErrorText>}
      </div>
    );
  return (
    <div>
      <FieldLabel required={field.required}>
        <span id={id}>{field.label}</span>
      </FieldLabel>
      {field.help && <p className="mb-2 text-xs text-muted-foreground">{field.help}</p>}
      {field.type === "text" && (
        <Input
          aria-labelledby={id}
          value={typeof value === "string" ? value : ""}
          maxLength={200}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.type === "textarea" && (
        <Textarea
          aria-labelledby={id}
          rows={4}
          maxLength={1500}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.type === "date" && (
        <Input
          aria-labelledby={id}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.type === "select" && (
        <Select value={typeof value === "string" ? value : ""} onValueChange={onChange}>
          <SelectTrigger aria-labelledby={id}>
            <SelectValue placeholder="Choose an option" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {field.type === "radio" && (
        <RadioGroup
          aria-labelledby={id}
          value={typeof value === "string" ? value : ""}
          onValueChange={onChange}
          className="grid gap-3 sm:grid-cols-2"
        >
          {options.map((o) => (
            <label
              key={o}
              className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-surface px-4"
            >
              <RadioGroupItem value={o} />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </RadioGroup>
      )}
      {field.type === "checkbox" && (
        <div className="grid gap-3 sm:grid-cols-2" role="group" aria-labelledby={id}>
          {options.map((o) => (
            <label
              key={o}
              className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-surface px-4"
            >
              <Checkbox
                checked={selected.includes(o)}
                onCheckedChange={() =>
                  onChange(
                    selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o],
                  )
                }
              />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </div>
      )}
      {field.type === "file" && (
        <UploadBox
          label={`Add ${field.label.toLowerCase()}`}
          kind="dental_photo"
          value={upload}
          onChange={onUpload}
        />
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}
function Summary({ draft, service }: { draft: Draft; service?: Service }) {
  return (
    <aside className="h-fit border border-border bg-surface p-6 lg:sticky lg:top-28">
      <p className="eyebrow">Appointment summary</p>
      <h3 className="mt-4 font-display text-2xl">{service?.name ?? "Choose a service"}</h3>
      <dl className="mt-6 space-y-4 border-t border-border pt-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Date</dt>
          <dd>{draft.date ? formatDate(draft.date, "EEE, MMM d") : "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Time</dt>
          <dd>{draft.time ? formatTime(draft.time) : "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Format</dt>
          <dd>{service?.format ?? "—"}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-4">
          <dt>{service?.paymentLabel ?? "Amount"}</dt>
          <dd className="font-semibold">
            {service ? (service.fee ? `$${service.fee} ${service.currency}` : "Free") : "—"}
          </dd>
        </div>
      </dl>
    </aside>
  );
}
function Review({
  draft,
  service,
  method,
  proof,
  free,
}: {
  draft: Draft;
  service?: Service;
  method?: PaymentMethod;
  proof?: UploadRef;
  free: boolean;
}) {
  const location = [draft.city, draft.country].filter(Boolean).join(", ");
  const rows = [
    ["Veneers", service?.name],
    [
      "Appointment",
      draft.date ? `${formatDate(draft.date)} at ${formatTime(draft.time)}` : undefined,
    ],
    ["Name", draft.fullName],
    ["Contact", `${draft.email} · ${draft.phone}`],
    ["Instagram", draft.instagram.trim().replace(/^@+/, "")],
    ...(location ? [["Location", location] as const] : []),
    ["Booking reference", draft.reference ?? "Generating…"],
    [
      "Payment",
      free
        ? "No payment required"
        : `${method?.name ?? "—"} · proof uploaded (${proof?.fileName ?? "missing"})`,
    ],
    ["Policies", "Accepted"],
  ];
  return (
    <div className="space-y-6">
      <div className="border border-border bg-surface">
        {rows.map(([a, b]) => (
          <div
            key={a}
            className="grid gap-1 border-b border-border p-4 last:border-0 sm:grid-cols-[10rem_1fr]"
          >
            <dt className="text-sm text-muted-foreground">{a}</dt>
            <dd className="text-sm">{b}</dd>
          </div>
        ))}
      </div>
      <div className="border-l-2 border-primary bg-primary/5 p-5 text-sm leading-6 text-muted-foreground">
        Your request will be reviewed.{" "}
        {free
          ? "No payment is needed for this service."
          : "Your payment remains unverified until staff confirm funds in the receiving account."}
      </div>
    </div>
  );
}

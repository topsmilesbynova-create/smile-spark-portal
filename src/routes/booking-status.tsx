import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Printer, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge, UploadBox } from "@/components/shared";
import { api, paymentStatusLabels, type PublicBookingStatus, type UploadRef } from "@/lib/api";
import { errorMessage, queryKeys } from "@/lib/api/queries";
import { formatDate, formatTime, formatTimestamp, zoneAbbreviation } from "@/lib/datetime";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/booking-status")({
  validateSearch: (s: Record<string, unknown>) => ({
    ref: typeof s.ref === "string" ? s.ref : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Booking Status — TopSmilesNova" },
      {
        name: "description",
        content: "Check a TopSmilesNova booking request and payment-review status.",
      },
      { property: "og:title", content: "Booking Status — TopSmilesNova" },
      { property: "og:description", content: "View booking and payment review updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BookingStatus,
});

type StepState = "done" | "pending" | "failed";

function timeline(
  booking: PublicBookingStatus,
): { label: string; detail: string; state: StepState }[] {
  const free = booking.paymentStatus === "not_required";
  const closed = booking.status === "cancelled" || booking.status === "expired";
  const review: StepState =
    booking.paymentStatus === "verified" || (free && booking.status === "confirmed")
      ? "done"
      : booking.paymentStatus === "rejected" || closed
        ? "failed"
        : "pending";
  const confirmation: StepState =
    booking.status === "confirmed" ? "done" : closed ? "failed" : "pending";
  return [
    { label: "Request received", detail: "Submission acknowledged", state: "done" },
    {
      label: free ? "Clinic review" : "Payment review",
      detail: free
        ? review === "done"
          ? "Reviewed"
          : "In review"
        : paymentStatusLabels[booking.paymentStatus],
      state: review,
    },
    {
      label: "Appointment confirmed",
      detail:
        booking.status === "confirmed"
          ? "Confirmed"
          : booking.status === "cancelled"
            ? "Cancelled"
            : booking.status === "expired"
              ? "Expired"
              : free
                ? "Pending review"
                : booking.paymentStatus === "verified"
                  ? "Pending confirmation"
                  : "Pending verification",
      state: confirmation,
    },
  ];
}

function BookingStatus() {
  const { ref } = Route.useSearch();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState(ref ?? "TSN-24076");
  const [lookup, setLookup] = useState(query);
  const [proof, setProof] = useState<UploadRef>();
  const [sending, setSending] = useState(false);
  const status = useQuery({
    queryKey: queryKeys.bookingStatus(lookup),
    queryFn: () => api.public.getBookingStatus(lookup),
    enabled: Boolean(lookup.trim()),
  });
  const booking = status.data;
  const search = () => {
    const next = query.trim();
    if (next === lookup) void status.refetch();
    else setLookup(next);
  };
  const resubmit = async () => {
    if (!booking || !proof) return;
    setSending(true);
    try {
      const next = await api.public.resubmitPaymentProof({
        reference: booking.reference,
        proofId: proof.id,
      });
      queryClient.setQueryData(queryKeys.bookingStatus(lookup), next);
      setProof(undefined);
      toast.success("New payment proof submitted for review.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="mx-auto max-w-5xl px-5 py-14 lg:px-8">
      <p className="eyebrow">Booking status</p>
      <h1 className="mt-3 font-display text-5xl">Follow your request.</h1>
      <form
        className="mt-8 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Booking reference"
          aria-label="Booking reference"
          maxLength={30}
        />
        <Button type="submit">Check status</Button>
      </form>
      {status.isPending && lookup ? (
        <div className="mt-10 h-64 animate-pulse bg-surface" />
      ) : status.isError ? (
        <div className="mt-10 border border-dashed border-border p-10 text-center">
          <h2 className="font-display text-2xl">Status unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage(status.error)}</p>
        </div>
      ) : !booking ? (
        <div className="mt-10 border border-dashed border-border p-10 text-center">
          <h2 className="font-display text-2xl">No booking found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Check the reference and try again. Demo references include TSN-24076 and TSN-24088.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <section>
            <div className="border border-border bg-surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{booking.reference}</p>
                  <h2 className="mt-2 font-display text-3xl">{booking.serviceName}</h2>
                </div>
                <StatusBadge status={booking.status} />
              </div>
              <div className="mt-7 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="mt-1 text-sm">{formatDate(booking.appointment.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="mt-1 text-sm">
                    {formatTime(booking.appointment.time)}{" "}
                    {zoneAbbreviation(booking.appointment.timeZone)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <p className="mt-1 text-sm">{paymentStatusLabels[booking.paymentStatus]}</p>
                </div>
              </div>
            </div>
            {booking.status === "action_needed" && booking.paymentStatus === "rejected" && (
              <div className="mt-5 border border-destructive/30 bg-destructive/5 p-6">
                <h3 className="font-semibold text-destructive">New payment proof needed</h3>
                <p className="mt-2 text-sm text-muted-foreground">{booking.rejectionReason}</p>
                <div className="mt-5">
                  <UploadBox
                    label="Submit new proof"
                    kind="payment_proof"
                    value={proof}
                    onChange={setProof}
                  />
                </div>
                <Button
                  className="mt-4"
                  disabled={!proof || sending}
                  onClick={() => void resubmit()}
                >
                  <RotateCcw /> {sending ? "Submitting…" : "Resubmit proof"}
                </Button>
              </div>
            )}
            {/* A receipt proves payment was verified; it is shown before the appointment is confirmed too. */}
            {booking.receipt && <Receipt booking={booking} />}
          </section>
          <aside className="border border-border p-6">
            <p className="eyebrow">Timeline</p>
            <div className="mt-6 space-y-7">
              {timeline(booking).map((s) => (
                <div className="flex gap-3" key={s.label}>
                  <div
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border",
                      s.state === "done" && "border-success bg-success/10 text-success",
                      s.state === "failed" &&
                        "border-destructive bg-destructive/10 text-destructive",
                      s.state === "pending" && "border-border text-muted-foreground",
                    )}
                  >
                    {s.state === "done" ? (
                      <Check className="size-3" />
                    ) : s.state === "failed" ? (
                      <X className="size-3" />
                    ) : (
                      <span className="size-1 rounded-full bg-current" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm">{s.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
function Receipt({ booking }: { booking: PublicBookingStatus }) {
  const receipt = booking.receipt!;
  const issued = formatTimestamp(receipt.issuedAt);
  const download = () => {
    const text = [
      "TOPSMILESNOVA",
      "Verified payment receipt",
      `Receipt: ${receipt.number}`,
      `Booking: ${receipt.bookingReference}`,
      `Service: ${receipt.serviceName}`,
      `Appointment: ${formatDate(booking.appointment.date)} ${formatTime(booking.appointment.time)} ${zoneAbbreviation(booking.appointment.timeZone)}`,
      `Amount received: ${receipt.amount} ${receipt.currency}`,
      `Method: ${receipt.methodName}`,
      `Issue date: ${issued}`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${receipt.number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="mt-5 border border-border bg-foreground p-7 text-background print:border-0">
      <div className="flex justify-between">
        <div>
          <p className="text-xs font-bold uppercase">TopSmilesNova</p>
          <h2 className="mt-3 font-display text-3xl">Verified payment receipt</h2>
        </div>
        <Check className="text-success" />
      </div>
      <dl className="mt-8 grid gap-5 border-y border-background/20 py-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs opacity-60">Receipt number</dt>
          <dd className="mt-1">{receipt.number}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-60">Issue date</dt>
          <dd className="mt-1">{issued}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-60">Amount received</dt>
          <dd className="mt-1">
            {receipt.amount} {receipt.currency}
          </dd>
        </div>
        <div>
          <dt className="text-xs opacity-60">Payment method</dt>
          <dd className="mt-1">{receipt.methodName}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-60">Booking reference</dt>
          <dd className="mt-1">{receipt.bookingReference}</dd>
        </div>
        <div>
          <dt className="text-xs opacity-60">Payment status</dt>
          <dd className="mt-1">Verified</dd>
        </div>
      </dl>
      <p className="mt-5 text-xs opacity-60">
        This verified payment receipt is separate from the initial booking submission
        acknowledgement.
      </p>
      <div className="no-print mt-6 flex gap-2">
        <Button variant="secondary" onClick={download}>
          <Download /> Download receipt
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer /> Print
        </Button>
      </div>
    </div>
  );
}

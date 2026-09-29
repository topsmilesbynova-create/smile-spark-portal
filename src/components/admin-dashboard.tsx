import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  ClipboardList,
  Eye,
  FilePenLine,
  GripVertical,
  LayoutDashboard,
  LogOut,
  Loader2,
  Menu,
  Plus,
  Search,
  Settings2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { logoutStaff } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Brand } from "@/components/site-shell";
import { EmptyState, Metric, StatusBadge } from "@/components/shared";
import { cn } from "@/lib/utils";
import {
  API_MODE,
  api,
  bookingStatusLabels,
  bookingStatuses,
  fieldTypes,
  type AvailabilitySettings,
  type Booking,
  type FormField,
  type PaymentMethod,
  type Service,
  type VisitorSession,
} from "@/lib/api";
import { errorMessage, queryKeys } from "@/lib/api/queries";
import { isBookableDate } from "@/lib/availability";
import {
  formatDate,
  formatTime,
  formatTimestamp,
  fromDateKey,
  nowInZone,
  timeAgo,
  toDateKey,
} from "@/lib/datetime";
import { notificationPrefLabels, useNotificationPrefs } from "@/lib/notification-prefs";

const simulated = API_MODE === "mock";
const nav = [
  ["Overview", "/admin", LayoutDashboard],
  ["Bookings", "/admin/bookings", ClipboardList],
  ["Payment review", "/admin/payments", CircleDollarSign],
  ["Form editor", "/admin/form-editor", FilePenLine],
  ["Payment settings", "/admin/payment-settings", Settings2],
  ["Services & availability", "/admin/services", CalendarDays],
  ["Visitors", "/admin/visitors", Users],
] as const;

// ---------- Data hooks ----------

const useBookings = () =>
  useQuery({ queryKey: queryKeys.admin.bookings, queryFn: () => api.admin.listBookings() });

/** Runs an admin action, refreshes shared data, and reports the outcome. */
function useAction() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const run = async <T,>(action: () => Promise<T>, success: string): Promise<T | undefined> => {
    setPending(true);
    try {
      const result = await action();
      await queryClient.invalidateQueries();
      toast.success(success);
      return result;
    } catch (error) {
      toast.error(errorMessage(error));
      return undefined;
    } finally {
      setPending(false);
    }
  };
  return { run, pending };
}

// ---------- Layout ----------

export function AdminShell({
  children,
  staff,
}: {
  children: ReactNode;
  staff: { displayName: string; csrfToken: string };
}) {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [today, setToday] = useState("");
  const [prefs] = useNotificationPrefs();
  const queryClient = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const notifications = useQuery({
    queryKey: queryKeys.admin.notifications,
    queryFn: () => api.admin.listNotifications(),
    refetchInterval: 15000,
  });
  const visible = (notifications.data ?? []).filter((n) => prefs[n.type]);
  const unread = visible.some((n) => !n.read);

  useEffect(() => setToday(format(new Date(), "EEEE, MMMM d")), []);
  useEffect(
    () =>
      api.admin.subscribeVisitors((event) => {
        if (event.type !== "arrived") return;
        void queryClient.invalidateQueries({ queryKey: queryKeys.admin.notifications });
        if (prefs.visitor_arrived)
          toast(`Visitor arrived on ${event.visitor.currentPath}`, {
            description: `${event.visitor.label}${simulated ? " · simulated" : ""}`,
          });
      }),
    [prefs.visitor_arrived, queryClient],
  );
  const toggleNotifications = () => {
    const next = !notificationsOpen;
    setNotificationsOpen(next);
    if (next && unread)
      void api.admin
        .markNotificationsRead()
        .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.admin.notifications }));
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-surface p-5 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Staff workspace</p>
        <nav className="mt-10 space-y-1">
          {nav.map(([label, to, Icon]) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: to === "/admin" }}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-primary/10 text-primary" }}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 border-t border-border pt-5">
          <p className="text-xs text-muted-foreground">Demo workspace</p>
          <p className="mt-1 text-sm">
            {simulated ? "Fictional local data only" : "Connected to API"}
          </p>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-18 items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu />
            </Button>
            <div>
              <p className="text-sm font-semibold">
                {nav.find(([, to]) => to === path)?.[0] ?? "Admin"}
              </p>
              <p className="hidden text-xs text-muted-foreground sm:block">{today}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {staff.displayName}
            </span>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                void logoutStaff(staff.csrfToken)
                  .catch((error: unknown) => {
                    toast(error instanceof Error ? error.message : "Could not sign out.");
                  })
                  .then(() => router.navigate({ to: "/admin/login" }));
              }}
            >
              <LogOut />
              Log out
            </Button>
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                aria-label={unread ? "Notifications (unread)" : "Notifications"}
                aria-expanded={notificationsOpen}
                onClick={toggleNotifications}
              >
                <Bell />
                {unread && (
                  <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
                )}
              </Button>
              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 max-h-[70vh] w-80 overflow-y-auto border border-border bg-popover p-4 shadow-xl">
                  <p className="font-semibold">Notifications</p>
                  {!visible.length && (
                    <p className="mt-3 text-sm text-muted-foreground">No notifications yet.</p>
                  )}
                  {visible.slice(0, 12).map((n) => (
                    <div key={n.id} className="mt-3 border-t border-border pt-3 text-sm">
                      <p className={cn(!n.read && "font-medium")}>
                        {n.title}
                        {n.bookingReference && ` · ${n.bookingReference}`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
function Heading({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow">Operations</p>
        <h1 className="mt-2 font-display text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
      </div>
      {action}
    </div>
  );
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
function Loading() {
  return (
    <div className="flex min-h-48 items-center justify-center text-muted-foreground">
      <Loader2 className="animate-spin" />
    </div>
  );
}
function LoadError({ error }: { error: unknown }) {
  return <EmptyState title="Could not load data" copy={errorMessage(error)} />;
}

// ---------- Overview ----------

const isOpen = (b: Booking) => b.status !== "cancelled" && b.status !== "expired";

export function Overview() {
  const bookings = useBookings();
  const [greeting, setGreeting] = useState("Welcome back.");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.");
  }, []);
  const visitors = useQuery({
    queryKey: ["admin", "visitors"],
    queryFn: () => api.admin.listVisitors(),
  });
  const items = bookings.data ?? [];
  const today = nowInZone(items[0]?.appointment.timeZone ?? "America/New_York").date;
  const todays = items.filter((b) => isOpen(b) && b.appointment.date === today);
  const upcoming = items
    .filter((b) => isOpen(b) && b.appointment.date >= today)
    .sort((a, b) =>
      (a.appointment.date + a.appointment.time).localeCompare(
        b.appointment.date + b.appointment.time,
      ),
    );
  const queue = items.filter((b) => b.paymentStatus === "proof_submitted");
  const oldest = queue
    .map((b) => b.payment.submittedAt)
    .filter((x): x is string => Boolean(x))
    .sort()[0];
  const activity = items
    .flatMap((b) => b.activity.map((a) => ({ ...a, reference: b.reference })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);
  return (
    <>
      <Heading title={greeting} copy="Here’s what needs attention across the clinic demo." />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Today’s appointments" value={todays.length} detail="Clinic calendar" />
        <Metric label="Upcoming bookings" value={upcoming.length} detail="Today onwards" />
        <Metric
          label="Payments to review"
          value={queue.length}
          detail={oldest ? `Oldest waiting ${timeAgo(oldest)}` : "Queue is clear"}
        />
        <Metric
          label="Confirmed"
          value={items.filter((b) => b.status === "confirmed").length}
          detail="All dates"
        />
        <Metric
          label="Active visitors"
          value={visitors.data?.filter((v) => v.state === "active").length ?? "—"}
          detail={simulated ? "Simulated presence" : "Live presence"}
        />
      </div>
      <div className="mt-10 grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
        <Panel title="Upcoming bookings">
          {bookings.isPending ? (
            <Loading />
          ) : bookings.isError ? (
            <LoadError error={bookings.error} />
          ) : (
            <BookingTable items={upcoming} />
          )}
        </Panel>
        <Panel title="Recent activity">
          <div className="space-y-5">
            {!activity.length && <p className="text-sm text-muted-foreground">No activity yet.</p>}
            {activity.map((a) => (
              <div
                key={a.reference + a.at + a.type}
                className="flex gap-3 border-b border-border pb-4 last:border-0"
              >
                <span className="mt-1 size-2 rounded-full bg-primary" />
                <div>
                  <p className="text-sm">{a.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.reference} · {timeAgo(a.at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
function BookingTable({ items, onSelect }: { items: Booking[]; onSelect?: (b: Booking) => void }) {
  if (!items.length)
    return <EmptyState title="No bookings" copy="Nothing matches this view yet." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="pb-3 font-medium">Reference</th>
            <th className="pb-3 font-medium">Patient</th>
            <th className="pb-3 font-medium">Service</th>
            <th className="pb-3 font-medium">Appointment</th>
            <th className="pb-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr
              key={b.id}
              onClick={() => onSelect?.(b)}
              className={cn(
                "border-t border-border",
                onSelect && "cursor-pointer hover:bg-muted/50",
              )}
            >
              <td className="py-4 font-medium text-primary">
                {onSelect ? (
                  <button type="button" className="text-left" onClick={() => onSelect(b)}>
                    {b.reference}
                  </button>
                ) : (
                  b.reference
                )}
              </td>
              <td>{b.patient.fullName}</td>
              <td>{b.serviceName}</td>
              <td>
                {formatDate(b.appointment.date)}
                <span className="block text-xs text-muted-foreground">
                  {formatTime(b.appointment.time)}
                </span>
              </td>
              <td>
                <StatusBadge status={b.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Bookings ----------

export function BookingsAdmin() {
  const bookings = useBookings();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string>();
  const items = bookings.data ?? [];
  const filtered = items.filter(
    (b) =>
      (b.patient.fullName + b.reference + b.serviceName)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "all" || b.status === status),
  );
  return (
    <>
      <Heading title="Bookings" copy="Search, review, and update patient requests." />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient or reference"
            aria-label="Search bookings"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-52" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {bookingStatuses.map((x) => (
              <SelectItem key={x} value={x}>
                {bookingStatusLabels[x]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Panel title={`${filtered.length} bookings`}>
        {bookings.isPending ? (
          <Loading />
        ) : bookings.isError ? (
          <LoadError error={bookings.error} />
        ) : (
          <BookingTable items={filtered} onSelect={(b) => setSelectedId(b.id)} />
        )}
      </Panel>
      <BookingDetail
        booking={items.find((b) => b.id === selectedId)}
        onClose={() => setSelectedId(undefined)}
      />
    </>
  );
}
function BookingDetail({ booking, onClose }: { booking?: Booking; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const { run, pending } = useAction();
  const form = useQuery({
    queryKey: queryKeys.formVersion(booking?.formVersion ?? 0),
    queryFn: () => api.admin.getFormVersion(booking!.formVersion),
    enabled: Boolean(booking),
  });
  useEffect(() => {
    setNote("");
    setRescheduling(false);
  }, [booking?.id]);
  const labelFor = (id: string) => form.data?.fields.find((f) => f.id === id)?.label ?? id;
  const closed = booking?.status === "cancelled" || booking?.status === "expired";
  const paid = booking?.paymentStatus === "verified" || booking?.paymentStatus === "not_required";
  return (
    <Dialog open={Boolean(booking)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {booking && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-3xl">{booking.reference}</DialogTitle>
              <DialogDescription>
                Form version {booking.formVersion} · {booking.serviceName}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 sm:grid-cols-2">
              <Panel title="Patient contact">
                <p className="text-sm">{booking.patient.fullName}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {booking.patient.email}
                  <br />
                  {booking.patient.phone}
                  {(booking.patient.city || booking.patient.country) && (
                    <>
                      <br />
                      {[booking.patient.city, booking.patient.country].filter(Boolean).join(", ")}
                    </>
                  )}
                </p>
              </Panel>
              <Panel title="Appointment">
                <p className="text-sm">
                  {formatDate(booking.appointment.date)} at {formatTime(booking.appointment.time)}{" "}
                  <span className="text-muted-foreground">({booking.appointment.timeZone})</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={booking.status} />
                  <StatusBadge status={booking.paymentStatus} />
                </div>
              </Panel>
              <Panel title="Form answers">
                <dl className="space-y-3 text-sm">
                  {Object.entries(booking.answers).map(([id, value]) => (
                    <div key={id}>
                      <dt className="text-xs text-muted-foreground">{labelFor(id)}</dt>
                      <dd className="mt-1">
                        {Array.isArray(value)
                          ? value.join(", ") || "None"
                          : value === true
                            ? "Yes"
                            : value === false
                              ? "No"
                              : value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Panel>
              <Panel title="Uploaded photos">
                {booking.photos.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {booking.photos.map((p) => (
                      <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                        <img
                          src={p.url}
                          alt={p.fileName}
                          className="h-20 w-full bg-muted object-cover"
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No photos submitted.</p>
                )}
              </Panel>
            </div>
            <Panel title="Activity history">
              <ol className="space-y-2 text-sm">
                {booking.activity.map((a) => (
                  <li key={a.at + a.type} className="flex justify-between gap-4">
                    <span>{a.message}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatTimestamp(a.at)}
                    </span>
                  </li>
                ))}
              </ol>
            </Panel>
            {rescheduling ? (
              <ReschedulePicker
                booking={booking}
                note={note}
                pending={pending}
                onCancel={() => setRescheduling(false)}
                onSave={async (date, time) => {
                  const done = await run(
                    () =>
                      api.admin.rescheduleBooking(booking.id, {
                        date,
                        time,
                        note: note.trim() || undefined,
                      }),
                    "Booking rescheduled",
                  );
                  if (done) setRescheduling(false);
                }}
              />
            ) : null}
            <div>
              <label className="text-sm" htmlFor="booking-note">
                Action note
              </label>
              <Textarea
                id="booking-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note for reschedule or cancellation"
                maxLength={500}
                className="mt-2"
              />
            </div>
            {!paid && !closed && (
              <p className="text-xs text-muted-foreground">
                Confirmation is available after the payment is verified in Payment review.
              </p>
            )}
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={pending || closed}
                onClick={() =>
                  void run(
                    () => api.admin.cancelBooking(booking.id, { reason: note.trim() || undefined }),
                    "Booking cancelled",
                  )
                }
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                disabled={pending || closed || rescheduling}
                onClick={() => setRescheduling(true)}
              >
                Reschedule
              </Button>
              <Button
                disabled={pending || closed || !paid || booking.status === "confirmed"}
                onClick={() =>
                  void run(() => api.admin.confirmBooking(booking.id), "Booking confirmed")
                }
              >
                Confirm booking
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
function ReschedulePicker({
  booking,
  note,
  pending,
  onCancel,
  onSave,
}: {
  booking: Booking;
  note: string;
  pending: boolean;
  onCancel: () => void;
  onSave: (date: string, time: string) => void;
}) {
  const [date, setDate] = useState<string>();
  const [time, setTime] = useState("");
  const availability = useQuery({
    queryKey: queryKeys.availability,
    queryFn: () => api.admin.getAvailability(),
  });
  const slots = useQuery({
    queryKey: queryKeys.slots(date ?? ""),
    queryFn: () => api.public.getSlots(date!),
    enabled: Boolean(date),
  });
  return (
    <Panel title="Choose a new time">
      <div className="grid gap-5 md:grid-cols-2">
        <Calendar
          mode="single"
          selected={date ? fromDateKey(date) : undefined}
          onSelect={(d) => {
            setDate(d ? toDateKey(d) : undefined);
            setTime("");
          }}
          disabled={(d) => !availability.data || !isBookableDate(toDateKey(d), availability.data)}
        />
        <div>
          {!date ? (
            <p className="text-sm text-muted-foreground">Pick a date to see open times.</p>
          ) : slots.isPending ? (
            <Loading />
          ) : !slots.data?.some((s) => s.available) ? (
            <p className="text-sm text-muted-foreground">No open times on this date.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {slots.data.map((s) => (
                <Button
                  key={s.time}
                  type="button"
                  size="sm"
                  variant={time === s.time ? "default" : "outline"}
                  disabled={!s.available}
                  onClick={() => setTime(s.time)}
                >
                  {formatTime(s.time)}
                </Button>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Current: {formatDate(booking.appointment.date)} at{" "}
            {formatTime(booking.appointment.time)}
            {note.trim() && " · the action note will be saved with this change"}
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Back
            </Button>
            <Button
              size="sm"
              disabled={!date || !time || pending}
              onClick={() => date && onSave(date, time)}
            >
              Save new time
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ---------- Payment review ----------

export function PaymentsAdmin() {
  const bookings = useBookings();
  const { run, pending } = useAction();
  const [selectedId, setSelectedId] = useState<string>();
  const [verify, setVerify] = useState(false);
  const [reject, setReject] = useState(false);
  const [enlarge, setEnlarge] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const queue = (bookings.data ?? []).filter((b) => b.paymentStatus === "proof_submitted");
  const selected = queue.find((b) => b.id === selectedId) ?? queue[0];
  const snapshot = selected?.payment.snapshot;
  useEffect(() => setNotes(""), [selected?.id]);
  return (
    <>
      <Heading
        title="Payment review"
        copy="Confirm funds in the receiving account before verification."
      />
      <div className="grid gap-6 xl:grid-cols-[20rem_1fr]">
        <Panel title={`${queue.length} awaiting review`}>
          <div className="space-y-2">
            {bookings.isPending ? (
              <Loading />
            ) : queue.length ? (
              queue.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={cn(
                    "w-full rounded-md border p-4 text-left",
                    selected?.id === b.id ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  <p className="text-sm font-semibold">{b.reference}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {b.patient.fullName} · {b.payment.amount} {b.payment.currency}
                  </p>
                </button>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Queue is clear.</p>
            )}
          </div>
        </Panel>
        <Panel title={selected?.reference ?? "Select a payment"}>
          {selected ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex min-h-80 items-center justify-center bg-muted">
                {selected.payment.proof ? (
                  <div className="w-full p-4 text-center">
                    <img
                      src={selected.payment.proof.url}
                      alt={`Payment screenshot for ${selected.reference}`}
                      className="mx-auto max-h-80 object-contain"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setEnlarge(true)}
                    >
                      <Eye /> Enlarge preview
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No screenshot on file.</p>
                )}
              </div>
              <div>
                <dl className="space-y-5 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Expected amount</dt>
                    <dd className="mt-1 text-xl font-semibold">
                      {selected.payment.amount} {selected.payment.currency}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Method shown to patient</dt>
                    <dd className="mt-1">
                      {snapshot
                        ? `${snapshot.methodName} · ${snapshot.identifier}`
                        : "Not recorded"}
                      {snapshot && (
                        <span className="block text-xs text-muted-foreground">
                          {snapshot.accountHolder}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Transaction reference</dt>
                    <dd className="mt-1">{selected.payment.transactionRef ?? "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Payer name</dt>
                    <dd className="mt-1">
                      {selected.payment.payerName ?? selected.patient.fullName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Submitted</dt>
                    <dd className="mt-1">
                      {selected.payment.submittedAt
                        ? formatTimestamp(selected.payment.submittedAt)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Instruction snapshot</dt>
                    <dd className="mt-1 leading-6">{snapshot?.instructions ?? "Not recorded"}</dd>
                  </div>
                </dl>
                <div className="mt-6">
                  <label className="text-sm" htmlFor="verification-notes">
                    Verification notes
                  </label>
                  <Textarea
                    id="verification-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Where you checked the funds, for the audit trail"
                    maxLength={500}
                    className="mt-2"
                  />
                </div>
                <div className="mt-8 flex gap-3">
                  <Button variant="destructive" disabled={pending} onClick={() => setReject(true)}>
                    Reject proof
                  </Button>
                  <Button disabled={pending} onClick={() => setVerify(true)}>
                    Verify payment
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-24 text-center text-sm text-muted-foreground">
              Choose an item from the review queue.
            </p>
          )}
        </Panel>
      </div>
      <Dialog open={enlarge} onOpenChange={setEnlarge}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.reference} payment screenshot</DialogTitle>
            <DialogDescription>{selected?.payment.proof?.fileName}</DialogDescription>
          </DialogHeader>
          {selected?.payment.proof && (
            <img
              src={selected.payment.proof.url}
              alt={`Payment screenshot for ${selected.reference}, enlarged`}
              className="max-h-[75vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={verify} onOpenChange={setVerify}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm funds arrived</DialogTitle>
            <DialogDescription>
              Check the receiving account, amount, payer, and booking reference. A screenshot alone
              is not verification.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerify(false)}>
              Go back
            </Button>
            <Button
              disabled={pending}
              onClick={async () => {
                if (!selected) return;
                const done = await run(
                  () => api.admin.verifyPayment(selected.id, { notes: notes.trim() || undefined }),
                  "Payment verified and receipt issued. Confirm the appointment from Bookings.",
                );
                if (done) setVerify(false);
              }}
            >
              I checked — verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={reject} onOpenChange={setReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject payment proof</DialogTitle>
            <DialogDescription>
              The patient will see this reason and can upload new proof.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Required reason"
            aria-label="Rejection reason"
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReject(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || pending}
              onClick={async () => {
                if (!selected) return;
                const done = await run(
                  () => api.admin.rejectPayment(selected.id, { reason: reason.trim() }),
                  "Proof rejected; the patient can resubmit",
                );
                if (done) {
                  setReject(false);
                  setReason("");
                }
              }}
            >
              Reject and notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------- Form editor ----------

function move<T>(items: T[], i: number, d: number) {
  const n = [...items];
  const [x] = n.splice(i, 1);
  if (x !== undefined) n.splice(i + d, 0, x);
  return n;
}

export function FormEditor() {
  const { run, pending } = useAction();
  const published = useQuery({
    queryKey: queryKeys.publishedForm,
    queryFn: () => api.admin.getPublishedForm(),
  });
  const draft = useQuery({
    queryKey: queryKeys.formDraft,
    queryFn: () => api.admin.getFormDraft(),
  });
  const [fields, setFields] = useState<FormField[]>();
  const [optionText, setOptionText] = useState<Record<string, string>>({});
  useEffect(() => {
    if (fields || !published.data || draft.isPending) return;
    setFields(draft.data?.fields ?? published.data.fields);
  }, [fields, published.data, draft.data, draft.isPending]);
  if (published.isError) return <LoadError error={published.error} />;
  if (!fields || !published.data) return <Loading />;
  const update = (i: number, p: Partial<FormField>) =>
    setFields(fields.map((f, j) => (i === j ? { ...f, ...p } : f)));
  return (
    <>
      <Heading
        title="Consultation form"
        copy={`Published version ${published.data.version}${draft.data ? ` · draft saved ${timeAgo(draft.data.savedAt)}` : ""}. Draft changes first, then publish when the patient form is ready.`}
        action={
          <Button
            onClick={() =>
              setFields([
                ...fields,
                {
                  id: `q-${crypto.randomUUID().slice(0, 8)}`,
                  label: "New question",
                  type: "text",
                  required: false,
                  visible: true,
                },
              ])
            }
          >
            <Plus /> Add question
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Panel title="Form fields">
          <div className="space-y-3">
            {fields.map((f, i) => (
              <div key={f.id} className="border border-border p-4">
                <div className="flex items-start gap-3">
                  <GripVertical className="mt-2 size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Input
                      value={f.label}
                      aria-label="Question label"
                      onChange={(e) => update(i, { label: e.target.value })}
                    />
                    <Input
                      value={f.help ?? ""}
                      onChange={(e) => update(i, { help: e.target.value })}
                      placeholder="Help text"
                      aria-label="Help text"
                      className="mt-2"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                      <Select
                        value={f.type}
                        disabled={f.protected}
                        onValueChange={(v) => update(i, { type: v as FormField["type"] })}
                      >
                        <SelectTrigger className="w-36" aria-label="Field type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldTypes.map((x) => (
                            <SelectItem key={x} value={x}>
                              {x}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={f.required}
                          disabled={f.protected}
                          onCheckedChange={(v) => update(i, { required: v })}
                        />{" "}
                        Required
                      </label>
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={f.visible}
                          disabled={f.protected}
                          onCheckedChange={(v) => update(i, { visible: v })}
                        />{" "}
                        Visible
                      </label>
                      {f.protected && (
                        <span className="text-primary">Protected workflow field</span>
                      )}
                    </div>
                    {["select", "radio", "checkbox"].includes(f.type) && (
                      <Input
                        className="mt-3"
                        value={optionText[f.id] ?? f.options?.join(", ") ?? ""}
                        onChange={(e) => {
                          setOptionText({ ...optionText, [f.id]: e.target.value });
                          update(i, {
                            options: e.target.value
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean),
                          });
                        }}
                        placeholder="Options, separated by commas"
                        aria-label="Options"
                      />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() => setFields(move(fields, i, -1))}
                    >
                      <ChevronUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Move down"
                      disabled={i === fields.length - 1}
                      onClick={() => setFields(move(fields, i, 1))}
                    >
                      <ChevronDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete question"
                      disabled={f.protected}
                      onClick={() => setFields(fields.filter((x) => x.id !== f.id))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Service, appointment time, and payment proof are fixed booking steps and are not edited
            here.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => void run(() => api.admin.saveFormDraft(fields), "Draft saved")}
            >
              Save draft
            </Button>
            <Button
              disabled={pending}
              onClick={async () => {
                const form = await run(() => api.admin.publishForm(fields), "Form published");
                if (form) {
                  setFields(form.fields);
                  setOptionText({});
                  toast.success(`Version ${form.version} is now live for new bookings`);
                }
              }}
            >
              Publish changes
            </Button>
          </div>
        </Panel>
        <Panel title="Patient preview">
          <p className="text-xs text-muted-foreground">
            Existing submissions keep their original form version.
          </p>
          <div className="mt-5 space-y-5">
            {fields
              .filter((f) => f.visible)
              .map((f) => (
                <div key={f.id}>
                  <label className="text-sm">
                    {f.label}
                    {f.required && " *"}
                  </label>
                  {f.type === "textarea" ? (
                    <Textarea disabled className="mt-2" />
                  ) : ["select", "radio", "checkbox"].includes(f.type) ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {f.options?.join(" · ") || "No options yet"}
                    </p>
                  ) : f.type === "consent" || f.type === "file" ? null : (
                    <Input disabled className="mt-2" />
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{f.help}</p>
                </div>
              ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

// ---------- Payment settings ----------

export function PaymentSettings() {
  const { run, pending } = useAction();
  const saved = useQuery({
    queryKey: queryKeys.admin.paymentMethods,
    queryFn: () => api.admin.listPaymentMethods(),
  });
  const [methods, setMethods] = useState<PaymentMethod[]>();
  useEffect(() => {
    if (!methods && saved.data) setMethods(saved.data);
  }, [methods, saved.data]);
  if (saved.isError) return <LoadError error={saved.error} />;
  if (!methods) return <Loading />;
  const update = (i: number, p: Partial<PaymentMethod>) =>
    setMethods(methods.map((m, j) => (i === j ? { ...m, ...p } : m)));
  return (
    <>
      <Heading
        title="Payment settings"
        copy="Manual methods shown during booking. Existing bookings retain instruction snapshots."
        action={
          <Button
            onClick={() =>
              setMethods([
                ...methods,
                {
                  id: crypto.randomUUID(),
                  name: "New method",
                  accountHolder: "",
                  identifier: "",
                  instructions: "",
                  enabled: false,
                },
              ])
            }
          >
            <Plus /> Add method
          </Button>
        }
      />
      <div className="space-y-5">
        {methods.map((m, i) => (
          <Panel key={m.id} title={m.name || "Untitled method"}>
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField
                label="Method name"
                value={m.name}
                onChange={(v) => update(i, { name: v })}
              />
              <AdminField
                label="Account holder"
                value={m.accountHolder}
                onChange={(v) => update(i, { accountHolder: v })}
              />
              <AdminField
                label="Tag or account identifier"
                value={m.identifier}
                onChange={(v) => update(i, { identifier: v })}
              />
              <div className="flex items-end justify-between gap-3 pb-2">
                <label className="flex items-center gap-3">
                  <Switch checked={m.enabled} onCheckedChange={(v) => update(i, { enabled: v })} />
                  <span className="text-sm">Enabled for new bookings</span>
                </label>
                <div className="flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Move up"
                    disabled={i === 0}
                    onClick={() => setMethods(move(methods, i, -1))}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Move down"
                    disabled={i === methods.length - 1}
                    onClick={() => setMethods(move(methods, i, 1))}
                  >
                    <ChevronDown />
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground" htmlFor={`instructions-${m.id}`}>
                  Payment instructions
                </label>
                <Textarea
                  id={`instructions-${m.id}`}
                  value={m.instructions}
                  onChange={(e) => update(i, { instructions: e.target.value })}
                  maxLength={1000}
                  className="mt-2"
                />
              </div>
            </div>
          </Panel>
        ))}
        <div className="flex justify-end">
          <Button
            disabled={pending}
            onClick={async () => {
              const next = await run(
                () => api.admin.savePaymentMethods(methods),
                "Payment options saved",
              );
              if (next) setMethods(next);
            }}
          >
            {pending ? (
              "Saving…"
            ) : (
              <>
                <Check /> Save payment options
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
function AdminField({
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2"
      />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

// ---------- Services and availability ----------

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const splitList = (text: string) =>
  text
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function ServicesAdmin() {
  const { run, pending } = useAction();
  const savedServices = useQuery({
    queryKey: queryKeys.admin.services,
    queryFn: () => api.admin.listServices(),
  });
  const savedAvailability = useQuery({
    queryKey: queryKeys.availability,
    queryFn: () => api.admin.getAvailability(),
  });
  const [services, setServices] = useState<Service[]>();
  const [availability, setAvailability] = useState<AvailabilitySettings>();
  const [slotText, setSlotText] = useState("");
  const [blackoutText, setBlackoutText] = useState("");
  useEffect(() => {
    if (!services && savedServices.data) setServices(savedServices.data);
  }, [services, savedServices.data]);
  useEffect(() => {
    if (availability || !savedAvailability.data) return;
    setAvailability(savedAvailability.data);
    setSlotText(savedAvailability.data.slotTimes.join(", "));
    setBlackoutText(savedAvailability.data.blackoutDates.join(", "));
  }, [availability, savedAvailability.data]);
  if (savedServices.isError) return <LoadError error={savedServices.error} />;
  if (savedAvailability.isError) return <LoadError error={savedAvailability.error} />;
  if (!services || !availability) return <Loading />;
  const update = (i: number, p: Partial<Service>) =>
    setServices(services.map((s, j) => (i === j ? { ...s, ...p } : s)));
  const save = async () => {
    const nextAvailability = {
      ...availability,
      slotTimes: splitList(slotText),
      blackoutDates: splitList(blackoutText),
    };
    const done = await run(async () => {
      const s = await api.admin.saveServices(services);
      const a = await api.admin.saveAvailability(nextAvailability);
      return { s, a };
    }, "Services and availability saved");
    if (done) {
      setServices(done.s);
      setAvailability(done.a);
      setSlotText(done.a.slotTimes.join(", "));
    }
  };
  return (
    <>
      <Heading
        title="Services & availability"
        copy="Edit consultation options, fees, scheduling rules, and clinic time zone."
      />
      <div className="space-y-5">
        {services.map((s, i) => (
          <Panel key={s.id} title={s.name || "Untitled service"}>
            <div className="grid gap-4 md:grid-cols-3">
              <AdminField
                label="Service name"
                value={s.name}
                onChange={(v) => update(i, { name: v })}
              />
              <AdminField
                label="Duration (minutes)"
                value={s.duration}
                onChange={(v) => update(i, { duration: Number(v) })}
                type="number"
              />
              <AdminField
                label="Format"
                value={s.format}
                onChange={(v) => update(i, { format: v })}
              />
              <AdminField
                label="Fee or deposit"
                value={s.fee}
                onChange={(v) => update(i, { fee: Number(v) })}
                type="number"
                hint="0 makes the service free and skips payment."
              />
              <AdminField
                label="Currency"
                value={s.currency}
                onChange={(v) => update(i, { currency: v.toUpperCase() })}
              />
              <label className="block">
                <span className="text-xs text-muted-foreground">Amount is a</span>
                <Select
                  value={s.fee === 0 ? "Free" : s.paymentLabel}
                  disabled={s.fee === 0}
                  onValueChange={(v) => update(i, { paymentLabel: v as Service["paymentLabel"] })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consultation fee">Consultation fee</SelectItem>
                    <SelectItem value="Down payment">
                      Down payment (not the full treatment price)
                    </SelectItem>
                    <SelectItem value="Deposit">Deposit (not the full treatment price)</SelectItem>
                    {s.fee === 0 && <SelectItem value="Free">Free</SelectItem>}
                  </SelectContent>
                </Select>
              </label>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground" htmlFor={`description-${s.id}`}>
                  Description
                </label>
                <Textarea
                  id={`description-${s.id}`}
                  value={s.description}
                  maxLength={400}
                  onChange={(e) => update(i, { description: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div className="flex items-end gap-3 pb-2">
                <Switch checked={s.enabled} onCheckedChange={(v) => update(i, { enabled: v })} />
                <span className="text-sm">Bookable</span>
              </div>
            </div>
          </Panel>
        ))}
        <Panel title="Availability">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminField
              label="Clinic time zone"
              value={availability.timeZone}
              onChange={(v) => setAvailability({ ...availability, timeZone: v })}
              hint="IANA name, e.g. America/New_York"
            />
            <AdminField
              label="Booking window (days ahead)"
              value={availability.bookingWindowDays}
              type="number"
              onChange={(v) => setAvailability({ ...availability, bookingWindowDays: Number(v) })}
            />
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground">Opening days</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {weekdays.map((d, day) => {
                  const on = availability.workingDays.includes(day);
                  return (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={on ? "default" : "outline"}
                      aria-pressed={on}
                      onClick={() =>
                        setAvailability({
                          ...availability,
                          workingDays: on
                            ? availability.workingDays.filter((x) => x !== day)
                            : [...availability.workingDays, day].sort(),
                        })
                      }
                    >
                      {d}
                    </Button>
                  );
                })}
              </div>
            </div>
            <AdminField
              label="Available slots"
              value={slotText}
              onChange={setSlotText}
              hint="24-hour times, comma separated, e.g. 09:00, 14:30"
            />
            <AdminField
              label="Blackout dates"
              value={blackoutText}
              onChange={setBlackoutText}
              hint="YYYY-MM-DD, comma separated"
            />
          </div>
        </Panel>
        <div className="flex justify-end">
          <Button disabled={pending} onClick={() => void save()}>
            {pending ? (
              "Saving…"
            ) : (
              <>
                <Check /> Save services & availability
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

// ---------- Visitors ----------

export function Visitors() {
  const [prefs, setPref] = useNotificationPrefs();
  const [visitors, setVisitors] = useState<VisitorSession[]>();
  useEffect(
    () =>
      api.admin.subscribeVisitors((event) => {
        if (event.type === "snapshot") setVisitors(event.visitors);
      }),
    [],
  );
  return (
    <>
      <Heading
        title="Visitors & notifications"
        copy={
          simulated
            ? "Simulated presence data for this administration demo."
            : "Anonymous presence for the public site."
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <Panel
          title={
            visitors
              ? `${visitors.filter((v) => v.state === "active").length} active visitors`
              : "Visitors"
          }
        >
          {!visitors ? (
            <Loading />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[35rem] text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-3">Anonymous session</th>
                    <th>Current page</th>
                    <th>Arrival</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v) => (
                    <tr key={v.id} className="border-t border-border">
                      <td className="py-4">{v.label}</td>
                      <td>{v.currentPath}</td>
                      <td>{timeAgo(v.arrivedAt)}</td>
                      <td>
                        <span
                          className={
                            v.state === "active" ? "text-success" : "text-muted-foreground"
                          }
                        >
                          ● {v.state === "active" ? "Active" : "Offline"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title="Notification preferences">
          <div className="space-y-5">
            {(Object.keys(notificationPrefLabels) as (keyof typeof notificationPrefLabels)[]).map(
              (type) => (
                <label key={type} className="flex items-center justify-between gap-3 text-sm">
                  <span>{notificationPrefLabels[type]}</span>
                  <Switch checked={prefs[type]} onCheckedChange={(v) => setPref(type, v)} />
                </label>
              ),
            )}
          </div>
          <p className="mt-6 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
            {simulated && "Presence and notifications are simulated. "}Anonymous labels do not
            represent real identities. Preferences are saved in this browser only.
          </p>
        </Panel>
      </div>
    </>
  );
}

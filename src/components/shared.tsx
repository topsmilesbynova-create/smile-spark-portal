import { Check, Clock3, Copy, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  api,
  bookingStatusLabels,
  paymentStatusLabels,
  statusTones,
  type BookingStatus,
  type PaymentStatus,
  type UploadKind,
  type UploadRef,
} from "@/lib/api";
import { errorMessage } from "@/lib/api/queries";

export function PageIntro({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-4 font-display text-5xl leading-none sm:text-6xl lg:text-7xl">{title}</h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">{copy}</p>
    </div>
  );
}
export function StatusBadge({ status }: { status: BookingStatus | PaymentStatus }) {
  const tone = statusTones[status];
  const good = tone === "good";
  const warning = tone === "warning";
  const bad = tone === "bad";
  const label =
    status in bookingStatusLabels
      ? bookingStatusLabels[status as BookingStatus]
      : paymentStatusLabels[status as PaymentStatus];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        good && "border-success/30 bg-success/10 text-success",
        warning && "border-primary/30 bg-primary/10 text-primary",
        bad && "border-destructive/30 bg-destructive/10 text-destructive",
        !good && !warning && !bad && "border-border bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
export function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-medium">
      {children}
      {required && <span className="ml-1 text-primary">*</span>}
    </label>
  );
}
/** Uploads the chosen image through the API and reports the stored file reference. */
export function UploadBox({
  label,
  kind,
  value,
  onChange,
  accept = "image/*",
}: {
  label: string;
  kind: UploadKind;
  value?: UploadRef;
  onChange: (value?: UploadRef) => void;
  accept?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const choose = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    try {
      onChange(await api.public.uploadFile(file, kind));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
      // Allow choosing the same file again after removing it.
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/20 p-4">
      {value ? (
        <div className="relative overflow-hidden rounded-md bg-surface">
          <img src={value.url} alt={`${label} preview`} className="h-40 w-full object-cover" />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute bottom-3 right-3"
            onClick={() => input.current?.click()}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : null}
            Replace
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-3 top-3"
            aria-label="Remove upload"
            onClick={() => onChange()}
          >
            <X />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-28 w-full border-0 bg-transparent"
          onClick={() => input.current?.click()}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload /> {label}
            </>
          )}
        </Button>
      )}
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => void choose(e.target.files?.[0])}
      />
    </div>
  );
}
export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          window.setTimeout(() => setDone(false), 1200);
        } catch {
          toast.error("Copy is unavailable here. Please select and copy the text.");
        }
      }}
    >
      {done ? <Check /> : <Copy />}
      {done ? "Copied" : "Copy"}
    </Button>
  );
}
export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="border-t border-border pt-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center border border-dashed border-border p-8 text-center">
      <Clock3 className="mb-4 text-muted-foreground" />
      <h3 className="font-medium">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{copy}</p>
    </div>
  );
}

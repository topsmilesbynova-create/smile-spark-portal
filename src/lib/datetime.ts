// Appointments are clinic wall-clock times: date "YYYY-MM-DD", time "HH:mm", plus an IANA zone.
import { format, parse } from "date-fns";

export const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");
export const fromDateKey = (key: string) => parse(key, "yyyy-MM-dd", new Date());

/** "14:00" → "2:00 PM" */
export function formatTime(time: string) {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return format(new Date(2000, 0, 1, h, m), "h:mm a");
}

/** "2026-09-25" → "Sep 25, 2026" */
export const formatDate = (key: string, pattern = "MMM d, yyyy") =>
  format(fromDateKey(key), pattern);

/** Short zone name such as "EDT"; falls back to the IANA id. */
export function zoneAbbreviation(timeZone: string, at = new Date()) {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

/** Current date and time in the given zone, as clinic wall-clock values. */
export function nowInZone(timeZone: string, at = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

/** ISO timestamp → "Sep 24, 2026, 3:05 PM" in the viewer's locale zone. */
export const formatTimestamp = (iso: string) => format(new Date(iso), "MMM d, yyyy, h:mm a");

export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

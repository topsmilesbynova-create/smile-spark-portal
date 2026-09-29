import { addDays } from "date-fns";
import type { AvailabilitySettings } from "@/lib/api/contracts";
import { fromDateKey, nowInZone, toDateKey } from "@/lib/datetime";

/** Whether patients may book on this clinic-local date ("YYYY-MM-DD"). The API re-checks. */
export function isBookableDate(date: string, settings: AvailabilitySettings) {
  const today = nowInZone(settings.timeZone).date;
  const last = toDateKey(addDays(fromDateKey(today), settings.bookingWindowDays));
  return (
    date >= today &&
    date <= last &&
    settings.workingDays.includes(fromDateKey(date).getDay()) &&
    !settings.blackoutDates.includes(date)
  );
}
